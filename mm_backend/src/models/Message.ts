import pool from '../utils/database';
import { Message, CreateMessageRequest } from '../types/chat';

export class MessageModel {
  static async create(data: CreateMessageRequest & {
    from_user_id: number;
    to_user_id: number;
    llm_request_id?: number;
    llm_response_id?: number;
  }): Promise<Message> {
    const query = `
      INSERT INTO messages (
        chat_id, from_user_id, to_user_id, message_body,
        llm_request_id, llm_response_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.chat_id,
      data.from_user_id,
      data.to_user_id,
      data.message_body,
      data.llm_request_id || null,
      data.llm_response_id || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByChatId(chatId: number): Promise<Message[]> {
    const query = `
      SELECT * FROM messages 
      WHERE chat_id = $1 
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [chatId]);
    return result.rows;
  }

  static async findById(messageId: number): Promise<Message | null> {
    const query = 'SELECT * FROM messages WHERE id = $1';
    const result = await pool.query(query, [messageId]);
    return result.rows[0] || null;
  }


  static async linkLLMRequest(messageId: number, llmRequestId: number): Promise<Message | null> {
    const query = `
      UPDATE messages 
      SET llm_request_id = $1 
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await pool.query(query, [llmRequestId, messageId]);
    return result.rows[0] || null;
  }

  static async linkLLMResponse(messageId: number, llmResponseId: number): Promise<Message | null> {
    const query = `
      UPDATE messages 
      SET llm_response_id = $1 
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await pool.query(query, [llmResponseId, messageId]);
    return result.rows[0] || null;
  }

  static async delete(messageId: number): Promise<boolean> {
    const query = 'DELETE FROM messages WHERE id = $1';
    const result = await pool.query(query, [messageId]);
    return (result.rowCount || 0) > 0;
  }
}