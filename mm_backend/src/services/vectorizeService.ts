import { Configuration, PipelinesApi } from '@vectorize-io/vectorize-client';
import {
  VectorizeConfig,
  VectorizeSearchOptions,
  VectorSearchResult,
  VectorizeDocument,
  MortgageProduct
} from '../types/vectorize';

export class VectorizeService {
  private config: VectorizeConfig;
  private pipelinesApi: PipelinesApi;

  constructor(config: VectorizeConfig) {
    this.config = config;

    // Initialize the official Vectorize client
    const configuration = new Configuration({
      basePath: config.url || 'https://api.vectorize.io',
      accessToken: config.apiKey
    });

    this.pipelinesApi = new PipelinesApi(configuration);
  }

  /**
   * Search for relevant mortgage products using semantic search
   */
  async searchRelevantProducts(options: VectorizeSearchOptions): Promise<VectorSearchResult> {
    try {
      const startTime = Date.now();

      console.log('Vectorize search request:', {
        organizationId: this.config.organizationId,
        pipelineId: this.config.pipelineId,
        question: options.query,
        numResults: options.rerank?.top_n || 10
      });

      // Use the official retrieveDocuments API
      const response = await this.pipelinesApi.retrieveDocuments({
        organizationId: this.config.organizationId,
        pipelineId: this.config.pipelineId,
        retrieveDocumentsRequest: {
          question: options.query,
          numResults: options.rerank?.top_n || 10,
          // Include filters if provided (format may need adjustment based on Vectorize API)
          ...(options.filters && { filters: options.filters })
        }
      });

      const processingTime = Date.now() - startTime;

      // Transform the response to our format
      const documents: VectorizeDocument[] = response.documents?.map((doc: any) => ({
        id: doc.id || '',
        content: doc.content || doc.data,
        metadata: doc.metadata,
        score: doc.score || doc.relevanceScore
      })) || [];

      console.log(`Vectorize returned ${documents.length} documents`);

      return {
        success: true,
        documents,
        searchQuery: options.query,
        totalFound: documents.length,
        processingTime
      };
    } catch (error) {
      console.error('Vectorize search error:', error);
      return {
        success: false,
        documents: [],
        searchQuery: options.query,
        totalFound: 0
      };
    }
  }

  /**
   * Upload mortgage products to Vectorize for indexing
   */
  async uploadDocuments(products: MortgageProduct[]): Promise<{ success: boolean; message: string }> {
    try {
      const documents = products.map(product => ({
        id: `${product.provider_name.toLowerCase().replace(/\s+/g, '-')}-${product.product_name.toLowerCase().replace(/\s+/g, '-')}`,
        content: this.createSearchableContent(product),
        metadata: product
      }));

      // Use direct API call for document upload
      const response = await fetch(`${this.config.url}/v1/organizations/${this.config.organizationId}/pipelines/${this.config.pipelineId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documents })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return {
        success: true,
        message: `Successfully uploaded ${products.length} mortgage products`
      };
    } catch (error) {
      console.error('Vectorize upload error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Create searchable content from a mortgage product
   * This text will be embedded and used for semantic search
   */
  private createSearchableContent(product: MortgageProduct): string {
    const parts = [
      `${product.provider_name} ${product.product_name}`,
      `${product.rate}% ${product.rate_type} rate mortgage`,
      `LTV ${product.ltv_min}% to ${product.ltv_max}%`,
      product.description,
      product.terms
    ];

    // Add special features
    if (product.product_fee === 0) {
      parts.push('no product fee zero fees');
    } else {
      parts.push(`£${product.product_fee} product fee`);
    }

    if (product.exit_fees.toLowerCase().includes('no early')) {
      parts.push('no early repayment charges flexible');
    }

    if (product.cashback) {
      parts.push(`£${product.cashback} cashback incentive`);
    }

    if (product.scheme) {
      parts.push(`${product.scheme} scheme`);
    }

    if (product.property_type) {
      parts.push(`${product.property_type} properties`);
    }

    if (product.professional_mortgage) {
      parts.push('professional mortgage enhanced terms doctors lawyers');
    }

    if (product.offset) {
      parts.push('offset mortgage savings reduce interest');
    }

    if (product.ethical) {
      parts.push('ethical sustainable green mortgage');
    }

    if (product.digital_only) {
      parts.push('digital online application quick decision');
    }

    // Add loan range
    parts.push(`loans from £${product.min_loan.toLocaleString()} to £${product.max_loan.toLocaleString()}`);

    // Add initial period if fixed
    if (product.initial_period_months) {
      const years = product.initial_period_months / 12;
      parts.push(`${years} year fixed period`);
    }

    return parts.join(' ');
  }

  /**
   * Delete all documents from Vectorize (useful for re-indexing)
   */
  async deleteAllDocuments(): Promise<{ success: boolean; message: string }> {
    try {
      // Use direct API call for document deletion
      const response = await fetch(`${this.config.url}/v1/organizations/${this.config.organizationId}/pipelines/${this.config.pipelineId}/documents`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return {
        success: true,
        message: 'All documents deleted successfully'
      };
    } catch (error) {
      console.error('Vectorize delete error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }
}

// Factory function to create Vectorize service from environment
export function createVectorizeService(): VectorizeService | null {
  const url = process.env.VECTORIZE_URL;
  const organizationId = process.env.VECTORIZE_ORGANIZATION_ID;
  const apiKey = process.env.VECTORIZE_API_KEY;
  const pipelineId = process.env.VECTORIZE_PIPELINE_ID;

  if (!url || !organizationId || !apiKey || !pipelineId) {
    console.log('Vectorize not configured - missing required environment variables:');
    if (!url) console.log('  - VECTORIZE_URL');
    if (!organizationId) console.log('  - VECTORIZE_ORGANIZATION_ID');
    if (!apiKey) console.log('  - VECTORIZE_API_KEY');
    if (!pipelineId) console.log('  - VECTORIZE_PIPELINE_ID');
    return null;
  }

  return new VectorizeService({
    url,
    organizationId,
    apiKey,
    pipelineId
  });
}