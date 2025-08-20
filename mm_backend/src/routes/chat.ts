import { Router, Request, Response } from 'express';
import { createLLMService } from '../services/llmService';
import { LLMMessage } from '../types/llm';
import { MortgageAdvisorService, AdvisorSession } from '../services/MortgageConversation/mortgageAdvisorService';
// import { ChatPersistenceServicePrismaSimple } from '../services/chatPersistenceServicePrismaSimple';
import { createDocumentParsingService } from '../services/DocumentParser/documentParser';
import { DocumentType } from '../types/documentParser';
import { requireAuth } from '../middleware/auth';
import * as fs from 'fs/promises';
import * as path from 'path';
import multer from 'multer';

// Define authenticated request interface
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
  };
}

const router = Router();
const llmService = createLLMService();
const documentParser = createDocumentParsingService();

// Temporary in-memory session store (TODO: replace with database persistence)
const sessionStore = new Map<string, AdvisorSession>();

// Temporary in-memory chat store for demo
interface TempChat {
  id: string;
  numericalId: number;
  title: string;
  userId: number;
  createdAt: Date;
}
const tempChatStore = new Map<number, TempChat[]>(); // userId -> chats
let nextNumericalId = 1;

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760'), // 10MB
    files: 5 // Max 5 files per request
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf', 'image/heic', 'image/heif'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Helper function to load system prompt
async function loadSystemPrompt(): Promise<string> {
  try {
    const promptPath = path.join(__dirname, '../services/MortgageConversation/prompts/prompt_templates/system_prompt.txt');
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    console.error('Failed to load system prompt:', error);
    return 'You are MortgageMate AI, a professional mortgage advisor.';
  }
}

// Helper function to extract structured data from LLM response and clean the user-facing text
function extractStructuredData(response: string): { cleanedResponse: string; extractedData: any } {
  try {
    let extractedData = null;
    let cleanedResponse = response;
    
    // Look for JSON block in response and remove it
    const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[1]);
      cleanedResponse = response.replace(/```json\s*\{[\s\S]*?\}\s*```/, '').trim();
    } else {
      // Look for extractedData object and remove it
      const dataMatch = response.match(/"extractedData":\s*(\{[\s\S]*?\})/);
      if (dataMatch) {
        extractedData = JSON.parse(`{"extractedData": ${dataMatch[1]}}`);
        cleanedResponse = response.replace(/"extractedData":\s*\{[\s\S]*?\}/, '').trim();
      }
    }
    
    return {
      cleanedResponse,
      extractedData
    };
  } catch (error) {
    console.error('Failed to extract structured data:', error);
    return {
      cleanedResponse: response,
      extractedData: null
    };
  }
}

// Helper function to determine document type from filename
function determineDocumentType(filename: string): DocumentType {
  const lowerName = filename.toLowerCase();
  
  if (lowerName.includes('mortgage') || lowerName.includes('statement')) {
    return 'mortgage_statement';
  } else if (lowerName.includes('offer') || lowerName.includes('approval')) {
    return 'mortgage_offer';
  } else if (lowerName.includes('bank') || lowerName.includes('account')) {
    return 'bank_statement';
  } else if (lowerName.includes('valuation') || lowerName.includes('survey')) {
    return 'property_valuation';
  } else if (lowerName.includes('pay') || lowerName.includes('salary') || lowerName.includes('wage')) {
    return 'pay_slip';
  } else if (lowerName.includes('tax') || lowerName.includes('p60') || lowerName.includes('p45')) {
    return 'tax_document';
  } else {
    return 'other';
  }
}

// GET /api/chat/list - Get all active chats for user
router.get('/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).user.id;
    
    // Get chats from temporary in-memory store
    const userChats = tempChatStore.get(userId) || [];
    const chats = userChats.map(chat => ({
      id: chat.id,
      numericalId: chat.numericalId,
      title: chat.title,
      lastViewed: chat.createdAt,
      updatedAt: chat.createdAt,
      createdAt: chat.createdAt
    }));
    
    // Get latest chat for auto-loading
    const latestChat = userChats.length > 0 ? userChats[userChats.length - 1] : null;
    
    return res.json({
      success: true,
      data: { 
        chats,
        latestChatId: latestChat?.numericalId || null
      }
    });
    
  } catch (error) {
    console.error('Failed to get chat list:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/chat/create - Create new chat session
router.post('/create', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const userId = (req as AuthenticatedRequest).user.id;
    
    // Create new chat session in temporary memory store
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const numericalId = nextNumericalId++;
    
    const newChat: TempChat = {
      id: chatId,
      numericalId,
      title: title || 'New Chat',
      userId,
      createdAt: new Date()
    };
    
    // Store chat in temporary store
    if (!tempChatStore.has(userId)) {
      tempChatStore.set(userId, []);
    }
    tempChatStore.get(userId)!.push(newChat);
    
    // Create new advisor session
    const advisorSession = MortgageAdvisorService.createInitialSession();
    
    // Store session in memory for immediate use
    sessionStore.set(chatId, advisorSession);

    // Load system prompt
    const systemPrompt = await loadSystemPrompt();
    
    // Generate welcome message with data gathering prompt
    const welcomePrompt = await MortgageAdvisorService.generateContextualPrompt(
      advisorSession,
      "Please provide a brief welcome message and start gathering mortgage information.",
      false
    );

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: welcomePrompt }
    ];

    const llmRequest = {
      messages,
      maxTokens: 800,
      temperature: 0.7,
    };

    const response = await llmService.generateResponse(llmRequest);

    // Extract structured data and clean response for user
    const { cleanedResponse, extractedData } = extractStructuredData(response.content);

    // Update session with AI response
    const updatedSession = MortgageAdvisorService.updateSessionWithAIResponse(
      advisorSession,
      cleanedResponse
    );

    // Save updated session
    sessionStore.set(chatId, updatedSession);

    // TODO: Re-enable database persistence later
    // await ChatPersistenceServicePrismaSimple.saveSessionToDatabase(...)
    
    return res.json({
      success: true,
      data: {
        chatId,
        numericalId: numericalId,
        message: cleanedResponse,
        isWelcomeMessage: true,
        advisorMode: updatedSession.mode,
        completenessScore: updatedSession.completenessScore,
        extractedData: extractedData?.extractedData || null,
        usage: response.usage,
        provider: response.provider,
        model: response.model,
      }
    });
    
  } catch (error) {
    console.error('Failed to create new chat:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/chat/:numericalId/load - Load existing chat session by numerical ID
router.post('/:numericalId/load', requireAuth, async (req: Request, res: Response) => {
  try {
    const numericalId = parseInt(req.params.numericalId);
    if (isNaN(numericalId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid numerical ID'
      });
    }
    
    const userId = (req as AuthenticatedRequest).user.id;
    
    // Find chat in temporary store
    const userChats = tempChatStore.get(userId) || [];
    const chat = userChats.find(c => c.numericalId === numericalId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    // Get or create advisor session
    let advisorSession = sessionStore.get(chat.id);
    if (!advisorSession) {
      // Create new session if not found in memory
      advisorSession = MortgageAdvisorService.createInitialSession();
      sessionStore.set(chat.id, advisorSession);
    }
    
    return res.json({
      success: true,
      data: {
        chatId: chat.id,
        numericalId: numericalId,
        advisorMode: advisorSession.mode,
        completenessScore: advisorSession.completenessScore,
        mortgageData: advisorSession.mortgageData,
        conversationHistory: advisorSession.conversationHistory || [],
        lastAnalysis: advisorSession.lastAnalysis
      }
    });
    
  } catch (error) {
    console.error('Failed to load chat session:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/chat/:numericalId/delete - Delete chat from temporary store
router.post('/:numericalId/delete', requireAuth, async (req: Request, res: Response) => {
  try {
    const numericalId = parseInt(req.params.numericalId);
    if (isNaN(numericalId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid numerical ID'
      });
    }
    
    const userId = (req as AuthenticatedRequest).user.id;
    
    // Find and remove chat from temporary store
    const userChats = tempChatStore.get(userId) || [];
    const chatIndex = userChats.findIndex(c => c.numericalId === numericalId);
    
    if (chatIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    const chatId = userChats[chatIndex].id;
    
    // Remove chat from store
    userChats.splice(chatIndex, 1);
    tempChatStore.set(userId, userChats);
    
    // Remove from memory store if present
    sessionStore.delete(chatId);
    
    return res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
    
  } catch (error) {
    console.error('Failed to delete chat session:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/chat/:numericalId - Send message to existing chat session (with optional file uploads)
router.post('/:numericalId', requireAuth, upload.array('documents', 5), async (req: Request, res: Response) => {
  try {
    const numericalId = parseInt(req.params.numericalId);
    if (isNaN(numericalId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid numerical ID'
      });
    }
    
    const { 
      userMessage, 
      hasRequestedAnalysis = false 
    } = req.body;

    // Validate request
    if (!userMessage && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ 
        error: 'Either userMessage or documents are required' 
      });
    }

    const userId = (req as AuthenticatedRequest).user.id;
    
    // Find chat in temporary store
    const userChats = tempChatStore.get(userId) || [];
    const chat = userChats.find(c => c.numericalId === numericalId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }
    
    const chatId = chat.id;

    const files = req.files as Express.Multer.File[] || [];
    
    // Process documents first if any are uploaded
    const documentResults: any[] = [];
    if (files.length > 0) {
      for (const file of files) {
        try {
          // Determine document type from filename/category
          const documentType = determineDocumentType(file.originalname);
          
          const parseResult = await documentParser.parseDocument({
            documentType,
            fileBuffer: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype
          });

          documentResults.push({
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            documentType,
            llmDocumentParserType: parseResult.provider,
            llmDocumentParserModel: 'claude-sonnet-4-20250514', // TODO: get from parser config
            extractedData: parseResult.extractedData,
            confidence: parseResult.confidence,
            processingTime: parseResult.processingTime,
            success: parseResult.success,
            error: parseResult.error
          });

        } catch (error) {
          console.error(`Failed to process document ${file.originalname}:`, error);
          documentResults.push({
            fileName: file.originalname,
            fileType: file.mimetype,
            fileSize: file.size,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown processing error'
          });
        }
      }
    }

    // Load system prompt
    const systemPrompt = await loadSystemPrompt();

    // Get existing session
    const advisorSession = sessionStore.get(chatId);
    if (!advisorSession) {
      return res.status(404).json({ 
        success: false,
        error: 'Chat session not found. Please load the chat first.' 
      });
    }
    
    // Update session with user input
    const updatedSession = MortgageAdvisorService.updateSessionWithUserInput(
      advisorSession,
      userMessage
    );

    // Check if user is requesting analysis
    const _requestingAnalysis = hasRequestedAnalysis || 
      MortgageAdvisorService.isRequestingAnalysis(userMessage);

    // Get conversation history and add current user message
    const conversationHistory = updatedSession.conversationHistory || [];
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    for (const historyMessage of conversationHistory) {
      if (historyMessage.startsWith('User: ')) {
        messages.push({ 
          role: 'user', 
          content: historyMessage.substring(6) // Remove "User: " prefix
        });
      } else if (historyMessage.startsWith('AI: ')) {
        messages.push({ 
          role: 'assistant', 
          content: historyMessage.substring(4) // Remove "AI: " prefix
        });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    // Add context information including document data
    const contextInfo = `
Current Context:
- Completion Score: ${updatedSession.completenessScore}%
- Missing Critical Data: ${MortgageAdvisorService.identifyMissingCriticalData(updatedSession.mortgageData).join(', ') || 'None'}
- Conversation Stage: ${MortgageAdvisorService.getConversationStage(updatedSession)}
- Current Priority: ${MortgageAdvisorService.getCurrentPriority(updatedSession)}
- Advisor Mode: ${updatedSession.mode}

User's mortgage data so far:
${JSON.stringify(updatedSession.mortgageData, null, 2)}

${documentResults.length > 0 ? `
Documents processed in this message:
${documentResults.map(doc => `
- File: ${doc.fileName} (${doc.fileType}, ${Math.round(doc.fileSize/1024)}KB)
- Document Type: ${doc.documentType}
- Processed by: ${doc.llmDocumentParserType} (${doc.llmDocumentParserModel})
- Success: ${doc.success}
- Confidence: ${doc.confidence ? (doc.confidence * 100).toFixed(1) + '%' : 'N/A'}
${doc.success ? `- Extracted Data: ${JSON.stringify(doc.extractedData, null, 2)}` : `- Error: ${doc.error}`}
`).join('\n')}

The user has uploaded documents with extracted data above. Use this information to update your understanding of their mortgage situation and respond appropriately.
` : ''}
`;

    // Update system message with context
    messages[0].content = systemPrompt + '\n\n' + contextInfo;

    // Adjust parameters based on advisor mode
    const isAnalysisMode = updatedSession.mode === 'analysis';
    const llmRequest = {
      messages,
      maxTokens: isAnalysisMode ? 2000 : 1000,
      temperature: isAnalysisMode ? 0.3 : 0.7,
    };

    const response = await llmService.generateResponse(llmRequest);

    // Extract structured data and clean response for user
    const { cleanedResponse, extractedData } = extractStructuredData(response.content);
    
    // Process any extracted data first
    if (extractedData?.extractedData) {
      // Update advisor session with extracted data
      const currentData = updatedSession.mortgageData;
      const newData = { ...currentData, ...extractedData.extractedData };
      updatedSession.mortgageData = newData;
      updatedSession.completenessScore = MortgageAdvisorService.calculateCompleteness(newData);
    }
    
    // Update session with AI response
    const finalSession = MortgageAdvisorService.updateSessionWithAIResponse(
      updatedSession,
      cleanedResponse,
      isAnalysisMode
    );

    // Save updated session
    sessionStore.set(chatId, finalSession);

    // TODO: Re-enable database persistence later
    // await ChatPersistenceServicePrismaSimple.saveSessionToDatabase(...);

    return res.json({
      success: true,
      data: {
        message: cleanedResponse,
        advisorMode: finalSession.mode,
        completenessScore: finalSession.completenessScore,
        extractedData: extractedData?.extractedData || null,
        missingFields: MortgageAdvisorService.identifyMissingCriticalData(finalSession.mortgageData),
        documentResults: documentResults.length > 0 ? documentResults : undefined,
        usage: response.usage,
        provider: response.provider,
        model: response.model,
        chatId: chatId,
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
router.get('/config', (_req: Request, res: Response) => {
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
router.post('/mortgage-analysis', requireAuth, async (req: Request, res: Response) => {
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