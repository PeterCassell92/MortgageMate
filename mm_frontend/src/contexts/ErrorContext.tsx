import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ErrorContextType {
  hasConnectionError: boolean;
  setConnectionError: (hasError: boolean) => void;
  handleNetworkError: (error: any) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [hasConnectionError, setHasConnectionError] = useState(false);

  const setConnectionError = (hasError: boolean) => {
    setHasConnectionError(hasError);
  };

  const handleNetworkError = (error: any) => {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      setHasConnectionError(true);
    } else if (error.message === 'Network error' || error.message.includes('Failed to fetch')) {
      setHasConnectionError(true);
    }
  };

  const clearError = () => {
    setHasConnectionError(false);
  };

  const value: ErrorContextType = {
    hasConnectionError,
    setConnectionError,
    handleNetworkError,
    clearError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};