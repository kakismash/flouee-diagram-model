export interface Theme {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isDefault: boolean;
  isDark: boolean;
  colors: ThemeColors;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryContrast: string;
  
  // Secondary colors
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  secondaryContrast: string;
  
  // Background colors
  background: string;
  backgroundPaper: string;
  backgroundDefault: string;
  
  // Surface colors
  surface: string;
  surfaceVariant: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  
  // Border and divider colors
  divider: string;
  border: string;
  outline: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Table specific colors
  tableHeader: string;
  tableRow: string;
  tableRowHover: string;
  tableRowSelected: string;
  tableBorder: string;
  
  // Card colors
  cardBackground: string;
  cardBorder: string;
  cardShadow: string;
  
  // Button colors
  buttonBackground: string;
  buttonHover: string;
  buttonActive: string;
  buttonText: string;
  
  // Input colors
  inputBackground: string;
  inputBorder: string;
  inputBorderFocused: string;
  inputText: string;
  inputPlaceholder: string;
}

export interface UserTheme {
  userId: string;
  themeId: string;
  isCustom: boolean;
  customColors?: Partial<ThemeColors>;
  createdAt: Date;
  updatedAt: Date;
}
