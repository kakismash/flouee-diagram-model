import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentSize } from '../../../design-system/design-system.config';

export type CardVariant = 'default' | 'elevated' | 'outlined';

@Component({
  selector: 'ds-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="cardClasses">
      <div *ngIf="title || showHeader" class="card-header">
        <h3 *ngIf="title" class="card-title">{{ title }}</h3>
        <div *ngIf="showHeader" class="card-header-content">
          <ng-content select="[slot=header]"></ng-content>
        </div>
      </div>
      <div class="card-content">
        <ng-content></ng-content>
      </div>
      <div *ngIf="showFooter" class="card-footer">
        <ng-content select="[slot=footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    div {
      display: flex;
      flex-direction: column;
      background-color: var(--theme-card-background);
      border: 1px solid var(--theme-card-border);
      border-radius: var(--ds-radius-medium, 8px);
      transition: all var(--ds-transition-normal, 200ms ease);
    }

    .card-header {
      padding: var(--ds-spacing-md, 16px);
      border-bottom: 1px solid var(--theme-divider);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--theme-text-primary);
    }

    .card-header-content {
      display: flex;
      align-items: center;
      gap: var(--ds-spacing-sm, 8px);
    }

    .card-content {
      padding: var(--ds-spacing-md, 16px);
      flex: 1;
    }

    .card-footer {
      padding: var(--ds-spacing-md, 16px);
      border-top: 1px solid var(--theme-divider);
      display: flex;
      align-items: center;
      gap: var(--ds-spacing-sm, 8px);
    }

    /* Variant Styles */
    .variant-default {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .variant-elevated {
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
    }

    .variant-outlined {
      box-shadow: none;
      border-width: 1px;
    }

    /* Size Variants */
    .size-small .card-header,
    .size-small .card-content,
    .size-small .card-footer {
      padding: var(--ds-spacing-sm, 8px);
    }

    .size-medium .card-header,
    .size-medium .card-content,
    .size-medium .card-footer {
      padding: var(--ds-spacing-md, 16px);
    }

    .size-large .card-header,
    .size-large .card-content,
    .size-large .card-footer {
      padding: var(--ds-spacing-lg, 24px);
    }

    /* Interactive */
    .clickable {
      cursor: pointer;
    }

    .clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15);
    }
  `]
})
export class CardComponent {
  @Input() title: string | null = null;
  @Input() variant: CardVariant = 'default';
  @Input() size: ComponentSize = 'medium';
  @Input() showHeader: boolean = false;
  @Input() showFooter: boolean = false;
  @Input() clickable: boolean = false;

  // Use getter instead of computed to avoid initialization issues
  get cardClasses(): string {
    const classes = [
      `variant-${this.variant}`,
      `size-${this.size}`
    ];

    if (this.clickable) {
      classes.push('clickable');
    }

    return classes.join(' ');
  }
}

