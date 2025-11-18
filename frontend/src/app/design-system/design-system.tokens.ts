/**
 * Design System Tokens
 * 
 * Maps design tokens to CSS variables from the theme system.
 * All components should reference these tokens instead of hardcoded values.
 */

export interface DesignTokens {
  // Colors
  colors: {
    primary: string;
    primaryHover: string;
    primaryActive: string;
    primaryContrast: string;
    secondary: string;
    secondaryHover: string;
    secondaryActive: string;
    secondaryContrast: string;
    background: string;
    backgroundPaper: string;
    surface: string;
    surfaceVariant: string;
    textPrimary: string;
    textSecondary: string;
    textDisabled: string;
    divider: string;
    border: string;
    outline: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  // Component-specific tokens
  button: {
    background: string;
    hover: string;
    active: string;
    text: string;
  };
  
  input: {
    background: string;
    border: string;
    borderFocused: string;
    text: string;
    placeholder: string;
  };
  
  card: {
    background: string;
    border: string;
    shadow: string;
  };
  
  table: {
    header: string;
    row: string;
    rowHover: string;
    rowSelected: string;
    border: string;
  };
}

/**
 * Get design token CSS variable name
 */
export function getTokenVar(category: string, key: string): string {
  return `var(--theme-${category}-${key}, var(--theme-${key}))`;
}

/**
 * Default design tokens mapped to theme CSS variables
 */
export const designTokens: DesignTokens = {
  colors: {
    primary: 'var(--theme-primary)',
    primaryHover: 'var(--theme-primary-dark)',
    primaryActive: 'var(--theme-primary-dark)',
    primaryContrast: 'var(--theme-primary-contrast)',
    secondary: 'var(--theme-secondary)',
    secondaryHover: 'var(--theme-secondary-dark)',
    secondaryActive: 'var(--theme-secondary-dark)',
    secondaryContrast: 'var(--theme-secondary-contrast)',
    background: 'var(--theme-background)',
    backgroundPaper: 'var(--theme-background-paper)',
    surface: 'var(--theme-surface)',
    surfaceVariant: 'var(--theme-surface-variant)',
    textPrimary: 'var(--theme-text-primary)',
    textSecondary: 'var(--theme-text-secondary)',
    textDisabled: 'var(--theme-text-disabled)',
    divider: 'var(--theme-divider)',
    border: 'var(--theme-border)',
    outline: 'var(--theme-outline)',
    success: 'var(--theme-success)',
    warning: 'var(--theme-warning)',
    error: 'var(--theme-error)',
    info: 'var(--theme-info)'
  },
  button: {
    background: 'var(--theme-button-background)',
    hover: 'var(--theme-button-hover)',
    active: 'var(--theme-button-active)',
    text: 'var(--theme-button-text)'
  },
  input: {
    background: 'var(--theme-input-background)',
    border: 'var(--theme-input-border)',
    borderFocused: 'var(--theme-input-border-focused)',
    text: 'var(--theme-input-text)',
    placeholder: 'var(--theme-input-placeholder)'
  },
  card: {
    background: 'var(--theme-card-background)',
    border: 'var(--theme-card-border)',
    shadow: 'var(--theme-card-shadow)'
  },
  table: {
    header: 'var(--theme-table-header)',
    row: 'var(--theme-table-row)',
    rowHover: 'var(--theme-table-row-hover)',
    rowSelected: 'var(--theme-table-row-selected)',
    border: 'var(--theme-table-border)'
  }
};

