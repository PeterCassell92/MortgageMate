import React from 'react';
import {
  Box,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
  Fab
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSidebarExpanded } from '../store/slices/chatSlice';

interface SidebarProps {
  children: React.ReactNode;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  children, 
  mobileOpen = false, 
  onMobileClose 
}) => {
  const dispatch = useAppDispatch();
  const sidebarExpanded = useAppSelector(state => state.chat.sidebarExpanded);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleToggleSidebar = () => {
    dispatch(setSidebarExpanded(!sidebarExpanded));
  };

  const sidebarWidth = 300;
  const collapsedWidth = 0;

  const sidebarContent = (
    <Box sx={{ 
      width: sidebarWidth, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Collapse button */}
      {!isMobile && (
        <IconButton
          onClick={handleToggleSidebar}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            zIndex: 1,
            bgcolor: 'background.paper',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      )}
      
      {children}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: sidebarWidth,
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <>
      {/* Collapsed state - floating expand button */}
      {!sidebarExpanded && (
        <Fab
          color="primary"
          onClick={handleToggleSidebar}
          sx={{
            position: 'fixed',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: theme.zIndex.drawer + 1,
            width: 48,
            height: 48,
          }}
        >
          <ChevronRightIcon />
        </Fab>
      )}

      {/* Expanded sidebar */}
      <Drawer
        variant="persistent"
        open={sidebarExpanded}
        sx={{
          width: sidebarExpanded ? sidebarWidth : collapsedWidth,
          flexShrink: 0,
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            boxSizing: 'border-box',
            position: 'relative',
            transition: theme.transitions.create('transform', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    </>
  );
};

export default Sidebar;