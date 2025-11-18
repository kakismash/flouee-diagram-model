import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BaseButtonComponent } from '../../design-system/base-button/base-button.component';
import { ChipComponent } from '../../design-system/chip/chip.component';

export interface SortColumn {
  columnId: string;
  columnName: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-table-view-sorter',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    BaseButtonComponent,
    ChipComponent
  ],
  template: `
    <div class="sorter-panel">
      <button
        mat-button
        [matMenuTriggerFor]="sortMenu"
        class="sorter-button">
        <mat-icon>sort</mat-icon>
        <span>{{ getSortLabel() }}</span>
      </button>

      <mat-menu #sortMenu="matMenu" class="sort-menu">
        <div class="sort-menu-header">
          <span>Sort by</span>
        </div>
        
        <div class="sort-list">
          <div *ngFor="let sort of sortColumns; let i = index" class="sort-item">
            <div class="sort-item-content">
              <mat-icon class="sort-icon">{{ getSortIcon(sort.direction) }}</mat-icon>
              <span class="sort-column-name">{{ sort.columnName }}</span>
              <ds-chip
                *ngIf="i === 0"
                label="1"
                variant="primary"
                size="small">
              </ds-chip>
            </div>
            <div class="sort-actions">
              <ds-base-button
                icon="arrow_upward"
                variant="ghost"
                size="small"
                [class.active]="sort.direction === 'asc'"
                (clicked)="setSortDirection(i, 'asc')">
              </ds-base-button>
              <ds-base-button
                icon="arrow_downward"
                variant="ghost"
                size="small"
                [class.active]="sort.direction === 'desc'"
                (clicked)="setSortDirection(i, 'desc')">
              </ds-base-button>
              <ds-base-button
                icon="close"
                variant="ghost"
                size="small"
                (clicked)="removeSort(i)">
              </ds-base-button>
            </div>
          </div>
        </div>

        <div class="sort-menu-footer">
          <ds-base-button
            label="Add Sort"
            variant="outline"
            size="small"
            icon="add"
            (clicked)="addSort()">
          </ds-base-button>
          <ds-base-button
            *ngIf="sortColumns.length > 0"
            label="Clear All"
            variant="text"
            size="small"
            (clicked)="clearAll()">
          </ds-base-button>
        </div>
      </mat-menu>
    </div>
  `,
  styles: [`
    .sorter-panel {
      display: flex;
      align-items: center;
    }

    .sorter-button {
      display: flex;
      align-items: center;
      gap: var(--ds-spacing-xs, 4px);
      color: var(--theme-text-primary);
      border: 1px solid var(--theme-border);
      border-radius: var(--ds-radius-small, 4px);
      padding: 6px 12px;
      font-size: 14px;
      background: var(--theme-surface);
    }

    .sorter-button:hover {
      background-color: var(--theme-surface-variant);
    }

    .sort-menu {
      min-width: 300px;
      max-width: 400px;
    }

    .sort-menu-header {
      padding: var(--ds-spacing-sm, 8px) var(--ds-spacing-md, 16px);
      font-weight: 500;
      color: var(--theme-text-primary);
      border-bottom: 1px solid var(--theme-divider);
    }

    .sort-list {
      padding: var(--ds-spacing-sm, 8px);
      max-height: 300px;
      overflow-y: auto;
    }

    .sort-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ds-spacing-xs, 4px) var(--ds-spacing-sm, 8px);
      border-radius: var(--ds-radius-small, 4px);
      margin-bottom: var(--ds-spacing-xs, 4px);
    }

    .sort-item:hover {
      background-color: var(--theme-surface-variant);
    }

    .sort-item-content {
      display: flex;
      align-items: center;
      gap: var(--ds-spacing-sm, 8px);
      flex: 1;
    }

    .sort-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--theme-text-secondary);
    }

    .sort-column-name {
      flex: 1;
      color: var(--theme-text-primary);
      font-size: 14px;
    }

    .sort-actions {
      display: flex;
      gap: var(--ds-spacing-xs, 4px);
    }

    .sort-actions button.active {
      background-color: var(--theme-primary-container);
      color: var(--theme-on-primary-container);
    }

    .sort-menu-footer {
      display: flex;
      gap: var(--ds-spacing-sm, 8px);
      padding: var(--ds-spacing-sm, 8px);
      border-top: 1px solid var(--theme-divider);
    }
  `]
})
export class TableViewSorterComponent {
  @Input() availableColumns: Array<{ id: string; name: string }> = [];
  @Input() sortColumns: SortColumn[] = [];

  @Output() sortChanged = new EventEmitter<SortColumn[]>();

  getSortLabel(): string {
    if (this.sortColumns.length === 0) {
      return 'Sort';
    }
    if (this.sortColumns.length === 1) {
      return `Sort: ${this.sortColumns[0].columnName}`;
    }
    return `Sort: ${this.sortColumns.length} columns`;
  }

  getSortIcon(direction: 'asc' | 'desc'): string {
    return direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  addSort(): void {
    const newSort: SortColumn = {
      columnId: this.availableColumns[0]?.id || '',
      columnName: this.availableColumns[0]?.name || '',
      direction: 'asc'
    };
    this.sortColumns.push(newSort);
    this.sortChanged.emit([...this.sortColumns]);
  }

  removeSort(index: number): void {
    this.sortColumns.splice(index, 1);
    this.sortChanged.emit([...this.sortColumns]);
  }

  setSortDirection(index: number, direction: 'asc' | 'desc'): void {
    this.sortColumns[index].direction = direction;
    this.sortChanged.emit([...this.sortColumns]);
  }

  clearAll(): void {
    this.sortColumns = [];
    this.sortChanged.emit([]);
  }
}

