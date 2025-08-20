import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import AppHeader from '../components/AppHeader';
import Chat from '../components/Chat';
import ChatSidebar from '../components/ChatSidebar';
import { ChatService } from '../services/chatService';
import { useError } from '../contexts/ErrorContext';

const ChatPage: React.FC = () => {
  const { numericalId } = useParams<{ numericalId: string }>();
  const navigate = useNavigate();
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { handleNetworkError } = useError();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const chatService = ChatService.getInstance();

  // Set current chat ID from URL parameter
  useEffect(() => {
    if (numericalId) {
      const chatId = parseInt(numericalId, 10);
      if (!isNaN(chatId)) {
        setCurrentChatId(chatId);
      } else {
        // Invalid numerical ID, redirect to dashboard
        navigate('/dashboard', { replace: true });
      }
    } else {
      // No numerical ID, load latest chat
      loadLatestChat();
    }
  }, [numericalId, navigate]);

  const loadLatestChat = async () => {
    try {
      const response = await chatService.getChatList();
      if (response.success && response.data?.latestChatId) {
        navigate(`/chat/${response.data.latestChatId}`, { replace: true });
      } else {
        // No chats exist, stay on dashboard
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Failed to load latest chat:', error);
      if (error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
    }
  };

  const handleChatSelect = (chatNumericalId: number) => {
    navigate(`/chat/${chatNumericalId}`);
  };

  const handleNewChat = async () => {
    try {
      const response = await chatService.createNewChat();
      if (response.success && response.data?.numericalId) {
        navigate(`/chat/${response.data.numericalId}`);
      }
    } catch (error: any) {
      console.error('Failed to create new chat:', error);
      if (error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
    }
  };

  const handleChatLoad = (chatNumericalId: number) => {
    // Update URL if it doesn't match the loaded chat
    if (numericalId !== chatNumericalId.toString()) {
      navigate(`/chat/${chatNumericalId}`, { replace: true });
    }
  };

  const handleMobileDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      overflow: 'hidden'
    }}>
      <AppHeader />
      
      {/* Main content area */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        minHeight: 0
      }}>
        {/* Mobile menu button */}
        {isMobile && (
          <Box sx={{ 
            position: 'fixed', 
            top: 70, // Below header
            left: 16, 
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: 'background.paper',
            borderRadius: 1,
            boxShadow: 1
          }}>
            <IconButton onClick={handleMobileDrawerToggle}>
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Sidebar */}
        <ChatSidebar
          currentChatId={currentChatId}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Chat area */}
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          ...(isMobile && { paddingLeft: '56px' }) // Space for mobile menu button
        }}>
          <Chat 
            numericalId={currentChatId || undefined}
            onChatLoad={handleChatLoad}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default ChatPage;