import { Injectable } from '@angular/core';
import { designTokens, DesignTokens } from '../design-system/design-system.tokens';
import { ThemeService } from './theme.service';

/**
 * Design Tokens Service
 * 
 * Provides access to design tokens and theme-aware utilities.
 * Components can inject this service to access design tokens programmatically.
 */
@Injectable({
  providedIn: 'root'
})
export class DesignTokensService {
  constructor(private themeService: ThemeService) {}

  /**
   * Get design tokens
   */
  getTokens(): DesignTokens {
    return designTokens;
  }

  /**
   * Get a specific color token
   */
  getColor(key: keyof DesignTokens['colors']): string {
    return designTokens.colors[key];
  }

  /**
   * Get button tokens
   */
  getButtonTokens(): DesignTokens['button'] {
    return designTokens.button;
  }

  /**
   * Get input tokens
   */
  getInputTokens(): DesignTokens['input'] {
    return designTokens.input;
  }

  /**
   * Get card tokens
   */
  getCardTokens(): DesignTokens['card'] {
    return designTokens.card;
  }

  /**
   * Get table tokens
   */
  getTableTokens(): DesignTokens['table'] {
    return designTokens.table;
  }

  /**
   * Check if current theme is dark mode
   */
  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }
}

