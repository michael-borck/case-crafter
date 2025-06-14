import { createTheme, ThemeOptions } from '@mui/material/styles';
import './types'; // Import theme augmentation

// Case Crafter Brand Colors
const brandColors = {
  primary: {
    main: '#2E86AB', // Professional blue
    light: '#5A9BD4',
    dark: '#1A5C7A',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#F24236', // Accent red-orange
    light: '#F56A5F',
    dark: '#C73529',
    contrastText: '#FFFFFF',
  },
  tertiary: {
    main: '#F6AE2D', // Educational yellow
    light: '#F8C660',
    dark: '#D48806',
    contrastText: '#000000',
  },
};

// Base theme configuration
const baseThemeOptions: ThemeOptions = {
  palette: {
    primary: brandColors.primary,
    secondary: brandColors.secondary,
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#2C3E50',
      secondary: '#5D6D7E',
    },
    divider: '#E5E8EC',
  },
  typography: {
    fontFamily: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 24px',
        },
        containedPrimary: {
          background: `linear-gradient(45deg, ${brandColors.primary.main} 30%, ${brandColors.primary.light} 90%)`,
          '&:hover': {
            background: `linear-gradient(45deg, ${brandColors.primary.dark} 30%, ${brandColors.primary.main} 90%)`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#2C3E50',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
};

// Light theme
export const lightTheme = createTheme(baseThemeOptions);

// Dark theme
export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      ...brandColors.primary,
      main: '#5A9BD4', // Lighter blue for dark mode
    },
    secondary: brandColors.secondary,
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0BEC5',
    },
    divider: '#424242',
  },
  components: {
    ...baseThemeOptions.components,
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E',
          color: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(255,255,255,0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#1E1E1E',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          },
        },
      },
    },
  },
});

export default lightTheme;