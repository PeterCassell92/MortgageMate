import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Type for API error responses from our backend
interface ApiErrorResponse {
  success?: boolean;
  error?: string;
  message?: string;
  details?: string[];
}

// Get API base URL from environment or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321';

// Create axios instance with base configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout (increased for analysis flow with 2 sequential LLM calls)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adds auth token to every request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Add token to headers if it exists
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Optional: Check if token is expired before making request
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp && payload.exp < now) {
          // Token is expired, clear auth and redirect
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/login';
          return Promise.reject(new Error('Token expired'));
        }
      } catch (error) {
        // If token can't be decoded, let the request continue
        // The backend will handle invalid tokens
        console.warn('Could not decode token:', error);
      }
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handles auth errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Simply return successful responses
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // Clear stored auth data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject(new Error('Authentication required. Please log in again.'));
    }
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    // Handle other errors with proper typing
    const errorData = error.response?.data as ApiErrorResponse;
    const errorMessage = errorData?.error || 
                        errorData?.message ||
                        error.message || 
                        'An unexpected error occurred';
    
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;

// Export typed methods for common operations
export const api = {
  get: <T = unknown>(url: string) => apiClient.get<T>(url),
  post: <T = unknown, D = unknown>(url: string, data?: D) => apiClient.post<T>(url, data),
  put: <T = unknown, D = unknown>(url: string, data?: D) => apiClient.put<T>(url, data),
  delete: <T = unknown>(url: string) => apiClient.delete<T>(url),
  patch: <T = unknown, D = unknown>(url: string, data?: D) => apiClient.patch<T>(url, data),
};

// Special method for file uploads (without Content-Type header)
export const uploadApi = {
  post: <T = unknown>(url: string, formData: FormData) => 
    apiClient.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
};