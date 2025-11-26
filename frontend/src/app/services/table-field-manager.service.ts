import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Table, TableColumn } from '../models/table.model';
import { SchemaChangeHandlerService } from './schema-change-handler.service';
import { ProjectService } from './project.service';
import { NotificationService } from './notification.service';
import { AddFieldDialogComponent } from '../components/add-field-dialog/add-field-dialog.component';

@Injectable({
  providedIn: 'root'
})
export class TableFieldManagerService {
  private dialog = inject(MatDialog);
  private schemaHandler = inject(SchemaChangeHandlerService);
  private projectService = inject(ProjectService);
  private notificationService = inject(NotificationService);

  /**
   * Open dialog to add a new field to the table
   */
  async addField(table: Table): Promise<TableColumn | null> {
    const dialogRef = this.dialog.open(AddFieldDialogComponent, {
      width: '400px',
      data: { table }
    });

    const result = await dialogRef.afterClosed().toPromise();
    
    if (!result || !result.fieldName || !result.fieldType) {
      return null;
    }

    // Create new column
    // ✅ Generate ID once and use it consistently for both id and internal_name
    const columnId = this.generateId();
    const newColumn: TableColumn = {
      id: columnId,
      name: result.fieldName,
      internal_name: `c_${columnId}`, // ✅ Use same ID for internal_name
      type: result.fieldType,
      isPrimaryKey: false,
      isNullable: result.isNullable ?? true,
      isUnique: false,
      defaultValue: result.defaultValue,
      isAutoIncrement: result.fieldType.includes('SERIAL') || result.fieldType.includes('AUTO_INCREMENT'),
      isAutoGenerate: result.fieldType === 'UUID',
      isSystemGenerated: false
    };

    // Add column to table schema
    const currentProject = this.projectService.getCurrentProjectSync();
    if (!currentProject) {
      this.notificationService.showError('No project found');
      return null;
    }

    const updatedTable: Table = {
      ...table,
      columns: [...table.columns, newColumn]
    };

    try {
      await this.schemaHandler.applyTableEdits(
        currentProject.id,
        table,
        updatedTable,
        currentProject.schemaData.tables,
        currentProject.schemaData.relationships || [],
        currentProject.schemaData.relationshipDisplayColumns || []
      );

      this.notificationService.showSuccess(`Field "${newColumn.name}" added successfully`);
      return newColumn;
    } catch (error) {
      this.notificationService.showError(`Failed to add field: ${error}`);
      return null;
    }
  }

  /**
   * Generate a unique ID for a column
   * Uses timestamp + random string to ensure uniqueness
   * This ID is used for both the column's `id` and `internal_name` (with `c_` prefix)
   */
  private generateId(): string {
    // Use timestamp + random string for better uniqueness
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${timestamp}_${random}`;
  }
}

