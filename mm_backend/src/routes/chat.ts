import { Router, Request, Response } from 'express';
import { createLLMService } from '../services/llmService';
import { LLMMessage } from '../types/llm';
import { MortgageAdvisorService, AdvisorSession } from '../services/mortgageAdvisorService';
import { createDocumentParsingService } from '../services/documentParser';
import { DocumentType } from '../types/documentParser';
import * as fs from 'fs/promises';
import * as path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const llmService = createLLMService();
const documentParser = createDocumentParsingService();

// Temporary in-memory session store (TODO: replace with database persistence)
const sessionStore = new Map<string, AdvisorSession>();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_DOCUMENT_SIZE || '10485760'), // 10MB
    files: 5 // Max 5 files per request
  },
  fileFilter: (req: any, file: any, cb: any) => {
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
    const promptPath = path.join(__dirname, '../prompts/prompt_templates/system_prompt.txt');
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

// POST /api/chat/initialize - Initialize new chat session
router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body; // TODO: Get from JWT token instead

    // Generate unique chat ID
    const chatId = uuidv4();
    
    // Create new advisor session
    const advisorSession = MortgageAdvisorService.createInitialSession();
    
    // Store session (TODO: save to database instead of memory)
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

    // TODO: Save chat to database with user association

    return res.json({
      success: true,
      data: {
        chatId,
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
    console.error('Chat initialization error:', error);
    return res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
});

// POST /api/chat - Send message to existing chat session (with optional file uploads)
router.post('/', upload.array('documents', 5), async (req: Request, res: Response) => {
  try {
    const { 
      chatId, 
      userMessage, 
      hasRequestedAnalysis = false 
    } = req.body;

    // Validate request
    if (!chatId || (!userMessage && (!req.files || req.files.length === 0))) {
      return res.status(400).json({ 
        error: 'chatId and either userMessage or documents are required' 
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
        error: 'Chat session not found. Please initialize a new chat first.' 
      });
    }
    
    // Update session with user input
    const updatedSession = MortgageAdvisorService.updateSessionWithUserInput(
      advisorSession,
      userMessage
    );

    // Check if user is requesting analysis
    const requestingAnalysis = hasRequestedAnalysis || 
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

    // TODO: Save extracted data to mortgage_scenarios table
    // TODO: Save conversation to llm_requests/llm_responses tables

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