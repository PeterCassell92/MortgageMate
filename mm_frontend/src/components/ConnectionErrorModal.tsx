import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { Refresh as RefreshIcon, WifiOff as WifiOffIcon } from '@mui/icons-material';

interface ConnectionErrorModalProps {
  open: boolean;
  onRefresh: () => void;
}

const ConnectionErrorModal: React.FC<ConnectionErrorModalProps> = ({ 
  open, 
  onRefresh 
}) => {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      aria-labelledby="connection-error-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="connection-error-title">
        <Box display="flex" alignItems="center" gap={1}>
          <WifiOffIcon color="error" />
          Connection Failed
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          Unable to connect to the server. Please check your internet connection.
        </Alert>
        
        <Typography variant="body2" color="text.secondary">
          This could be due to:
        </Typography>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>
            <Typography variant="body2" color="text.secondary">
              No internet connection
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Server is temporarily unavailable
            </Typography>
          </li>
          <li>
            <Typography variant="body2" color="text.secondary">
              Network firewall blocking the connection
            </Typography>
          </li>
        </ul>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={onRefresh}
          variant="contained"
          startIcon={<RefreshIcon />}
          fullWidth
          size="large"
        >
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConnectionErrorModal;