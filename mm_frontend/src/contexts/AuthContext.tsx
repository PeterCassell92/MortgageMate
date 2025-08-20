import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types/auth';
import { AuthAPI } from '../services/api';
import { useError } from './ErrorContext';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const { handleNetworkError } = useError();

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');

    if (storedToken && storedUser) {
      // Simply restore from localStorage without validation
      // Individual components can handle token validation if needed
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await AuthAPI.login({ username, password });
      
      // Store auth data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
    } catch (error: any) {
      if (error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
      throw error;
    }
  };

  const register = async (username: string, password: string): Promise<void> => {
    try {
      const response = await AuthAPI.register({ username, password });
      
      // Store auth data
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
    } catch (error: any) {
      if (error.message.includes('Connection failed')) {
        handleNetworkError(error);
      }
      throw error;
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