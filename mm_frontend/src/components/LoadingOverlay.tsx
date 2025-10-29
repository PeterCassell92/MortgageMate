import React from 'react';
import { Box, CircularProgress, Backdrop } from '@mui/material';
import { useAppSelector } from '../store/hooks';

/**
 * Application-level loading overlay
 * Displays a spinner over the entire application when isLoading is true
 * Prevents user interaction during async operations like chat creation
 */
const LoadingOverlay: React.FC = () => {
  const isLoading = useAppSelector((state) => state.application.isLoading);

  return (
    <Backdrop
      open={isLoading}
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent black
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress color="inherit" size={60} />
      </Box>
    </Backdrop>
  );
};

export default LoadingOverlay;
