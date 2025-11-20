import { createTheme } from '@mui/material/styles';

// MortgageMate Brand Colors
const brandColors = {
  // Primary green from the owl logo
  primaryGreen: '#409540',
  primaryGreenLight: '#5AAA5A', // Lighter tint for hover states
  primaryGreenDark: '#2E6B2E',  // Darker shade for active states

  // Secondary brown from the owl logo
  secondaryBrown: '#705327',
  secondaryBrownLight: '#8A6A3F', // Lighter tint for hover states
  secondaryBrownDark: '#573F1C',  // Darker shade for active states

  // Additional UI colors
  background: {
    default: '#FAFAFA',
    paper: '#FFFFFF',
  },
  text: {
    primary: '#1F1F1F',
    secondary: '#5F5F5F',
  }
};

// Create MortgageMate custom theme
export const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.primaryGreen,
      light: brandColors.primaryGreenLight,
      dark: brandColors.primaryGreenDark,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: brandColors.secondaryBrown,
      light: brandColors.secondaryBrownLight,
      dark: brandColors.secondaryBrownDark,
      contrastText: '#FFFFFF',
    },
    background: brandColors.background,
    text: brandColors.text,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none', // Keep button text in normal case
    },
  },
  shape: {
    borderRadius: 8, // Slightly rounded corners for a modern look
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
            transition: 'transform 0.2s ease-in-out',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

export default theme;
