import React from 'react';
import { Box } from '@mui/material';
import AppHeader from '../components/AppHeader';
import Chat from '../components/Chat';
import { ChatService } from '../services/chatService';

const Dashboard: React.FC = () => {
  const handleSendMessage = async (message: string): Promise<string> => {
    const chatService = ChatService.getInstance();
    
    try {
      const response = await chatService.sendMessage([
        { role: 'user', content: message }
      ]);
      return response;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
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
      
      {/* Chat component takes up the remaining space */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        minHeight: 0 // This ensures the flex child can shrink below its content size
      }}>
        <Chat onSendMessage={handleSendMessage} />
      </Box>
    </Box>
  );
};

export default Dashboard;