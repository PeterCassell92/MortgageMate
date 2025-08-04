export interface User {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
  };
}

export interface MortgageScenario {
  id: number;
  user_id: number;
  name: string;
  mortgage_type: 'Fixed' | 'Variable' | 'Tracker';
  monthly_payment?: number;
  term_length?: number;
  initial_loan_size?: number;
  overpayments?: string; // JSON string
  initial_house_value?: number;
  product_cost?: number;
  exit_fees?: string; // JSON string for sliding scale
  created_at: Date;
  updated_at: Date;
}