import { Injectable, signal, computed, inject, Optional, effect } from '@angular/core';
import { Theme, ThemeColors, UserTheme } from '../models/theme.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private authService = inject(AuthService, { optional: true });
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
    
    // Set up effect to watch for authentication changes
    effect(() => {
      if (this.authService) {
        const user = this.authService.user();
        const isAuthenticated = this.authService.isAuthenticated();
        const isLoading = this.authService.isLoading();
        const error = this.authService.error();
        
        // Only apply theme if:
        // 1. User is authenticated
        // 2. We have user data
        // 3. Not currently loading
        // 4. No authentication errors
        if (isAuthenticated && user && !isLoading && !error) {
          if (user.theme_id) {
            // User has a theme preference
            const currentTheme = this.currentTheme();
            if (!currentTheme || currentTheme.id !== user.theme_id) {
              this.setTheme(user.theme_id).catch(error => {
                console.error('Failed to apply user theme:', error);
              });
            }
          } else {
            // User has no theme preference, use default
            const defaultTheme = this.availableThemes().find(t => t.isDefault);
            if (defaultTheme) {
              const currentTheme = this.currentTheme();
              if (!currentTheme || currentTheme.id !== defaultTheme.id) {
                this.setTheme(defaultTheme.id).catch(error => {
                  console.error('Failed to apply default theme:', error);
                });
              }
            }
          }
        } else if (!isAuthenticated) {
          // If user is not authenticated, clear any applied theme
          this.clearTheme();
        }
        // Note: We don't apply any theme when user is not authenticated or has errors
        // This prevents theme application on login page and error states
      }
    });
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
      this.createDraculaTheme(),
      this.createGitHubDarkTheme(),
      this.createVSCodeDarkPlusTheme(),
      this.createOneDarkTheme()
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
   * Create GitHub Dark theme
   */
  private createGitHubDarkTheme(): Theme {
    return {
      id: 'github-dark',
      name: 'github-dark',
      displayName: 'GitHub Dark',
      description: 'GitHub Dark theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#58a6ff',
        primaryLight: '#79c0ff',
        primaryDark: '#1f6feb',
        primaryContrast: '#0d1117',
        
        secondary: '#f85149',
        secondaryLight: '#ff7b72',
        secondaryDark: '#da3633',
        secondaryContrast: '#ffffff',
        
        background: '#0d1117',
        backgroundPaper: '#161b22',
        backgroundDefault: '#0d1117',
        
        surface: '#161b22',
        surfaceVariant: '#21262d',
        
        textPrimary: '#f0f6fc',
        textSecondary: '#8b949e',
        textDisabled: '#6e7681',
        
        divider: '#21262d',
        border: '#30363d',
        outline: '#6e7681',
        
        success: '#3fb950',
        warning: '#d29922',
        error: '#f85149',
        info: '#58a6ff',
        
        tableHeader: '#21262d',
        tableRow: '#161b22',
        tableRowHover: '#21262d',
        tableRowSelected: '#1f6feb',
        tableBorder: '#30363d',
        
        cardBackground: '#161b22',
        cardBorder: '#30363d',
        cardShadow: 'rgba(0, 0, 0, 0.4)',
        
        buttonBackground: '#238636',
        buttonHover: '#2ea043',
        buttonActive: '#1a7f37',
        buttonText: '#ffffff',
        
        inputBackground: '#0d1117',
        inputBorder: '#30363d',
        inputBorderFocused: '#58a6ff',
        inputText: '#f0f6fc',
        inputPlaceholder: '#8b949e'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create VS Code Dark+ theme
   */
  private createVSCodeDarkPlusTheme(): Theme {
    return {
      id: 'vscode-dark-plus',
      name: 'vscode-dark-plus',
      displayName: 'VS Code Dark+',
      description: 'Visual Studio Code Dark+ theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#007acc',
        primaryLight: '#1e90ff',
        primaryDark: '#005a9e',
        primaryContrast: '#ffffff',
        
        secondary: '#c678dd',
        secondaryLight: '#d19fe8',
        secondaryDark: '#a855f7',
        secondaryContrast: '#ffffff',
        
        background: '#1e1e1e',
        backgroundPaper: '#252526',
        backgroundDefault: '#1e1e1e',
        
        surface: '#252526',
        surfaceVariant: '#2d2d30',
        
        textPrimary: '#cccccc',
        textSecondary: '#969696',
        textDisabled: '#6a6a6a',
        
        divider: '#2d2d30',
        border: '#3e3e42',
        outline: '#6a6a6a',
        
        success: '#4ec9b0',
        warning: '#dcdcaa',
        error: '#f44747',
        info: '#4fc1ff',
        
        tableHeader: '#2d2d30',
        tableRow: '#252526',
        tableRowHover: '#2d2d30',
        tableRowSelected: '#094771',
        tableBorder: '#3e3e42',
        
        cardBackground: '#252526',
        cardBorder: '#3e3e42',
        cardShadow: 'rgba(0, 0, 0, 0.3)',
        
        buttonBackground: '#0e639c',
        buttonHover: '#1177bb',
        buttonActive: '#0d5a8a',
        buttonText: '#ffffff',
        
        inputBackground: '#3c3c3c',
        inputBorder: '#3e3e42',
        inputBorderFocused: '#007acc',
        inputText: '#cccccc',
        inputPlaceholder: '#969696'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create One Dark theme
   */
  private createOneDarkTheme(): Theme {
    return {
      id: 'one-dark',
      name: 'one-dark',
      displayName: 'One Dark',
      description: 'Atom One Dark theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#61afef',
        primaryLight: '#7bb3f0',
        primaryDark: '#4a9eff',
        primaryContrast: '#282c34',
        
        secondary: '#c678dd',
        secondaryLight: '#d19fe8',
        secondaryDark: '#a855f7',
        secondaryContrast: '#ffffff',
        
        background: '#282c34',
        backgroundPaper: '#21252b',
        backgroundDefault: '#282c34',
        
        surface: '#21252b',
        surfaceVariant: '#2c313c',
        
        textPrimary: '#abb2bf',
        textSecondary: '#5c6370',
        textDisabled: '#4b5263',
        
        divider: '#2c313c',
        border: '#3e4451',
        outline: '#5c6370',
        
        success: '#98c379',
        warning: '#e5c07b',
        error: '#e06c75',
        info: '#61afef',
        
        tableHeader: '#2c313c',
        tableRow: '#21252b',
        tableRowHover: '#2c313c',
        tableRowSelected: '#3e4451',
        tableBorder: '#3e4451',
        
        cardBackground: '#21252b',
        cardBorder: '#3e4451',
        cardShadow: 'rgba(0, 0, 0, 0.3)',
        
        buttonBackground: '#61afef',
        buttonHover: '#7bb3f0',
        buttonActive: '#4a9eff',
        buttonText: '#282c34',
        
        inputBackground: '#3e4451',
        inputBorder: '#5c6370',
        inputBorderFocused: '#61afef',
        inputText: '#abb2bf',
        inputPlaceholder: '#5c6370'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Nord theme
   */
  private createNordTheme(): Theme {
    return {
      id: 'nord',
      name: 'nord',
      displayName: 'Nord',
      description: 'Nord color palette theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#88c0d0',
        primaryLight: '#8fbcbb',
        primaryDark: '#5e81ac',
        primaryContrast: '#2e3440',
        
        secondary: '#b48ead',
        secondaryLight: '#d08770',
        secondaryDark: '#a3be8c',
        secondaryContrast: '#ffffff',
        
        background: '#2e3440',
        backgroundPaper: '#3b4252',
        backgroundDefault: '#2e3440',
        
        surface: '#3b4252',
        surfaceVariant: '#434c5e',
        
        textPrimary: '#d8dee9',
        textSecondary: '#81a1c1',
        textDisabled: '#4c566a',
        
        divider: '#434c5e',
        border: '#4c566a',
        outline: '#81a1c1',
        
        success: '#a3be8c',
        warning: '#ebcb8b',
        error: '#bf616a',
        info: '#88c0d0',
        
        tableHeader: '#434c5e',
        tableRow: '#3b4252',
        tableRowHover: '#434c5e',
        tableRowSelected: '#4c566a',
        tableBorder: '#4c566a',
        
        cardBackground: '#3b4252',
        cardBorder: '#4c566a',
        cardShadow: 'rgba(0, 0, 0, 0.3)',
        
        buttonBackground: '#5e81ac',
        buttonHover: '#81a1c1',
        buttonActive: '#4c566a',
        buttonText: '#d8dee9',
        
        inputBackground: '#434c5e',
        inputBorder: '#4c566a',
        inputBorderFocused: '#88c0d0',
        inputText: '#d8dee9',
        inputPlaceholder: '#81a1c1'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Gruvbox theme
   */
  private createGruvboxTheme(): Theme {
    return {
      id: 'gruvbox',
      name: 'gruvbox',
      displayName: 'Gruvbox',
      description: 'Gruvbox color scheme theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#fe8019',
        primaryLight: '#fabd2f',
        primaryDark: '#d65d0e',
        primaryContrast: '#282828',
        
        secondary: '#b16286',
        secondaryLight: '#d3869b',
        secondaryDark: '#8f3f71',
        secondaryContrast: '#ffffff',
        
        background: '#282828',
        backgroundPaper: '#3c3836',
        backgroundDefault: '#282828',
        
        surface: '#3c3836',
        surfaceVariant: '#504945',
        
        textPrimary: '#ebdbb2',
        textSecondary: '#a89984',
        textDisabled: '#665c54',
        
        divider: '#504945',
        border: '#665c54',
        outline: '#a89984',
        
        success: '#b8bb26',
        warning: '#fabd2f',
        error: '#fb4934',
        info: '#83a598',
        
        tableHeader: '#504945',
        tableRow: '#3c3836',
        tableRowHover: '#504945',
        tableRowSelected: '#665c54',
        tableBorder: '#665c54',
        
        cardBackground: '#3c3836',
        cardBorder: '#665c54',
        cardShadow: 'rgba(0, 0, 0, 0.4)',
        
        buttonBackground: '#fe8019',
        buttonHover: '#fabd2f',
        buttonActive: '#d65d0e',
        buttonText: '#282828',
        
        inputBackground: '#504945',
        inputBorder: '#665c54',
        inputBorderFocused: '#fe8019',
        inputText: '#ebdbb2',
        inputPlaceholder: '#a89984'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Create Tokyo Night theme
   */
  private createTokyoNightTheme(): Theme {
    return {
      id: 'tokyo-night',
      name: 'tokyo-night',
      displayName: 'Tokyo Night',
      description: 'Tokyo Night color scheme theme',
      isDefault: false,
      isDark: true,
      colors: {
        primary: '#7aa2f7',
        primaryLight: '#9ece6a',
        primaryDark: '#565f89',
        primaryContrast: '#1a1b26',
        
        secondary: '#bb9af7',
        secondaryLight: '#c0caf5',
        secondaryDark: '#9aa5ce',
        secondaryContrast: '#ffffff',
        
        background: '#1a1b26',
        backgroundPaper: '#24283b',
        backgroundDefault: '#1a1b26',
        
        surface: '#24283b',
        surfaceVariant: '#2f3349',
        
        textPrimary: '#c0caf5',
        textSecondary: '#9aa5ce',
        textDisabled: '#565f89',
        
        divider: '#2f3349',
        border: '#414868',
        outline: '#9aa5ce',
        
        success: '#9ece6a',
        warning: '#e0af68',
        error: '#f7768e',
        info: '#7aa2f7',
        
        tableHeader: '#2f3349',
        tableRow: '#24283b',
        tableRowHover: '#2f3349',
        tableRowSelected: '#414868',
        tableBorder: '#414868',
        
        cardBackground: '#24283b',
        cardBorder: '#414868',
        cardShadow: 'rgba(0, 0, 0, 0.4)',
        
        buttonBackground: '#7aa2f7',
        buttonHover: '#9aa5ce',
        buttonActive: '#565f89',
        buttonText: '#1a1b26',
        
        inputBackground: '#2f3349',
        inputBorder: '#414868',
        inputBorderFocused: '#7aa2f7',
        inputText: '#c0caf5',
        inputPlaceholder: '#9aa5ce'
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
  async setTheme(themeId: string): Promise<void> {
    console.log('Setting theme:', themeId);
    const theme = this.availableThemes().find(t => t.id === themeId);
    if (theme) {
      console.log('Found theme:', theme.displayName);
      this.currentTheme.set(theme);
      this.applyTheme(theme);
      await this.saveUserTheme(themeId);
    } else {
      console.error('Theme not found:', themeId);
    }
  }

  /**
   * Clear all applied themes (used when user logs out)
   */
  clearTheme(): void {
    console.log('Clearing theme');
    this.currentTheme.set(null);
    
    // Remove all theme classes from document
    const root = document.documentElement;
    const themeClasses = [
      'light-theme', 'dark-theme', 'monokai-theme', 'dracula-theme',
      'github-dark-theme', 'vscode-dark-plus-theme', 'one-dark-theme'
    ];
    
    themeClasses.forEach(themeClass => {
      root.classList.remove(themeClass);
    });
    
    // Reset to default CSS variables (no theme applied)
    root.style.setProperty('--theme-background', '');
    root.style.setProperty('--theme-surface', '');
    root.style.setProperty('--theme-text-primary', '');
    root.style.setProperty('--theme-text-secondary', '');
    root.style.setProperty('--theme-primary', '');
    root.style.setProperty('--theme-on-primary', '');
    root.style.setProperty('--theme-secondary', '');
    root.style.setProperty('--theme-on-secondary', '');
    root.style.setProperty('--theme-error', '');
    root.style.setProperty('--theme-on-error', '');
    root.style.setProperty('--theme-success', '');
    root.style.setProperty('--theme-warning', '');
    root.style.setProperty('--theme-info', '');
    root.style.setProperty('--theme-border', '');
    root.style.setProperty('--theme-divider', '');
    root.style.setProperty('--theme-card-shadow', '');
    root.style.setProperty('--theme-primary-container', '');
    root.style.setProperty('--theme-on-primary-container', '');
    root.style.setProperty('--theme-surface-variant', '');
    root.style.setProperty('--theme-text-disabled', '');
    root.style.setProperty('--theme-outline', '');
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: Theme): void {
    console.log('Applying theme:', theme.displayName, theme.isDark ? '(dark)' : '(light)');
    
    const root = document.documentElement;
    const colors = theme.colors;

    // Remove all existing theme classes
    const allThemeClasses = [
      'dark-theme', 'monokai-theme', 'dracula-theme', 'github-dark-theme',
      'vscode-dark-plus-theme', 'one-dark-theme'
    ];
    
    allThemeClasses.forEach(themeClass => {
      document.body.classList.remove(themeClass);
    });

    // Set CSS custom properties
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Add specific theme class based on theme ID
    const themeClassMap: { [key: string]: string } = {
      'light': '', // No class for light theme
      'dark': 'dark-theme',
      'material': 'dark-theme', // Material uses dark-theme class
      'monokai': 'monokai-theme',
      'dracula': 'dracula-theme',
      'github-dark': 'github-dark-theme',
      'vscode-dark-plus': 'vscode-dark-plus-theme',
      'one-dark': 'one-dark-theme'
    };

    const themeClass = themeClassMap[theme.id];
    if (themeClass) {
      document.body.classList.add(themeClass);
      console.log(`Added ${themeClass} class`);
    } else {
      console.log('No theme class to add (light theme)');
    }

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', colors.primary);
    }
    
    console.log('Theme applied successfully');
  }

  /**
   * Load user theme from authenticated user or localStorage
   * This method should only be called when user is authenticated
   */
  private async loadUserTheme(): Promise<void> {
    const user = this.authService?.user();
    
    if (user && user.theme_id) {
      // Use theme from authenticated user
      await this.setTheme(user.theme_id);
    } else {
      // Fallback to localStorage for authenticated users without theme preference
      const savedThemeId = localStorage.getItem('user-theme');
      if (savedThemeId) {
        await this.setTheme(savedThemeId);
      } else {
        // Set default theme
        const defaultTheme = this.availableThemes().find(t => t.isDefault);
        if (defaultTheme) {
          await this.setTheme(defaultTheme.id);
        }
      }
    }
  }

  /**
   * Save user theme to authenticated user profile and localStorage
   */
  private async saveUserTheme(themeId: string): Promise<void> {
    // Always save to localStorage as fallback
    localStorage.setItem('user-theme', themeId);
    
    // Save to user profile if authenticated
    const user = this.authService?.user();
    if (user && this.authService) {
      try {
        await this.authService.updateUserTheme(themeId);
      } catch (error) {
        console.error('Failed to save theme to user profile:', error);
        // Continue anyway, theme is saved in localStorage
      }
    }
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
