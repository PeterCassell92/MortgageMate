import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatService, ChatSummary } from '../../services/chatService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documents?: File[];
  advisorMode?: 'data_gathering' | 'analysis' | 'followup';
  completenessScore?: number;
  missingFields?: string[];
  isWelcomeMessage?: boolean;
}

interface ChatState {
  // Chat list
  chats: ChatSummary[];
  chatsLoading: boolean;
  chatsError: string | null;
  
  // Current chat
  currentChatId: string | null;
  currentNumericalId: number | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  
  // Chat metadata
  currentAdvisorMode: 'data_gathering' | 'analysis' | 'followup';
  completenessScore: number;
  missingFields: string[];
  isInitialized: boolean;
  
  // UI state
  sidebarExpanded: boolean;
}

const initialState: ChatState = {
  chats: [],
  chatsLoading: false,
  chatsError: null,
  
  currentChatId: null,
  currentNumericalId: null,
  messages: [],
  messagesLoading: false,
  messagesError: null,
  
  currentAdvisorMode: 'data_gathering',
  completenessScore: 0,
  missingFields: [],
  isInitialized: false,
  
  sidebarExpanded: false,
};

// Async thunks
export const loadChatList = createAsyncThunk(
  'chat/loadChatList',
  async (_, { rejectWithValue }) => {
    try {
      const chatService = ChatService.getInstance();
      const response = await chatService.getChatList();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load chat list');
      }
      
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const createNewChat = createAsyncThunk(
  'chat/createNewChat',
  async (title: string = 'New Chat', { rejectWithValue }) => {
    try {
      const chatService = ChatService.getInstance();
      const response = await chatService.createNewChat(title);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create new chat');
      }
      
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const loadExistingChat = createAsyncThunk(
  'chat/loadExistingChat',
  async (numericalId: number, { rejectWithValue }) => {
    try {
      const chatService = ChatService.getInstance();
      const response = await chatService.loadChat(numericalId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load chat');
      }
      
      return { numericalId, data: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ 
    userMessage, 
    hasRequestedAnalysis = false, 
    documents = [] 
  }: { 
    userMessage: string; 
    hasRequestedAnalysis?: boolean; 
    documents?: File[] 
  }, { rejectWithValue }) => {
    try {
      const chatService = ChatService.getInstance();
      const response = await chatService.sendMessage(userMessage, undefined, hasRequestedAnalysis, documents);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
      
      return { userMessage, response: response.data };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

export const deleteChat = createAsyncThunk(
  'chat/deleteChat',
  async (numericalId: number, { rejectWithValue }) => {
    try {
      const chatService = ChatService.getInstance();
      const response = await chatService.deleteChat(numericalId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete chat');
      }
      
      return numericalId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return rejectWithValue(message);
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSidebarExpanded: (state, action: PayloadAction<boolean>) => {
      state.sidebarExpanded = action.payload;
    },
    clearCurrentChat: (state) => {
      state.currentChatId = null;
      state.currentNumericalId = null;
      state.messages = [];
      state.isInitialized = false;
      state.currentAdvisorMode = 'data_gathering';
      state.completenessScore = 0;
      state.missingFields = [];
    },
    addUserMessage: (state, action: PayloadAction<{ content: string; documents?: File[] }>) => {
      const message: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: action.payload.content,
        timestamp: new Date(),
        documents: action.payload.documents,
      };
      state.messages.push(message);
    },
    clearErrors: (state) => {
      state.chatsError = null;
      state.messagesError = null;
    },
  },
  extraReducers: (builder) => {
    // Load chat list
    builder
      .addCase(loadChatList.pending, (state) => {
        state.chatsLoading = true;
        state.chatsError = null;
      })
      .addCase(loadChatList.fulfilled, (state, action) => {
        state.chatsLoading = false;
        if (action.payload) {
          state.chats = action.payload.chats || [];
        }
      })
      .addCase(loadChatList.rejected, (state, action) => {
        state.chatsLoading = false;
        state.chatsError = action.payload as string;
      });

    // Create new chat
    builder
      .addCase(createNewChat.pending, (state) => {
        state.messagesLoading = true;
        state.messagesError = null;
      })
      .addCase(createNewChat.fulfilled, (state, action) => {
        state.messagesLoading = false;
        if (action.payload) {
          state.currentChatId = action.payload.chatId || null;
          state.currentNumericalId = action.payload.numericalId || null;
          state.currentAdvisorMode = action.payload.advisorMode || 'data_gathering';
          state.completenessScore = action.payload.completenessScore || 0;
          state.isInitialized = true;
          
          // Add welcome message if present
          if (action.payload.isWelcomeMessage && action.payload.message) {
            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              content: action.payload.message,
              timestamp: new Date(),
              isWelcomeMessage: true,
              advisorMode: action.payload.advisorMode,
              completenessScore: action.payload.completenessScore,
            };
            state.messages = [welcomeMessage];
          }
        }
      })
      .addCase(createNewChat.rejected, (state, action) => {
        state.messagesLoading = false;
        state.messagesError = action.payload as string;
      });

    // Load existing chat
    builder
      .addCase(loadExistingChat.pending, (state) => {
        state.messagesLoading = true;
        state.messagesError = null;
      })
      .addCase(loadExistingChat.fulfilled, (state, action) => {
        state.messagesLoading = false;
        if (action.payload.data) {
          const data = action.payload.data;
          state.currentChatId = data.chatId || null;
          state.currentNumericalId = action.payload.numericalId;
          state.currentAdvisorMode = data.advisorMode || 'data_gathering';
          state.completenessScore = data.completenessScore || 0;
          state.missingFields = data.missingFields || [];
          state.isInitialized = true;
          
          // Restore conversation history as messages
          const restoredMessages: ChatMessage[] = [];
          if (data.conversationHistory) {
            data.conversationHistory.forEach((historyItem, index) => {
              if (historyItem.startsWith('User: ')) {
                restoredMessages.push({
                  id: `restored-user-${index}`,
                  role: 'user',
                  content: historyItem.substring(6),
                  timestamp: new Date(),
                });
              } else if (historyItem.startsWith('AI: ')) {
                restoredMessages.push({
                  id: `restored-ai-${index}`,
                  role: 'assistant',
                  content: historyItem.substring(4),
                  timestamp: new Date(),
                  advisorMode: data.advisorMode,
                  completenessScore: data.completenessScore,
                });
              }
            });
          }
          state.messages = restoredMessages;
        }
      })
      .addCase(loadExistingChat.rejected, (state, action) => {
        state.messagesLoading = false;
        state.messagesError = action.payload as string;
      });

    // Send message
    builder
      .addCase(sendMessage.pending, (state) => {
        state.messagesLoading = true;
        state.messagesError = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.messagesLoading = false;
        if (action.payload.response) {
          const response = action.payload.response;
          
          // Add assistant message
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date(),
            advisorMode: response.advisorMode,
            completenessScore: response.completenessScore,
            missingFields: response.missingFields,
          };
          state.messages.push(assistantMessage);
          
          // Update chat metadata
          if (response.advisorMode) {
            state.currentAdvisorMode = response.advisorMode;
          }
          if (response.completenessScore !== undefined) {
            state.completenessScore = response.completenessScore;
          }
          if (response.missingFields) {
            state.missingFields = response.missingFields;
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.messagesLoading = false;
        state.messagesError = action.payload as string;
      });

    // Delete chat
    builder
      .addCase(deleteChat.fulfilled, (state, action) => {
        const deletedNumericalId = action.payload;
        state.chats = state.chats.filter(chat => chat.numericalId !== deletedNumericalId);
        
        // Clear current chat if it was deleted
        if (state.currentNumericalId === deletedNumericalId) {
          state.currentChatId = null;
          state.currentNumericalId = null;
          state.messages = [];
          state.isInitialized = false;
          state.currentAdvisorMode = 'data_gathering';
          state.completenessScore = 0;
          state.missingFields = [];
        }
      });
  },
});

export const { setSidebarExpanded, clearCurrentChat, addUserMessage, clearErrors } = chatSlice.actions;
export default chatSlice.reducer;