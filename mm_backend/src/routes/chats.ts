import { Router, Request, Response } from 'express';
import { ChatModel } from '../models/Chat';
import { MessageModel } from '../models/Message';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all chat routes
router.use(authenticateToken);

// GET /api/chats - Get all chats for the current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const chats = await ChatModel.findByUserId(userId);
    
    return res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Get chats error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// GET /api/chats/latest - Get the latest chat for the current user
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    let chat = await ChatModel.findLatestByUserId(userId);
    
    // If no chat exists, create a new one
    if (!chat) {
      chat = await ChatModel.create(userId, { title: 'New Chat' });
    }
    
    return res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get latest chat error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// GET /api/chats/:id - Get a specific chat with messages
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    
    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chat ID'
      });
    }

    const chat = await ChatModel.findWithMessages(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    // Verify ownership
    if (chat.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    return res.json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// POST /api/chats - Create a new chat
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, mortgage_scenario_id } = req.body;
    
    const chat = await ChatModel.create(userId, {
      title: title || 'New Chat',
      mortgage_scenario_id
    });
    
    return res.status(201).json({
      success: true,
      data: chat
    });
  } catch (error) {
    console.error('Create chat error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/chats/:id/title - Update chat title
router.put('/:id/title', async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    const { title } = req.body;
    
    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chat ID'
      });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Verify ownership
    const existingChat = await ChatModel.findById(chatId);
    if (!existingChat || existingChat.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    const updatedChat = await ChatModel.updateTitle(chatId, title.trim());
    
    return res.json({
      success: true,
      data: updatedChat
    });
  } catch (error) {
    console.error('Update chat title error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// GET /api/chats/:id/messages - Get messages for a chat
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    
    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chat ID'
      });
    }

    // Verify ownership
    const chat = await ChatModel.findById(chatId);
    if (!chat || chat.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    const messages = await MessageModel.findByChatId(chatId);
    
    return res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/chats/:id - Delete a chat
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.id);
    const userId = (req as any).user.id;
    
    if (isNaN(chatId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid chat ID'
      });
    }

    // Verify ownership
    const chat = await ChatModel.findById(chatId);
    if (!chat || chat.user_id !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    const deleted = await ChatModel.delete(chatId);
    
    if (deleted) {
      return res.json({
        success: true,
        message: 'Chat deleted successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete chat'
      });
    }
  } catch (error) {
    console.error('Delete chat error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;