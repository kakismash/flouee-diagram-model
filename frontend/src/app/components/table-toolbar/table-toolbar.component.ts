import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { TableSearchComponent } from '../table-view/table-search/table-search.component';

@Component({
  selector: 'app-table-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    TableSearchComponent
  ],
  template: `
    <div class="table-toolbar">
      <!-- Left Section: Search -->
      <div class="toolbar-left">
        <app-table-search (searchChanged)="onSearchChanged($event)"></app-table-search>
      </div>

      <!-- Center Section: Selection Info (when items selected) -->
      <div class="toolbar-center" *ngIf="selectedCount > 0">
        <div class="selection-badge">
          <span class="selection-count">{{ selectedCount }} selected</span>
          <button mat-icon-button 
                  (click)="deleteSelected.emit()" 
                  matTooltip="Delete Selected"
                  class="action-icon-btn">
            <mat-icon>delete</mat-icon>
          </button>
          <button mat-icon-button 
                  (click)="clearSelection.emit()" 
                  matTooltip="Clear Selection"
                  class="action-icon-btn">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <!-- Right Section: Action Buttons -->
      <div class="toolbar-right">
        <!-- Filter Button -->
        <button mat-icon-button
                (click)="openFilters.emit()" 
                matTooltip="Filters"
                class="toolbar-icon-btn"
                [class.active]="activeFiltersCount > 0">
          <mat-icon>filter_list</mat-icon>
          <span class="badge" *ngIf="activeFiltersCount > 0">{{ activeFiltersCount }}</span>
        </button>

        <!-- Sort Button -->
        <button mat-icon-button
                (click)="openSort.emit()" 
                matTooltip="Sort"
                class="toolbar-icon-btn">
          <mat-icon>sort</mat-icon>
        </button>

        <!-- Columns Button -->
        <button mat-icon-button
                (click)="openColumns.emit()" 
                matTooltip="Columns"
                class="toolbar-icon-btn">
          <mat-icon>view_column</mat-icon>
        </button>

        <!-- More Menu -->
        <button mat-icon-button
                [matMenuTriggerFor]="moreMenu"
                matTooltip="More options"
                class="toolbar-icon-btn">
          <mat-icon>more_vert</mat-icon>
        </button>

        <mat-menu #moreMenu="matMenu" class="more-menu">
          <button mat-menu-item (click)="openViewManager.emit()">
            <mat-icon>view_module</mat-icon>
            <span>Views</span>
          </button>
          <button mat-menu-item 
                  (click)="toggleMultiSelect.emit()"
                  [class.active]="isMultiSelectMode">
            <mat-icon>checklist</mat-icon>
            <span>{{ isMultiSelectMode ? 'Exit Multi-Select' : 'Multi-Select' }}</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="editSchema.emit()">
            <mat-icon>schema</mat-icon>
            <span>Edit Schema</span>
          </button>
        </mat-menu>
      </div>
    </div>
  `,
  styles: [`
    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background-color: var(--theme-surface);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      min-height: 48px;
      gap: 16px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      flex: 0 0 auto;
    }

    .toolbar-center {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 0 0 auto;
    }

    .selection-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background-color: var(--theme-primary-container);
      color: var(--theme-on-primary-container);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .selection-count {
      font-weight: 500;
    }

    .action-icon-btn {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      line-height: 40px;
      color: var(--theme-on-primary-container);
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: all 150ms ease-out;
      border-radius: 6px;
    }

    .action-icon-btn:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    .action-icon-btn:active {
      background-color: rgba(255, 255, 255, 0.2);
      transform: scale(0.95);
    }

    .action-icon-btn mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Ensure Material touch targets are properly sized */
    .action-icon-btn ::ng-deep .mat-mdc-button-touch-target {
      width: 40px !important;
      height: 40px !important;
    }

    .toolbar-icon-btn {
      width: 48px;
      height: 48px;
      min-width: 48px;
      min-height: 48px;
      line-height: 48px;
      color: var(--theme-text-secondary);
      position: relative;
      transition: all 150ms ease-out;
      border-radius: 8px;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }

    .toolbar-icon-btn:hover {
      background-color: rgba(0, 0, 0, 0.04);
      color: var(--theme-text-primary);
    }

    .toolbar-icon-btn:active {
      background-color: rgba(0, 0, 0, 0.08);
      transform: scale(0.95);
    }

    .toolbar-icon-btn.active {
      background-color: var(--theme-primary-container);
      color: var(--theme-primary);
    }

    .toolbar-icon-btn mat-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    /* Ensure Material touch targets are properly sized */
    .toolbar-icon-btn ::ng-deep .mat-mdc-button-touch-target {
      width: 48px !important;
      height: 48px !important;
    }

    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background-color: var(--theme-primary);
      color: var(--theme-on-primary);
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
    }

    .more-menu {
      margin-top: 4px;
    }

    .more-menu button[mat-menu-item].active {
      background-color: var(--theme-primary-container);
      color: var(--theme-primary);
    }

    .more-menu mat-icon {
      margin-right: 12px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Responsive adjustments for mobile */
    @media (max-width: 768px) {
      .table-toolbar {
        padding: 8px 12px;
        gap: 12px;
        min-height: 56px;
      }

      .toolbar-icon-btn {
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
        line-height: 44px;
      }

      .toolbar-icon-btn ::ng-deep .mat-mdc-button-touch-target {
        width: 44px !important;
        height: 44px !important;
      }

      .toolbar-icon-btn mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .toolbar-right {
        gap: 2px;
      }
    }

    @media (max-width: 480px) {
      .table-toolbar {
        padding: 6px 8px;
        gap: 8px;
        flex-wrap: wrap;
      }

      .toolbar-left {
        width: 100%;
        margin-bottom: 8px;
      }

      .toolbar-center {
        width: 100%;
        justify-content: flex-start;
        margin-bottom: 8px;
      }

      .toolbar-right {
        width: 100%;
        justify-content: space-between;
      }

      .toolbar-icon-btn {
        flex: 1;
        max-width: none;
      }
    }

    /* Touch device optimizations */
    @media (hover: none) and (pointer: coarse) {
      .toolbar-icon-btn {
        width: 48px;
        height: 48px;
      }

      .toolbar-icon-btn:hover {
        background-color: transparent;
      }

      .toolbar-icon-btn:active {
        background-color: rgba(0, 0, 0, 0.12);
      }
    }
  `]
})
export class TableToolbarComponent {
  @Input() selectedCount = 0;
  @Input() isMultiSelectMode = false;
  @Input() activeFiltersCount = 0;

  @Output() openFilters = new EventEmitter<void>();
  @Output() openSort = new EventEmitter<void>();
  @Output() openColumns = new EventEmitter<void>();
  @Output() openViewManager = new EventEmitter<void>();
  @Output() toggleMultiSelect = new EventEmitter<void>();
  @Output() deleteSelected = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() editSchema = new EventEmitter<void>();
  @Output() searchChanged = new EventEmitter<string>();

  onSearchChanged(value: string): void {
    this.searchChanged.emit(value);
  }
}



