import pool from '../utils/database';
import { Chat, CreateChatRequest } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';

export class ChatModel {
  /**
   * Create a new chat with associated mortgage scenario in a single transaction
   */
  static async createWithScenario(
    userId: number, 
    title: string
  ): Promise<{ chatId: string; numericalId: number }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get next numerical ID
      const nextIdResult = await client.query(
        'SELECT COALESCE(MAX(non_unique_numerical_id), 0) + 1 as next_id FROM chats WHERE user_id = $1',
        [userId]
      );
      const nextNumericalId = nextIdResult.rows[0].next_id;
      
      // Create mortgage scenario
      const scenarioResult = await client.query(
        `INSERT INTO mortgage_scenarios (user_id, name, advisor_mode)
         VALUES ($1, $2, $3) RETURNING id`,
        [userId, `${title} Scenario`, 'data_gathering']
      );
      const scenarioId = scenarioResult.rows[0].id;
      
      // Create chat
      const chatUUID = uuidv4();
      const chatResult = await client.query(
        `INSERT INTO chats (chat_id, user_id, title, mortgage_scenario_id, non_unique_numerical_id, overall_status)
         VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
        [chatUUID, userId, title, scenarioId, nextNumericalId]
      );
      
      await client.query('COMMIT');
      
      return {
        chatId: chatUUID,
        numericalId: nextNumericalId
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Legacy method - replaced by Prisma
  static async create(userId: number, data: CreateChatRequest): Promise<Chat> {
    throw new Error('This method is deprecated. Use ChatPersistenceServicePrisma.createNewChatSession instead.');
  }
}