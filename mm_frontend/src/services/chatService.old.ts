const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    chatId?: string;
    numericalId?: number;
    message: string;
    isWelcomeMessage?: boolean;
    advisorMode?: 'data_gathering' | 'analysis' | 'followup';
    completenessScore?: number;
    extractedData?: any;
    missingFields?: string[];
    mortgageData?: any;
    conversationHistory?: string[];
    lastAnalysis?: string;
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

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Check if token is expired by attempting to decode it
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch (error) {
      return true; // If can't decode, consider expired
    }
  }

  // Enhanced method to handle token validation
  private async validateTokenAndMakeRequest(url: string, options: RequestInit): Promise<Response> {
    const token = localStorage.getItem('auth_token');
    
    if (!token || this.isTokenExpired(token)) {
      // Token is missing or expired, redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    const response = await fetch(url, options);
    
    if (response.status === 401) {
      // Token might be invalid, clear auth and redirect
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      throw new Error('Session expired, please log in again');
    }

    return response;
  }

  private getAuthHeadersForFormData(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
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

  // Get user's chat list
  async getChatList(): Promise<ChatListResponse> {
    try {
      const response = await this.validateTokenAndMakeRequest(`${API_BASE_URL}/api/chat/list`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Failed to get chat list:', error);
      
      if (error instanceof Error && error.message.includes('Connection failed')) {
        throw new Error('Connection failed - please check your internet connection');
      }
      
      throw new Error(`Failed to get chat list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create new chat
  async createNewChat(title?: string): Promise<ChatResponse> {
    try {
      const response = await this.validateTokenAndMakeRequest(`${API_BASE_URL}/api/chat/create`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ title: title || 'New Chat' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      return data;
      
    } catch (error) {
      console.error('Failed to create new chat:', error);
      
      if (error instanceof Error && error.message.includes('Connection failed')) {
        throw new Error('Connection failed - please check your internet connection');
      }
      
      throw new Error(`Failed to create new chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Load existing chat by numerical ID
  async loadChat(numericalId: number): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${numericalId}/load`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Store loaded chat details
      if (data.data?.chatId) {
        this.chatId = data.data.chatId;
        this.numericalId = numericalId;
      }

      return data;
      
    } catch (error) {
      console.error('Failed to load chat:', error);
      
      if (error instanceof Error && error.message.includes('Connection failed')) {
        throw new Error('Connection failed - please check your internet connection');
      }
      
      throw new Error(`Failed to load chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Initialize a new chat (now just calls createNewChat)
  async initializeChat(): Promise<ChatResponse> {
    return this.createNewChat('New Chat');
  }

  // Delete chat (soft delete)
  async deleteChat(numericalId: number): Promise<ChatResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${numericalId}/delete`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Clear current session if we're deleting the active chat
      if (this.numericalId === numericalId) {
        this.clearCurrentSession();
      }

      return data;
      
    } catch (error) {
      console.error('Failed to delete chat:', error);
      
      if (error instanceof Error && error.message.includes('Connection failed')) {
        throw new Error('Connection failed - please check your internet connection');
      }
      
      throw new Error(`Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendMessage(userMessage: string, chatId?: string, hasRequestedAnalysis?: boolean, documents?: File[]): Promise<ChatResponse> {
    try {
      // Use numerical ID for the URL
      if (!this.numericalId) {
        throw new Error('No active chat session. Please load or create a chat first.');
      }

      const formData = new FormData();
      
      // Add text data (no need for chatId in body since it's in URL)
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

      const response = await fetch(`${API_BASE_URL}/api/chat/${this.numericalId}`, {
        method: 'POST',
        headers: this.getAuthHeadersForFormData(),
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
      
      // Check for network connectivity issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Connection failed - please check your internet connection');
      }
      
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendMortgageAnalysis(mortgageData: any, userQuestion: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/mortgage-analysis`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
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
      
      // Check for network connectivity issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Connection failed - please check your internet connection');
      }
      
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