import axios, { AxiosError } from 'axios';
import { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth';

// Create a separate axios instance for auth that doesn't have token interceptors
const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Type for API error responses from our backend
interface ApiErrorResponse {
  success?: boolean;
  error?: string;
  message?: string;
  details?: string[];
}

class ApiError extends Error {
  public status: number;
  public details?: string[];
  
  constructor(
    message: string,
    status: number,
    details?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export class AuthAPI {
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const { data } = await authClient.post<AuthResponse>('/api/auth/register', userData);
      return data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new ApiError(
        axiosError.message || 'Registration failed',
        axiosError.response?.status || 0,
        axiosError.response?.data?.details
      );
    }
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const { data } = await authClient.post<AuthResponse>('/api/auth/login', credentials);
      return data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new ApiError(
        axiosError.message || 'Login failed',
        axiosError.response?.status || 0,
        axiosError.response?.data?.details
      );
    }
  }

  static async getCurrentUser(token: string): Promise<{ user: Record<string, unknown> }> {
    try {
      // Use authClient with explicit token to avoid interceptor conflicts
      const { data } = await authClient.get<{ user: Record<string, unknown> }>('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new ApiError(
        axiosError.message || 'Failed to get user',
        axiosError.response?.status || 0
      );
    }
  }

  static async validateToken(token: string): Promise<{ valid: boolean; user: Record<string, unknown> }> {
    try {
      const { data } = await authClient.post<{ valid: boolean; user: Record<string, unknown> }>(
        '/api/auth/validate-token',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new ApiError(
        axiosError.message || 'Token validation failed',
        axiosError.response?.status || 0
      );
    }
  }

  static async refreshToken(token: string): Promise<AuthResponse> {
    try {
      const { data } = await authClient.post<AuthResponse>(
        '/api/auth/refresh',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      return data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      throw new ApiError(
        axiosError.message || 'Token refresh failed',
        axiosError.response?.status || 0
      );
    }
  }
}