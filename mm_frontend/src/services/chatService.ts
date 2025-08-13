const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    chatId?: string;
    message: string;
    isWelcomeMessage?: boolean;
    advisorMode?: 'data_gathering' | 'analysis' | 'followup';
    completenessScore?: number;
    extractedData?: any;
    missingFields?: string[];
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    provider: string;
    model: string;
    analysis?: string;
  };
  error?: string;
}

export interface ChatConfig {
  success: boolean;
  data?: {
    provider: string;
    mockMode: boolean;
    hasAnthropicKey: boolean;
    hasOpenAIKey: boolean;
  };
}

export class ChatService {
  private static instance: ChatService;
  private chatId: string | null = null;

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  async initializeChat(userId?: string): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId // TODO: Get from auth context instead
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Store chat ID for future requests
      if (data.data?.chatId) {
        this.chatId = data.data.chatId;
      }

      return data;
      
    } catch (error) {
      console.error('Chat initialization error:', error);
      throw new Error(`Failed to initialize chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendMessage(userMessage: string, chatId?: string, hasRequestedAnalysis?: boolean, documents?: File[]): Promise<ChatResponse> {
    try {
      const formData = new FormData();
      
      // Add text data
      formData.append('chatId', this.chatId || chatId || '');
      if (userMessage) {
        formData.append('userMessage', userMessage);
      }
      if (hasRequestedAnalysis) {
        formData.append('hasRequestedAnalysis', 'true');
      }
      
      // Add documents if any
      if (documents && documents.length > 0) {
        documents.forEach(doc => {
          formData.append('documents', doc);
        });
      }

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        body: formData, // No Content-Type header - let browser set it for FormData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Store chat ID for future requests  
      if (data.data?.chatId) {
        this.chatId = data.data.chatId;
      }

      return data;
      
    } catch (error) {
      console.error('Chat service error:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendMortgageAnalysis(mortgageData: any, userQuestion: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/mortgage-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mortgageData,
          userQuestion
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      return data.data?.message || data.data?.analysis || 'I apologize, but I didn\'t receive a proper analysis.';
      
    } catch (error) {
      console.error('Mortgage analysis service error:', error);
      throw new Error(`Failed to analyze mortgage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConfig(): Promise<ChatConfig> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/config`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Chat config service error:', error);
      return {
        success: false,
        data: {
          provider: 'unknown',
          mockMode: true,
          hasAnthropicKey: false,
          hasOpenAIKey: false
        }
      };
    }
  }
}