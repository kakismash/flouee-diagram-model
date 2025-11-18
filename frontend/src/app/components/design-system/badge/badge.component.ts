import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentSize } from '../../../design-system/design-system.config';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'ds-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses" [attr.aria-label]="ariaLabel">
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      vertical-align: middle;
      border-radius: var(--ds-radius-full, 9999px);
    }

    /* Size Variants */
    .size-small {
      font-size: 10px;
      padding: 2px 6px;
      min-height: 16px;
    }

    .size-medium {
      font-size: 12px;
      padding: 4px 8px;
      min-height: 20px;
    }

    .size-large {
      font-size: 14px;
      padding: 6px 12px;
      min-height: 24px;
    }

    /* Variant Styles */
    .variant-primary {
      background-color: var(--theme-primary);
      color: var(--theme-primary-contrast);
    }

    .variant-secondary {
      background-color: var(--theme-secondary);
      color: var(--theme-secondary-contrast);
    }

    .variant-success {
      background-color: var(--theme-success);
      color: #ffffff;
    }

    .variant-warning {
      background-color: var(--theme-warning);
      color: #000000;
    }

    .variant-error {
      background-color: var(--theme-error);
      color: #ffffff;
    }

    .variant-info {
      background-color: var(--theme-info);
      color: #ffffff;
    }

    /* Outline Variant */
    .outline {
      background-color: transparent;
      border: 1px solid currentColor;
    }

    .variant-primary.outline {
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }

    .variant-secondary.outline {
      border-color: var(--theme-secondary);
      color: var(--theme-secondary);
    }

    .variant-success.outline {
      border-color: var(--theme-success);
      color: var(--theme-success);
    }

    .variant-warning.outline {
      border-color: var(--theme-warning);
      color: var(--theme-warning);
    }

    .variant-error.outline {
      border-color: var(--theme-error);
      color: var(--theme-error);
    }

    .variant-info.outline {
      border-color: var(--theme-info);
      color: var(--theme-info);
    }

    /* Dot Variant */
    .dot {
      padding: 0;
      width: 8px;
      height: 8px;
      min-width: 8px;
      min-height: 8px;
      border-radius: 50%;
    }

    .size-large.dot {
      width: 10px;
      height: 10px;
      min-width: 10px;
      min-height: 10px;
    }
  `]
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'primary';
  @Input() size: ComponentSize = 'medium';
  @Input() outline: boolean = false;
  @Input() dot: boolean = false;
  @Input() ariaLabel: string | null = null;

  // Use getter instead of computed to avoid initialization issues
  get badgeClasses(): string {
    const classes = [
      `size-${this.size}`,
      `variant-${this.variant}`
    ];

    if (this.outline) {
      classes.push('outline');
    }

    if (this.dot) {
      classes.push('dot');
    }

    return classes.join(' ');
  }
}

