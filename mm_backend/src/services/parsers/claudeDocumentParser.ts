import { Anthropic } from '@anthropic-ai/sdk';
import { DocumentParser, DocumentParseRequest, DocumentParseResponse, DocumentType } from '../../types/documentParser';

interface ClaudeParserConfig {
  apiKey: string;
  maxFileSize: number;
  supportedMimeTypes: string[];
}

export class ClaudeDocumentParser implements DocumentParser {
  private anthropic: Anthropic;
  private config: ClaudeParserConfig;

  constructor(config: ClaudeParserConfig) {
    this.config = config;
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async parseDocument(request: DocumentParseRequest): Promise<DocumentParseResponse> {
    const startTime = Date.now();

    try {
      const base64Data = request.fileBuffer.toString('base64');
      const prompt = this.generatePrompt(request.documentType);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for consistent extraction
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: request.mimeType as any,
                  data: base64Data
                }
              }
            ]
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from response
      const extractedData = this.parseClaudeResponse(content.text);

      return {
        success: true,
        extractedData,
        confidence: this.calculateConfidence(extractedData),
        provider: 'claude',
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Claude document parsing error:', error);
      throw error;
    }
  }

  private generatePrompt(documentType: DocumentType): string {
    const basePrompt = `You are a financial document parsing AI. Extract ALL relevant information from this document and return it as structured JSON data.

CRITICAL: You must return ONLY a JSON object with the extracted data, no other text or explanation.`;

    switch (documentType) {
      case 'mortgage_statement':
        return `${basePrompt}

For a mortgage statement, extract:
{
  "lender": "name of mortgage lender",
  "accountNumber": "mortgage account number",
  "currentBalance": "outstanding balance amount",
  "monthlyPayment": "monthly payment amount", 
  "interestRate": "current interest rate",
  "mortgageType": "fixed/variable/tracker",
  "termRemaining": "years or months remaining",
  "propertyValue": "current property value if shown",
  "productFee": "any product fees",
  "exitFees": "early repayment charges if shown",
  "nextPaymentDate": "next payment due date",
  "statementDate": "statement date",
  "originalLoanAmount": "original mortgage amount if shown",
  "startDate": "mortgage start date if shown"
}`;

      case 'mortgage_offer':
        return `${basePrompt}

For a mortgage offer, extract:
{
  "lender": "name of mortgage lender",
  "loanAmount": "loan amount offered",
  "propertyValue": "property valuation",
  "interestRate": "offered interest rate",
  "mortgageType": "fixed/variable/tracker",
  "term": "mortgage term in years",
  "monthlyPayment": "monthly payment amount",
  "productFee": "arrangement/product fees",
  "exitFees": "early repayment charges",
  "offerValidUntil": "offer expiry date",
  "propertyAddress": "property address",
  "applicantName": "borrower name(s)",
  "loanToValue": "LTV ratio",
  "conditions": "any special conditions"
}`;

      case 'bank_statement':
        return `${basePrompt}

For a bank statement, extract:
{
  "bankName": "name of bank",
  "accountNumber": "account number (masked for privacy)",
  "statementPeriod": "statement period dates",
  "openingBalance": "opening balance",
  "closingBalance": "closing balance",
  "salary": "salary/income payments identified",
  "mortgagePayments": "mortgage payment amounts and dates",
  "averageBalance": "average monthly balance",
  "largeDeposits": "any large deposits over £1000",
  "largeWithdrawals": "any large withdrawals over £1000"
}`;

      case 'property_valuation':
        return `${basePrompt}

For a property valuation, extract:
{
  "propertyAddress": "full property address",
  "valuationAmount": "property valuation",
  "valuationDate": "date of valuation",
  "valuationCompany": "valuation company name",
  "propertyType": "house/flat/bungalow etc",
  "bedrooms": "number of bedrooms",
  "propertyAge": "age or year built",
  "constructionType": "construction materials",
  "marketConditions": "local market comments",
  "comparableProperties": "comparable sales if mentioned"
}`;

      case 'pay_slip':
        return `${basePrompt}

For a payslip, extract:
{
  "employerName": "employer company name",
  "employeeName": "employee name",
  "payPeriod": "pay period dates",
  "grossPay": "gross pay amount",
  "netPay": "net/take home pay",
  "tax": "income tax deducted",
  "nationalInsurance": "NI contributions",
  "pension": "pension contributions",
  "otherDeductions": "other deductions",
  "yearToDateGross": "YTD gross pay",
  "yearToDateTax": "YTD tax paid",
  "payrollNumber": "payroll/employee number"
}`;

      default:
        return `${basePrompt}

Extract any relevant financial information from this document:
{
  "documentType": "identified document type",
  "keyFinancialFigures": "any important numbers",
  "relevantDates": "important dates",
  "names": "names of people/companies",
  "addresses": "any addresses",
  "additionalInfo": "other relevant information"
}`;
    }
  }

  private parseClaudeResponse(response: string): Record<string, any> {
    try {
      // Clean up the response - remove any markdown formatting
      let cleanResponse = response.trim();
      
      // Remove code block markers if present
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      
      // Parse JSON
      return JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse Claude response as JSON:', response);
      
      // Fallback: try to extract JSON from anywhere in the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Final fallback: return raw response wrapped
          return { rawResponse: response, parseError: true };
        }
      }
      
      return { rawResponse: response, parseError: true };
    }
  }

  private calculateConfidence(extractedData: Record<string, any>): number {
    // Simple confidence calculation based on how much data was extracted
    const totalFields = Object.keys(extractedData).length;
    const filledFields = Object.values(extractedData).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length;
    
    if (extractedData.parseError) return 0.3;
    if (totalFields === 0) return 0;
    
    return Math.min(0.95, (filledFields / totalFields) * 0.8 + 0.2);
  }

  isSupported(mimeType: string): boolean {
    return this.config.supportedMimeTypes.includes(mimeType);
  }

  getProviderName() {
    return 'claude' as const;
  }
}