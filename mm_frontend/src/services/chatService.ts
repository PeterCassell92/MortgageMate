import apiClient, { uploadApi } from './apiClient';
import type { MortgageData } from '@mortgagemate/models';

export interface ChatResponse {
  success: boolean;
  data?: {
    chatId?: string;
    numericalId?: number;
    message: string;
    isWelcomeMessage?: boolean;
    advisorMode?: string;
    completenessScore?: number;
    extractedData?: Partial<MortgageData>;
    missingFields?: string[];
    documentResults?: any[];
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    provider?: string;
    model?: string;
  };
  error?: string;
}

export interface ChatListResponse {
  success: boolean;
  data?: {
    chats: ChatSummary[];
    latestChatId: number | null;
  };
  error?: string;
}

export interface ChatSummary {
  id: number;
  numericalId: number;
  title: string;
  lastViewed: string;
  updatedAt: string;
  createdAt: string;
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
  private numericalId: number | null = null;

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // Getter methods
  getCurrentChatId(): string | null {
    return this.chatId;
  }

  getCurrentNumericalId(): number | null {
    return this.numericalId;
  }

  // Clear current chat session
  clearCurrentSession(): void {
    this.chatId = null;
    this.numericalId = null;
  }

  // Set current chat session
  setCurrentSession(chatId: string, numericalId: number): void {
    this.chatId = chatId;
    this.numericalId = numericalId;
  }

  // Get user's chat list - LOOK HOW CLEAN THIS IS NOW!
  async getChatList(): Promise<ChatListResponse> {
    try {
      const { data } = await apiClient.get<ChatListResponse>('/api/chat/list');
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get chat list');
      }
      
      return data;
    } catch (error: unknown) {
      console.error('Failed to get chat list:', error);
      throw error;
    }
  }

  // Create new chat
  async createNewChat(title?: string): Promise<ChatResponse> {
    try {
      const { data } = await apiClient.post<ChatResponse>('/api/chat/create', {
        title: title || 'New Chat'
      });
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Store chat ID and numerical ID if present
      if (data.data?.chatId) {
        this.chatId = data.data.chatId;
      }
      if (data.data?.numericalId) {
        this.numericalId = data.data.numericalId;
      }

      return data;
    } catch (error: unknown) {
      console.error('Failed to create new chat:', error);
      throw error;
    }
  }

  // Load existing chat
  async loadChat(numericalId: number): Promise<ChatResponse> {
    try {
      const { data } = await apiClient.post<ChatResponse>(`/api/chat/${numericalId}/load`);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load chat');
      }

      // Update stored IDs
      if (data.data?.chatId) {
        this.chatId = data.data.chatId;
        this.numericalId = numericalId;
      }

      return data;
    } catch (error: unknown) {
      console.error('Failed to load chat:', error);
      throw error;
    }
  }

  // Delete chat
  async deleteChat(numericalId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const { data } = await apiClient.post(`/api/chat/${numericalId}/delete`);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete chat');
      }

      // Clear current session if deleted chat was active
      if (this.numericalId === numericalId) {
        this.clearCurrentSession();
      }

      return data;
    } catch (error: unknown) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  }

  // Send message to chat (with optional document uploads)
  async sendMessage(
    message: string, 
    documents?: File[],
    hasRequestedAnalysis: boolean = false
  ): Promise<ChatResponse> {
    try {
      if (!this.numericalId) {
        throw new Error('No active chat session. Please create or load a chat first.');
      }

      let response;
      
      if (documents && documents.length > 0) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('userMessage', message);
        formData.append('hasRequestedAnalysis', String(hasRequestedAnalysis));
        
        documents.forEach((doc, index) => {
          formData.append('documents', doc);
        });

        const { data } = await uploadApi.post<ChatResponse>(
          `/api/chat/${this.numericalId}`,
          formData
        );
        response = data;
      } else {
        // Regular JSON request
        const { data } = await apiClient.post<ChatResponse>(
          `/api/chat/${this.numericalId}`,
          {
            userMessage: message,
            hasRequestedAnalysis
          }
        );
        response = data;
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }

      return response;
    } catch (error: unknown) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Mortgage analysis endpoint
  async analyzeMortgage(mortgageData: Partial<MortgageData>, userQuestion: string): Promise<ChatResponse> {
    try {
      const { data } = await apiClient.post<ChatResponse>('/api/chat/mortgage-analysis', {
        mortgageData,
        userQuestion
      });

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      return data;
    } catch (error: unknown) {
      console.error('Mortgage analysis failed:', error);
      throw error;
    }
  }

  // Get chat configuration
  async getConfig(): Promise<ChatConfig> {
    try {
      const { data } = await apiClient.get<ChatConfig>('/api/chat/config');
      
      if (!data.success) {
        throw new Error('Failed to get configuration');
      }

      return data;
    } catch (error: unknown) {
      console.error('Failed to get config:', error);
      throw error;
    }
  }
}

export default ChatService;