import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  Chip,
  LinearProgress
} from '@mui/material';
import { Send as SendIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  loadExistingChat, 
  createNewChat, 
  sendMessage, 
  addUserMessage, 
  loadChatList 
} from '../store/slices/chatSlice';
import { useError } from '../contexts/ErrorContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documents?: UploadedDocument[];
  advisorMode?: 'data_gathering' | 'analysis' | 'followup';
  completenessScore?: number;
  missingFields?: string[];
  isWelcomeMessage?: boolean;
}

interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  category?: 'mortgage_statement' | 'bank_statement' | 'pay_slip' | 'tax_document' | 'property_document' | 'other';
  url?: string;
  file: File; // Store the actual File object
}

interface ChatProps {
  numericalId?: number;
}

const Chat: React.FC<ChatProps> = ({ numericalId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { 
    messages, 
    messagesLoading,
    currentNumericalId, 
    currentAdvisorMode, 
    completenessScore, 
    missingFields, 
    isInitialized 
  } = useAppSelector(state => state.chat);
  
  const [inputValue, setInputValue] = useState('');
  const [attachedDocuments, setAttachedDocuments] = useState<UploadedDocument[]>([]);
  const { handleNetworkError } = useError();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat when numericalId changes or when first loading
  useEffect(() => {
    if (numericalId && numericalId !== currentNumericalId) {
      // Load existing chat using Redux action
      dispatch(loadExistingChat(numericalId));
    } else if (!numericalId && !isInitialized && !currentNumericalId) {
      // Create new chat if no specific ID and not initialized
      dispatch(createNewChat('New Chat')).then((result) => {
        if (result.meta.requestStatus === 'fulfilled' && result.payload?.numericalId) {
          // Navigate to the new chat URL
          navigate(`/dashboard/chat/${result.payload.numericalId}`, { replace: true });
        }
      });
    }
  }, [numericalId, currentNumericalId, isInitialized, dispatch, navigate]);

  // Categorize document based on filename and type
  const categorizeDocument = (filename: string): UploadedDocument['category'] => {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.includes('mortgage') || lowerName.includes('loan')) {
      return 'mortgage_statement';
    } else if (lowerName.includes('bank') || lowerName.includes('statement')) {
      return 'bank_statement';
    } else if (lowerName.includes('pay') || lowerName.includes('salary') || lowerName.includes('wage')) {
      return 'pay_slip';
    } else if (lowerName.includes('tax') || lowerName.includes('p60') || lowerName.includes('p45')) {
      return 'tax_document';
    } else if (lowerName.includes('property') || lowerName.includes('deed') || lowerName.includes('valuation')) {
      return 'property_document';
    } else {
      return 'other';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newDocuments: UploadedDocument[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      category: categorizeDocument(file.name),
      file: file // Store the actual File object
    }));

    setAttachedDocuments(prev => [...prev, ...newDocuments]);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDocumentUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeDocument = (docId: string) => {
    setAttachedDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachedDocuments.length === 0) || messagesLoading || !isInitialized) return;

    const messageText = inputValue.trim() || 'Uploaded documents for analysis';
    
    // Add user message to Redux store immediately
    dispatch(addUserMessage({ 
      content: messageText, 
      documents: attachedDocuments.map(doc => doc.file) 
    }));
    
    // Clear input and attachments
    setInputValue('');
    setAttachedDocuments([]);

    try {
      // Detect if user is requesting analysis
      const hasRequestedAnalysis = /\b(analy[sz]e|analy[sz]is|recommend|advice|what should i do|help me decide|best option|compare|should i switch|proceed|yes.*analy)/i.test(messageText);
      
      // Extract actual File objects from attached documents
      const documentFiles = attachedDocuments.map(doc => doc.file);
      
      // Send message using Redux action
      await dispatch(sendMessage({
        userMessage: messageText,
        hasRequestedAnalysis,
        documents: documentFiles.length > 0 ? documentFiles : undefined
      })).unwrap();
      
      // Refresh chat list to update last activity
      dispatch(loadChatList());
      
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      
      // Check for connection errors
      if (error instanceof Error && error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box 
      sx={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fafafa'
      }}
    >
      {/* Chat Window */}
      <Paper
        elevation={1}
        sx={{
          flex: 1,
          margin: 2,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 3,
          border: '1px solid #e0e0e0',
          overflow: 'hidden',
          minHeight: 0 // Allows the paper to shrink properly
        }}
      >
        {/* Progress Header */}
        {isInitialized && (
          <Box
            sx={{
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              bgcolor: '#f8f9fa'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {currentAdvisorMode === 'data_gathering' && 'Gathering Information'}
                {currentAdvisorMode === 'analysis' && 'Analysis Mode'}
                {currentAdvisorMode === 'followup' && 'Follow-up Discussion'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {completenessScore}% Complete
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={completenessScore} 
              sx={{ height: 4, borderRadius: 2 }}
            />
            {missingFields.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Still needed: {missingFields.join(', ')}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Messages Container */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: 3,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0 // Ensures proper scrolling behavior
          }}
        >
          {messages.length === 0 ? (
            // Initial welcome message
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: 4
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#666',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  maxWidth: 600
                }}
              >
                Explain to us your mortgage situation as clearly as possible, and add any supporting documents that you can, then we'll be able to find you the best options
              </Typography>
            </Box>
          ) : (
            // Chat messages
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      maxWidth: '70%',
                      padding: 2,
                      borderRadius: 2,
                      bgcolor: message.role === 'user' ? '#1976d2' : '#f5f5f5',
                      color: message.role === 'user' ? 'white' : '#333',
                    }}
                  >
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Typography>
                    
                    {/* Display attached documents */}
                    {message.documents && message.documents.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {message.documents.map((doc) => (
                          <Paper
                            key={doc.id}
                            elevation={0}
                            sx={{
                              padding: 1,
                              mt: 0.5,
                              bgcolor: message.role === 'user' ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <AttachFileIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                            <Typography variant="caption" sx={{ flex: 1 }}>
                              {doc.name} ({(doc.size / 1024).toFixed(1)}KB)
                            </Typography>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontSize: '0.65rem',
                                opacity: 0.6,
                                textTransform: 'capitalize'
                              }}
                            >
                              {doc.category?.replace('_', ' ')}
                            </Typography>
                          </Paper>
                        ))}
                      </Box>
                    )}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        mt: 1,
                        opacity: 0.7,
                        fontSize: '0.75rem'
                      }}
                    >
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                  </Paper>
                </Box>
              ))}
              
              {/* Loading indicator */}
              {messagesLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      padding: 2,
                      borderRadius: 2,
                      bgcolor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      Analyzing your message...
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box 
          sx={{ 
            padding: 3, 
            borderTop: '1px solid #e0e0e0',
            bgcolor: '#fff'
          }}
        >
          {/* Document Preview Area */}
          {attachedDocuments.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block' }}>
                Attached Documents ({attachedDocuments.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {attachedDocuments.map((doc) => (
                  <Chip
                    key={doc.id}
                    icon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                    label={`${doc.name} (${doc.category?.replace('_', ' ')})`}
                    variant="outlined"
                    size="small"
                    onDelete={() => removeDocument(doc.id)}
                    sx={{ maxWidth: 200 }}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.csv,.xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <TextField
              multiline
              maxRows={4}
              fullWidth
              placeholder="Describe your mortgage situation..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={messagesLoading}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: '#fafafa',
                }
              }}
            />
            
            {/* Document Upload Button */}
            <Tooltip title="Attach documents (PDF, images, spreadsheets)">
              <IconButton
                onClick={handleDocumentUploadClick}
                disabled={messagesLoading}
                sx={{
                  bgcolor: '#f5f5f5',
                  color: '#666',
                  width: 48,
                  height: 48,
                  '&:hover': {
                    bgcolor: '#e0e0e0',
                    color: '#333',
                  },
                  '&:disabled': {
                    bgcolor: '#f0f0f0',
                    color: '#ccc'
                  }
                }}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>

            {/* Send Button */}
            <IconButton
              onClick={handleSendMessage}
              disabled={(!inputValue.trim() && attachedDocuments.length === 0) || messagesLoading}
              sx={{
                bgcolor: '#1976d2',
                color: 'white',
                width: 48,
                height: 48,
                '&:hover': {
                  bgcolor: '#1565c0',
                },
                '&:disabled': {
                  bgcolor: '#e0e0e0',
                  color: '#999'
                }
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Chat;