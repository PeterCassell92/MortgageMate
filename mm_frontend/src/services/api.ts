import { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthAPI {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || 'Request failed',
          response.status,
          data.details
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0);
    }
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  static async getCurrentUser(token: string): Promise<{ user: any }> {
    return this.request<{ user: any }>('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  static async validateToken(token: string): Promise<{ valid: boolean; user: any }> {
    return this.request<{ valid: boolean; user: any }>('/api/auth/validate-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  static async refreshToken(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
}