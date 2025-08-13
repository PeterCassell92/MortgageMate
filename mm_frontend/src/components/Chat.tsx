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
import { ChatService, ChatResponse } from '../services/chatService';

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
  chatId?: string;
}

const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [attachedDocuments, setAttachedDocuments] = useState<UploadedDocument[]>([]);
  const [currentAdvisorMode, setCurrentAdvisorMode] = useState<'data_gathering' | 'analysis' | 'followup'>('data_gathering');
  const [completenessScore, setCompletenessScore] = useState(0);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatService = ChatService.getInstance();

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat with welcome message on component mount
  useEffect(() => {
    const initializeChat = async () => {
      if (isInitialized) return;
      
      setIsLoading(true);
      try {
        // TODO: Pass actual user ID from auth context
        const response = await chatService.initializeChat();
        
        if (response.data?.isWelcomeMessage) {
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: response.data.message,
            timestamp: new Date(),
            isWelcomeMessage: true,
            advisorMode: response.data.advisorMode,
            completenessScore: response.data.completenessScore
          };
          
          setMessages([welcomeMessage]);
          setCurrentAdvisorMode(response.data.advisorMode || 'data_gathering');
          setCompletenessScore(response.data.completenessScore || 0);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        // Add error message
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Welcome to MortgageMate! I\'m here to help you analyze your mortgage options. Let\'s start by gathering some basic information about your current mortgage.',
          timestamp: new Date(),
          isWelcomeMessage: true
        };
        setMessages([errorMessage]);
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [isInitialized]);

  // Categorize document based on filename and type
  const categorizeDocument = (filename: string, mimeType: string): UploadedDocument['category'] => {
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
      category: categorizeDocument(file.name, file.type),
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
    if ((!inputValue.trim() && attachedDocuments.length === 0) || isLoading || !isInitialized) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim() || 'Uploaded documents for analysis',
      timestamp: new Date(),
      documents: attachedDocuments.length > 0 ? [...attachedDocuments] : undefined
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const messageText = inputValue.trim();
    setInputValue('');
    setAttachedDocuments([]); // Clear attached documents
    setIsLoading(true);

    try {
      // Detect if user is requesting analysis
      const hasRequestedAnalysis = /\b(analy[sz]e|analy[sz]is|recommend|advice|what should i do|help me decide|best option|compare|should i switch|proceed|yes.*analy)/i.test(messageText);
      
      // Extract actual File objects from attached documents
      const documentFiles = attachedDocuments.map(doc => doc.file);
      
      const response = await chatService.sendMessage(messageText, undefined, hasRequestedAnalysis, documentFiles.length > 0 ? documentFiles : undefined);

      if (response.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          advisorMode: response.data.advisorMode,
          completenessScore: response.data.completenessScore,
          missingFields: response.data.missingFields
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Update state with latest advisor information
        if (response.data.advisorMode) {
          setCurrentAdvisorMode(response.data.advisorMode);
        }
        if (response.data.completenessScore !== undefined) {
          setCompletenessScore(response.data.completenessScore);
        }
        if (response.data.missingFields) {
          setMissingFields(response.data.missingFields);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I\'m experiencing some technical difficulties. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
              {isLoading && (
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
              disabled={isLoading}
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
                disabled={isLoading}
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
              disabled={(!inputValue.trim() && attachedDocuments.length === 0) || isLoading}
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