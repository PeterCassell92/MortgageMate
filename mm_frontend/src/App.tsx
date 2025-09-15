import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorProvider, useError } from './contexts/ErrorContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ConnectionErrorModal from './components/ConnectionErrorModal';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user} = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route component (redirect to dashboard if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  return user ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

// Error Modal Handler component
const ErrorModalHandler: React.FC = () => {
  const { hasConnectionError, clearError } = useError();

  const handleRefresh = () => {
    clearError();
    window.location.reload();
  };

  return (
    <ConnectionErrorModal
      open={hasConnectionError}
      onRefresh={handleRefresh}
    />
  );
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorProvider>
          <AuthProvider>
            <Router>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                }
              />
              <Route
                path="/dashboard/chat/:numericalId"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/chat"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={<Navigate to="/dashboard/chat" replace />}
              />
              <Route
                path="/chat/:numericalId"
                element={<Navigate to={`/dashboard/chat/${window.location.pathname.split('/').pop()}`} replace />}
              />
              <Route
                path="/chat"
                element={<Navigate to="/dashboard/chat" replace />}
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
              <ErrorModalHandler />
            </Router>
          </AuthProvider>
        </ErrorProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
