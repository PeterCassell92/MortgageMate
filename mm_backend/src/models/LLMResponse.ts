import pool from '../utils/database';
import { LLMResponse } from '../types/chat';

export class LLMResponseModel {
  static async create(data: {
    llm_request_id: number;
    response_totality: string;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    estimated_cost?: number;
  }): Promise<LLMResponse> {
    const query = `
      INSERT INTO llm_responses (
        llm_request_id, response_totality, input_tokens, 
        output_tokens, total_tokens, estimated_cost
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      data.llm_request_id,
      data.response_totality,
      data.input_tokens || 0,
      data.output_tokens || 0,
      data.total_tokens || 0,
      data.estimated_cost || 0
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(responseId: number): Promise<LLMResponse | null> {
    const query = 'SELECT * FROM llm_responses WHERE id = $1';
    const result = await pool.query(query, [responseId]);
    return result.rows[0] || null;
  }

  static async findByRequestId(requestId: number): Promise<LLMResponse | null> {
    const query = 'SELECT * FROM llm_responses WHERE llm_request_id = $1';
    const result = await pool.query(query, [requestId]);
    return result.rows[0] || null;
  }

  static async update(responseId: number, data: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    estimated_cost?: number;
  }): Promise<LLMResponse | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (data.input_tokens !== undefined) {
      paramCount++;
      fields.push(`input_tokens = $${paramCount}`);
      values.push(data.input_tokens);
    }

    if (data.output_tokens !== undefined) {
      paramCount++;
      fields.push(`output_tokens = $${paramCount}`);
      values.push(data.output_tokens);
    }

    if (data.total_tokens !== undefined) {
      paramCount++;
      fields.push(`total_tokens = $${paramCount}`);
      values.push(data.total_tokens);
    }

    if (data.estimated_cost !== undefined) {
      paramCount++;
      fields.push(`estimated_cost = $${paramCount}`);
      values.push(data.estimated_cost);
    }

    if (fields.length === 0) {
      return null;
    }

    paramCount++;
    values.push(responseId);

    const query = `
      UPDATE llm_responses 
      SET ${fields.join(', ')} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  // Helper function to calculate estimated costs based on provider pricing
  static calculateEstimatedCost(
    provider: string, 
    model: string, 
    inputTokens: number, 
    outputTokens: number
  ): number {
    // Rough pricing estimates (as of 2024) - should be configurable
    const pricing: { [key: string]: { input: number; output: number } } = {
      'anthropic-claude-3-5-sonnet-20241022': { input: 0.003 / 1000, output: 0.015 / 1000 },
      'gpt-4-turbo-preview': { input: 0.01 / 1000, output: 0.03 / 1000 },
      'mock-model-v1': { input: 0, output: 0 }
    };

    const modelKey = `${provider === 'anthropic' ? 'anthropic-' : ''}${model}`;
    const rates = pricing[modelKey] || { input: 0.002 / 1000, output: 0.006 / 1000 };
    
    return (inputTokens * rates.input) + (outputTokens * rates.output);
  }
}