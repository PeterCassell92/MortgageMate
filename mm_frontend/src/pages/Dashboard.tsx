import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import DashboardHome from '../components/DashboardHome';

const Dashboard: React.FC = () => {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default'
    }}>
      <AppHeader />
      
      {/* This will render child routes, or DashboardHome as default */}
      <Outlet />
      
      {/* For now, show DashboardHome directly until we set up nested routes */}
      <DashboardHome />
    </Box>
  );
};

export default Dashboard;