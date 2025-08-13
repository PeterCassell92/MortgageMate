// Document parsing service types
export type DocumentParserProvider = 'claude' | 'openai' | 'google-document-ai' | 'aws-textract' | 'azure-form-recognizer' | 'mindee';

export type DocumentType = 'mortgage_statement' | 'mortgage_offer' | 'bank_statement' | 'property_valuation' | 'pay_slip' | 'tax_document' | 'other';

export interface DocumentParseRequest {
  documentType: DocumentType;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface DocumentParseResponse {
  success: boolean;
  extractedData: Record<string, any>;
  confidence?: number;
  provider: DocumentParserProvider;
  processingTime: number;
  error?: string;
}

export interface DocumentParserConfig {
  provider: DocumentParserProvider;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleCredentials?: any;
  awsCredentials?: any;
  azureCredentials?: any;
  mindeeApiKey?: string;
  fallbackProvider?: DocumentParserProvider;
  maxFileSize: number; // in bytes
  supportedMimeTypes: string[];
}

export interface DocumentParser {
  parseDocument(request: DocumentParseRequest): Promise<DocumentParseResponse>;
  isSupported(mimeType: string): boolean;
  getProviderName(): DocumentParserProvider;
}