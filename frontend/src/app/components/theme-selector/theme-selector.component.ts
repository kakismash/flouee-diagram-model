import { Component, OnInit, OnDestroy, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { Theme, ThemeColors } from '../../models/theme.model';

@Component({
  selector: 'app-theme-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="theme-selector">
      <!-- Theme Toggle Button -->
      <button mat-icon-button 
              [matMenuTriggerFor]="themeMenu"
              matTooltip="Change Theme"
              class="theme-toggle-btn">
        <mat-icon>{{ isDarkMode() ? 'dark_mode' : 'light_mode' }}</mat-icon>
      </button>

      <!-- Theme Menu -->
      <mat-menu #themeMenu="matMenu" class="theme-menu">
        <div class="theme-menu-header">
          <h3>Choose Theme</h3>
          <button mat-icon-button (click)="openCustomThemeDialog()" matTooltip="Create Custom Theme">
            <mat-icon>palette</mat-icon>
          </button>
        </div>

        <mat-divider></mat-divider>

        <!-- Theme Options -->
        <div class="theme-options">
          <div *ngFor="let theme of availableThemes" 
               class="theme-option"
               [class.active]="theme.id === currentTheme?.id"
               (click)="selectTheme(theme)">
            
            <div class="theme-preview" [style.background]="theme.colors.background">
              <div class="theme-preview-header" [style.background]="theme.colors.primary"></div>
              <div class="theme-preview-content">
                <div class="theme-preview-card" [style.background]="theme.colors.surface">
                  <div class="theme-preview-text" [style.color]="theme.colors.textPrimary">Aa</div>
                </div>
              </div>
            </div>

            <div class="theme-info">
              <div class="theme-name">{{ theme.displayName }}</div>
              <div class="theme-description">{{ theme.description }}</div>
              <mat-chip *ngIf="theme.isDefault" class="default-chip">Default</mat-chip>
              <mat-chip *ngIf="theme.isDark" class="dark-chip">Dark</mat-chip>
            </div>

            <mat-icon *ngIf="theme.id === currentTheme?.id" class="selected-icon">check</mat-icon>
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Theme Actions -->
        <div class="theme-actions">
          <button mat-menu-item (click)="resetToDefault()">
            <mat-icon>refresh</mat-icon>
            <span>Reset to Default</span>
          </button>
        </div>
      </mat-menu>
    </div>

    <!-- Custom Theme Dialog -->
    <div *ngIf="showCustomThemeDialog" class="custom-theme-dialog-overlay" (click)="closeCustomThemeDialog()">
      <div class="custom-theme-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h2>Create Custom Theme</h2>
          <button mat-icon-button (click)="closeCustomThemeDialog()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <form [formGroup]="customThemeForm" class="custom-theme-form">
          <mat-form-field appearance="outline">
            <mat-label>Theme Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter theme name">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Base Theme</mat-label>
            <mat-select formControlName="baseTheme">
              <mat-option *ngFor="let theme of availableThemes" [value]="theme.id">
                {{ theme.displayName }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <div class="color-customization">
            <h3>Customize Colors</h3>
            
            <div class="color-group">
              <h4>Primary Colors</h4>
              <div class="color-inputs">
                <mat-form-field appearance="outline">
                  <mat-label>Primary</mat-label>
                  <input matInput type="color" formControlName="primary">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Secondary</mat-label>
                  <input matInput type="color" formControlName="secondary">
                </mat-form-field>
              </div>
            </div>

            <div class="color-group">
              <h4>Background Colors</h4>
              <div class="color-inputs">
                <mat-form-field appearance="outline">
                  <mat-label>Background</mat-label>
                  <input matInput type="color" formControlName="background">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Surface</mat-label>
                  <input matInput type="color" formControlName="surface">
                </mat-form-field>
              </div>
            </div>

            <div class="color-group">
              <h4>Text Colors</h4>
              <div class="color-inputs">
                <mat-form-field appearance="outline">
                  <mat-label>Primary Text</mat-label>
                  <input matInput type="color" formControlName="textPrimary">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Secondary Text</mat-label>
                  <input matInput type="color" formControlName="textSecondary">
                </mat-form-field>
              </div>
            </div>
          </div>

          <div class="dialog-actions">
            <button mat-button (click)="closeCustomThemeDialog()">Cancel</button>
            <button mat-raised-button color="primary" (click)="createCustomTheme()" [disabled]="!customThemeForm.valid">
              Create Theme
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .theme-selector {
      position: relative;
    }

    .theme-toggle-btn {
      color: var(--theme-text-primary);
    }

    .theme-menu {
      min-width: 320px;
      max-width: 400px;
    }

    .theme-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
    }

    .theme-menu-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .theme-options {
      max-height: 400px;
      overflow-y: auto;
    }

    .theme-option {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      border-bottom: 1px solid var(--theme-divider);
    }

    .theme-option:hover {
      background-color: var(--theme-surface-variant);
    }

    .theme-option.active {
      background-color: var(--theme-primary);
      color: var(--theme-primary-contrast);
    }

    .theme-preview {
      width: 40px;
      height: 30px;
      border-radius: 4px;
      margin-right: 12px;
      overflow: hidden;
      border: 1px solid var(--theme-border);
    }

    .theme-preview-header {
      height: 8px;
      width: 100%;
    }

    .theme-preview-content {
      height: 22px;
      padding: 2px;
    }

    .theme-preview-card {
      height: 100%;
      border-radius: 2px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .theme-preview-text {
      font-size: 10px;
      font-weight: 500;
    }

    .theme-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .theme-name {
      font-weight: 500;
      font-size: 14px;
    }

    .theme-description {
      font-size: 12px;
      opacity: 0.7;
    }

    .default-chip,
    .dark-chip {
      font-size: 10px;
      height: 20px;
      margin-top: 4px;
    }

    .default-chip {
      background-color: var(--theme-success);
      color: white;
    }

    .dark-chip {
      background-color: var(--theme-primary);
      color: var(--theme-primary-contrast);
    }

    .selected-icon {
      color: var(--theme-success);
    }

    .theme-option.active .selected-icon {
      color: var(--theme-primary-contrast);
    }

    .theme-actions {
      padding: 8px 0;
    }

    /* Custom Theme Dialog */
    .custom-theme-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .custom-theme-dialog {
      background: var(--theme-background-paper);
      border-radius: 8px;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid var(--theme-divider);
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .custom-theme-form {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .color-customization h3 {
      margin: 16px 0 8px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .color-group {
      margin-bottom: 16px;
    }

    .color-group h4 {
      margin: 8px 0;
      font-size: 14px;
      font-weight: 500;
      color: var(--theme-text-secondary);
    }

    .color-inputs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--theme-divider);
    }

    @media (max-width: 768px) {
      .color-inputs {
        grid-template-columns: 1fr;
      }
      
      .custom-theme-dialog {
        width: 95%;
        margin: 20px;
      }
    }
  `]
})
export class ThemeSelectorComponent implements OnInit, OnDestroy {
  availableThemes: Theme[] = [];
  currentTheme: Theme | null = null;
  isDarkMode = computed(() => this.themeService.isDarkMode());
  
  showCustomThemeDialog = false;
  customThemeForm: FormGroup;

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.customThemeForm = this.fb.group({
      name: ['', Validators.required],
      baseTheme: ['light', Validators.required],
      primary: ['#1976d2'],
      secondary: ['#dc004e'],
      background: ['#fafafa'],
      surface: ['#ffffff'],
      textPrimary: ['rgba(0, 0, 0, 0.87)'],
      textSecondary: ['rgba(0, 0, 0, 0.6)']
    });

    // Subscribe to theme changes using effect in constructor
    effect(() => {
      this.currentTheme = this.themeService.currentTheme$();
    });
  }

  ngOnInit() {
    // Initialize themes
    this.availableThemes = this.themeService.getAvailableThemes();
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  async selectTheme(theme: Theme) {
    console.log('Selecting theme:', theme.displayName);
    
    // Update user's theme preference if authenticated
    if (this.authService.isAuthenticated()) {
      const result = await this.authService.updateUserTheme(theme.id);
      if (!result.success) {
        console.error('Failed to update user theme:', result.error);
        // Still apply the theme locally even if save fails
        this.themeService.setTheme(theme.id);
      }
    } else {
      // Just apply theme locally if not authenticated
      this.themeService.setTheme(theme.id);
    }
    
    // Update local current theme
    this.currentTheme = theme;
  }

  async resetToDefault() {
    const defaultTheme = this.themeService.getAvailableThemes().find(t => t.isDefault);
    if (defaultTheme) {
      await this.selectTheme(defaultTheme);
    }
  }

  openCustomThemeDialog() {
    this.showCustomThemeDialog = true;
  }

  closeCustomThemeDialog() {
    this.showCustomThemeDialog = false;
    this.customThemeForm.reset();
  }

  async createCustomTheme() {
    if (this.customThemeForm.valid) {
      const formValue = this.customThemeForm.value;
      
      const customColors: Partial<ThemeColors> = {
        primary: formValue.primary,
        secondary: formValue.secondary,
        background: formValue.background,
        surface: formValue.surface,
        textPrimary: formValue.textPrimary,
        textSecondary: formValue.textSecondary
      };

      try {
        const customTheme = this.themeService.createCustomTheme(
          formValue.name,
          formValue.baseTheme,
          customColors
        );
        
        await this.selectTheme(customTheme);
        this.closeCustomThemeDialog();
      } catch (error) {
        console.error('Error creating custom theme:', error);
      }
    }
  }
}
