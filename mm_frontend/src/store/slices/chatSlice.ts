import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatService, ChatSummary } from '../../services/chatService';
import { setLoading } from './applicationSlice';
import { UploadedDocument } from '../../types/document';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string instead of Date object for Redux serialization
  documents?: UploadedDocument[];
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
  messagesLoading: boolean; // Only true when loading messages from database
  messagesError: string | null;

  // LLM state
  llmThinking: boolean; // True when waiting for LLM response
  llmError: string | null;
  llmErrorType: string | null;

  // Error handling
  chatCreationError: string | null;

  // Chat metadata
  currentAdvisorMode: 'data_gathering' | 'analysis' | 'followup';
  completenessScore: number;
  missingFields: string[];
  isInitialized: boolean;
  offerAnalysis: boolean; // True when all required data collected and ready to offer analysis
  userHasRequestedAnalysis: boolean; // True when LLM detects user has explicitly requested analysis

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

  llmThinking: false,
  llmError: null,
  llmErrorType: null,
  chatCreationError: null,

  currentAdvisorMode: 'data_gathering',
  completenessScore: 0,
  missingFields: [],
  isInitialized: false,
  offerAnalysis: false,
  userHasRequestedAnalysis: false,

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
  async (title: string = 'New Chat', { rejectWithValue, dispatch }) => {
    try {
      // Set application loading state
      dispatch(setLoading(true));

      const chatService = ChatService.getInstance();
      const response = await chatService.createNewChat(title);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create new chat');
      }

      // Clear loading state on success
      dispatch(setLoading(false));
      return response.data;
    } catch (error: unknown) {
      // Clear loading state on error
      dispatch(setLoading(false));
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
      const response = await chatService.sendMessage(userMessage, documents, hasRequestedAnalysis);
      
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
      // Convert File[] to UploadedDocument[] for storage
      const uploadedDocs: UploadedDocument[] | undefined = action.payload.documents?.map(file => ({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        size: file.size,
        category: undefined, // Will be set by backend response
      }));

      const message: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: action.payload.content,
        timestamp: new Date().toISOString(),
        documents: uploadedDocs,
      };
      state.messages.push(message);
    },
    clearErrors: (state) => {
      state.chatsError = null;
      state.messagesError = null;
      state.llmError = null;
      state.llmErrorType = null;
      state.chatCreationError = null;
    },
    clearLlmError: (state) => {
      state.llmError = null;
      state.llmErrorType = null;
    },
    clearChatCreationError: (state) => {
      state.chatCreationError = null;
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
        state.chatCreationError = null;
      })
      .addCase(createNewChat.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.chatCreationError = null;

        if (action.payload) {
          state.currentChatId = action.payload.chatId || null;
          state.currentNumericalId = action.payload.numericalId || null;
          state.currentAdvisorMode = action.payload.advisorMode || 'data_gathering';
          state.completenessScore = action.payload.completenessScore || 0;
          state.offerAnalysis = action.payload.offerAnalysis || false;
          state.userHasRequestedAnalysis = action.payload.userHasRequestedAnalysis || false;
          state.isInitialized = true;

          // Add welcome message if present
          if (action.payload.isWelcomeMessage && action.payload.message) {
            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              content: action.payload.message,
              timestamp: new Date().toISOString(),
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
        state.isInitialized = false;

        // Extract a user-friendly error message
        const errorMessage = action.payload as string;

        // Simplify technical errors for users
        if (errorMessage.includes('LangChain error') || errorMessage.includes('template')) {
          state.chatCreationError = 'Unable to start new chat. Please try again or contact support if the problem persists.';
        } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
          state.chatCreationError = 'Server error occurred. Please try again in a moment.';
        } else {
          state.chatCreationError = 'Failed to create new chat. Please try again.';
        }
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
          state.offerAnalysis = data.offerAnalysis || false;
          state.userHasRequestedAnalysis = data.userHasRequestedAnalysis || false;
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
                  timestamp: new Date().toISOString(),
                });
              } else if (historyItem.startsWith('AI: ')) {
                restoredMessages.push({
                  id: `restored-ai-${index}`,
                  role: 'assistant',
                  content: historyItem.substring(4),
                  timestamp: new Date().toISOString(),
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
        state.llmThinking = true;
        state.messagesError = null;
        state.llmError = null;
        state.llmErrorType = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.llmThinking = false;
        state.llmError = null;
        state.llmErrorType = null;

        if (action.payload.response) {
          const response = action.payload.response;

          // Add assistant message
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.message,
            timestamp: new Date().toISOString(),
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
          if (response.offerAnalysis !== undefined) {
            state.offerAnalysis = response.offerAnalysis;
          }
          if (response.userHasRequestedAnalysis !== undefined) {
            state.userHasRequestedAnalysis = response.userHasRequestedAnalysis;
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.llmThinking = false;

        // Try to parse the error to detect LLM_ERROR type
        const errorMessage = action.payload as string;

        // Check if this is an LLM error - the backend returns a specific message
        if (errorMessage.includes('Error occurred when requesting response from LLM service') ||
            errorMessage.includes('LLM_ERROR')) {
          state.llmError = 'Error occurred when requesting response from LLM service';
          state.llmErrorType = 'LLM_ERROR';
        } else {
          state.messagesError = errorMessage;
        }
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

export const { setSidebarExpanded, clearCurrentChat, addUserMessage, clearErrors, clearLlmError, clearChatCreationError } = chatSlice.actions;
export default chatSlice.reducer;