const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    message: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    provider: string;
    model: string;
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

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  async sendMessage(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          maxTokens: 1000,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      return data.data?.message || 'I apologize, but I didn\'t receive a proper response.';
      
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