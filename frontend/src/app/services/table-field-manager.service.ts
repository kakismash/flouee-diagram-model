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
    const newColumn: TableColumn = {
      id: this.generateId(),
      name: result.fieldName,
      internal_name: `c_${this.generateId()}`,
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

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

