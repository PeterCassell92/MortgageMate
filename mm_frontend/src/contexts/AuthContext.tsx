import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types/auth';
import { AuthAPI } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          // Validate the stored token
          const validation = await AuthAPI.validateToken(storedToken);
          if (validation.valid) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
        } catch (error) {
          // Token validation failed, clear storage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          console.error('Token validation failed:', error);
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await AuthAPI.login({ username, password });
      
      // Store auth data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      throw error; // Re-throw to handle in component
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await AuthAPI.register({ username, password });
      
      // Store auth data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      throw error; // Re-throw to handle in component
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    // Clear storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    // Clear state
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};