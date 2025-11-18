import { Injectable, inject } from '@angular/core';
import { Table, TableColumn } from '../models/table.model';
import { TableView } from '../models/table-view.model';
import { TableViewService } from './table-view.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

/**
 * Service to manage table view operations
 * Handles applying views, default columns, and column reordering
 */
@Injectable({
  providedIn: 'root'
})
export class TableViewManagerService {
  private tableViewService = inject(TableViewService);

  /**
   * Apply a view to a table - updates regularColumns and relationshipColumns
   */
  applyViewToTable(
    table: Table,
    view: TableView
  ): { regularColumns: TableColumn[]; relationshipColumns: any[] } {
    return this.tableViewService.applyViewToTable(table, view);
  }

  /**
   * Apply default columns (all columns) when no view is active
   */
  applyDefaultColumns(table: Table): { regularColumns: TableColumn[]; relationshipColumns: any[] } {
    return this.tableViewService.getDefaultColumns(table);
  }

  /**
   * Handle column drop/reorder event
   * Updates the view's column settings with the new order
   */
  handleColumnDrop(
    event: CdkDragDrop<any[]>,
    regularColumns: TableColumn[],
    activeView: TableView | null,
    table: Table | null,
    onViewUpdated: (view: TableView) => void,
    onColumnsUpdated: (regularColumns: TableColumn[], relationshipColumns: any[]) => void
  ): void {
    if (!activeView) {
      return;
    }
    
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    
    // Get the column that was moved (before reordering)
    const movedColumn = regularColumns[event.previousIndex];
    
    if (!movedColumn) {
      return;
    }
    
    // Update view column settings with new order FIRST (before modifying regularColumns)
    if (activeView.columnSettings && movedColumn && table) {
      // Get only visible regular column settings (not relationship columns), sorted by current order
      const regularColumnSettings = activeView.columnSettings
        .filter(s => {
          // Check if this is a regular column (not a relationship column)
          return table.columns.some(col => col.id === s.columnId);
        })
        .sort((a, b) => a.order - b.order);
      
      // Find the setting for the moved column
      const movedSettingIndex = regularColumnSettings.findIndex(s => s.columnId === movedColumn.id);
      
      if (movedSettingIndex !== -1) {
        // Reorder the regular column settings array based on the new position
        // The event.currentIndex is the new position in regularColumns array
        moveItemInArray(regularColumnSettings, movedSettingIndex, event.currentIndex);
        
        // Update order values for all regular column settings
        regularColumnSettings.forEach((setting, index) => {
          setting.order = index;
        });
        
        // Merge back with relationship column settings (preserve their order)
        const relationshipColumnSettings = activeView.columnSettings.filter(s => {
          return !table.columns.some(col => col.id === s.columnId);
        });
        
        // Update the view columnSettings in place (mutate the existing array to avoid triggering effect)
        // Clear and repopulate to maintain reference
        activeView.columnSettings.length = 0;
        activeView.columnSettings.push(...regularColumnSettings, ...relationshipColumnSettings);
        
        // Now update regularColumns to match the new order
        // Reapply the view to get the updated column order
        const result = this.tableViewService.applyViewToTable(table, activeView);
        
        // Update columns
        onColumnsUpdated(result.regularColumns, result.relationshipColumns);
        
        // Emit the updated view AFTER updating regularColumns
        // Create a new object reference for the emit to ensure parent gets the update
        onViewUpdated({ ...activeView });
      }
    } else {
      // If no view settings, just reorder the display array
      const reorderedColumns = [...regularColumns];
      moveItemInArray(reorderedColumns, event.previousIndex, event.currentIndex);
      onColumnsUpdated(reorderedColumns, []);
    }
  }
}

