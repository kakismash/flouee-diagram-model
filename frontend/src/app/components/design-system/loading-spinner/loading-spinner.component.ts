import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ComponentSize } from '../../../design-system/design-system.config';

@Component({
  selector: 'ds-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="loading-spinner" [class.center]="center" [attr.aria-label]="ariaLabel || 'Loading'">
      <mat-spinner [diameter]="getDiameter()" [strokeWidth]="strokeWidth"></mat-spinner>
      <p *ngIf="message" class="loading-message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ds-spacing-md, 16px);
      padding: var(--ds-spacing-lg, 24px);
    }

    .loading-spinner.center {
      justify-content: center;
      min-height: 200px;
    }

    .loading-message {
      margin: 0;
      font-size: 14px;
      color: var(--theme-text-secondary);
      text-align: center;
    }

    mat-spinner {
      color: var(--theme-primary);
    }
  `]
})
export class LoadingSpinnerComponent {
  @Input() size: ComponentSize = 'medium';
  @Input() strokeWidth: number = 4;
  @Input() message: string | null = null;
  @Input() center: boolean = false;
  @Input() ariaLabel: string | null = null;

  getDiameter(): number {
    const sizeMap: Record<ComponentSize, number> = {
      small: 32,
      medium: 48,
      large: 64
    };
    return sizeMap[this.size];
  }
}

