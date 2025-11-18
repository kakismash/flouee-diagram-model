import { Injectable, signal, computed, inject, Optional, effect, Injector, runInInjectionContext, untracked } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Theme, ThemeColors, UserTheme } from '../models/theme.model';
import { AuthService } from './auth.service';
import { getDefaultThemes } from '../config/themes.config';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private authService = inject(AuthService, { optional: true });
  private router = inject(Router, { optional: true });
  private injector = inject(Injector);
  private currentTheme = signal<Theme | null>(null);
  private currentRoute = signal<string>('');
  private availableThemes = signal<Theme[]>([]);
  private userTheme = signal<UserTheme | null>(null);
  private isThemeLoading = signal<boolean>(false);
  private isThemeReady = signal<boolean>(false);
  private isAppReady = signal<boolean>(false);

  // Computed signals
  isDarkMode = computed(() => this.currentTheme()?.isDark ?? false);
  themeColors = computed(() => this.currentTheme()?.colors);
  
  // Public signals for components to subscribe
  currentTheme$ = this.currentTheme.asReadonly();
  availableThemes$ = this.availableThemes.asReadonly();
  isThemeLoading$ = this.isThemeLoading.asReadonly();
  isThemeReady$ = this.isThemeReady.asReadonly();

  constructor() {
    this.initializeDefaultThemes();
    
    // Track route changes
    if (this.router) {
      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          const previousRoute = this.currentRoute();
          this.currentRoute.set(event.url);
          
          // If navigating to login, remove theme
          if (event.url.includes('/login')) {
            console.log('🎨 Navigated to login, removing theme');
            this.isThemeLoading.set(false);
            this.isThemeReady.set(true);
            this.removeTheme();
          } 
          // If navigating away from login, apply theme if user is authenticated
          else if (previousRoute.includes('/login') && this.authService?.isAuthenticated()) {
            console.log('🎨 Navigated away from login, applying user theme');
            const user = this.authService.user();
            if (user?.theme_id) {
              this.setTheme(user.theme_id).catch(console.error);
            } else {
              const defaultTheme = this.availableThemes().find(t => t.isDefault);
              if (defaultTheme) {
                this.setTheme(defaultTheme.id).catch(console.error);
              }
            }
          }
        });
      
      // Set initial route
      this.currentRoute.set(this.router.url);
    }
    
    // Apply default light theme immediately (only if not on login)
    if (!this.isLoginRoute()) {
      const defaultTheme = this.availableThemes().find(t => t.isDefault);
      if (defaultTheme) {
        this.currentTheme.set(defaultTheme);
        this.applyTheme(defaultTheme);
      }
    } else {
      // On login route, remove all theme variables and classes
      // Mark as ready immediately so loading doesn't block
      this.isThemeLoading.set(false);
      this.isThemeReady.set(true);
      this.removeTheme();
    }
    
    // Mark app as ready after initialization is complete
    // Router subscription is set up above, so we can mark as ready
    untracked(() => {
      this.isAppReady.set(true);
    });
    
    // Set up effect to watch for authentication changes
    // Use injector option to create effect safely with proper injection context
    this.initializeAuthEffect();
  }

  /**
   * Initialize authentication effect safely using injection context
   */
  private initializeAuthEffect(): void {
    runInInjectionContext(this.injector, () => {
      effect(() => {
        // Only execute effect logic if app is ready
        // This prevents template access issues during initialization
        if (!this.isAppReady()) {
          return;
        }

        try {
          if (this.authService) {
            // Read auth state signals - these are safe to read in effects
            const user = this.authService.user();
            const isAuthenticated = this.authService.isAuthenticated();
            const isLoading = this.authService.isLoading();
            const error = this.authService.error();
            
            // Only apply theme if:
            // 1. User is authenticated
            // 2. We have user data
            // 3. Not currently loading
            // 4. No authentication errors
            // 5. NOT on login route
            if (isAuthenticated && user && !isLoading && !error && !this.isLoginRoute()) {
              console.log('🎨 User authenticated, applying user theme...');
              
              // Apply theme immediately (navigation will wait)
              if (user.theme_id && typeof user.theme_id === 'string') {
                // User has a theme preference
                const themeId = user.theme_id;
                const currentTheme = untracked(() => this.currentTheme());
                if (!currentTheme || currentTheme.id !== themeId) {
                  console.log('🎨 Applying user saved theme:', themeId);
                  untracked(() => {
                    this.setTheme(themeId).catch(error => {
                      console.error('Failed to apply user theme:', error);
                    });
                  });
                }
              } else {
                // User has no theme preference, use default
                const defaultTheme = untracked(() => this.availableThemes().find(t => t.isDefault));
                if (defaultTheme) {
                  const currentTheme = untracked(() => this.currentTheme());
                  if (!currentTheme || currentTheme.id !== defaultTheme.id) {
                    console.log('🎨 Applying default theme for authenticated user');
                    untracked(() => {
                      this.setTheme(defaultTheme.id).catch(error => {
                        console.error('Failed to apply default theme:', error);
                      });
                    });
                  }
                }
              }
            } else if (!isAuthenticated && !isLoading) {
              // User logged out - remove theme for login page
              console.log('🎨 User logged out, removing theme for login page');
              untracked(() => {
                this.isThemeLoading.set(false);
                this.isThemeReady.set(true);
                this.removeTheme();
              });
            } else if (isAuthenticated && this.isLoginRoute()) {
              // User is authenticated but on login route - remove theme
              console.log('🎨 User authenticated but on login route, removing theme');
              untracked(() => {
                this.isThemeLoading.set(false);
                this.isThemeReady.set(true);
                this.removeTheme();
              });
            }
          }
        } catch (error) {
          // Silently handle errors during effect execution
          console.warn('Auth effect error:', error);
        }
      });
    });
  }

  /**
   * Initialize default themes
   */
  private initializeDefaultThemes(): void {
    const defaultThemes = getDefaultThemes();
    this.availableThemes.set(defaultThemes);
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
  /**
   * Check if current route is login
   */
  private isLoginRoute(): boolean {
    return this.currentRoute().includes('/login') || (this.router?.url?.includes('/login') ?? false);
  }

  /**
   * Remove all theme variables and classes (for login page)
   */
  private removeTheme(): void {
    console.log('🎨 Removing theme for login page');
    
    const root = document.documentElement;
    
    // Remove all theme CSS variables
    const allThemeKeys = [
      'primary', 'primaryLight', 'primaryDark', 'primaryContrast',
      'secondary', 'secondaryLight', 'secondaryDark', 'secondaryContrast',
      'background', 'backgroundPaper', 'backgroundDefault',
      'surface', 'surfaceVariant',
      'textPrimary', 'textSecondary', 'textDisabled',
      'divider', 'border', 'outline',
      'success', 'warning', 'error', 'info',
      'tableHeader', 'tableRow', 'tableRowHover', 'tableRowSelected', 'tableBorder',
      'cardBackground', 'cardBorder', 'cardShadow',
      'buttonBackground', 'buttonHover', 'buttonActive', 'buttonText',
      'inputBackground', 'inputBorder', 'inputBorderFocused', 'inputText', 'inputPlaceholder'
    ];
    
    allThemeKeys.forEach(key => {
      root.style.removeProperty(`--theme-${key}`);
    });
    
    // Remove all theme classes
    const allThemeClasses = [
      'dark-theme', 'monokai-theme', 'dracula-theme', 'github-dark-theme',
      'vscode-dark-plus-theme', 'one-dark-theme'
    ];
    
    allThemeClasses.forEach(themeClass => {
      document.body.classList.remove(themeClass);
    });
    
    // Mark theme as ready (no loading needed for login page)
    this.isThemeLoading.set(false);
    this.isThemeReady.set(true);
    
    console.log('✅ Theme removed for login page');
  }

  private applyTheme(theme: Theme): void {
    // Don't apply theme on login route
    if (this.isLoginRoute()) {
      console.log('🎨 Skipping theme application on login route');
      this.removeTheme();
      return;
    }
    
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

  /**
   * Apply user theme immediately after login
   * Called directly from AuthService to ensure theme is applied before navigation
   */
  applyUserTheme(themeId: string | null | undefined): void {
    // Don't apply theme if on login route
    if (this.isLoginRoute()) {
      console.log('🎨 Skipping applyUserTheme on login route');
      this.isThemeLoading.set(false);
      this.isThemeReady.set(true);
      this.removeTheme();
      return;
    }
    
    console.log('🎨 Applying theme:', themeId || 'default');
    this.isThemeLoading.set(true);
    this.isThemeReady.set(false);
    
    // Apply theme immediately - no need for setTimeout
    // CSS updates are synchronous and DOM is already ready
    try {
      if (themeId) {
        const theme = this.availableThemes().find(t => t.id === themeId);
        if (theme) {
          this.currentTheme.set(theme);
          this.applyTheme(theme);
        } else {
          console.warn('⚠️ User theme not found, applying default:', themeId);
          this.applyDefaultTheme();
        }
      } else {
        this.applyDefaultTheme();
      }
      
      // Mark theme as ready immediately - CSS is applied synchronously
      this.isThemeLoading.set(false);
      this.isThemeReady.set(true);
      
    } catch (error) {
      console.error('❌ Error applying user theme:', error);
      this.applyDefaultTheme();
      this.isThemeLoading.set(false);
      this.isThemeReady.set(true);
    }
  }

  /**
   * Apply default light theme
   */
  private applyDefaultTheme(): void {
    const defaultTheme = this.availableThemes().find(t => t.isDefault);
    if (defaultTheme) {
      this.currentTheme.set(defaultTheme);
      this.applyTheme(defaultTheme);
    }
  }
}
