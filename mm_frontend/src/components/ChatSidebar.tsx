import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Typography,
  Button,
  Divider,
  Chip,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { ChatService, ChatSummary } from '../services/chatService';
import { useError } from '../contexts/ErrorContext';

interface ChatSidebarProps {
  currentChatId?: number | null;
  onChatSelect: (numericalId: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  currentChatId,
  onChatSelect,
  mobileOpen = false,
  onMobileClose
}) => {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const { handleNetworkError } = useError();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const chatService = ChatService.getInstance();

  const currentTitle : string|null = useMemo(() => {
    if(currentChatId){
      const chat = chats.find(c => c.numericalId === currentChatId);
      return chat?.title ?? null;
    }
    return null

  }, [currentChatId, chats]);

  useEffect(() => {
    loadChatList();
  }, []);

  const loadChatList = async () => {
    try {
      setLoading(true);
      const response = await chatService.getChatList();
      if (response.success && response.data) {
        setChats(response.data.chats);
      }
    } catch (error: any) {
      console.error('Failed to load chat list:', error);
      if (error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      // Create new chat using ChatService
      const response = await chatService.createNewChat('New Chat');
      if (response.success && response.data?.numericalId) {
        // Select the newly created chat
        onChatSelect(response.data.numericalId);
      }
      
      // Reload chat list to include the new chat
      await loadChatList();
      if (isMobile && onMobileClose) {
        onMobileClose();
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
      if (error instanceof Error && error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
    }
  };

  const handleChatSelect = (numericalId: number) => {
    onChatSelect(numericalId);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, chatId: number) => {
    event.stopPropagation(); // Prevent chat selection
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
      await chatService.deleteChat(selectedChatId);
      // Reload chat list to remove the deleted chat
      await loadChatList();
      
      // If we deleted the current chat, we might want to select another one or clear selection
      if (currentChatId === selectedChatId) {
        // You could implement logic to select the first available chat or clear selection
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      if (error instanceof Error && error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
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

  const drawerContent = (
    <Box sx={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ChatIcon />
          Chats
        </Typography>
        {isMobile && (
          <IconButton onClick={onMobileClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
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
        {loading ? (
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
                  selected={currentChatId === chat.numericalId}
                  onClick={() => handleChatSelect(chat.numericalId)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.primary.main + '0a',
                      borderRight: `3px solid ${theme.palette.primary.main}`,
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: currentChatId === chat.numericalId ? 600 : 400,
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
                            opacity: currentChatId === chat.numericalId ? 1 : 0,
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

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 300,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 300,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 300,
          boxSizing: 'border-box',
          position: 'relative',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default ChatSidebar;