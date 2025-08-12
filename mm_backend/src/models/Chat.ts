import pool from '../utils/database';
import { Chat, CreateChatRequest, ChatWithMessages } from '../types/chat';

export class ChatModel {
  static async create(userId: number, data: CreateChatRequest): Promise<Chat> {
    const query = `
      INSERT INTO chats (user_id, title, mortgage_scenario_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const values = [
      userId,
      data.title || 'New Chat',
      data.mortgage_scenario_id || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId: number): Promise<Chat[]> {
    const query = `
      SELECT * FROM chats 
      WHERE user_id = $1 
      ORDER BY updated_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findLatestByUserId(userId: number): Promise<Chat | null> {
    const query = `
      SELECT * FROM chats 
      WHERE user_id = $1 
      ORDER BY updated_at DESC 
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
      ORDER BY sent_time ASC
    `;
    const messagesResult = await pool.query(messagesQuery, [chatId]);

    return {
      ...chatResult.rows[0],
      messages: messagesResult.rows
    };
  }

  static async delete(chatId: number): Promise<boolean> {
    const query = 'DELETE FROM chats WHERE id = $1';
    const result = await pool.query(query, [chatId]);
    return (result.rowCount || 0) > 0;
  }
}