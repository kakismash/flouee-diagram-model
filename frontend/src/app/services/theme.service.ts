import { Injectable, signal, computed } from '@angular/core';
import { Theme, ThemeColors, UserTheme } from '../models/theme.model';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = signal<Theme | null>(null);
  private availableThemes = signal<Theme[]>([]);
  private userTheme = signal<UserTheme | null>(null);

  // Computed signals
  isDarkMode = computed(() => this.currentTheme()?.isDark ?? false);
  themeColors = computed(() => this.currentTheme()?.colors);
  
  // Public signals for components to subscribe
  currentTheme$ = this.currentTheme.asReadonly();
  availableThemes$ = this.availableThemes.asReadonly();

  constructor() {
    this.initializeDefaultThemes();
    this.loadUserTheme();
  }

  /**
   * Initialize default themes
   */
  private initializeDefaultThemes(): void {
    const defaultThemes: Theme[] = [
      this.createLightTheme(),
      this.createDarkTheme(),
      this.createMaterialTheme(),
      this.createMonokaiTheme(),
      this.createSolarizedTheme(),
      this.createDraculaTheme()
    ];

    this.availableThemes.set(defaultThemes);
  }

  /**
   * Create Light theme (default)
   */
  private createLightTheme(): Theme {
    return {
      id: 'light',
      name: 'light',
      displayName: 'Light',
      description: 'Clean and bright theme for daytime use',
      isDefault: true,
      isDark: false,
      colors: {
        primary: '#1976d2',
        primaryLight: '#42a5f5',
        primaryDark: '#1565c0',
        primaryContrast: '#ffffff',
        
        secondary: '#dc004e',
        secondaryLight: '#ff5983',
        secondaryDark: '#9a0036',
        secondaryContrast: '#ffffff',
        
        background: '#fafafa',
        backgroundPaper: '#ffffff',
        backgroundDefault: '#fafafa',
        
        surface: '#ffffff',
        surfaceVariant: '#f5f5f5',
        
        textPrimary: 'rgba(0, 0, 0, 0.87)',
        textSecondary: 'rgba(0, 0, 0, 0.6)',
        textDisabled: 'rgba(0, 0, 0, 0.38)',
        
        divider: 'rgba(0, 0, 0, 0.12)',
        border: '#e0e0e0',
        outline: '#bdbdbd',
        
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
        
        tableHeader: '#f5f5f5',
        tableRow: '#ffffff',
        tableRowHover: '#f0f0f0',
        tableRowSelected: '#e3f2fd',
        tableBorder: '#e0e0e0',
        
        cardBackground: '#ffffff',
        cardBorder: '#e0e0e0',
        cardShadow: 'rgba(0, 0, 0, 0.1)',
        
        buttonBackground: '#1976d2',
        buttonHover: '#1565c0',
        buttonActive: '#0d47a1',
        buttonText: '#ffffff',
        
        inputBackground: '#ffffff',
        inputBorder: '#bdbdbd',
        inputBorderFocused: '#1976d2',
        inputText: 'rgba(0, 0, 0, 0.87)',
        inputPlaceholder: 'rgba(0, 0, 0, 0.6)'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Dark theme
   */
  private createDarkTheme(): Theme {
    return {
      id: 'dark',
      name: 'dark',
      displayName: 'Dark',
      description: 'Easy on the eyes for nighttime use',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#90caf9',
        primaryLight: '#e3f2fd',
        primaryDark: '#42a5f5',
        primaryContrast: '#000000',
        
        secondary: '#f48fb1',
        secondaryLight: '#fce4ec',
        secondaryDark: '#ad1457',
        secondaryContrast: '#000000',
        
        background: '#121212',
        backgroundPaper: '#1e1e1e',
        backgroundDefault: '#121212',
        
        surface: '#1e1e1e',
        surfaceVariant: '#2d2d2d',
        
        textPrimary: '#ffffff',
        textSecondary: 'rgba(255, 255, 255, 0.7)',
        textDisabled: 'rgba(255, 255, 255, 0.5)',
        
        divider: 'rgba(255, 255, 255, 0.12)',
        border: '#424242',
        outline: '#616161',
        
        success: '#81c784',
        warning: '#ffb74d',
        error: '#e57373',
        info: '#64b5f6',
        
        tableHeader: '#2d2d2d',
        tableRow: '#1e1e1e',
        tableRowHover: '#2d2d2d',
        tableRowSelected: '#424242',
        tableBorder: '#424242',
        
        cardBackground: '#1e1e1e',
        cardBorder: '#424242',
        cardShadow: 'rgba(0, 0, 0, 0.3)',
        
        buttonBackground: '#1976d2',
        buttonHover: '#1565c0',
        buttonActive: '#0d47a1',
        buttonText: '#ffffff',
        
        inputBackground: '#2d2d2d',
        inputBorder: '#616161',
        inputBorderFocused: '#90caf9',
        inputText: '#ffffff',
        inputPlaceholder: 'rgba(255, 255, 255, 0.7)'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Material theme
   */
  private createMaterialTheme(): Theme {
    return {
      id: 'material',
      name: 'material',
      displayName: 'Material',
      description: 'Google Material Design inspired theme',
      isDefault: false,
      isDark: false,
      colors: {
        primary: '#6200ea',
        primaryLight: '#9c4dcc',
        primaryDark: '#3700b3',
        primaryContrast: '#ffffff',
        
        secondary: '#03dac6',
        secondaryLight: '#66fff9',
        secondaryDark: '#018786',
        secondaryContrast: '#000000',
        
        background: '#fefefe',
        backgroundPaper: '#ffffff',
        backgroundDefault: '#fefefe',
        
        surface: '#ffffff',
        surfaceVariant: '#f3e5f5',
        
        textPrimary: '#212121',
        textSecondary: '#757575',
        textDisabled: '#bdbdbd',
        
        divider: '#e0e0e0',
        border: '#e1bee7',
        outline: '#ce93d8',
        
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
        
        tableHeader: '#f3e5f5',
        tableRow: '#ffffff',
        tableRowHover: '#fce4ec',
        tableRowSelected: '#e8f5e8',
        tableBorder: '#e1bee7',
        
        cardBackground: '#ffffff',
        cardBorder: '#e1bee7',
        cardShadow: 'rgba(98, 0, 234, 0.1)',
        
        buttonBackground: '#6200ea',
        buttonHover: '#3700b3',
        buttonActive: '#4a148c',
        buttonText: '#ffffff',
        
        inputBackground: '#ffffff',
        inputBorder: '#ce93d8',
        inputBorderFocused: '#6200ea',
        inputText: '#212121',
        inputPlaceholder: '#757575'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Monokai theme
   */
  private createMonokaiTheme(): Theme {
    return {
      id: 'monokai',
      name: 'monokai',
      displayName: 'Monokai',
      description: 'Sublime Text Monokai inspired theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#a6e22e',
        primaryLight: '#b8e633',
        primaryDark: '#8cc83a',
        primaryContrast: '#272822',
        
        secondary: '#f92672',
        secondaryLight: '#ff6699',
        secondaryDark: '#e91e63',
        secondaryContrast: '#ffffff',
        
        background: '#272822',
        backgroundPaper: '#3e3d32',
        backgroundDefault: '#272822',
        
        surface: '#3e3d32',
        surfaceVariant: '#49483e',
        
        textPrimary: '#f8f8f2',
        textSecondary: '#75715e',
        textDisabled: '#49483e',
        
        divider: '#49483e',
        border: '#49483e',
        outline: '#75715e',
        
        success: '#a6e22e',
        warning: '#e6db74',
        error: '#f92672',
        info: '#66d9ef',
        
        tableHeader: '#49483e',
        tableRow: '#3e3d32',
        tableRowHover: '#49483e',
        tableRowSelected: '#4a4a4a',
        tableBorder: '#49483e',
        
        cardBackground: '#3e3d32',
        cardBorder: '#49483e',
        cardShadow: 'rgba(0, 0, 0, 0.5)',
        
        buttonBackground: '#a6e22e',
        buttonHover: '#8cc83a',
        buttonActive: '#7bb83a',
        buttonText: '#272822',
        
        inputBackground: '#49483e',
        inputBorder: '#75715e',
        inputBorderFocused: '#a6e22e',
        inputText: '#f8f8f2',
        inputPlaceholder: '#75715e'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Solarized theme
   */
  private createSolarizedTheme(): Theme {
    return {
      id: 'solarized',
      name: 'solarized',
      displayName: 'Solarized',
      description: 'Solarized color palette theme',
      isDefault: false,
      isDark: false,
      colors: {
        primary: '#268bd2',
        primaryLight: '#7bb3d3',
        primaryDark: '#1e6b9b',
        primaryContrast: '#ffffff',
        
        secondary: '#d33682',
        secondaryLight: '#e06fa8',
        secondaryDark: '#b02a6b',
        secondaryContrast: '#ffffff',
        
        background: '#fdf6e3',
        backgroundPaper: '#eee8d5',
        backgroundDefault: '#fdf6e3',
        
        surface: '#eee8d5',
        surfaceVariant: '#e6dfc7',
        
        textPrimary: '#586e75',
        textSecondary: '#93a1a1',
        textDisabled: '#b8c5c6',
        
        divider: '#e6dfc7',
        border: '#d3c7b8',
        outline: '#b8c5c6',
        
        success: '#859900',
        warning: '#b58900',
        error: '#dc322f',
        info: '#268bd2',
        
        tableHeader: '#e6dfc7',
        tableRow: '#eee8d5',
        tableRowHover: '#e6dfc7',
        tableRowSelected: '#d3c7b8',
        tableBorder: '#d3c7b8',
        
        cardBackground: '#eee8d5',
        cardBorder: '#d3c7b8',
        cardShadow: 'rgba(88, 110, 117, 0.1)',
        
        buttonBackground: '#268bd2',
        buttonHover: '#1e6b9b',
        buttonActive: '#1a5f8a',
        buttonText: '#ffffff',
        
        inputBackground: '#eee8d5',
        inputBorder: '#d3c7b8',
        inputBorderFocused: '#268bd2',
        inputText: '#586e75',
        inputPlaceholder: '#93a1a1'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Dracula theme
   */
  private createDraculaTheme(): Theme {
    return {
      id: 'dracula',
      name: 'dracula',
      displayName: 'Dracula',
      description: 'Dracula color scheme theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#bd93f9',
        primaryLight: '#d1b3ff',
        primaryDark: '#8b5cf6',
        primaryContrast: '#282a36',
        
        secondary: '#ff79c6',
        secondaryLight: '#ffa3d9',
        secondaryDark: '#ff1493',
        secondaryContrast: '#282a36',
        
        background: '#282a36',
        backgroundPaper: '#44475a',
        backgroundDefault: '#282a36',
        
        surface: '#44475a',
        surfaceVariant: '#6272a4',
        
        textPrimary: '#f8f8f2',
        textSecondary: '#6272a4',
        textDisabled: '#44475a',
        
        divider: '#6272a4',
        border: '#6272a4',
        outline: '#50fa7b',
        
        success: '#50fa7b',
        warning: '#f1fa8c',
        error: '#ff5555',
        info: '#8be9fd',
        
        tableHeader: '#6272a4',
        tableRow: '#44475a',
        tableRowHover: '#6272a4',
        tableRowSelected: '#50fa7b',
        tableBorder: '#6272a4',
        
        cardBackground: '#44475a',
        cardBorder: '#6272a4',
        cardShadow: 'rgba(0, 0, 0, 0.4)',
        
        buttonBackground: '#bd93f9',
        buttonHover: '#8b5cf6',
        buttonActive: '#7c3aed',
        buttonText: '#282a36',
        
        inputBackground: '#6272a4',
        inputBorder: '#50fa7b',
        inputBorderFocused: '#bd93f9',
        inputText: '#f8f8f2',
        inputPlaceholder: '#6272a4'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get all available themes
   */
  getAvailableThemes(): Theme[] {
    return this.availableThemes();
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): Theme | null {
    return this.currentTheme();
  }

  /**
   * Set current theme
   */
  setTheme(themeId: string): void {
    console.log('Setting theme:', themeId);
    const theme = this.availableThemes().find(t => t.id === themeId);
    if (theme) {
      console.log('Found theme:', theme.displayName);
      this.currentTheme.set(theme);
      this.applyTheme(theme);
      this.saveUserTheme(themeId);
    } else {
      console.error('Theme not found:', themeId);
    }
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: Theme): void {
    console.log('Applying theme:', theme.displayName, theme.isDark ? '(dark)' : '(light)');
    
    const root = document.documentElement;
    const colors = theme.colors;

    // Set CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Set dark mode class
    if (theme.isDark) {
      document.body.classList.add('dark-theme');
      console.log('Added dark-theme class');
    } else {
      document.body.classList.remove('dark-theme');
      console.log('Removed dark-theme class');
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.primary);
    }
    
    console.log('Theme applied successfully');
  }

  /**
   * Load user theme from localStorage
   */
  private loadUserTheme(): void {
    const savedThemeId = localStorage.getItem('user-theme');
    if (savedThemeId) {
      this.setTheme(savedThemeId);
    } else {
      // Set default theme
      const defaultTheme = this.availableThemes().find(t => t.isDefault);
      if (defaultTheme) {
        this.setTheme(defaultTheme.id);
      }
    }
  }

  /**
   * Save user theme to localStorage
   */
  private saveUserTheme(themeId: string): void {
    localStorage.setItem('user-theme', themeId);
  }

  /**
   * Reset to default theme
   */
  resetToDefault(): void {
    const defaultTheme = this.availableThemes().find(t => t.isDefault);
    if (defaultTheme) {
      this.setTheme(defaultTheme.id);
    }
  }

  /**
   * Create custom theme
   */
  createCustomTheme(name: string, baseThemeId: string, customColors: Partial<ThemeColors>): Theme {
    const baseTheme = this.availableThemes().find(t => t.id === baseThemeId);
    if (!baseTheme) {
      throw new Error('Base theme not found');
    }

    const customTheme: Theme = {
      id: `custom-${Date.now()}`,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      displayName: name,
      description: 'Custom theme created by user',
      isDefault: false,
      isDark: baseTheme.isDark,
      colors: {
        ...baseTheme.colors,
        ...customColors
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to available themes
    const currentThemes = this.availableThemes();
    this.availableThemes.set([...currentThemes, customTheme]);

    return customTheme;
  }

  /**
   * Remove custom theme
   */
  removeCustomTheme(themeId: string): void {
    const currentThemes = this.availableThemes();
    const filteredThemes = currentThemes.filter(t => t.id !== themeId);
    this.availableThemes.set(filteredThemes);

    // If current theme was removed, reset to default
    if (this.currentTheme()?.id === themeId) {
      this.resetToDefault();
    }
  }
}
