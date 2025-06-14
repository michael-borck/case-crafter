import '@mui/material/styles';

// Extend the MUI theme interface to include custom properties
declare module '@mui/material/styles' {
  interface Theme {
    customShadows?: {
      card: string;
      cardHover: string;
      elevated: string;
    };
  }

  interface ThemeOptions {
    customShadows?: {
      card?: string;
      cardHover?: string;
      elevated?: string;
    };
  }

  interface Palette {
    tertiary?: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
  }

  interface PaletteOptions {
    tertiary?: {
      main?: string;
      light?: string;
      dark?: string;
      contrastText?: string;
    };
  }
}

// Custom component props for consistent theming
export interface ThemedComponentProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  elevation?: number;
}

export type ThemeMode = 'light' | 'dark';