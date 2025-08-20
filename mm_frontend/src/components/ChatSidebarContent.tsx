import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
  Button,
  Divider,
  Chip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Chat as ChatIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  loadChatList, 
  createNewChat, 
  deleteChat,
  setSidebarExpanded 
} from '../store/slices/chatSlice';
import { useError } from '../contexts/ErrorContext';

const ChatSidebarContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { 
    chats, 
    chatsLoading, 
    chatsError,
    currentNumericalId,
    sidebarExpanded
  } = useAppSelector(state => state.chat);
  
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const { handleNetworkError } = useError();

  // Load chat list when sidebar opens
  useEffect(() => {
    if (sidebarExpanded) {
      dispatch(loadChatList());
    }
  }, [dispatch, sidebarExpanded]);

  // Handle network errors
  useEffect(() => {
    if (chatsError && chatsError.includes('Connection failed')) {
      handleNetworkError(new Error(chatsError));
    }
  }, [chatsError, handleNetworkError]);

  const handleNewChat = async () => {
    try {
      const result = await dispatch(createNewChat('New Chat')).unwrap();
      if (result?.numericalId) {
        navigate(`/dashboard/chat/${result.numericalId}`);
        // Refresh chat list to show the new chat
        dispatch(loadChatList());
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleChatSelect = (numericalId: number) => {
    navigate(`/dashboard/chat/${numericalId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, chatId: number) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedChatId(chatId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedChatId(null);
  };

  const handleDeleteChat = async () => {
    if (!selectedChatId) return;
    
    try {
      await dispatch(deleteChat(selectedChatId)).unwrap();
      
      // If we deleted the current chat, navigate to dashboard
      if (currentNumericalId === selectedChatId) {
        navigate('/dashboard/chat');
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    } finally {
      handleMenuClose();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatIcon />
          Chats
        </Typography>
      </Box>

      {/* New Chat Button */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewChat}
        >
          New Chat
        </Button>
      </Box>

      <Divider />

      {/* Chat List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {chatsLoading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading chats...
            </Typography>
          </Box>
        ) : chats.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No chats yet. Create your first chat!
            </Typography>
          </Box>
        ) : (
          <List sx={{ pt: 0 }}>
            {chats.map((chat) => (
              <ListItem key={chat.numericalId} disablePadding>
                <ListItemButton
                  selected={currentNumericalId === chat.numericalId}
                  onClick={() => handleChatSelect(chat.numericalId)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: (theme) => theme.palette.primary.main + '0a',
                      borderRight: (theme) => `3px solid ${theme.palette.primary.main}`,
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: currentNumericalId === chat.numericalId ? 600 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                        >
                          {chat.title}
                        </Typography>
                        <Chip
                          label={chat.numericalId}
                          size="small"
                          variant="outlined"
                          sx={{ minWidth: 'auto', height: 20, fontSize: '0.75rem' }}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, chat.numericalId)}
                          sx={{ 
                            opacity: currentNumericalId === chat.numericalId ? 1 : 0,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 1 }
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(chat.lastViewed || chat.updatedAt)}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleDeleteChat}>
          <DeleteIcon sx={{ mr: 1, fontSize: 'small' }} />
          Delete Chat
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatSidebarContent;