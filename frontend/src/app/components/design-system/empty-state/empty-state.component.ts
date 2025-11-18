import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BaseButtonComponent } from '../base-button/base-button.component';

@Component({
  selector: 'ds-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, BaseButtonComponent],
  template: `
    <div class="empty-state">
      <mat-icon *ngIf="icon" class="empty-state-icon">{{ icon }}</mat-icon>
      <h3 *ngIf="title" class="empty-state-title">{{ title }}</h3>
      <p *ngIf="description" class="empty-state-description">{{ description }}</p>
      <div *ngIf="actionLabel" class="empty-state-action">
        <ds-base-button
          [label]="actionLabel"
          [variant]="actionVariant"
          (clicked)="onActionClick($event)">
        </ds-base-button>
      </div>
      <div *ngIf="hasSlotContent" class="empty-state-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--ds-spacing-xxl, 48px) var(--ds-spacing-lg, 24px);
      min-height: 300px;
    }

    .empty-state-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--theme-text-disabled);
      margin-bottom: var(--ds-spacing-md, 16px);
    }

    .empty-state-title {
      margin: 0 0 var(--ds-spacing-sm, 8px) 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--theme-text-primary);
    }

    .empty-state-description {
      margin: 0 0 var(--ds-spacing-lg, 24px) 0;
      font-size: 14px;
      color: var(--theme-text-secondary);
      max-width: 400px;
    }

    .empty-state-action {
      margin-top: var(--ds-spacing-md, 16px);
    }

    .empty-state-content {
      margin-top: var(--ds-spacing-lg, 24px);
      width: 100%;
      max-width: 400px;
    }

    @media (max-width: 768px) {
      .empty-state {
        padding: var(--ds-spacing-xl, 32px) var(--ds-spacing-md, 16px);
        min-height: 200px;
      }

      .empty-state-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      .empty-state-title {
        font-size: 18px;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: string | null = null;
  @Input() title: string | null = null;
  @Input() description: string | null = null;
  @Input() actionLabel: string | null = null;
  @Input() actionVariant: 'primary' | 'secondary' | 'outline' = 'primary';
  @Input() hasSlotContent: boolean = false;

  onActionClick(event: MouseEvent): void {
    // Action handled by parent component via slot content or custom handler
  }
}

