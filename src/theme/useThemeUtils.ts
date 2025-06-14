import { useTheme as useMuiTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

/**
 * Custom hook that provides theme utilities and responsive design helpers
 */
export const useThemeUtils = () => {
  const theme = useMuiTheme();
  
  // Responsive breakpoints
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Theme mode check
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Common spacing values
  const spacing = {
    xs: theme.spacing(1), // 8px
    sm: theme.spacing(2), // 16px
    md: theme.spacing(3), // 24px
    lg: theme.spacing(4), // 32px
    xl: theme.spacing(6), // 48px
  };
  
  // Common shadows
  const shadows = {
    card: theme.shadows[2],
    cardHover: theme.shadows[4],
    elevated: theme.shadows[8],
  };
  
  // Brand colors
  const brandColors = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    tertiary: '#F6AE2D', // Educational yellow
    success: theme.palette.success?.main || '#4CAF50',
    warning: theme.palette.warning?.main || '#FF9800',
    error: theme.palette.error?.main || '#F44336',
  };
  
  return {
    theme,
    // Responsive flags
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    // Theme state
    isDarkMode,
    // Utilities
    spacing,
    shadows,
    brandColors,
    // Helper functions
    getSpacing: (multiplier: number) => theme.spacing(multiplier),
    getShadow: (elevation: number) => theme.shadows[elevation],
  };
};