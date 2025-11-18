import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Skeleton loader component for table view
 * Shows loading state while table initializes
 */
@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="table-skeleton">
      <div class="skeleton-header">
        @for (col of [1, 2, 3, 4]; track col) {
          <div class="skeleton-header-cell"></div>
        }
      </div>
      @for (row of [1, 2, 3, 4, 5]; track row) {
        <div class="skeleton-row">
          @for (col of [1, 2, 3, 4]; track col) {
            <div class="skeleton-cell"></div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .table-skeleton {
      width: 100%;
      padding: 16px;
      background-color: var(--theme-surface);
      border-radius: 8px;
    }

    .skeleton-header {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--theme-divider);
    }

    .skeleton-header-cell {
      flex: 1;
      height: 32px;
      background: linear-gradient(
        90deg,
        var(--theme-surface-variant) 25%,
        var(--theme-background) 50%,
        var(--theme-surface-variant) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }

    .skeleton-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }

    .skeleton-cell {
      flex: 1;
      height: 48px;
      background: linear-gradient(
        90deg,
        var(--theme-surface-variant) 25%,
        var(--theme-background) 50%,
        var(--theme-surface-variant) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }

    @keyframes skeleton-loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `]
})
export class TableSkeletonComponent {
  @Input() columnCount = 4;
  @Input() rowCount = 5;
}

