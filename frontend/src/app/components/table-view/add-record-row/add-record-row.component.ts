import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Table, TableColumn } from '../../../models/table.model';
import { TableDataService } from '../../../services/table-data.service';
import { TableCellComponent } from '../../table-cell/table-cell.component';

@Component({
  selector: 'app-add-record-row',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TableCellComponent
  ],
  template: `
    @if (!isEditing()) {
      <!-- Add Record Button -->
      <tr class="add-record-row" (click)="onAddClick()">
        <td [attr.colspan]="totalColumns" class="add-record-cell">
          <button class="add-record-button" type="button" (click)="onAddClick()">
            <mat-icon>add</mat-icon>
            <span>Add Record</span>
          </button>
        </td>
      </tr>
    } @else {
      <!-- Temporary Record Row -->
      <tr class="temporary-record-row" [class.valid]="isValid()">
        @for (column of editableColumns(); track column.id) {
          <td [class.required-field]="isRequiredFieldEmpty(column)"
              [class.required-field-filled]="isRequiredFieldFilled(column)">
            <app-table-cell
              [rowIndex]="0"
              [columnName]="'reg_' + column.name"
              [value]="temporaryRecord()[column.name]"
              [column]="column"
              [isEditing]="true"
              [editingValue]="temporaryRecord()[column.name]"
              [selectOptions]="[]"
              [isTemporaryRow]="true"
              (startEdit)="startEdit.emit($event)"
              (valueChange)="valueChange.emit($event)"
              (save)="save.emit({rowIndex: 0, columnName: 'reg_' + column.name, element: temporaryRecord()})"
              (cancel)="cancel.emit()"
              (tabNext)="tabNext.emit($event)">
            </app-table-cell>
          </td>
        }
        <!-- Actions Column -->
        <td class="actions-cell">
          <div class="actions-buttons">
            <button mat-icon-button 
                    class="save-button"
                    [class.valid]="isValid()"
                    [disabled]="!isValid()"
                    (click)="onSaveRecord()"
                    matTooltip="Save Record">
              <mat-icon>check</mat-icon>
            </button>
            <button mat-icon-button 
                    class="cancel-button"
                    (click)="onCancelRecord()"
                    matTooltip="Cancel">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </td>
      </tr>
    }
  `,
  styles: [`
    .add-record-row {
      background-color: var(--theme-surface);
      border-top: 2px dashed var(--theme-outline);
      border-bottom: 1px solid var(--theme-outline-variant);
      min-height: 56px;
      cursor: pointer;
    }

    .add-record-row:hover {
      background-color: var(--theme-surface-variant);
      border-top-color: var(--theme-primary);
    }

    .add-record-cell {
      padding: 12px 16px !important;
      text-align: center;
      height: 56px;
    }

    .add-record-button {
      width: 100%;
      height: 100%;
      padding: 12px 24px;
      background: var(--theme-surface-variant);
      border: 2px dashed var(--theme-outline);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--theme-text-secondary);
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .add-record-button:hover {
      background-color: var(--theme-primary-container);
      border-color: var(--theme-primary);
      color: var(--theme-primary);
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .add-record-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    /* Temporary Record Row */
    .temporary-record-row {
      background-color: var(--theme-primary-container);
      opacity: 0.95;
      border: 2px dashed var(--theme-outline);
      animation: pulse 2s ease-in-out infinite;
    }

    .temporary-record-row.valid {
      border-color: var(--theme-success, #4caf50);
      animation: none;
    }

    .temporary-record-row:hover {
      opacity: 1;
      border-color: var(--theme-primary);
    }

    .temporary-record-row td {
      padding: 2px 4px !important;
      height: auto;
      min-height: 32px;
      vertical-align: middle;
    }

    .temporary-record-row td.required-field {
      background-color: var(--theme-error-container);
      border: 2px solid var(--theme-error);
    }

    .temporary-record-row td.required-field-filled {
      background-color: var(--theme-success-container);
      border: 2px solid var(--theme-success, #4caf50);
    }

    .actions-cell {
      padding: 4px !important;
      width: 80px;
      text-align: center;
    }

    .actions-buttons {
      display: flex;
      gap: 4px;
      justify-content: center;
      align-items: center;
    }

    .save-button {
      color: var(--theme-success, #4caf50);
    }

    .save-button.valid {
      background-color: var(--theme-success-container);
    }

    .save-button:disabled {
      opacity: 0.5;
    }

    .cancel-button {
      color: var(--theme-error);
    }

    .cancel-button:hover {
      background-color: var(--theme-error-container);
    }

    @keyframes pulse {
      0%, 100% { 
        background-color: var(--theme-primary-container);
        border-color: var(--theme-outline);
      }
      50% { 
        background-color: var(--theme-secondary-container);
        border-color: var(--theme-primary);
      }
    }
  `]
})
export class AddRecordRowComponent implements OnInit {
  @Input() table!: Table;
  @Input() originalData: any[] = [];
  @Input() totalColumns: number = 1;
  
  @Output() recordCreated = new EventEmitter<any>();
  @Output() recordSaved = new EventEmitter<any>();
  @Output() recordCancelled = new EventEmitter<void>();
  @Output() startEdit = new EventEmitter<{rowIndex: number, columnName: string, value: any}>();
  @Output() valueChange = new EventEmitter<{rowIndex: number, columnName: string, value: any}>();
  @Output() save = new EventEmitter<{rowIndex: number, columnName: string, element: any}>();
  @Output() cancel = new EventEmitter<void>();
  @Output() tabNext = new EventEmitter<{rowIndex: number, columnName: string}>();

  isEditing = signal(false);
  temporaryRecord = signal<any>(null);

  constructor(private tableDataService: TableDataService) {}

  ngOnInit() {
    // Component initialization
  }

  editableColumns = computed(() => {
    if (!this.table) return [];
    return this.table.columns.filter(col => 
      !col.isAutoIncrement && 
      !col.isAutoGenerate && 
      !col.isPrimaryKey
    );
  });

  isValid = computed(() => {
    const record = this.temporaryRecord();
    if (!record || !this.table) return false;
    
    // Check all required fields are filled
    const requiredColumns = this.table.columns.filter(col => 
      !col.isNullable && 
      !col.isAutoIncrement && 
      !col.isAutoGenerate
    );
    
    return requiredColumns.every(col => {
      const value = record[col.name];
      return value !== null && value !== undefined && value !== '';
    });
  });

  isRequiredFieldEmpty(column: TableColumn): boolean {
    const record = this.temporaryRecord();
    if (!record || !column) return false;
    if (column.isNullable || column.isAutoIncrement || column.isAutoGenerate) return false;
    
    const value = record[column.name];
    return value === null || value === undefined || value === '';
  }

  isRequiredFieldFilled(column: TableColumn): boolean {
    const record = this.temporaryRecord();
    if (!record || !column) return false;
    if (column.isNullable || column.isAutoIncrement || column.isAutoGenerate) return false;
    
    const value = record[column.name];
    return value !== null && value !== undefined && value !== '';
  }

  onAddClick() {
    if (this.isEditing()) return;
    
    // Create new temporary record
    const newRecord = this.tableDataService.createRecord(this.table, this.originalData);
    newRecord._isTemporary = true;
    
    this.temporaryRecord.set(newRecord);
    this.isEditing.set(true);
    
    this.recordCreated.emit(newRecord);
    
    // Focus first field after a short delay
    setTimeout(() => {
      const firstColumn = this.editableColumns()[0];
      if (firstColumn) {
        const inputElement = document.querySelector(
          `tr.temporary-record-row td app-table-cell[ng-reflect-column-name="reg_${firstColumn.name}"] input`
        ) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
        }
      }
    }, 100);
  }

  onSaveRecord() {
    if (!this.isValid()) return;
    
    const record = { ...this.temporaryRecord() };
    delete record._isTemporary;
    
    this.recordSaved.emit(record);
    
    // Reset
    this.temporaryRecord.set(null);
    this.isEditing.set(false);
  }

  onCancelRecord() {
    this.temporaryRecord.set(null);
    this.isEditing.set(false);
    this.recordCancelled.emit();
  }
}

