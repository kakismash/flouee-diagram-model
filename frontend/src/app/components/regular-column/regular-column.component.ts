import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { TableColumnComponent, ColumnConfig } from '../table-column/table-column.component';
import { ModernInputComponent } from '../modern-input/modern-input.component';

export interface RegularColumnData {
  element: any;
  index: number;
  column: ColumnConfig;
  value: any;
}

@Component({
  selector: 'app-regular-column',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    TableColumnComponent,
    ModernInputComponent
  ],
  template: `
    <app-table-column 
      [config]="columnConfig"
      [cellTemplate]="cellTemplate"
      [isEditingName]="isEditingName"
      [editingName]="editingName"
      (nameEdit)="onNameEdit($event)"
      (nameEditCancel)="onNameEditCancel()"
      (columnClick)="onColumnClick($event)">
    </app-table-column>

    <ng-template #cellTemplate let-data="element" let-i="index" let-column="column" let-value="value">
      <div class="cell-content" 
           [class.editing]="isEditingCell(i, column.name)"
           (click)="onCellClick(i, column.name, value)">
        
        <!-- Display Mode -->
        <span *ngIf="!isEditingCell(i, column.name)" 
              [class.primary-key]="column.isPrimaryKey"
              [class.editable]="!column.isAutoIncrement">
          {{ formatCellValue(value, column) }}
        </span>
        
        <!-- Edit Mode -->
        <div *ngIf="isEditingCell(i, column.name)" class="edit-cell">
          <app-modern-input
            [config]="{
              size: 'small',
              variant: 'outline',
              placeholder: 'Enter value',
              maxLength: 255
            }"
            [value]="editingValue"
            (valueChange)="onValueChange($event)"
            (enter)="onSaveEdit(i, column.name, data)"
            (escape)="onCancelEdit()"
            class="cell-edit-input">
          </app-modern-input>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .cell-content {
      padding: 8px 16px;
      min-height: 48px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .cell-content:hover {
      background-color: var(--theme-surface-variant);
    }

    .cell-content.editing {
      background-color: var(--theme-primary-container);
    }

    .edit-cell {
      width: 100%;
    }

    .cell-edit-input {
      width: 100%;
    }

    .primary-key {
      font-weight: 600;
      color: var(--theme-primary);
    }

    .editable {
      color: var(--theme-on-surface);
    }
  `]
})
export class RegularColumnComponent {
  @Input() column!: any; // Column definition from table
  @Input() isEditingName = false;
  @Input() editingName = '';
  @Input() editingValue = '';
  @Input() isEditingCell!: (rowIndex: number, columnName: string) => boolean;

  @Output() nameEdit = new EventEmitter<{ columnId: string; newName: string }>();
  @Output() nameEditCancel = new EventEmitter<void>();
  @Output() columnClick = new EventEmitter<string>();
  @Output() cellClick = new EventEmitter<{ rowIndex: number; columnName: string; value: any }>();
  @Output() valueChange = new EventEmitter<string>();
  @Output() saveEdit = new EventEmitter<{ rowIndex: number; columnName: string; element: any }>();
  @Output() cancelEdit = new EventEmitter<void>();

  get columnConfig(): ColumnConfig {
    return {
      name: this.column.name,
      id: this.column.id,
      isPrimaryKey: this.column.isPrimaryKey,
      isForeignKey: this.column.isForeignKey,
      isUnique: this.column.isUnique,
      isAutoIncrement: this.column.isAutoIncrement,
      isEditable: true,
      isDraggable: true,
      tooltip: this.getColumnTooltip()
    };
  }

  private getColumnTooltip(): string {
    const tooltips = [];
    if (this.column.isPrimaryKey) tooltips.push('Primary Key');
    if (this.column.isForeignKey) tooltips.push('Foreign Key');
    if (this.column.isUnique) tooltips.push('Unique');
    if (this.column.isAutoIncrement) tooltips.push('Auto Increment');
    return tooltips.join(', ');
  }

  onNameEdit(event: { columnId: string; newName: string }) {
    this.nameEdit.emit(event);
  }

  onNameEditCancel() {
    this.nameEditCancel.emit();
  }

  onColumnClick(columnId: string) {
    this.columnClick.emit(columnId);
  }

  onCellClick(rowIndex: number, columnName: string, value: any) {
    this.cellClick.emit({ rowIndex, columnName, value });
  }

  onValueChange(value: string) {
    this.valueChange.emit(value);
  }

  onSaveEdit(rowIndex: number, columnName: string, element: any) {
    this.saveEdit.emit({ rowIndex, columnName, element });
  }

  onCancelEdit() {
    this.cancelEdit.emit();
  }

  formatCellValue(value: any, column: ColumnConfig): string {
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Format based on column type
    if (column.isPrimaryKey && typeof value === 'number') {
      return `#${value}`;
    }
    
    return String(value);
  }
}
