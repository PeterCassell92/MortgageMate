export interface Chat {
  id: number;
  chat_id: string;
  non_unique_numerical_id: number;
  user_id: number;
  title: string;
  overall_status: 'active' | 'inactive';
  mortgage_scenario_id?: number;
  latest_view_time: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: number;
  chat_id: number;
  from_user: string;
  to_user: string;
  message_body: string;
  sent_time: Date;
  received_time?: Date;
  llm_request_id?: number;
  llm_response_id?: number;
  created_at: Date;
}

export interface LLMRequest {
  id: number;
  user_id: number;
  chat_id: number;
  url: string;
  http_method: string;
  request_body: string;
  status: 'inprocess' | 'completed' | 'failed';
  provider: string;
  model: string;
  start_time: Date;
  finish_time?: Date;
  created_at: Date;
}

export interface LLMResponse {
  id: number;
  llm_request_id: number;
  response_totality: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  created_at: Date;
}

export interface CreateChatRequest {
  title?: string;
  mortgage_scenario_id?: number;
}

export interface CreateMessageRequest {
  chat_id: number;
  message_body: string;
  from_user: string;
  to_user: string;
}

export interface ChatWithMessages extends Chat {
  messages: Message[];
}

// Mortgage data structure for LLM context
export interface MortgageScenarioData {
  monthly_payment?: number;
  term_length?: number;
  initial_loan_size?: number;
  overpayments?: string;
  initial_house_value?: number;
  product_cost?: number;
  exit_fees?: string;
  mortgage_type?: 'Fixed' | 'Variable' | 'Tracker';
}