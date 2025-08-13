import { DocumentParser, DocumentParseRequest, DocumentParseResponse, DocumentParserConfig, DocumentParserProvider } from '../types/documentParser';
import { ClaudeDocumentParser } from './parsers/claudeDocumentParser';
// Future imports:
// import { OpenAIDocumentParser } from './parsers/openaiDocumentParser';
// import { GoogleDocumentParser } from './parsers/googleDocumentParser';
// import { AWSTextractParser } from './parsers/awsTextractParser';
// import { AzureDocumentParser } from './parsers/azureDocumentParser';
// import { MindeeDocumentParser } from './parsers/mindeeDocumentParser';

export class DocumentParsingService {
  private parser: DocumentParser;
  private fallbackParser?: DocumentParser;
  private config: DocumentParserConfig;

  constructor(config: DocumentParserConfig) {
    this.config = config;
    this.parser = this.createParser(config.provider);
    
    if (config.fallbackProvider) {
      this.fallbackParser = this.createParser(config.fallbackProvider);
    }
  }

  private createParser(provider: DocumentParserProvider): DocumentParser {
    switch (provider) {
      case 'claude':
        return new ClaudeDocumentParser({
          apiKey: this.config.anthropicApiKey!,
          maxFileSize: this.config.maxFileSize,
          supportedMimeTypes: this.config.supportedMimeTypes
        });
      
      // Future implementations:
      // case 'openai':
      //   return new OpenAIDocumentParser(this.config.openaiApiKey!);
      // case 'google-document-ai':
      //   return new GoogleDocumentParser(this.config.googleCredentials);
      // case 'aws-textract':
      //   return new AWSTextractParser(this.config.awsCredentials);
      // case 'azure-form-recognizer':
      //   return new AzureDocumentParser(this.config.azureCredentials);
      // case 'mindee':
      //   return new MindeeDocumentParser(this.config.mindeeApiKey!);
      
      default:
        throw new Error(`Unsupported document parser provider: ${provider}`);
    }
  }

  async parseDocument(request: DocumentParseRequest): Promise<DocumentParseResponse> {
    const startTime = Date.now();

    try {
      // Validate file size
      if (request.fileBuffer.length > this.config.maxFileSize) {
        throw new Error(`File size ${request.fileBuffer.length} exceeds maximum ${this.config.maxFileSize} bytes`);
      }

      // Validate MIME type
      if (!this.parser.isSupported(request.mimeType)) {
        throw new Error(`Unsupported file type: ${request.mimeType}`);
      }

      // Attempt parsing with primary parser
      const result = await this.parser.parseDocument(request);
      result.processingTime = Date.now() - startTime;
      
      return result;

    } catch (error) {
      console.error(`Document parsing failed with ${this.parser.getProviderName()}:`, error);

      // Try fallback parser if available
      if (this.fallbackParser && this.fallbackParser.isSupported(request.mimeType)) {
        try {
          console.log(`Attempting fallback parsing with ${this.fallbackParser.getProviderName()}`);
          const fallbackResult = await this.fallbackParser.parseDocument(request);
          fallbackResult.processingTime = Date.now() - startTime;
          return fallbackResult;
        } catch (fallbackError) {
          console.error(`Fallback parsing also failed:`, fallbackError);
        }
      }

      // Return error response
      return {
        success: false,
        extractedData: {},
        provider: this.parser.getProviderName(),
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      };
    }
  }

  getProviderInfo() {
    return {
      primary: this.parser.getProviderName(),
      fallback: this.fallbackParser?.getProviderName(),
      maxFileSize: this.config.maxFileSize,
      supportedTypes: this.config.supportedMimeTypes
    };
  }
}

// Factory function to create configured document parsing service
export function createDocumentParsingService(): DocumentParsingService {
  const config: DocumentParserConfig = {
    provider: (process.env.DOCUMENT_PARSER_PROVIDER as DocumentParserProvider) || 'claude',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    mindeeApiKey: process.env.MINDEE_API_KEY,
    fallbackProvider: process.env.DOCUMENT_PARSER_FALLBACK as DocumentParserProvider,
    maxFileSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760'), // 10MB default
    supportedMimeTypes: [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf',
      'image/heic',
      'image/heif'
    ]
  };

  return new DocumentParsingService(config);
}