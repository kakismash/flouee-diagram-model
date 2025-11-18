import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ComponentSize, ComponentVariant, ComponentShape, ButtonType } from '../../../design-system/design-system.config';
import { designSystemConfig } from '../../../design-system/design-system.config';
import { designTokens } from '../../../design-system/design-system.tokens';

@Component({
  selector: 'ds-base-button',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="buttonClasses"
      [style.width]="fullWidth ? '100%' : 'auto'"
      (click)="onClick($event)"
      [attr.aria-label]="ariaLabel || (iconOnly ? label : null)"
      [attr.aria-busy]="loading">
      <span class="button-content">
        <mat-spinner
          *ngIf="loading"
          [diameter]="getSpinnerSize()"
          class="button-spinner">
        </mat-spinner>
        <mat-icon
          *ngIf="icon && !loading && (iconPosition === 'left' || iconOnly)"
          [class]="iconClasses"
          [style.font-size]="getIconSize()">
          {{ icon }}
        </mat-icon>
        <span
          *ngIf="!iconOnly"
          [class.hidden]="loading"
          class="button-label">
          {{ label }}
        </span>
        <mat-icon
          *ngIf="icon && !loading && iconPosition === 'right'"
          [class]="iconClasses"
          [style.font-size]="getIconSize()">
          {{ icon }}
        </mat-icon>
      </span>
    </button>
  `,
  styles: [`
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-weight: 500;
      transition: all var(--ds-transition-normal, 200ms ease);
      position: relative;
      outline: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }

    button:focus-visible {
      outline: 2px solid var(--theme-outline);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .button-content {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ds-spacing-sm, 8px);
    }

    .button-label {
      white-space: nowrap;
    }

    .button-label.hidden {
      opacity: 0;
    }

    .button-spinner {
      position: absolute;
    }

    .button-icon {
      flex-shrink: 0;
    }

    /* Size Variants */
    .size-small {
      height: 32px;
      padding: 6px 12px;
      font-size: 12px;
      border-radius: var(--ds-radius-small, 4px);
    }

    .size-medium {
      height: 40px;
      padding: 8px 16px;
      font-size: 14px;
      border-radius: var(--ds-radius-medium, 8px);
    }

    .size-large {
      height: 48px;
      padding: 12px 24px;
      font-size: 16px;
      border-radius: var(--ds-radius-large, 12px);
    }

    /* Shape Variants */
    .shape-square {
      border-radius: var(--ds-radius-medium, 8px);
    }

    .shape-round {
      border-radius: var(--ds-radius-full, 9999px);
    }

    .size-small.shape-round {
      border-radius: var(--ds-radius-full, 9999px);
    }

    .size-medium.shape-round {
      border-radius: var(--ds-radius-full, 9999px);
    }

    .size-large.shape-round {
      border-radius: var(--ds-radius-full, 9999px);
    }

    /* Variant Styles */
    .variant-primary {
      background-color: var(--theme-button-background);
      color: var(--theme-button-text);
    }

    .variant-primary:hover:not(:disabled) {
      background-color: var(--theme-button-hover);
    }

    .variant-primary:active:not(:disabled) {
      background-color: var(--theme-button-active);
    }

    .variant-secondary {
      background-color: var(--theme-secondary);
      color: var(--theme-secondary-contrast);
    }

    .variant-secondary:hover:not(:disabled) {
      background-color: var(--theme-secondary-dark);
    }

    .variant-text {
      background-color: transparent;
      color: var(--theme-primary);
    }

    .variant-text:hover:not(:disabled) {
      background-color: var(--theme-surface-variant);
    }

    .variant-outline {
      background-color: transparent;
      color: var(--theme-primary);
      border: 1px solid var(--theme-border);
    }

    .variant-outline:hover:not(:disabled) {
      background-color: var(--theme-surface-variant);
      border-color: var(--theme-primary);
    }

    .variant-ghost {
      background-color: transparent;
      color: var(--theme-text-primary);
    }

    .variant-ghost:hover:not(:disabled) {
      background-color: var(--theme-surface-variant);
    }

    /* Icon-only button */
    .icon-only {
      padding: 0;
      width: var(--button-height, 40px);
      aspect-ratio: 1;
    }

    .icon-only.size-small {
      width: 32px;
    }

    .icon-only.size-medium {
      width: 40px;
    }

    .icon-only.size-large {
      width: 48px;
    }

    /* Full width */
    .full-width {
      width: 100%;
    }
  `]
})
export class BaseButtonComponent {
  @Input() label: string = '';
  @Input() icon: string | null = null;
  @Input() iconPosition: 'left' | 'right' = 'left';
  @Input() variant: ComponentVariant = 'primary';
  @Input() size: ComponentSize = 'medium';
  @Input() shape: ComponentShape = 'square';
  @Input() type: ButtonType = 'button';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() fullWidth: boolean = false;
  @Input() ariaLabel: string | null = null;

  @Output() clicked = new EventEmitter<MouseEvent>();

  get iconOnly(): boolean {
    return !this.label && !!this.icon;
  }

  // Use getters instead of computed to avoid initialization issues
  get buttonClasses(): string {
    const classes = [
      `size-${this.size}`,
      `variant-${this.variant}`,
      `shape-${this.shape}`
    ];

    if (this.iconOnly) {
      classes.push('icon-only');
    }

    if (this.fullWidth) {
      classes.push('full-width');
    }

    return classes.join(' ');
  }

  get iconClasses(): string {
    return 'button-icon';
  }

  getSpinnerSize(): number {
    const sizeMap: Record<ComponentSize, number> = {
      small: 16,
      medium: 20,
      large: 24
    };
    return sizeMap[this.size];
  }

  getIconSize(): string {
    const sizeMap: Record<ComponentSize, string> = {
      small: '16px',
      medium: '20px',
      large: '24px'
    };
    return sizeMap[this.size];
  }

  onClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.clicked.emit(event);
    }
  }
}

