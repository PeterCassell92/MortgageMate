import { ChatModel } from '../models/Chat';
import { MessageModel } from '../models/Message';
import { LLMRequestModel } from '../models/LLMRequest';
import { LLMResponseModel } from '../models/LLMResponse';
import { MortgageAdvisorService, AdvisorSession } from './MortgageConversation/mortgageAdvisorService';
import type { MortgageData } from '@mortgagemate/models';
import pool from '../utils/database';

export interface PersistedChatSession {
  chatId: number;
  numericalId: number;
  advisorSession: AdvisorSession;
  conversationHistory: string[];
}

export class ChatPersistenceService {
  
  /**
   * Save chat session to database with full persistence
   */
  static async saveSessionToDatabase(
    chatId: string, 
    userId: number, 
    advisorSession: AdvisorSession,
    userMessage?: string,
    aiResponse?: string,
    llmRequestId?: number,
    llmResponseId?: number
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Convert UUID chatId to integer for database lookup
      const chatIdInt = await this.getChatIdFromUUID(chatId);
      if (!chatIdInt) {
        throw new Error(`Chat not found for UUID: ${chatId}`);
      }
      
      // Update latest_view_time for this chat
      await ChatModel.updateLatestViewTime(chatIdInt);
      
      // Save or update mortgage scenario with advisor session data
      await this.saveAdvisorSessionToMortgageScenario(
        client,
        chatIdInt,
        userId,
        advisorSession
      );
      
      // Save messages if provided
      // MortgageAdvisor user ID = 0
      const MORTGAGE_ADVISOR_ID = 0;

      if (userMessage) {
        await MessageModel.create({
          chat_id: chatIdInt,
          from_user_id: userId,
          to_user_id: MORTGAGE_ADVISOR_ID,
          message_body: userMessage,
          llm_request_id: llmRequestId
        });
      }

      if (aiResponse) {
        await MessageModel.create({
          chat_id: chatIdInt,
          from_user_id: MORTGAGE_ADVISOR_ID,
          to_user_id: userId,
          message_body: aiResponse,
          llm_request_id: llmRequestId,
          llm_response_id: llmResponseId
        });
      }
      
      await client.query('COMMIT');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to save chat session:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Restore complete advisor session from database using numerical ID
   */
  static async restoreSessionFromDatabase(
    numericalId: number, 
    userId: number
  ): Promise<PersistedChatSession | null> {
    try {
      // First convert numerical ID to UUID chatId
      const chatId = await this.getChatIdFromNumericalId(userId, numericalId);
      if (!chatId) {
        return null;
      }
      
      // Now get the internal database ID
      const chatIdInt = await this.getChatIdFromUUID(chatId);
      if (!chatIdInt) {
        return null;
      }
      
      // Find the chat for additional info
      const chat = await ChatModel.findById(chatIdInt);
      if (!chat || chat.user_id !== userId) {
        return null;
      }
      
      // Update latest_view_time
      await ChatModel.updateLatestViewTime(chatIdInt);
      
      // Get chat with messages
      const chatWithMessages = await ChatModel.findWithMessages(chatIdInt);
      if (!chatWithMessages || chatWithMessages.user_id !== userId) {
        return null;
      }
      
      // Restore mortgage scenario data
      const mortgageData = await this.getMortgageScenarioData(chatWithMessages.mortgage_scenario_id || null);
      
      // Reconstruct conversation history from messages
      const conversationHistory = this.reconstructConversationHistory(chatWithMessages.messages);
      
      // Determine advisor mode and analysis state
      const lastAnalysis = await this.getLastAnalysis(chatWithMessages.mortgage_scenario_id || null);
      
      // Reconstruct advisor session
      const advisorSession: AdvisorSession = {
        mode: (mortgageData.advisor_mode as any) || 'data_gathering',
        mortgageData: mortgageData,
        conversationHistory: conversationHistory,
        lastAnalysis: lastAnalysis,
        completenessScore: MortgageAdvisorService.calculateCompleteness(mortgageData)
      };
      
      return {
        chatId: chatIdInt,
        numericalId: chat.non_unique_numerical_id,
        advisorSession,
        conversationHistory
      };
      
    } catch (error) {
      console.error('Failed to restore chat session:', error);
      return null;
    }
  }
  
  /**
   * Create new chat session in database
   */
  static async createNewChatSession(userId: number, title?: string): Promise<{ chatId: string; numericalId: number }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create associated mortgage scenario FIRST
      const mortgageScenarioQuery = `
        INSERT INTO mortgage_scenarios (user_id, name, advisor_mode)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      
      const scenarioResult = await client.query(mortgageScenarioQuery, [
        userId,
        title || 'New Mortgage Scenario',
        'data_gathering'
      ]);
      
      const scenarioId = scenarioResult.rows[0].id;

      // Now create chat record with proper mortgage_scenario_id
      // Pass the client to ensure it's part of the same transaction
      const chat = await ChatModel.create(userId, {
        title: title || 'New Chat',
        mortgage_scenario_id: scenarioId
      }, client);

      await client.query('COMMIT');
      
      // Return UUID chatId and user-friendly numerical ID
      return {
        chatId: chat.chat_id, // Return the actual UUID
        numericalId: chat.non_unique_numerical_id
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to create new chat session:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get user's chat list ordered by latest_view_time
   */
  static async getUserChats(userId: number): Promise<any[]> {
    const chats = await ChatModel.findByUserId(userId);
    
    return chats.map(chat => ({
      id: chat.id,
      numericalId: chat.non_unique_numerical_id,
      title: chat.title,
      lastViewed: chat.latest_view_time,
      updatedAt: chat.updated_at,
      createdAt: chat.created_at
    }));
  }

  /**
   * Get user's most recently viewed chat
   */
  static async getLatestChatForUser(userId: number): Promise<{ numericalId: number } | null> {
    const latestChat = await ChatModel.findLatestByUserId(userId);
    if (!latestChat) {
      return null;
    }
    
    return {
      numericalId: latestChat.non_unique_numerical_id
    };
  }

  /**
   * Soft delete chat by setting overall_status to 'inactive'
   */
  static async softDeleteChat(chatId: string, userId: number): Promise<boolean> {
    try {
      // Convert UUID chatId to integer for database lookup
      const chatIdInt = await this.getChatIdFromUUID(chatId);
      if (!chatIdInt) {
        return false;
      }

      // Verify ownership before deletion
      const chat = await ChatModel.findById(chatIdInt);
      if (!chat || chat.user_id !== userId) {
        return false;
      }

      // Update overall_status to 'inactive'
      const updateQuery = `
        UPDATE chats 
        SET overall_status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND user_id = $2 AND overall_status = 'active'
        RETURNING id
      `;
      
      const result = await pool.query(updateQuery, [chatIdInt, userId]);
      return result.rows.length > 0;
      
    } catch (error) {
      console.error('Failed to soft delete chat:', error);
      return false;
    }
  }
  
  // Helper methods
  
  /**
   * Convert numerical ID to UUID chatId for database operations
   */
  static async getChatIdFromNumericalId(userId: number, numericalId: number): Promise<string | null> {
    const chat = await ChatModel.findByUserIdAndNumericalId(userId, numericalId);
    if (!chat) {
      return null;
    }
    return chat.chat_id; // Return the actual UUID
  }
  
  private static async getChatIdFromUUID(chatUUID: string): Promise<number | null> {
    // Find chat by UUID and return internal database ID
    const query = 'SELECT id FROM chats WHERE chat_id = $1';
    const result = await pool.query(query, [chatUUID]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].id;
  }
  
  private static async saveAdvisorSessionToMortgageScenario(
    client: any,
    chatId: number,
    userId: number,
    advisorSession: AdvisorSession
  ): Promise<void> {
    // Get chat to find mortgage_scenario_id
    const chat = await ChatModel.findById(chatId);
    if (!chat || !chat.mortgage_scenario_id) {
      throw new Error('Chat or mortgage scenario not found');
    }
    
    const data = advisorSession.mortgageData;
    const stage = MortgageAdvisorService.getConversationStage(advisorSession);
    const priority = MortgageAdvisorService.getCurrentPriority(advisorSession);
    
    const updateQuery = `
      UPDATE mortgage_scenarios SET
        advisor_mode = $1,
        conversation_stage = $2,
        current_priority = $3,
        property_location = $4,
        property_type = $5,
        property_value = $6,
        property_use = $7,
        current_lender = $8,
        mortgage_type = $9,
        current_balance = $10,
        monthly_payment = $11,
        current_rate = $12,
        term_length = $13,
        product_end_date = $14,
        exit_fees = $15,
        early_repayment_charges = $16,
        annual_income = $17,
        employment_status = $18,
        credit_score = $19,
        existing_debts = $20,
        disposable_income = $21,
        available_deposit = $22,
        primary_objective = $23,
        risk_tolerance = $24,
        preferred_term = $25,
        payment_preference = $26,
        timeline = $27,
        additional_context = $28,
        documents_summary = $29,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $30 AND user_id = $31
    `;
    
    const values = [
      advisorSession.mode,
      stage,
      priority,
      data.propertyLocation || null,
      data.propertyType || null,
      data.propertyValue || null,
      data.propertyUse || null,
      data.currentLender || null,
      data.mortgageType || null,
      data.currentBalance || null,
      data.monthlyPayment || null,
      data.currentRate || null,
      data.termRemaining || null,
      data.productEndDate || null,
      data.exitFees || null,
      data.earlyRepaymentCharges || null,
      data.annualIncome || null,
      data.employmentStatus || null,
      data.creditScore || null,
      data.existingDebts || null,
      data.disposableIncome || null,
      data.availableDeposit || null,
      data.primaryObjective || null,
      data.riskTolerance || null,
      data.preferredTerm || null,
      data.paymentPreference || null,
      data.timeline || null,
      data.additionalContext || null,
      data.documentsSummary || null,
      chat.mortgage_scenario_id,
      userId
    ];
    
    await client.query(updateQuery, values);
  }
  
  private static async getMortgageScenarioData(scenarioId: number | null): Promise<Partial<MortgageData> & { advisor_mode?: string }> {
    if (!scenarioId) {
      return {};
    }
    
    const query = 'SELECT * FROM mortgage_scenarios WHERE id = $1';
    const result = await pool.query(query, [scenarioId]);
    
    if (result.rows.length === 0) {
      return {};
    }
    
    const row = result.rows[0];
    
    return {
      advisor_mode: row.advisor_mode,
      propertyLocation: row.property_location,
      propertyType: row.property_type,
      propertyValue: row.property_value,
      propertyUse: row.property_use,
      currentLender: row.current_lender,
      mortgageType: row.mortgage_type,
      currentBalance: row.current_balance,
      monthlyPayment: row.monthly_payment,
      currentRate: row.current_rate,
      termRemaining: row.term_length,
      productEndDate: row.product_end_date,
      exitFees: row.exit_fees,
      earlyRepaymentCharges: row.early_repayment_charges,
      annualIncome: row.annual_income,
      employmentStatus: row.employment_status,
      creditScore: row.credit_score,
      existingDebts: row.existing_debts,
      disposableIncome: row.disposable_income,
      availableDeposit: row.available_deposit,
      primaryObjective: row.primary_objective,
      riskTolerance: row.risk_tolerance,
      preferredTerm: row.preferred_term,
      paymentPreference: row.payment_preference,
      timeline: row.timeline,
      additionalContext: row.additional_context,
      documentsSummary: row.documents_summary
    };
  }
  
  private static reconstructConversationHistory(messages: any[]): string[] {
    const MORTGAGE_ADVISOR_ID = 0;
    return messages.map(msg => {
      const role = msg.from_user_id === MORTGAGE_ADVISOR_ID ? 'AI' : 'User';
      return `${role}: ${msg.message_body}`;
    });
  }
  
  private static async getLastAnalysis(scenarioId: number | null): Promise<string | undefined> {
    if (!scenarioId) {
      return undefined;
    }
    
    const query = `
      SELECT llm_response 
      FROM analyses 
      WHERE mortgage_scenario_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [scenarioId]);
    return result.rows[0]?.llm_response;
  }
}