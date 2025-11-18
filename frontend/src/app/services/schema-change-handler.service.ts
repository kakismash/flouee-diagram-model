import { Injectable, inject } from '@angular/core';
import { Table, TableColumn, ProjectSchema } from '../models/table.model';
import { SchemaChange } from '../models/schema-change.model';
import { EventDrivenSchemaService, EventDrivenResult } from './event-driven-schema.service';
import { ProjectService } from './project.service';
import { NotificationService } from './notification.service';

/**
 * Service to handle schema changes (table creation, updates, deletions)
 * Extracted from diagram-editor.component.ts for reusability and testability
 */
@Injectable({
  providedIn: 'root'
})
export class SchemaChangeHandlerService {
  private eventDrivenSchema = inject(EventDrivenSchemaService);
  private projectService = inject(ProjectService);
  private notificationService = inject(NotificationService);

  /**
   * Create a new table using Edge Function to sync with Slave
   */
  async createTable(
    projectId: string,
    table: Table,
    currentTables: Table[],
    currentRelationships: any[],
    currentRelationshipDisplayColumns: any[],
    currentVersion: number
  ): Promise<EventDrivenResult> {
    // Ensure table has internal_name for Edge Function
    if (!table.internal_name) {
      table.internal_name = `t_${table.id}`;
    }
    
    // Ensure columns have internal_name
    table.columns = table.columns.map((col: any) => ({
      ...col,
      internal_name: col.internal_name || `c_${col.id}`
    }));

    const currentProject = this.projectService.getCurrentProject()();
    if (!currentProject) {
      throw new Error('No current project found');
    }

    // Create new schema with the new table
    const newSchemaData: ProjectSchema = {
      tables: [...currentTables, table],
      relationships: currentRelationships,
      relationshipDisplayColumns: currentRelationshipDisplayColumns,
      ...(currentProject.schemaData.metadata && { metadata: currentProject.schemaData.metadata })
    };

    const result = await this.notificationService.showOperationStatus(
      async () => {
        const createResult = await this.eventDrivenSchema.createTable(
          projectId,
          table,
          newSchemaData,
          currentVersion
        );

        if (!createResult.success) {
          throw new Error(createResult.error || 'Failed to create table');
        }

        return createResult;
      },
      `Creating table "${table.name}"...`,
      `Table "${table.name}" created successfully`
    );

    return result;
  }

  /**
   * Delete a table using Edge Function
   */
  async deleteTable(
    projectId: string,
    tableId: string,
    currentTables: Table[],
    currentRelationships: any[],
    currentRelationshipDisplayColumns: any[],
    currentVersion: number
  ): Promise<EventDrivenResult> {
    const currentProject = this.projectService.getCurrentProject()();
    if (!currentProject) {
      throw new Error('No current project found');
    }

    // Create new schema without the table
    const newSchemaData: ProjectSchema = {
      tables: currentTables.filter(t => t.id !== tableId),
      relationships: currentRelationships.filter(rel => 
        rel.fromTableId !== tableId && rel.toTableId !== tableId
      ),
      relationshipDisplayColumns: currentRelationshipDisplayColumns.filter(
        col => col.tableId !== tableId
      ),
      ...(currentProject.schemaData.metadata && { metadata: currentProject.schemaData.metadata })
    };

    const table = currentTables.find(t => t.id === tableId);
    const tableName = table?.name || 'Unknown';

    const result = await this.notificationService.showOperationStatus(
      async () => {
        const deleteResult = await this.eventDrivenSchema.deleteTable(
          projectId,
          tableId,
          newSchemaData,
          currentVersion
        );

        if (!deleteResult.success) {
          throw new Error(deleteResult.error || 'Failed to delete table');
        }

        return deleteResult;
      },
      `Deleting table "${tableName}"...`,
      `Table "${tableName}" deleted successfully`
    );

    return result;
  }

  /**
   * Detect and apply changes when a table is edited
   */
  async applyTableEdits(
    projectId: string,
    oldTable: Table,
    newTable: Table,
    currentTables: Table[],
    currentRelationships: any[],
    currentRelationshipDisplayColumns: any[]
  ): Promise<void> {
    console.log('=== applyTableEdits START ===');
    console.log('applyTableEdits - projectId:', projectId);
    console.log('applyTableEdits - oldTable:', oldTable);
    console.log('applyTableEdits - newTable:', newTable);
    console.log('applyTableEdits - oldTable columns:', oldTable.columns.map(c => ({ id: c.id, name: c.name })));
    console.log('applyTableEdits - newTable columns:', newTable.columns.map(c => ({ id: c.id, name: c.name })));
    const tableNameForDB = newTable.internal_name || oldTable.internal_name || `t_${oldTable.id}`;
    const changes: SchemaChange[] = [];
    
    console.log('applyTableEdits - tableNameForDB:', tableNameForDB);
    
    // Filter out system columns (id column) from comparison
    const oldUserColumns = oldTable.columns.filter(col => 
      !(col.name === 'id' && col.isPrimaryKey)
    );
    const newUserColumns = newTable.columns.filter(col => 
      !(col.name === 'id' && col.isPrimaryKey)
    );
    
    console.log('applyTableEdits - oldUserColumns:', oldUserColumns.map(c => ({ id: c.id, name: c.name })));
    console.log('applyTableEdits - newUserColumns:', newUserColumns.map(c => ({ id: c.id, name: c.name })));

    // Detect added columns
    const addedColumns = newUserColumns.filter(newCol => 
      !oldUserColumns.some(oldCol => oldCol.id === newCol.id)
    );

    for (const col of addedColumns) {
      changes.push({
        type: 'add_column',
        table_name: tableNameForDB,
        column: {
          id: col.id,
          name: col.name,
          internal_name: col.internal_name || `c_${col.id}`,
          type: col.type,
          nullable: col.isNullable,
          primary_key: col.isPrimaryKey,
          unique: col.isUnique,
          default: col.defaultValue
        }
      });
    }

    // Detect removed columns
    const removedColumns = oldUserColumns.filter(oldCol => 
      !newUserColumns.some(newCol => newCol.id === oldCol.id)
    );

    for (const col of removedColumns) {
      changes.push({
        type: 'drop_column',
        table_name: tableNameForDB,
        column_name: col.name
      });
    }

    // Detect renamed columns
    // Note: When renaming a column, we only change the display name (name), not the internal_name
    // The internal_name is the actual column name in the database and should not change
    // Therefore, we don't need to do an ALTER TABLE RENAME COLUMN in the database
    // We only need to update the schema_data in Master
    // So we skip generating a rename_column change - the schema_data update will handle it
    // This is intentional: display names can change, but internal names are stable identifiers

    // Detect column type changes
    const typeChangedColumns = newUserColumns.filter(newCol => {
      const oldCol = oldUserColumns.find(old => old.id === newCol.id);
      return oldCol && oldCol.type !== newCol.type && oldCol.name === newCol.name;
    });

    for (const newCol of typeChangedColumns) {
      const oldCol = oldUserColumns.find(old => old.id === newCol.id);
      if (oldCol) {
        changes.push({
          type: 'alter_column_type',
          table_name: tableNameForDB,
          column_name: newCol.name,
          new_type: newCol.type
        });
      }
    }

    // Detect constraint changes
    for (const newCol of newUserColumns) {
      const oldCol = oldUserColumns.find(old => old.id === newCol.id);
      if (oldCol && oldCol.name === newCol.name) {
        // UNIQUE constraint change
        if ((oldCol.isUnique || false) !== (newCol.isUnique || false)) {
          changes.push({
            type: newCol.isUnique ? 'add_unique_constraint' : 'drop_unique_constraint',
            table_name: tableNameForDB,
            column_name: newCol.name
          });
        }
        
        // DEFAULT value change
        const oldDefault = oldCol.defaultValue || null;
        const newDefault = newCol.defaultValue || null;
        if (oldDefault !== newDefault) {
          changes.push({
            type: 'alter_column_default',
            table_name: tableNameForDB,
            column_name: newCol.name,
            new_default: newDefault,
            old_default: oldDefault
          });
        }
        
        // NULLABLE change
        if (oldCol.isNullable !== newCol.isNullable) {
          changes.push({
            type: 'alter_column_nullable',
            table_name: tableNameForDB,
            column_name: newCol.name,
            nullable: newCol.isNullable
          });
        }
      }
    }

    // Apply all changes
    if (changes.length === 0) {
      console.log('applyTableEdits - No DDL changes detected, updating schema_data only');
      // Update schema_data in Master to reflect the new table structure
      // Use getCurrentProjectSync to get the current project
      const currentProject = this.projectService.getCurrentProjectSync();
      if (!currentProject) {
        console.error('applyTableEdits - Project not found');
        throw new Error('Project not found');
      }

      const newSchemaData: ProjectSchema = {
        tables: currentTables.map(t => t.id === newTable.id ? newTable : t),
        relationships: currentRelationships,
        relationshipDisplayColumns: currentRelationshipDisplayColumns,
        metadata: currentProject.schemaData.metadata
      };

      console.log('applyTableEdits - Updating schema_data with new table:', newTable);
      console.log('applyTableEdits - newSchemaData tables:', newSchemaData.tables.map(t => ({ id: t.id, name: t.name, columns: t.columns.map(c => ({ id: c.id, name: c.name })) })));
      
      // When there are no DDL changes, we still need to update schema_data in Master
      // We'll use a no-op change type that the Edge Function can handle
      // For now, we'll use alter_column_nullable with the same value (no-op)
      // This will update schema_data without changing the database
      const firstColumn = newTable.columns.find(col => !col.isPrimaryKey);
      if (firstColumn) {
        const noOpChange: SchemaChange = {
          type: 'alter_column_nullable',
          table_name: newTable.internal_name || `t_${newTable.id}`,
          column_name: firstColumn.internal_name || `c_${firstColumn.id}`,
          nullable: firstColumn.isNullable // Same value = no-op
        };
        
        await this.eventDrivenSchema.applySchemaChange(
          projectId,
          noOpChange,
          newSchemaData,
          currentProject.version
        );
      } else {
        // If no columns, just update schema_data directly via Supabase
        // This is a fallback for edge cases
        console.warn('applyTableEdits - No columns found, cannot use no-op change');
        throw new Error('Cannot update schema_data: table has no columns');
      }
      console.log('applyTableEdits - schema_data updated successfully');
      console.log('=== applyTableEdits END (schema_data only) ===');
      return; // No schema changes, only UI updates
    }

    console.log('applyTableEdits - DDL changes detected:', changes.length);
    console.log('applyTableEdits - changes:', changes);

    const currentProject = this.projectService.getCurrentProject()();
    if (!currentProject) {
      console.error('applyTableEdits - No current project found');
      throw new Error('No current project found');
    }

    // Create updated schema with the new table
    const newSchemaData: ProjectSchema = {
      tables: currentTables.map(t => t.id === newTable.id ? newTable : t),
      relationships: currentRelationships,
      relationshipDisplayColumns: currentRelationshipDisplayColumns,
      ...(currentProject.schemaData.metadata && { metadata: currentProject.schemaData.metadata })
    };

    console.log('applyTableEdits - newSchemaData for DDL changes:', newSchemaData.tables.map(t => ({ id: t.id, name: t.name, columns: t.columns.map(c => ({ id: c.id, name: c.name })) })));

    // Apply each change individually
    for (const change of changes) {
      console.log('applyTableEdits - Processing change:', change);
      const changeDescription = this.getChangeDescription(change);
      console.log('applyTableEdits - Change description:', changeDescription);

      await this.notificationService.showOperationStatus(
        async () => {
          console.log('applyTableEdits - Calling eventDrivenSchema.applySchemaChange');
          const result = await this.eventDrivenSchema.applySchemaChange(
            projectId,
            change,
            newSchemaData,
            currentProject.version
          );
          console.log('applyTableEdits - applySchemaChange result:', result);

          if (!result.success) {
            console.error('applyTableEdits - Change failed:', result.error);
            if (result.error && result.error.includes('VERSION_CONFLICT')) {
              throw new Error('Project was updated by another user. Please try your change again.');
            }
            throw new Error(result.error || 'Failed to apply change');
          }

          console.log('applyTableEdits - Change applied successfully');
          return result;
        },
        `Applying change: ${changeDescription}...`,
        `Change applied: ${changeDescription}`
      );
    }
    console.log('applyTableEdits - All changes applied, updating schema_data');
    console.log('=== applyTableEdits END (with DDL changes) ===');
  }

  /**
   * Get human-readable description of a schema change
   */
  getChangeDescription(change: SchemaChange): string {
    switch (change.type) {
      case 'add_column':
        return `Add column ${change.column?.name || change.column_name} to ${change.table_name}`;
      case 'drop_column':
        return `Remove column ${change.column_name} from ${change.table_name}`;
      case 'add_foreign_key':
        return `Add relationship in ${change.foreign_key?.table_name}`;
      case 'drop_foreign_key':
        return `Remove relationship from ${change.foreign_key?.table_name}`;
      case 'add_unique_constraint':
        return `Add unique constraint to ${change.column_name} in ${change.table_name}`;
      case 'drop_unique_constraint':
        return `Remove unique constraint from ${change.column_name} in ${change.table_name}`;
      case 'alter_column_nullable':
        return `Change nullable for ${change.column_name} in ${change.table_name}`;
      case 'alter_column_default':
        return `Change default value for ${change.column_name} in ${change.table_name}`;
      case 'alter_column_type':
        return `Change type of ${change.column_name} in ${change.table_name}`;
      case 'rename_column':
        return `Rename column ${change.old_name} to ${change.new_name} in ${change.table_name}`;
      default:
        return `${change.type} in ${change.table_name || 'table'}`;
    }
  }
}

