import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableColumnComponent, ColumnConfig } from '../table-column/table-column.component';

export interface ActionColumnData {
  element: any;
  index: number;
  column: ColumnConfig;
  value: any;
}

@Component({
  selector: 'app-action-column',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TableColumnComponent
  ],
  template: `
    <app-table-column 
      [config]="columnConfig"
      [cellTemplate]="cellTemplate"
      [isEditingName]="false"
      [editingName]="''">
    </app-table-column>

    <ng-template #cellTemplate let-data="element" let-i="index" let-column="column" let-value="value">
      <div class="actions-cell">
        <button mat-icon-button 
                (click)="onDeleteClick(i)" 
                matTooltip="Delete Row"
                class="delete-btn">
          <mat-icon>delete</mat-icon>
        </button>
        
        <button mat-icon-button 
                (click)="onEditClick(i)" 
                matTooltip="Edit Row"
                class="edit-btn">
          <mat-icon>edit</mat-icon>
        </button>
        
        <button mat-icon-button 
                (click)="onViewClick(i)" 
                matTooltip="View Details"
                class="view-btn">
          <mat-icon>visibility</mat-icon>
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .actions-cell {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 16px;
      min-height: 48px;
    }

    .delete-btn {
      color: var(--theme-error);
    }

    .delete-btn:hover {
      background-color: var(--theme-error-container);
    }

    .edit-btn {
      color: var(--theme-primary);
    }

    .edit-btn:hover {
      background-color: var(--theme-primary-container);
    }

    .view-btn {
      color: var(--theme-secondary);
    }

    .view-btn:hover {
      background-color: var(--theme-secondary-container);
    }
  `]
})
export class ActionColumnComponent {
  @Input() showDelete = true;
  @Input() showEdit = true;
  @Input() showView = true;

  @Output() delete = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() view = new EventEmitter<number>();

  get columnConfig(): ColumnConfig {
    return {
      name: 'Actions',
      id: 'actions',
      isEditable: false,
      isDraggable: false,
      tooltip: 'Row actions'
    };
  }

  onDeleteClick(index: number) {
    this.delete.emit(index);
  }

  onEditClick(index: number) {
    this.edit.emit(index);
  }

  onViewClick(index: number) {
    this.view.emit(index);
  }
}
