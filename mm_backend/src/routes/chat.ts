import { Router, Request, Response } from 'express';
import { createLLMService } from '../services/llmService';
import { createLangChainService } from '../services/langChainService';
import { LLMLoggingService } from '../services/llmLoggingService';
import { LLMMessage } from '../types/llm';
import { MortgageAdvisorService, AdvisorSession } from '../services/MortgageConversation/mortgageAdvisorService';
import { ChatPersistenceService } from '../services/chatPersistenceService';
import { MessageModel } from '../models/Message';
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
const langChainService = createLangChainService();
const llmLoggingService = LLMLoggingService.getInstance();
const documentParser = createDocumentParsingService();

// Check which LLM implementation to use
const useLangChain = process.env.LLM_IMPLEMENTATION === 'langchain';

// In-memory session store for active sessions (will be synced to DB)
const sessionStore = new Map<string, AdvisorSession>();

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

// Helper function to call LLM with either legacy or LangChain
async function callLLM(
  messages: LLMMessage[],
  options: { maxTokens: number; temperature: number },
  context?: { userId?: number; chatId?: string; numericalChatId?: number }
) {
  console.log(`[callLLM] Using ${useLangChain ? 'LangChain' : 'Legacy'} implementation`);

  // Extract system prompt and user message
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.find(m => m.role === 'user');

  if (!systemMessage || !userMessage) {
    throw new Error('System and user messages are required');
  }

  // Determine provider, model, and API URL (common for both implementations)
  const provider = process.env.LLM_PROVIDER || 'mock';
  const model = process.env.LLM_MODEL || 'claude-sonnet-4-20250514';
  const apiUrl = provider === 'anthropic'
    ? 'https://api.anthropic.com/v1/messages'
    : provider === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : 'mock://llm';

  try {
    // Start logging the request (for both LangChain and Legacy)
    const loggingResult = await llmLoggingService.logLLMRequest({
      userId: context?.userId,
      url: apiUrl,
      httpMethod: 'POST',
      requestBody: JSON.stringify({ messages, ...options }),
      provider,
      model,
      systemPrompt: systemMessage.content,
      userMessage: userMessage.content,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      implementationMode: useLangChain ? 'langchain' : 'legacy',
      apiWrapper: useLangChain ? 'langchain' : null
    });

    if (useLangChain) {
      console.log('[callLLM] Calling LangChain service...');

      try {
        // Escape curly braces in system prompt for LangChain template
        // LangChain uses {variable} syntax, so we need to escape any literal braces
        const escapedSystemPrompt = systemMessage.content
          .replace(/\{/g, '{{')
          .replace(/\}/g, '}}');

        // Combine system prompt and user message into a single template
        const template = `${escapedSystemPrompt}\n\n---\n\n{userMessage}`;

        const response = await langChainService.invoke({
          template,
          variables: {
            userMessage: userMessage.content
          },
          options: {
            maxTokens: options.maxTokens,
            temperature: options.temperature
          }
        });

        console.log('[callLLM] LangChain response received');

        // Log successful completion
        let responseId: number | null = null;
        if (loggingResult) {
          responseId = await llmLoggingService.logLLMResponse(loggingResult.requestId, {
            content: response.content,
            inputTokens: response.usage?.inputTokens || 0,
            outputTokens: response.usage?.outputTokens || 0,
            totalTokens: response.usage?.totalTokens || 0,
            estimatedCost: 0, // TODO: Implement pricing lookup
            finishReason: 'stop'
          });
        }

        return {
          content: response.content,
          usage: response.usage,
          provider: response.provider,
          model: response.model,
          llmRequestId: loggingResult?.requestId,
          llmResponseId: responseId
        };
      } catch (llmError) {
        // Log failure for LangChain
        if (loggingResult) {
          await llmLoggingService.failRequest(
            loggingResult.requestId,
            llmError instanceof Error ? llmError.message : 'Unknown LLM error',
            llmError instanceof Error ? llmError.constructor.name : 'UnknownError'
          );
        }
        throw llmError;
      }
    } else {
      // Legacy approach
      console.log('[callLLM] Calling legacy LLM service with database logging...');

      try {
        const response = await llmService.generateResponse({
          messages,
          maxTokens: options.maxTokens,
          temperature: options.temperature
        });

        console.log('[callLLM] Legacy response received');

        // Log successful completion and get response ID
        let responseId: number | null = null;
        if (loggingResult) {
          responseId = await llmLoggingService.logLLMResponse(loggingResult.requestId, {
            content: response.content,
            inputTokens: response.usage?.inputTokens || 0,
            outputTokens: response.usage?.outputTokens || 0,
            totalTokens: response.usage?.totalTokens || 0,
            estimatedCost: 0, // TODO: Implement pricing lookup (no API available from providers)
            finishReason: 'stop'
          });
        }

        return {
          ...response,
          llmRequestId: loggingResult?.requestId,
          llmResponseId: responseId
        };
      } catch (llmError) {
        // Log failure
        if (loggingResult) {
          await llmLoggingService.failRequest(
            loggingResult.requestId,
            llmError instanceof Error ? llmError.message : 'Unknown LLM error',
            llmError instanceof Error ? llmError.constructor.name : 'UnknownError'
          );
        }
        throw llmError;
      }
    }
  } catch (error) {
    console.error('[callLLM] ERROR:', error);
    throw error;
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

    // Get chats from database
    const chats = await ChatPersistenceService.getUserChats(userId);

    // Get latest chat for auto-loading
    const latestChat = await ChatPersistenceService.getLatestChatForUser(userId);

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

    // Create new chat session in database
    const { chatId, numericalId } = await ChatPersistenceService.createNewChatSession(
      userId,
      title || 'New Chat'
    );

    // Create new advisor session for in-memory use
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

    const response = await callLLM(messages, {
      maxTokens: 800,
      temperature: 0.7
    }, {
      userId,
      chatId,
      numericalChatId: numericalId
    });

    // Extract structured data and clean response for user
    const { cleanedResponse, extractedData } = extractStructuredData(response.content);

    // Update session with AI response
    const updatedSession = MortgageAdvisorService.updateSessionWithAIResponse(
      advisorSession,
      cleanedResponse
    );

    // Save updated session
    sessionStore.set(chatId, updatedSession);

    // Save welcome message to database (AI response only, no user message yet)
    await ChatPersistenceService.saveSessionToDatabase(
      chatId,
      userId,
      updatedSession,
      undefined, // No user message yet
      cleanedResponse, // AI welcome message
      undefined, // No LLM request for welcome
      undefined  // No LLM response for welcome
    );

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

    // Restore chat from database
    const persistedChat = await ChatPersistenceService.restoreSessionFromDatabase(
      numericalId,
      userId
    );

    if (!persistedChat) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }

    // Get the chat UUID from the persisted session
    const chatUUID = await ChatPersistenceService.getChatIdFromNumericalId(userId, numericalId);
    if (!chatUUID) {
      return res.status(404).json({
        success: false,
        error: 'Chat UUID not found'
      });
    }

    // Store advisor session in memory for active use
    sessionStore.set(chatUUID, persistedChat.advisorSession);

    return res.json({
      success: true,
      data: {
        chatId: chatUUID,
        numericalId: numericalId,
        advisorMode: persistedChat.advisorSession.mode,
        completenessScore: persistedChat.advisorSession.completenessScore,
        mortgageData: persistedChat.advisorSession.mortgageData,
        conversationHistory: persistedChat.conversationHistory || [],
        lastAnalysis: persistedChat.advisorSession.lastAnalysis
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

// POST /api/chat/:numericalId/delete - Soft delete chat from database
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

    // Get chat UUID
    const chatUUID = await ChatPersistenceService.getChatIdFromNumericalId(userId, numericalId);
    if (!chatUUID) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }

    // Soft delete chat in database
    const deleted = await ChatPersistenceService.softDeleteChat(chatUUID, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found or already deleted'
      });
    }

    // Remove from memory store if present
    sessionStore.delete(chatUUID);

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

    // Get chat UUID from database
    const chatId = await ChatPersistenceService.getChatIdFromNumericalId(userId, numericalId);

    if (!chatId) {
      return res.status(404).json({
        success: false,
        error: 'Chat session not found'
      });
    }

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

    // Get internal database chat ID for loading previous messages
    const chatIdInt = await ChatPersistenceService.getChatIdFromUUID(chatId);
    if (!chatIdInt) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found in database'
      });
    }

    // Load previous messages from database
    const MORTGAGE_ADVISOR_ID = 0;
    const previousMessages = await MessageModel.findByChatId(chatIdInt);

    // Convert database messages to LLM format
    const conversationHistory: LLMMessage[] = previousMessages.map(msg => ({
      role: msg.from_user_id === MORTGAGE_ADVISOR_ID ? 'assistant' : 'user',
      content: msg.message_body
    }));
    
    // Update session with user input
    const updatedSession = MortgageAdvisorService.updateSessionWithUserInput(
      advisorSession,
      userMessage
    );

    // Check if user is requesting analysis
    const _requestingAnalysis = hasRequestedAnalysis ||
      MortgageAdvisorService.isRequestingAnalysis(userMessage);

    // NEW: Use MortgageAdvisorService to generate contextual prompt with RAG data
    const enhancedSystemPrompt = await MortgageAdvisorService.generateContextualPrompt(
      updatedSession,
      userMessage,
      _requestingAnalysis
    );

    // Add document context if files were uploaded
    let documentContext = '';
    if (documentResults.length > 0) {
      documentContext = `

Additional Context - Documents processed in this message:
${documentResults.map(doc => `
- File: ${doc.fileName} (${doc.fileType}, ${Math.round(doc.fileSize/1024)}KB)
- Document Type: ${doc.documentType}
- Processed by: ${doc.llmDocumentParserType} (${doc.llmDocumentParserModel})
- Success: ${doc.success}
- Confidence: ${doc.confidence ? (doc.confidence * 100).toFixed(1) + '%' : 'N/A'}
${doc.success ? `- Extracted Data: ${JSON.stringify(doc.extractedData, null, 2)}` : `- Error: ${doc.error}`}
`).join('\n')}

The user has uploaded documents with extracted data above. Use this information to update your understanding of their mortgage situation and respond appropriately.`;
    }

    // Build the final prompt with document context
    const finalSystemPrompt = enhancedSystemPrompt + documentContext;

    // Build messages array with conversation history from database
    const messages: LLMMessage[] = [
      { role: 'system', content: finalSystemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    // Adjust parameters based on advisor mode
    const isAnalysisMode = updatedSession.mode === 'analysis';

    let response;
    try {
      response = await callLLM(messages, {
        maxTokens: isAnalysisMode ? 2000 : 1000,
        temperature: isAnalysisMode ? 0.3 : 0.7
      }, {
        userId,
        chatId,
        numericalChatId: numericalId
      });
    } catch (llmError) {
      console.error('LLM Service Error:', llmError);
      return res.status(500).json({
        success: false,
        error: 'Error occurred when requesting response from LLM service',
        errorType: 'LLM_ERROR',
        details: llmError instanceof Error ? llmError.message : 'Unknown LLM error'
      });
    }

    // Debug: Log raw LLM response to see what we're getting
    console.log('=== RAW LLM RESPONSE ===');
    console.log(response.content.substring(0, 500)); // First 500 chars
    console.log('=== END RAW RESPONSE ===');

    // Extract structured data and clean response for user
    const { cleanedResponse, extractedData } = extractStructuredData(response.content);

    // Debug: Log extraction results
    console.log('=== EXTRACTION RESULTS ===');
    console.log('Extracted data:', extractedData);
    console.log('=== END EXTRACTION ===');

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

    // Save messages and session to database with LLM request/response links
    await ChatPersistenceService.saveSessionToDatabase(
      chatId,
      userId,
      finalSession,
      userMessage, // User message
      cleanedResponse, // AI response
      (response as any).llmRequestId, // LLM request ID from callLLM
      (response as any).llmResponseId  // LLM response ID from callLLM
    );

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
    const userId = (req as AuthenticatedRequest).user.id;

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

    const response = await callLLM(messages, {
      maxTokens: 1500,
      temperature: 0.3 // Lower temperature for more consistent financial advice
    }, {
      userId
      // No chatId for this endpoint - it's a standalone analysis
    });

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