import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error', 'warn', 'query'],
});

// Connect on module load
prisma.$connect().catch((err: unknown) => {
  console.error('[LLMLoggingService] Failed to connect to database:', err);
});

interface LLMRequestData {
  // Context (optional)
  userId?: number;

  // Required LLM call details
  url: string;
  httpMethod: string;
  requestBody: string;
  provider: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature: number;
  maxTokens: number;
  implementationMode: 'legacy' | 'langchain';
  apiWrapper?: string | null; // 'langchain' or null for direct API calls

  // Optional metadata
  tags?: string[];
  metadata?: Record<string, any>;
  parentRunId?: string;
}

interface LLMResponseData {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  finishReason?: string;
}

/**
 * LLM Logging Service
 *
 * Provides database persistence for LLM requests and responses
 * to match LangSmith's tracing capabilities in legacy mode.
 *
 * Non-breaking: All methods are wrapped in try-catch to prevent
 * logging failures from breaking the main application flow.
 *
 * No defaults: Required fields must be provided or the database
 * insert will fail. This ensures accurate logging.
 */
export class LLMLoggingService {
  private static instance: LLMLoggingService;

  private constructor() {}

  static getInstance(): LLMLoggingService {
    if (!LLMLoggingService.instance) {
      LLMLoggingService.instance = new LLMLoggingService();
    }
    return LLMLoggingService.instance;
  }

  /**
   * Log an LLM request
   * Returns the request ID and run ID for tracking
   *
   * All required fields must be provided, or the database insert will fail.
   */
  async logLLMRequest(data: LLMRequestData): Promise<{ requestId: number; runId: string } | null> {
    try {
      const llmRequest = await prisma.lLMRequest.create({
        data: {
          // Context
          user_id: data.userId,

          // Required fields (no defaults - must be provided)
          url: data.url,
          http_method: data.httpMethod,
          request_body: data.requestBody,
          provider: data.provider,
          model: data.model,
          systemPrompt: data.systemPrompt,
          userMessage: data.userMessage,
          temperature: data.temperature,
          maxTokens: data.maxTokens,
          implementationMode: data.implementationMode,
          apiWrapper: data.apiWrapper || null,

          // Optional metadata
          parentRunId: data.parentRunId,
          tags: data.tags ? JSON.stringify(data.tags) : null,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,

          // Status defaults to 'inprocess' in schema
          // start_time defaults to now() in schema
          // runId auto-generated as UUID in schema
        }
      });

      console.log(`[LLMLoggingService] Started request ${llmRequest.id} with run_id ${llmRequest.runId}`);
      return { requestId: llmRequest.id, runId: llmRequest.runId };
    } catch (error) {
      console.error('[LLMLoggingService] Error starting request:', error);
      if (error instanceof Error) {
        console.error('[LLMLoggingService] Error message:', error.message);
        console.error('[LLMLoggingService] Error stack:', error.stack);
      }
      // Log the data that failed
      console.error('[LLMLoggingService] Failed data:', JSON.stringify(data, null, 2));
      return null;
    }
  }

  /**
   * Log an LLM response
   *
   * All required response fields must be provided.
   * Returns the response ID for linking to messages.
   */
  async logLLMResponse(
    requestId: number,
    responseData: LLMResponseData
  ): Promise<number | null> {
    try {
      const finishTime = new Date();

      // Get the request to calculate latency
      const request = await prisma.lLMRequest.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        console.error(`[LLMLoggingService] Request ${requestId} not found`);
        return null;
      }

      const latencyMs = request.start_time
        ? finishTime.getTime() - new Date(request.start_time).getTime()
        : null;

      // Update request status
      await prisma.lLMRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          finish_time: finishTime
        }
      });

      // Create response record (all required fields must be provided)
      const llmResponse = await prisma.lLMResponse.create({
        data: {
          llmRequestId: requestId,
          response_totality: responseData.content,
          input_tokens: responseData.inputTokens,
          outputTokens: responseData.outputTokens,
          totalTokens: responseData.totalTokens,
          estimated_cost: responseData.estimatedCost,
          latencyMs: latencyMs,
          finishReason: responseData.finishReason
        }
      });

      console.log(`[LLMLoggingService] Completed request ${requestId} with response ${llmResponse.id} (${latencyMs}ms)`);
      return llmResponse.id;
    } catch (error) {
      console.error('[LLMLoggingService] Error completing request:', error);
      if (error instanceof Error) {
        console.error('[LLMLoggingService] Error details:', error.message);
      }
      return null;
    }
  }

  /**
   * Log a failed LLM request
   */
  async failRequest(
    requestId: number,
    errorMessage: string,
    errorType?: string
  ): Promise<void> {
    try {
      await prisma.lLMRequest.update({
        where: { id: requestId },
        data: {
          status: 'failed',
          finish_time: new Date(),
          errorMessage: errorMessage,
          errorType: errorType
        }
      });

      console.log(`[LLMLoggingService] Failed request ${requestId}: ${errorMessage}`);
    } catch (error) {
      console.error('[LLMLoggingService] Error logging failure:', error);
    }
  }

  /**
   * Get request details by ID
   */
  async getRequest(requestId: number) {
    try {
      return await prisma.lLMRequest.findUnique({
        where: { id: requestId },
        include: {
          llmResponse: true
        }
      });
    } catch (error) {
      console.error('[LLMLoggingService] Error getting request:', error);
      return null;
    }
  }

  /**
   * Get request details by run ID
   */
  async getRequestByRunId(runId: string) {
    try {
      return await prisma.lLMRequest.findUnique({
        where: { runId: runId },
        include: {
          llmResponse: true
        }
      });
    } catch (error) {
      console.error('[LLMLoggingService] Error getting request by run ID:', error);
      return null;
    }
  }

  /**
   * Get chat with all messages and their associated LLM requests/responses
   * Provides complete traceability of chat -> messages -> LLM calls
   */
  async getChatWithLLMDetails(chatId: number, userId: number) {
    try {
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: userId,
          overallStatus: 'active'
        },
        include: {
          messages: {
            include: {
              llmRequest: {
                include: {
                  llmResponse: true
                }
              },
              llmResponse: true
            },
            orderBy: { createdAt: 'asc' }
          },
          mortgageScenario: true
        }
      });

      if (!chat) {
        return null;
      }

      // Calculate totals for this chat
      const llmRequests = chat.messages
        .map((m: any) => m.llmRequest)
        .filter((r: any) => r !== null);

      const totalRequests = llmRequests.length;
      const totalTokens = llmRequests.reduce((sum: number, req: any) => {
        const response = req?.llmResponse?.[0];
        return sum + (response?.totalTokens || 0);
      }, 0);
      const totalCost = llmRequests.reduce((sum: number, req: any) => {
        const response = req?.llmResponse?.[0];
        return sum + (response ? Number(response.estimated_cost) : 0);
      }, 0);

      return {
        chat,
        stats: {
          totalRequests,
          totalTokens,
          totalCost: totalCost.toFixed(4),
          messageCount: chat.messages.length
        }
      };
    } catch (error) {
      console.error('[LLMLoggingService] Error getting chat with LLM details:', error);
      return null;
    }
  }

  /**
   * Get analytics for a user's LLM usage
   */
  async getUserAnalytics(userId: number) {
    try {
      const requests = await prisma.lLMRequest.findMany({
        where: { user_id: userId },
        include: {
          llmResponse: true
        }
      });

      const totalRequests = requests.length;
      const completedRequests = requests.filter((r: any) => r.status === 'completed').length;
      const failedRequests = requests.filter((r: any) => r.status === 'failed').length;

      const totalCost = requests.reduce((sum: number, req: any) => {
        const response = req.llmResponse[0];
        return sum + (response ? Number(response.estimated_cost) : 0);
      }, 0);

      const totalTokens = requests.reduce((sum: number, req: any) => {
        const response = req.llmResponse[0];
        return sum + (response?.totalTokens || 0);
      }, 0);

      const avgLatency = requests
        .map((req: any) => req.llmResponse[0]?.latencyMs || 0)
        .reduce((sum: number, lat: number) => sum + lat, 0) / (completedRequests || 1);

      return {
        totalRequests,
        completedRequests,
        failedRequests,
        totalCost,
        totalTokens,
        avgLatency: Math.round(avgLatency)
      };
    } catch (error) {
      console.error('[LLMLoggingService] Error getting analytics:', error);
      return null;
    }
  }
}
