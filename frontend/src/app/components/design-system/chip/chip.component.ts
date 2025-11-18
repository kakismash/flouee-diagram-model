import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ComponentSize } from '../../../design-system/design-system.config';

export type ChipVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

@Component({
  selector: 'ds-chip',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <span
      [class]="chipClasses"
      [attr.aria-label]="ariaLabel"
      [attr.role]="clickable || removable ? 'button' : null"
      [attr.tabindex]="clickable || removable ? 0 : null"
      (click)="onClick($event)"
      (keydown.enter)="onEnter($event)"
      (keydown.space)="onSpace($event)">
      <mat-icon *ngIf="icon && !removable" class="chip-icon chip-icon-left" [style.font-size]="getIconSize()">
        {{ icon }}
      </mat-icon>
      <ng-content></ng-content>
      <mat-icon
        *ngIf="removable"
        class="chip-icon chip-icon-remove"
        [style.font-size]="getIconSize()"
        (click)="onRemove($event)">
        close
      </mat-icon>
    </span>
  `,
  styles: [`
    span {
      display: inline-flex;
      align-items: center;
      gap: var(--ds-spacing-xs, 4px);
      padding: var(--ds-spacing-xs, 4px) var(--ds-spacing-sm, 8px);
      border-radius: var(--ds-radius-full, 9999px);
      font-weight: 500;
      white-space: nowrap;
      transition: all var(--ds-transition-normal, 200ms ease);
      outline: none;
    }

    span[role="button"] {
      cursor: pointer;
    }

    span[role="button"]:hover {
      opacity: 0.8;
    }

    span[role="button"]:focus-visible {
      outline: 2px solid var(--theme-outline);
      outline-offset: 2px;
    }

    .chip-icon {
      flex-shrink: 0;
    }

    .chip-icon-left {
      margin-right: -2px;
    }

    .chip-icon-remove {
      margin-left: -2px;
      cursor: pointer;
      opacity: 0.7;
    }

    .chip-icon-remove:hover {
      opacity: 1;
    }

    /* Size Variants */
    .size-small {
      font-size: 11px;
      padding: 2px 6px;
      min-height: 20px;
    }

    .size-medium {
      font-size: 12px;
      padding: 4px 10px;
      min-height: 24px;
    }

    .size-large {
      font-size: 14px;
      padding: 6px 12px;
      min-height: 28px;
    }

    /* Variant Styles */
    .variant-default {
      background-color: var(--theme-surface-variant);
      color: var(--theme-text-primary);
    }

    .variant-primary {
      background-color: var(--theme-primary-container);
      color: var(--theme-on-primary-container);
    }

    .variant-secondary {
      background-color: var(--theme-secondary);
      color: var(--theme-secondary-contrast);
    }

    .variant-success {
      background-color: var(--theme-success);
      color: #ffffff;
      opacity: 0.9;
    }

    .variant-warning {
      background-color: var(--theme-warning);
      color: #000000;
      opacity: 0.9;
    }

    .variant-error {
      background-color: var(--theme-error);
      color: #ffffff;
      opacity: 0.9;
    }

    /* Outline Variant */
    .outline {
      background-color: transparent;
      border: 1px solid currentColor;
    }

    .variant-default.outline {
      border-color: var(--theme-border);
      color: var(--theme-text-primary);
    }

    .variant-primary.outline {
      border-color: var(--theme-primary);
      color: var(--theme-primary);
    }

    .variant-secondary.outline {
      border-color: var(--theme-secondary);
      color: var(--theme-secondary);
    }
  `]
})
export class ChipComponent {
  @Input() variant: ChipVariant = 'default';
  @Input() size: ComponentSize = 'medium';
  @Input() outline: boolean = false;
  @Input() clickable: boolean = false;
  @Input() removable: boolean = false;
  @Input() icon: string | null = null;
  @Input() ariaLabel: string | null = null;

  @Output() clicked = new EventEmitter<MouseEvent>();
  @Output() removed = new EventEmitter<MouseEvent>();

  // Use getter instead of computed to avoid initialization issues
  get chipClasses(): string {
    const classes = [
      `size-${this.size}`,
      `variant-${this.variant}`
    ];

    if (this.outline) {
      classes.push('outline');
    }

    if (this.clickable) {
      classes.push('clickable');
    }

    if (this.removable) {
      classes.push('removable');
    }

    return classes.join(' ');
  }

  getIconSize(): string {
    const sizeMap: Record<ComponentSize, string> = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    return sizeMap[this.size];
  }

  onClick(event: MouseEvent): void {
    if (this.clickable) {
      this.clicked.emit(event);
    }
  }

  onRemove(event: MouseEvent): void {
    event.stopPropagation();
    if (this.removable) {
      this.removed.emit(event);
    }
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (this.clickable || this.removable) {
      keyboardEvent.preventDefault();
      (keyboardEvent.target as HTMLElement).click();
    }
  }

  onSpace(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (this.clickable || this.removable) {
      keyboardEvent.preventDefault();
      (keyboardEvent.target as HTMLElement).click();
    }
  }
}

