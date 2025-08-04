import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  AppBar,
  Toolbar,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MortgageMate
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Welcome, {user?.username}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column' }}>
          <Typography component="h1" variant="h4" gutterBottom>
            Dashboard
          </Typography>
          
          <Typography variant="body1" paragraph>
            Welcome to MortgageMate! This is your dashboard where you'll be able to:
          </Typography>

          <Box component="ul" sx={{ pl: 3 }}>
            <Typography component="li" variant="body1">
              Create and manage mortgage scenarios
            </Typography>
            <Typography component="li" variant="body1">
              Chat with our AI to capture mortgage details
            </Typography>
            <Typography component="li" variant="body1">
              Get analysis on the best mortgage deals for you
            </Typography>
            <Typography component="li" variant="body1">
              View recommendations and savings calculations
            </Typography>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Coming soon: Mortgage scenario management and AI-powered analysis!
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Dashboard;