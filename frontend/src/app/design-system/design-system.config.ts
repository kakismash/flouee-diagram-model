/**
 * Design System Configuration
 * 
 * Centralized configuration for sizes, variants, spacing, and other design tokens.
 * All values should map to CSS variables in themes.css
 */

export type ComponentSize = 'small' | 'medium' | 'large';
export type ComponentVariant = 'primary' | 'secondary' | 'text' | 'outline' | 'ghost';
export type ComponentShape = 'square' | 'round';
export type ButtonType = 'button' | 'submit' | 'reset';

export interface SizeConfig {
  height: string;
  padding: string;
  fontSize: string;
  iconSize: string;
  borderRadius: string;
}

export interface DesignSystemConfig {
  sizes: {
    small: SizeConfig;
    medium: SizeConfig;
    large: SizeConfig;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    none: string;
    small: string;
    medium: string;
    large: string;
    full: string;
  };
  shadows: {
    none: string;
    small: string;
    medium: string;
    large: string;
    xl: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  zIndex: {
    dropdown: number;
    modal: number;
    tooltip: number;
    notification: number;
  };
}

export const designSystemConfig: DesignSystemConfig = {
  sizes: {
    small: {
      height: '32px',
      padding: '6px 12px',
      fontSize: '12px',
      iconSize: '16px',
      borderRadius: 'var(--ds-radius-small, 4px)'
    },
    medium: {
      height: '40px',
      padding: '8px 16px',
      fontSize: '14px',
      iconSize: '20px',
      borderRadius: 'var(--ds-radius-medium, 8px)'
    },
    large: {
      height: '48px',
      padding: '12px 24px',
      fontSize: '16px',
      iconSize: '24px',
      borderRadius: 'var(--ds-radius-large, 12px)'
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    none: '0',
    small: 'var(--ds-radius-small, 4px)',
    medium: 'var(--ds-radius-medium, 8px)',
    large: 'var(--ds-radius-large, 12px)',
    full: '9999px'
  },
  shadows: {
    none: 'none',
    small: '0 1px 2px rgba(0, 0, 0, 0.05)',
    medium: '0 4px 6px rgba(0, 0, 0, 0.1)',
    large: '0 10px 15px rgba(0, 0, 0, 0.15)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.2)'
  },
  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease'
  },
  zIndex: {
    dropdown: 1000,
    modal: 2000,
    tooltip: 3000,
    notification: 4000
  }
};

