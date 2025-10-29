import { VectorizeService, createVectorizeService } from './vectorizeService';
import { LLMService, createLLMService } from './llmService';
import { LangChainService, createLangChainService } from './langChainService';
import { PromptTemplate } from './MortgageConversation/prompts/prompt_scripts/PromptTemplate';
import { SEARCH_QUERY_GENERATION_TEMPLATE, createSearchQueryVariables } from './prompts/langChainTemplates';
import { MarketData, MortgageProduct, VectorizeDocument } from '../types/vectorize';
import type { MortgageData } from '@mortgagemate/models';

export class MortgageMarketService {
  private vectorizeService: VectorizeService | null;
  private llmService: LLMService;
  private langChainService: LangChainService;
  private useLangChain: boolean;

  constructor() {
    this.vectorizeService = createVectorizeService();
    this.llmService = createLLMService();
    this.langChainService = createLangChainService();
    // Use LangChain when LLM_IMPLEMENTATION is set to 'langchain', otherwise use legacy
    this.useLangChain = process.env.LLM_IMPLEMENTATION === 'langchain';
  }

  /**
   * Main method: Find competing products for a mortgage scenario
   */
  async findCompetingProducts(mortgageData: Partial<MortgageData>): Promise<MarketData> {
    if (!this.vectorizeService) {
      console.log('Vectorize not available, returning empty market data');
      return this.getEmptyMarketData();
    }

    // Step 1: Generate intelligent search query using LLM and template
    console.log('Generating search query with LLM...');
    const searchQuery = await this.generateSearchQuery(mortgageData);
    console.log(`Generated search query: "${searchQuery}"`);

    // Step 2: Build filters for hard constraints
    const filters = this.buildFilters(mortgageData);
    console.log('Search filters:', filters);

    // Step 3: Search Vectorize with reranking
    const searchResult = await this.vectorizeService.searchRelevantProducts({
      query: searchQuery,
      top_k: 30,
      rerank: {
        enabled: true,
        top_n: 5
      },
      filters
    });

    if (!searchResult.success) {
      console.error('Vectorize search failed');
      return this.getEmptyMarketData();
    }

    // Step 4: Transform results and calculate market insights
    const products = this.transformSearchResults(searchResult.documents);
    const marketData = this.calculateMarketInsights(products, searchQuery);

    console.log(`Found ${products.length} relevant products`);
    return marketData;
  }

  /**
   * Generate an intelligent search query using LLM and prompt template
   */
  private async generateSearchQuery(mortgageData: Partial<MortgageData>): Promise<string> {
    if (this.useLangChain) {
      // New LangChain approach
      const variables = createSearchQueryVariables(mortgageData);

      const response = await this.langChainService.invoke({
        template: SEARCH_QUERY_GENERATION_TEMPLATE,
        variables,
        options: {
          maxTokens: 100,
          temperature: 0.3
        }
      });

      return response.content.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    } else {
      // Legacy approach - keep for backward compatibility
      const prompt = await PromptTemplate.generatePrompt(
        'search_query_generation',
        mortgageData as MortgageData
      );

      const response = await this.llmService.generateResponse({
        messages: [
          { role: 'user', content: prompt }
        ],
        maxTokens: 100,
        temperature: 0.3
      });

      return response.content.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
    }
  }

  /**
   * Build Vectorize filters for hard constraints
   */
  private buildFilters(mortgageData: Partial<MortgageData>): Record<string, any> {
    const filters: Record<string, any> = {};
    const ltv = this.calculateLTV(mortgageData);

    // LTV constraints
    if (ltv && ltv > 0) {
      filters.ltv_max = { $gte: ltv };
      filters.ltv_min = { $lte: ltv };
    }

    // Loan amount constraints
    if (mortgageData.currentBalance) {
      filters.max_loan = { $gte: mortgageData.currentBalance };
      filters.min_loan = { $lte: mortgageData.currentBalance };
    }

    // Property type filter
    if (mortgageData.propertyUse === 'Buy to Let') {
      filters.property_type = 'buy-to-let';
    }

    return filters;
  }

  /**
   * Transform Vectorize search results to MortgageProduct array
   */
  private transformSearchResults(documents: VectorizeDocument[]): MortgageProduct[] {
    return documents.map((doc, index) => {
      // Use the parsedContent field that contains the parsed mortgage product data
      const product = doc.parsedContent;

      // Debug: Log the first product transformation
      if (index === 0) {
        console.log('=== TRANSFORM DEBUG ===');
        console.log('Document structure:', {
          hasParsedContent: !!doc.parsedContent,
          parsedContentKeys: doc.parsedContent ? Object.keys(doc.parsedContent) : [],
          similarity: doc.similarity,
          relevancy: doc.relevancy
        });
        console.log('Product after extraction:', product);
      }

      return {
        ...product,
        _score: doc.similarity || doc.relevancy || 0
      };
    });
  }

  /**
   * Calculate market insights from the retrieved products
   */
  private calculateMarketInsights(products: MortgageProduct[], searchQuery: string): MarketData {
    const now = new Date();

    // Calculate average rates by type
    const fixedProducts = products.filter(p => p.rate_type === 'fixed');
    const variableProducts = products.filter(p => p.rate_type === 'variable');
    const trackerProducts = products.filter(p => p.rate_type === 'tracker');

    const twoYearFixed = fixedProducts.filter(p => p.initial_period_months === 24);
    const fiveYearFixed = fixedProducts.filter(p => p.initial_period_months === 60);

    const averageRates = {
      twoYearFixed: twoYearFixed.length ? twoYearFixed.reduce((sum, p) => sum + p.rate, 0) / twoYearFixed.length : undefined,
      fiveYearFixed: fiveYearFixed.length ? fiveYearFixed.reduce((sum, p) => sum + p.rate, 0) / fiveYearFixed.length : undefined,
      tracker: trackerProducts.length ? trackerProducts.reduce((sum, p) => sum + p.rate, 0) / trackerProducts.length : undefined,
      variable: variableProducts.length ? variableProducts.reduce((sum, p) => sum + p.rate, 0) / variableProducts.length : undefined
    };

    // Find best rates
    const bestRates = {
      twoYearFixed: twoYearFixed.sort((a, b) => a.rate - b.rate)[0],
      fiveYearFixed: fiveYearFixed.sort((a, b) => a.rate - b.rate)[0],
      tracker: trackerProducts.sort((a, b) => a.rate - b.rate)[0],
      variable: variableProducts.sort((a, b) => a.rate - b.rate)[0]
    };

    return {
      products,
      searchQuery,
      averageRates,
      bestRates,
      timestamp: now
    };
  }

  /**
   * Calculate LTV from mortgage data
   */
  private calculateLTV(mortgageData: Partial<MortgageData>): number | null {
    if (!mortgageData.currentBalance || !mortgageData.propertyValue) {
      return null;
    }
    return (mortgageData.currentBalance / mortgageData.propertyValue) * 100;
  }

  /**
   * Return empty market data when Vectorize is unavailable
   */
  private getEmptyMarketData(): MarketData {
    return {
      products: [],
      searchQuery: '',
      averageRates: {},
      bestRates: {},
      timestamp: new Date()
    };
  }

  /**
   * Format market data for prompt injection
   */
  formatMarketDataForPrompt(marketData: MarketData): string {
    if (marketData.products.length === 0) {
      return 'No market data available - Vectorize service not configured or no products found.';
    }

    const parts = [];

    // Search summary
    parts.push(`Search Query Used: "${marketData.searchQuery}"`);
    parts.push(`Found: ${marketData.products.length} relevant products`);
    parts.push('');

    // Market averages
    parts.push('**Market Averages:**');
    if (marketData.averageRates.twoYearFixed) {
      parts.push(`- 2-year fixed: ${marketData.averageRates.twoYearFixed.toFixed(2)}%`);
    }
    if (marketData.averageRates.fiveYearFixed) {
      parts.push(`- 5-year fixed: ${marketData.averageRates.fiveYearFixed.toFixed(2)}%`);
    }
    if (marketData.averageRates.tracker) {
      parts.push(`- Tracker: ${marketData.averageRates.tracker.toFixed(2)}%`);
    }
    if (marketData.averageRates.variable) {
      parts.push(`- Variable: ${marketData.averageRates.variable.toFixed(2)}%`);
    }
    parts.push('');

    // Top products
    parts.push('**Top 5 Most Relevant Products (Reranked by AI):**');
    marketData.products.forEach((product, index) => {
      const monthlyCost = this.estimateMonthlyPayment(product.rate, 25); // Assume 25 year term for comparison
      parts.push(`${index + 1}. ${product.provider_name} - ${product.product_name}`);
      parts.push(`   Rate: ${product.rate}% ${product.rate_type}`);
      parts.push(`   LTV: ${product.ltv_min}-${product.ltv_max}%`);
      parts.push(`   Fee: £${product.product_fee}`);
      parts.push(`   Est. monthly per £100k: £${monthlyCost.toFixed(0)}`);
      parts.push(`   Relevance: ${(product._score || 0).toFixed(3)}`);
      parts.push('');
    });

    return parts.join('\n');
  }

  /**
   * Estimate monthly payment per £100k loan for comparison
   */
  private estimateMonthlyPayment(rate: number, termYears: number): number {
    const monthlyRate = rate / 100 / 12;
    const totalMonths = termYears * 12;
    const loanAmount = 100000;

    if (rate === 0) return loanAmount / totalMonths;

    return (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
           (Math.pow(1 + monthlyRate, totalMonths) - 1);
  }
}

// Factory function
export function createMortgageMarketService(): MortgageMarketService {
  return new MortgageMarketService();
}