import pool from '../utils/database';
import { Chat, CreateChatRequest, ChatWithMessages } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';

export class ChatModel {
  static async create(userId: number, data: CreateChatRequest, client?: PoolClient): Promise<Chat> {
    // Use provided client (for transactions) or default pool
    const db = client || pool;

    // First, get the next numerical ID for this user
    const nextIdQuery = `
      SELECT COALESCE(MAX(non_unique_numerical_id), 0) + 1 as next_id
      FROM chats
      WHERE user_id = $1
    `;

    const nextIdResult = await db.query(nextIdQuery, [userId]);
    const nextNumericalId = nextIdResult.rows[0].next_id;

    // Generate UUID for chat_id
    const chatUUID = uuidv4();

    const query = `
      INSERT INTO chats (chat_id, user_id, title, mortgage_scenario_id, non_unique_numerical_id, overall_status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `;

    const values = [
      chatUUID,
      userId,
      data.title || 'New Chat',
      data.mortgage_scenario_id || null,
      nextNumericalId
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId: number): Promise<Chat[]> {
    const query = `
      SELECT * FROM chats 
      WHERE user_id = $1 AND overall_status = 'active'
      ORDER BY latest_view_time DESC, updated_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findLatestByUserId(userId: number): Promise<Chat | null> {
    const query = `
      SELECT * FROM chats 
      WHERE user_id = $1 AND overall_status = 'active'
      ORDER BY latest_view_time DESC, updated_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  static async findById(chatId: number): Promise<Chat | null> {
    const query = 'SELECT * FROM chats WHERE id = $1';
    const result = await pool.query(query, [chatId]);
    return result.rows[0] || null;
  }

  static async findByUserIdAndNumericalId(userId: number, numericalId: number): Promise<Chat | null> {
    const query = `
      SELECT * FROM chats 
      WHERE user_id = $1 AND non_unique_numerical_id = $2 AND overall_status = 'active'
    `;
    const result = await pool.query(query, [userId, numericalId]);
    return result.rows[0] || null;
  }

  static async updateTitle(chatId: number, title: string): Promise<Chat | null> {
    const query = `
      UPDATE chats 
      SET title = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await pool.query(query, [title, chatId]);
    return result.rows[0] || null;
  }

  static async findWithMessages(chatId: number): Promise<ChatWithMessages | null> {
    const chatQuery = 'SELECT * FROM chats WHERE id = $1';
    const chatResult = await pool.query(chatQuery, [chatId]);
    
    if (chatResult.rows.length === 0) {
      return null;
    }

    const messagesQuery = `
      SELECT * FROM messages 
      WHERE chat_id = $1 
      ORDER BY created_at ASC
    `;
    const messagesResult = await pool.query(messagesQuery, [chatId]);

    return {
      ...chatResult.rows[0],
      messages: messagesResult.rows
    };
  }

  static async updateLatestViewTime(chatId: number): Promise<Chat | null> {
    const query = `
      UPDATE chats 
      SET latest_view_time = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await pool.query(query, [chatId]);
    return result.rows[0] || null;
  }

  static async delete(chatId: number): Promise<boolean> {
    const query = 'DELETE FROM chats WHERE id = $1';
    const result = await pool.query(query, [chatId]);
    return (result.rowCount || 0) > 0;
  }
}