import React, { useState, useEffect, useRef } from 'react';
import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Chat from '../components/Chat';
import Sidebar from '../components/Sidebar';
import ChatSidebarContent from '../components/ChatSidebarContent';
import LoadingOverlay from '../components/LoadingOverlay';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loadExistingChat, createNewChat, loadChatList } from '../store/slices/chatSlice';

const Dashboard: React.FC = () => {
  const { numericalId } = useParams<{ numericalId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentNumericalId, messagesError } = useAppSelector(state => state.chat);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Prevent duplicate chat initialization in StrictMode
  const hasInitialized = useRef(false);

  // Smart chat initialization: load existing or create new
  useEffect(() => {
    const chatId = numericalId ? parseInt(numericalId, 10) : null;

    if (chatId && !isNaN(chatId)) {
      // Load specific chat from URL
      dispatch(loadExistingChat(chatId)).unwrap().catch((error) => {
        // If chat not found (404), navigate to dashboard to load/create a chat
        if (error.includes('not found') || error.includes('404')) {
          console.log('Chat not found, navigating to dashboard');
          navigate('/dashboard/chat', { replace: true });
        }
      });
    } else if (location.pathname === '/dashboard/chat' && !currentNumericalId && !hasInitialized.current) {
      // No specific chat in URL - check if user has existing chats
      hasInitialized.current = true;

      dispatch(loadChatList()).then((result) => {
        if (result.meta.requestStatus === 'fulfilled' && result.payload) {
          const payload = result.payload as { latestChatId: number | null };

          if (payload.latestChatId) {
            // User has existing chats - load the most recent one
            dispatch(loadExistingChat(payload.latestChatId));
          } else {
            // User has no chats - create first chat
            dispatch(createNewChat('New Chat'));
          }
        }
      });
    }
  }, [numericalId, location.pathname, currentNumericalId, dispatch, navigate]);

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

      {/* Application-level loading overlay */}
      <LoadingOverlay />
    </Box>
  );
};

export default Dashboard;