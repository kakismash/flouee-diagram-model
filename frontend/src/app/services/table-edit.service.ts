import { Injectable, signal } from '@angular/core';
import { Table } from '../models/table.model';

export interface EditingState {
  row: number;
  column: string;
  value: string;
}

@Injectable({
  providedIn: 'root'
})
export class TableEditService {
  // Editing state signals
  editingCell = signal<{row: number, column: string} | null>(null);
  editingValue = signal<string>('');
  editingColumnName = signal<string | null>(null);
  editingColumnNameValue = signal<string>('');

  // Multi-select state
  selectedRows = signal<Set<number>>(new Set());
  isMultiSelectMode = signal<boolean>(false);
  isCtrlPressed = signal<boolean>(false);

  /**
   * Start editing a cell
   */
  startEdit(rowIndex: number, columnName: string, currentValue: any): void {
    this.editingCell.set({ row: rowIndex, column: columnName });
    this.editingValue.set(String(currentValue || ''));
  }

  /**
   * Start editing a column name
   */
  startEditColumnName(columnId: string, currentName: string): void {
    this.editingColumnName.set(columnId);
    this.editingColumnNameValue.set(currentName);
  }

  /**
   * Update the editing value
   */
  updateEditingValue(value: any): void {
    this.editingValue.set(String(value || ''));
  }

  /**
   * Update the editing column name value
   */
  updateEditingColumnNameValue(value: string): void {
    this.editingColumnNameValue.set(value);
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.editingCell.set(null);
    this.editingValue.set('');
  }

  /**
   * Cancel column name editing
   */
  cancelEditColumnName(): void {
    this.editingColumnName.set(null);
    this.editingColumnNameValue.set('');
  }

  /**
   * Check if a cell is being edited
   */
  isEditing(rowIndex: number, columnName: string): boolean {
    const editing = this.editingCell();
    return editing?.row === rowIndex && editing?.column === columnName;
  }

  /**
   * Check if a column name is being edited
   */
  isEditingColumnName(columnId: string): boolean {
    return this.editingColumnName() === columnId;
  }

  /**
   * Toggle multi-select mode
   */
  toggleMultiSelectMode(): void {
    this.isMultiSelectMode.set(!this.isMultiSelectMode());
    if (!this.isMultiSelectMode()) {
      this.clearSelection();
    }
  }

  /**
   * Exit multi-select mode
   */
  exitMultiSelectMode(): void {
    this.isMultiSelectMode.set(false);
    this.clearSelection();
  }

  /**
   * Toggle row selection
   */
  toggleRowSelection(rowIndex: number): void {
    const selected = this.selectedRows();
    const newSelected = new Set(selected);
    
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
    } else {
      newSelected.add(rowIndex);
    }
    
    this.selectedRows.set(newSelected);
  }

  /**
   * Check if a row is selected
   */
  isRowSelected(rowIndex: number): boolean {
    return this.selectedRows().has(rowIndex);
  }

  /**
   * Select all visible rows
   */
  selectAllVisibleRows(visibleRowCount: number): void {
    const newSelected = new Set<number>();
    for (let i = 0; i < visibleRowCount; i++) {
      newSelected.add(i);
    }
    this.selectedRows.set(newSelected);
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedRows.set(new Set());
  }

  /**
   * Get selected count
   */
  getSelectedCount(): number {
    return this.selectedRows().size;
  }

  /**
   * Parse value based on column type
   */
  parseValue(value: string, columnName: string, table: Table): any {
    const column = table.columns.find(col => col.name === columnName);
    if (!column) return value;

    switch (column.type) {
      case 'INTEGER':
      case 'BIGINT':
      case 'SMALLINT':
        return parseInt(value, 10) || 0;
      case 'DECIMAL':
      case 'NUMERIC':
      case 'REAL':
      case 'DOUBLE PRECISION':
        return parseFloat(value) || 0;
      case 'BOOLEAN':
        return value.toLowerCase() === 'true' || value === '1';
      case 'DATE':
      case 'TIMESTAMP':
      case 'TIMESTAMPTZ':
        return value ? new Date(value) : null;
      default:
        return value;
    }
  }

  /**
   * Format cell value for display
   */
  formatCellValue(value: any, column: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (column.type === 'date' || column.type === 'datetime') {
      return value instanceof Date ? value.toLocaleDateString() : value;
    }

    return String(value);
  }
}



