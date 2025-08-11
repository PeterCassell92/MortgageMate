import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
} from '@mui/material';

const DashboardHome: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
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
  );
};

export default DashboardHome;