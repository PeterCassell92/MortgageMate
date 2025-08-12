import pool from '../utils/database';
import { LLMRequest } from '../types/chat';

export class LLMRequestModel {
  static async create(data: {
    user_id: number;
    chat_id: number;
    url: string;
    http_method: string;
    request_body: string;
    provider: string;
    model: string;
  }): Promise<LLMRequest> {
    const query = `
      INSERT INTO llm_requests (
        user_id, chat_id, url, http_method, request_body, 
        status, provider, model, start_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      data.user_id,
      data.chat_id,
      data.url,
      data.http_method,
      data.request_body,
      'inprocess',
      data.provider,
      data.model,
      new Date()
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStatus(
    requestId: number, 
    status: 'inprocess' | 'completed' | 'failed',
    finishTime?: Date
  ): Promise<LLMRequest | null> {
    const query = `
      UPDATE llm_requests 
      SET status = $1, finish_time = $2 
      WHERE id = $3 
      RETURNING *
    `;
    
    const values = [status, finishTime || new Date(), requestId];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  static async findById(requestId: number): Promise<LLMRequest | null> {
    const query = 'SELECT * FROM llm_requests WHERE id = $1';
    const result = await pool.query(query, [requestId]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: number): Promise<LLMRequest[]> {
    const query = `
      SELECT * FROM llm_requests 
      WHERE user_id = $1 
      ORDER BY start_time DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByChatId(chatId: number): Promise<LLMRequest[]> {
    const query = `
      SELECT * FROM llm_requests 
      WHERE chat_id = $1 
      ORDER BY start_time ASC
    `;
    
    const result = await pool.query(query, [chatId]);
    return result.rows;
  }

  static async getUsageStats(userId?: number, dateFrom?: Date, dateTo?: Date): Promise<{
    total_requests: number;
    completed_requests: number;
    failed_requests: number;
    total_input_tokens: number;
    total_output_tokens: number;
    estimated_total_cost: number;
  }> {
    let query = `
      SELECT 
        COUNT(lr.id) as total_requests,
        COUNT(CASE WHEN lr.status = 'completed' THEN 1 END) as completed_requests,
        COUNT(CASE WHEN lr.status = 'failed' THEN 1 END) as failed_requests,
        COALESCE(SUM(lresp.input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(lresp.output_tokens), 0) as total_output_tokens,
        COALESCE(SUM(lresp.estimated_cost), 0) as estimated_total_cost
      FROM llm_requests lr
      LEFT JOIN llm_responses lresp ON lr.id = lresp.llm_request_id
      WHERE 1=1
    `;
    
    const values: any[] = [];
    let paramCount = 0;

    if (userId) {
      paramCount++;
      query += ` AND lr.user_id = $${paramCount}`;
      values.push(userId);
    }

    if (dateFrom) {
      paramCount++;
      query += ` AND lr.start_time >= $${paramCount}`;
      values.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND lr.start_time <= $${paramCount}`;
      values.push(dateTo);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
  }
}