import { Injectable, inject } from '@angular/core';
import { Table, TableColumn, Relationship, ProjectSchema } from '../models/table.model';
import { SchemaChange } from '../models/schema-change.model';
import { EventDrivenSchemaService } from './event-driven-schema.service';
import { ProjectService } from './project.service';
import { NotificationService } from './notification.service';

/**
 * Service to handle relationship type conversions (1:1, 1:M, M:M)
 * Extracted from diagram-editor.component.ts for reusability
 */
@Injectable({
  providedIn: 'root'
})
export class RelationshipConversionService {
  private eventDrivenSchema = inject(EventDrivenSchemaService);
  private projectService = inject(ProjectService);
  private notificationService = inject(NotificationService);

  /**
   * Convert relationship to One-to-Many (1:M)
   */
  async convertToOneToMany(
    projectId: string,
    relationship: Relationship,
    fromTable: Table,
    toTable: Table,
    fromPK: TableColumn,
    currentTables: Table[]
  ): Promise<void> {
    // Check if FK column already exists
    const existingFK = toTable.columns.find(c => 
      c.isForeignKey && c.referencedTableId === fromTable.id
    );

    if (existingFK) {
      return; // FK already exists
    }

    // Create FK column in the "many" table (toTable)
    const foreignKeyColumnName = `${fromTable.name.toLowerCase()}_id`;
    const foreignKeyColumn: TableColumn = {
      id: this.generateId(),
      name: foreignKeyColumnName,
      internal_name: `c_${this.generateId()}`,
      type: fromPK.type,
      isPrimaryKey: false,
      isNullable: true,
      isUnique: false,
      isForeignKey: true,
      referencedTableId: fromTable.id,
      referencedColumnId: fromPK.id
    };

    // Update local state
    const updatedToTable = {
      ...toTable,
      columns: [...toTable.columns, foreignKeyColumn]
    };

    // Apply changes to database
    const tableNameForDB = updatedToTable.internal_name || `t_${updatedToTable.id}`;
    const fromTableNameForDB = fromTable.internal_name || `t_${fromTable.id}`;

    const currentProject = this.projectService.getCurrentProject()();
    if (!currentProject) {
      throw new Error('No current project found');
    }

    const currentSchema: ProjectSchema = {
      tables: currentTables.map(t => t.id === toTable.id ? updatedToTable : t),
      relationships: [], // Will be updated by caller
      relationshipDisplayColumns: [],
      metadata: currentProject.schemaData.metadata
    };

    // Add FK column
    const addColumnChange: SchemaChange = {
      type: 'add_column',
      table_name: tableNameForDB,
      column: {
        id: foreignKeyColumn.id,
        name: foreignKeyColumn.name,
        internal_name: foreignKeyColumn.internal_name,
        type: foreignKeyColumn.type,
        nullable: foreignKeyColumn.isNullable,
        default: foreignKeyColumn.defaultValue
      }
    };

    await this.eventDrivenSchema.applySchemaChange(
      projectId,
      addColumnChange,
      currentSchema,
      currentProject.version
    );

    // Add FK constraint
    const addFKChange: SchemaChange = {
      type: 'add_foreign_key',
      foreign_key: {
        table_name: tableNameForDB,
        column_name: foreignKeyColumn.internal_name || `c_${foreignKeyColumn.id}`,
        column_internal_name: foreignKeyColumn.internal_name,
        referenced_table: fromTableNameForDB,
        referenced_column: fromPK.internal_name || `c_${fromPK.id}`,
        referenced_column_internal_name: fromPK.internal_name,
        constraint_name: `fk_${relationship.name}`
      }
    };

    await this.eventDrivenSchema.applySchemaChange(
      projectId,
      addFKChange,
      currentSchema,
      currentProject.version
    );
  }

  /**
   * Convert relationship to Many-to-Many (M:M)
   */
  async convertToManyToMany(
    projectId: string,
    relationship: Relationship,
    fromTable: Table,
    toTable: Table,
    fromPK: TableColumn,
    toPK: TableColumn,
    currentTables: Table[],
    currentRelationships: Relationship[]
  ): Promise<{ junctionTableId: string; junctionTableInternalName: string }> {
    // Create junction table
    const junctionTableName = `${fromTable.name.toLowerCase()}_${toTable.name.toLowerCase()}`;
    const junctionTableId = this.generateId();
    const junctionTableInternalName = `t_${junctionTableId}`;

    const fromFKColumn: TableColumn = {
      id: this.generateId(),
      name: `${fromTable.name.toLowerCase()}_id`,
      internal_name: `c_${this.generateId()}`,
      type: fromPK.type,
      isPrimaryKey: true,
      isNullable: false,
      isUnique: false,
      isForeignKey: true,
      referencedTableId: fromTable.id,
      referencedColumnId: fromPK.id
    };

    const toFKColumn: TableColumn = {
      id: this.generateId(),
      name: `${toTable.name.toLowerCase()}_id`,
      internal_name: `c_${this.generateId()}`,
      type: toPK.type,
      isPrimaryKey: true,
      isNullable: false,
      isUnique: false,
      isForeignKey: true,
      referencedTableId: toTable.id,
      referencedColumnId: toPK.id
    };

    const junctionTable: Table = {
      id: junctionTableId,
      name: junctionTableName,
      internal_name: junctionTableInternalName,
      x: (fromTable.x + toTable.x) / 2,
      y: (fromTable.y + toTable.y) / 2,
      width: 200,
      height: 100,
      columns: [fromFKColumn, toFKColumn],
      isJunctionTable: true
    };

    const currentProject = this.projectService.getCurrentProject()();
    if (!currentProject) {
      throw new Error('No current project found');
    }

    // Create schema with junction table (will be filtered on load)
    const schemaWithJunctionTable: ProjectSchema = {
      tables: [...currentTables, junctionTable],
      relationships: currentRelationships,
      relationshipDisplayColumns: [],
      metadata: currentProject.schemaData.metadata
    };

    // 1. Create junction table
    const createTableResult = await this.eventDrivenSchema.createTable(
      projectId,
      junctionTable,
      schemaWithJunctionTable,
      currentProject.version
    );

    if (!createTableResult.success) {
      throw new Error(createTableResult.error || 'Failed to create junction table');
    }

    // Reload to get updated version
    await this.projectService.loadProject(projectId);
    const updatedProject = this.projectService.getCurrentProject()();
    if (!updatedProject) {
      throw new Error('Failed to reload project');
    }

    const fromTableNameForDB = fromTable.internal_name || `t_${fromTable.id}`;
    const toTableNameForDB = toTable.internal_name || `t_${toTable.id}`;

    // 2. Add first foreign key (junction -> fromTable)
    const fk1Change: SchemaChange = {
      type: 'add_foreign_key',
      foreign_key: {
        table_name: junctionTableInternalName,
        table_internal_name: junctionTableInternalName,
        column_name: fromFKColumn.internal_name || `c_${fromFKColumn.id}`,
        column_internal_name: fromFKColumn.internal_name,
        referenced_table: fromTableNameForDB,
        referenced_table_internal_name: fromTable.internal_name,
        referenced_column: fromPK.internal_name || `c_${fromPK.id}`,
        referenced_column_internal_name: fromPK.internal_name,
        constraint_name: `fk_${junctionTableInternalName}_${fromTableNameForDB}`,
        on_delete: 'CASCADE',
        on_update: 'CASCADE'
      }
    };

    const schemaForFK1: ProjectSchema = {
      ...schemaWithJunctionTable,
      tables: [...currentTables, junctionTable]
    };

    const fk1Result = await this.eventDrivenSchema.applySchemaChange(
      projectId,
      fk1Change,
      schemaForFK1,
      updatedProject.version
    );

    if (!fk1Result.success) {
      throw new Error(fk1Result.error || 'Failed to create first foreign key');
    }

    // Reload again
    await this.projectService.loadProject(projectId);
    const updatedProject2 = this.projectService.getCurrentProject()();
    if (!updatedProject2) {
      throw new Error('Failed to reload project');
    }

    // 3. Add second foreign key (junction -> toTable)
    const fk2Change: SchemaChange = {
      type: 'add_foreign_key',
      foreign_key: {
        table_name: junctionTableInternalName,
        table_internal_name: junctionTableInternalName,
        column_name: toFKColumn.internal_name || `c_${toFKColumn.id}`,
        column_internal_name: toFKColumn.internal_name,
        referenced_table: toTableNameForDB,
        referenced_table_internal_name: toTable.internal_name,
        referenced_column: toPK.internal_name || `c_${toPK.id}`,
        referenced_column_internal_name: toPK.internal_name,
        constraint_name: `fk_${junctionTableInternalName}_${toTableNameForDB}`,
        on_delete: 'CASCADE',
        on_update: 'CASCADE'
      }
    };

    const schemaForFK2: ProjectSchema = {
      ...schemaWithJunctionTable,
      tables: [...currentTables, junctionTable]
    };

    const fk2Result = await this.eventDrivenSchema.applySchemaChange(
      projectId,
      fk2Change,
      schemaForFK2,
      updatedProject2.version
    );

    if (!fk2Result.success) {
      throw new Error(fk2Result.error || 'Failed to create second foreign key');
    }

    return {
      junctionTableId,
      junctionTableInternalName
    };
  }

  /**
   * Convert relationship to One-to-One (1:1)
   * For 1:1, we might need to add a unique constraint to the FK column
   */
  async convertToOneToOne(
    projectId: string,
    relationship: Relationship,
    fromTable: Table,
    toTable: Table,
    fromPK: TableColumn
  ): Promise<void> {
    // For 1:1, we might need to add a unique constraint to the FK column
    // This is handled by the existing FK column, no additional changes needed
    return;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

