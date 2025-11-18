import { Injectable, inject } from '@angular/core';
import { Table, Relationship, RelationshipDisplayColumn } from '../models/table.model';
import { TableEditService } from './table-edit.service';
import { SchemaChangeHandlerService } from './schema-change-handler.service';
import { ProjectService } from './project.service';
import { NotificationService } from './notification.service';

/**
 * Service to handle column name editing
 * Manages renaming columns and updating schema in Supabase
 */
@Injectable({
  providedIn: 'root'
})
export class TableColumnNameEditorService {
  private tableEditService = inject(TableEditService);
  private schemaChangeHandler = inject(SchemaChangeHandlerService);
  private projectService = inject(ProjectService);
  private notificationService = inject(NotificationService);

  /**
   * Save a column name change
   * Updates the column name in the table and syncs with Supabase
   */
  async saveColumnName(
    columnId: string,
    newName: string,
    table: Table,
    allTables: Table[],
    relationships: Relationship[],
    relationshipDisplayColumns: RelationshipDisplayColumn[]
  ): Promise<void> {
    const column = table.columns.find(col => col.id === columnId);
    
    if (!column) {
      this.tableEditService.cancelEditColumnName();
      return;
    }

    // Trim the new name
    const trimmedNewName = newName.trim();
    
    // If name didn't change, just cancel
    if (column.name === trimmedNewName) {
      this.tableEditService.cancelEditColumnName();
      return;
    }

    // Get current project
    const currentProject = this.projectService.getCurrentProjectSync();
    
    if (!currentProject) {
      this.notificationService.showError('No project found');
      this.tableEditService.cancelEditColumnName();
      return;
    }

    // Create a copy of the table with updated column name
    const oldTable = { ...table };
    const updatedTable: Table = {
      ...table,
      columns: table.columns.map(col => 
        col.id === columnId ? { ...col, name: trimmedNewName } : col
      )
    };

    // Show loading notification and save
    try {
      await this.notificationService.showOperationStatus(
        async () => {
          // Call applyTableEdits which will detect the rename and apply to Supabase
          await this.schemaChangeHandler.applyTableEdits(
            currentProject.id,
            oldTable,
            updatedTable,
            allTables,
            relationships,
            relationshipDisplayColumns
          );
          
          // Update local table reference
          column.name = trimmedNewName;
          
          return { success: true };
        },
        `Renaming column to "${trimmedNewName}"...`,
        `Column renamed to "${trimmedNewName}"`
      );
      
      // Only cancel edit mode after successful save
      this.tableEditService.cancelEditColumnName();
    } catch (error: any) {
      console.error('saveColumnName - Error occurred:', error);
      this.notificationService.showError(`Failed to rename column: ${error.message || error}`);
      // Don't cancel edit mode on error so user can try again
    }
  }
}

