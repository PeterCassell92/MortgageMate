import React, { useState, useEffect } from 'react';
import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useParams, useLocation } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Chat from '../components/Chat';
import Sidebar from '../components/Sidebar';
import ChatSidebarContent from '../components/ChatSidebarContent';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadExistingChat, createNewChat } from '../store/slices/chatSlice';

const Dashboard: React.FC = () => {
  const { numericalId } = useParams<{ numericalId: string }>();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { currentNumericalId } = useAppSelector(state => state.chat);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Load chat based on URL parameter
  useEffect(() => {
    const chatId = numericalId ? parseInt(numericalId, 10) : null;
    
    if (chatId && !isNaN(chatId)) {
      // Load specific chat from URL
      dispatch(loadExistingChat(chatId));
    } else if (location.pathname === '/dashboard/chat' && !currentNumericalId) {
      // No specific chat ID and no current chat - create new chat
      dispatch(createNewChat('New Chat'));
    }
  }, [numericalId, location.pathname, currentNumericalId, dispatch]);

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

        {/* Sidebar with ChatSidebarContent */}
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        >
          <ChatSidebarContent />
        </Sidebar>

        {/* Chat area */}
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          ...(isMobile && { paddingLeft: '56px' }) // Space for mobile menu button
        }}>
          <Chat 
            numericalId={currentNumericalId || undefined}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;