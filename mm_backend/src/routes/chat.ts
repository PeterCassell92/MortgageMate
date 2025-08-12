import { Router, Request, Response } from 'express';
import { createLLMService } from '../services/llmService';
import { LLMMessage } from '../types/llm';

const router = Router();
const llmService = createLLMService();

// POST /api/chat - Send message to AI chatbot
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, systemPrompt, maxTokens, temperature } = req.body;

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Messages array is required and must not be empty' 
      });
    }

    // Validate message format
    for (const message of messages) {
      if (!message.role || !message.content) {
        return res.status(400).json({ 
          error: 'Each message must have role and content' 
        });
      }
      if (!['user', 'assistant', 'system'].includes(message.role)) {
        return res.status(400).json({ 
          error: 'Message role must be user, assistant, or system' 
        });
      }
    }

    // Prepare request
    const llmRequest = {
      messages: messages as LLMMessage[],
      systemPrompt,
      maxTokens: maxTokens || 1000,
      temperature: temperature || 0.7,
    };

    // Get AI response
    const response = await llmService.generateResponse(llmRequest);

    return res.json({
      success: true,
      data: {
        message: response.content,
        usage: response.usage,
        provider: response.provider,
        model: response.model,
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// GET /api/chat/config - Get current chat configuration
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      provider: process.env.LLM_PROVIDER || 'mock',
      mockMode: process.env.MOCK_LLM === 'true',
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    }
  });
});

// POST /api/chat/mortgage-analysis - Specialized endpoint for mortgage analysis
router.post('/mortgage-analysis', async (req: Request, res: Response) => {
  try {
    const { mortgageData, userQuestion } = req.body;

    if (!mortgageData || !userQuestion) {
      return res.status(400).json({ 
        error: 'Both mortgageData and userQuestion are required' 
      });
    }

    // Create specialized system prompt for mortgage analysis
    const systemPrompt = `You are a mortgage advisor AI helping users analyze their mortgage options. 
You should provide clear, actionable advice based on the mortgage data provided.
Always consider factors like:
- Current interest rates vs market rates
- Remaining loan term vs new loan terms
- Closing costs and fees
- Break-even analysis for refinancing
- User's financial goals and timeline

Be specific with numbers when possible and explain your reasoning.`;

    const mortgageDataString = JSON.stringify(mortgageData, null, 2);
    
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Here is my current mortgage data:\n\n${mortgageDataString}\n\nMy question: ${userQuestion}`
      }
    ];

    const llmRequest = {
      messages,
      maxTokens: 1500,
      temperature: 0.3, // Lower temperature for more consistent financial advice
    };

    const response = await llmService.generateResponse(llmRequest);

    return res.json({
      success: true,
      data: {
        analysis: response.content,
        usage: response.usage,
        provider: response.provider,
        model: response.model,
      }
    });

  } catch (error) {
    console.error('Mortgage analysis API error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

export default router;