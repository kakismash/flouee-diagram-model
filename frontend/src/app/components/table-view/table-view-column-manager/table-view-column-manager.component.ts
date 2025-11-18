import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { BaseButtonComponent } from '../../design-system/base-button/base-button.component';

export interface ColumnSetting {
  columnId: string;
  columnName: string;
  isVisible: boolean;
  order: number;
}

@Component({
  selector: 'app-table-view-column-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCheckboxModule,
    MatTooltipModule,
    DragDropModule,
    BaseButtonComponent
  ],
  template: `
    <div class="column-manager">
      <button
        mat-button
        [matMenuTriggerFor]="columnMenu"
        class="column-manager-button">
        <mat-icon>view_column</mat-icon>
        <span>Columns</span>
      </button>

      <mat-menu #columnMenu="matMenu" class="column-menu">
        <div class="column-menu-header">
          <span>Manage Columns</span>
          <ds-base-button
            icon="drag_indicator"
            variant="ghost"
            size="small"
            matTooltip="Drag to reorder">
          </ds-base-button>
        </div>

        <div class="column-list" cdkDropList (cdkDropListDropped)="onColumnDrop($event)">
          <div
            *ngFor="let column of columnSettings"
            cdkDrag
            class="column-item">
            <div class="column-item-content">
              <mat-checkbox
                [checked]="column.isVisible"
                (change)="toggleColumnVisibility(column.columnId, $event.checked)"
                (click)="$event.stopPropagation()">
              </mat-checkbox>
              <span class="column-name">{{ column.columnName }}</span>
              <mat-icon class="drag-handle" cdkDragHandle>drag_indicator</mat-icon>
            </div>
          </div>
        </div>

        <div class="column-menu-footer">
          <ds-base-button
            label="Show All"
            variant="text"
            size="small"
            (clicked)="showAllColumns()">
          </ds-base-button>
          <ds-base-button
            label="Hide All"
            variant="text"
            size="small"
            (clicked)="hideAllColumns()">
          </ds-base-button>
        </div>
      </mat-menu>
    </div>
  `,
  styles: [`
    .column-manager {
      display: flex;
      align-items: center;
    }

    .column-manager-button {
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

    .column-manager-button:hover {
      background-color: var(--theme-surface-variant);
    }

    .column-menu {
      min-width: 280px;
      max-width: 350px;
    }

    .column-menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--ds-spacing-sm, 8px) var(--ds-spacing-md, 16px);
      font-weight: 500;
      color: var(--theme-text-primary);
      border-bottom: 1px solid var(--theme-divider);
    }

    .column-list {
      padding: var(--ds-spacing-sm, 8px);
      max-height: 400px;
      overflow-y: auto;
    }

    .column-item {
      cursor: move;
      border-radius: var(--ds-radius-small, 4px);
      margin-bottom: var(--ds-spacing-xs, 4px);
    }

    .column-item:hover {
      background-color: var(--theme-surface-variant);
    }

    .column-item-content {
      display: flex;
      align-items: center;
      gap: var(--ds-spacing-sm, 8px);
      padding: var(--ds-spacing-xs, 4px) var(--ds-spacing-sm, 8px);
    }

    .column-name {
      flex: 1;
      color: var(--theme-text-primary);
      font-size: 14px;
    }

    .drag-handle {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--theme-text-disabled);
      cursor: grab;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .column-menu-footer {
      display: flex;
      gap: var(--ds-spacing-sm, 8px);
      padding: var(--ds-spacing-sm, 8px);
      border-top: 1px solid var(--theme-divider);
    }

    /* Drag and drop styles */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: var(--ds-radius-small, 4px);
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                  0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12);
      background: var(--theme-surface);
    }

    .cdk-drag-placeholder {
      opacity: 0.4;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class TableViewColumnManagerComponent {
  @Input() columnSettings: ColumnSetting[] = [];

  @Output() columnsChanged = new EventEmitter<ColumnSetting[]>();

  toggleColumnVisibility(columnId: string, isVisible: boolean): void {
    const column = this.columnSettings.find(c => c.columnId === columnId);
    if (column) {
      column.isVisible = isVisible;
      this.columnsChanged.emit([...this.columnSettings]);
    }
  }

  onColumnDrop(event: CdkDragDrop<ColumnSetting[]>): void {
    moveItemInArray(this.columnSettings, event.previousIndex, event.currentIndex);
    // Update order values
    this.columnSettings.forEach((col, index) => {
      col.order = index;
    });
    this.columnsChanged.emit([...this.columnSettings]);
  }

  showAllColumns(): void {
    this.columnSettings.forEach(col => col.isVisible = true);
    this.columnsChanged.emit([...this.columnSettings]);
  }

  hideAllColumns(): void {
    this.columnSettings.forEach(col => col.isVisible = false);
    this.columnsChanged.emit([...this.columnSettings]);
  }
}

