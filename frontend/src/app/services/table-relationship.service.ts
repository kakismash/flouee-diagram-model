import { Injectable } from '@angular/core';
import { Table, Relationship, RelationshipDisplayColumn, RelationshipDisplayField } from '../models/table.model';

@Injectable({
  providedIn: 'root'
})
export class TableRelationshipService {
  
  /**
   * Get relationship options for a simple relationship
   */
  getSimpleRelationshipOptions(rel: any, allTables: any[], allTableData: { [tableName: string]: any[] }): { value: string; label: string }[] {
    if (!rel.displayColumnId) return [];

    const currentProject = this.getCurrentProject();
    if (!currentProject) return [];

    const relationshipDisplayColumn = currentProject.relationshipDisplayColumns.find(
      (rdc: RelationshipDisplayColumn) => rdc.id === rel.displayColumnId
    );

    if (!relationshipDisplayColumn) return [];

    const sourceTable = allTables.find(t => t.id === relationshipDisplayColumn.sourceTableId);
    if (!sourceTable) return [];

    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) return [];

    const sourceColumn = sourceTable.columns.find((c: any) => c.id === relationshipDisplayColumn.fields[0]?.sourceColumnId);
    if (!sourceColumn) return [];

    const sourceTableData = allTableData[sourceTable.name] || [];

    return sourceTableData.map((record: any) => ({
      value: record[pkColumn.name],
      label: String(record[sourceColumn.name] || '')
    }));
  }

  /**
   * Get relationship display value for a simple relationship
   */
  getRelationshipDisplayValue(value: any, rel: any, allTables: any[], allTableData: { [tableName: string]: any[] }): string {
    if (!rel.displayColumnId) return '';

    const currentProject = this.getCurrentProject();
    if (!currentProject) return '';

    const relationshipDisplayColumn = currentProject.relationshipDisplayColumns.find(
      (rdc: RelationshipDisplayColumn) => rdc.id === rel.displayColumnId
    );

    if (!relationshipDisplayColumn) return '';

    const sourceTable = allTables.find(t => t.id === relationshipDisplayColumn.sourceTableId);
    if (!sourceTable) return '';

    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) return '';

    const sourceColumn = sourceTable.columns.find((c: any) => c.id === relationshipDisplayColumn.fields[0]?.sourceColumnId);
    if (!sourceColumn) return '';

    const sourceTableData = allTableData[sourceTable.name] || [];
    const sourceRecord = sourceTableData.find((record: any) => record[pkColumn.name] === value);

    return sourceRecord ? String(sourceRecord[sourceColumn.name] || '') : '';
  }

  /**
   * Get relationship value for a complex relationship
   */
  getRelationshipValue(element: any, relCol: RelationshipDisplayColumn, field: RelationshipDisplayField, allTables: any[], allTableData: { [tableName: string]: any[] }): string {
    // Get the foreign key column
    const fkColumn = element[field.sourceColumnId];
    if (!fkColumn) return '';

    // Get the source table
    const sourceTable = allTables.find(t => t.id === relCol.sourceTableId);
    if (!sourceTable) return '';

    // Get the source column
    const sourceColumn = sourceTable.columns.find((c: any) => c.id === field.sourceColumnId);
    if (!sourceColumn) return '';

    // Get the primary key column
    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) return '';

    // Get the source record
    const sourceTableData = allTableData[sourceTable.name] || [];
    const sourceRecord = sourceTableData.find((record: any) => record[pkColumn.name] === fkColumn);
    if (!sourceRecord) return '';

    return String(sourceRecord[sourceColumn.name] || '');
  }

  /**
   * Get relationship options for a complex relationship field
   */
  getRelationshipOptionsForField(relCol: RelationshipDisplayColumn, field: RelationshipDisplayField, allTables: any[], allTableData: { [tableName: string]: any[] }): { value: string; label: string }[] {
    const sourceTable = allTables.find(t => t.id === relCol.sourceTableId);
    if (!sourceTable) return [];

    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) return [];

    const fieldColumn = sourceTable.columns.find((c: any) => c.id === field.sourceColumnId);
    if (!fieldColumn) return [];

    const sourceTableData = allTableData[sourceTable.name] || [];

    return sourceTableData.map((record: any) => ({
      value: record[pkColumn.name],
      label: String(record[fieldColumn.name] || '')
    }));
  }

  /**
   * Get relationship description
   */
  getRelationshipDescription(rel: Relationship, allTables: any[]): string {
    const fromTable = allTables.find(t => t.id === rel.fromTableId);
    const toTable = allTables.find(t => t.id === rel.toTableId);
    
    if (fromTable && toTable) {
      return `${fromTable.name} → ${toTable.name} (${rel.type})`;
    }
    
    return 'Unknown relationship';
  }

  /**
   * Get source table name
   */
  getSourceTableName(sourceTableId: string, allTables: any[]): string {
    const sourceTable = allTables.find(t => t.id === sourceTableId);
    return sourceTable ? sourceTable.name : 'Unknown';
  }

  /**
   * Validate relationship data
   */
  validateRelationshipData(relCol: RelationshipDisplayColumn, field: RelationshipDisplayField, newId: string, allTables: any[], allTableData: { [tableName: string]: any[] }): { isValid: boolean; error?: string } {
    if (!newId) {
      return { isValid: true }; // Allow empty values
    }

    const sourceTable = allTables.find(t => t.id === relCol.sourceTableId);
    if (!sourceTable) {
      return { isValid: false, error: 'Source table not found' };
    }

    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) {
      return { isValid: false, error: 'Primary key column not found' };
    }

    const sourceTableData = allTableData[sourceTable.name] || [];
    const sourceRecord = sourceTableData.find((record: any) => record[pkColumn.name] === newId);
    
    if (!sourceRecord) {
      return { isValid: false, error: 'Selected record does not exist' };
    }

    return { isValid: true };
  }

  /**
   * Update all relationship fields when a relationship changes
   */
  updateAllRelationshipFields(rowIndex: number, relCol: RelationshipDisplayColumn, newId: string, element: any, allTables: any[], allTableData: { [tableName: string]: any[] }): void {
    const sourceTable = allTables.find(t => t.id === relCol.sourceTableId);
    if (!sourceTable || !allTableData[sourceTable.name]) return;

    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) return;

    const newRecord = allTableData[sourceTable.name].find((record: any) => record[pkColumn.name] === newId);
    if (!newRecord) return;

    // Update all foreign key fields
    relCol.fields.forEach(field => {
      const fkColumn = sourceTable.columns.find((c: any) => c.id === field.sourceColumnId);
      if (fkColumn) {
        element[fkColumn.name] = newRecord[pkColumn.name];
      }
    });
  }

  /**
   * Get current project (placeholder - should be injected)
   */
  private getCurrentProject(): any {
    // This should be injected from the parent component
    // For now, return null - this will be handled by the parent component
    return null;
  }

  /**
   * Get relationship type for display
   */
  getRelationshipType(viewColumn: any): string {
    // Implementation for getting relationship type
    return '1:1';
  }

  /**
   * Get relationship display column
   */
  getRelationshipDisplayColumn(
    viewColumn: any,
    relationshipDisplayColumns: RelationshipDisplayColumn[]
  ): RelationshipDisplayColumn | null {
    if (!relationshipDisplayColumns || !Array.isArray(relationshipDisplayColumns)) {
      return null;
    }
    return relationshipDisplayColumns.find(rdc => rdc.id === viewColumn.columnId) || null;
  }

  /**
   * Get relationship options for a view column
   */
  getRelationshipOptions(viewColumn: any): { value: string; label: string }[] {
    // Implementation for getting relationship options
    return [];
  }

  /**
   * Check if a relationship is being edited
   */
  isEditingRelationship(rowIndex: number, relColId: string, fieldIndex: number): boolean {
    // Implementation for checking if relationship is being edited
    return false;
  }

  /**
   * Start editing a relationship field
   */
  startEditRelationship(
    rowIndex: number,
    relCol: RelationshipDisplayColumn,
    field: any,
    element: any
  ): void {
    // Implementation for starting relationship edit
    // This can be extended to track editing state if needed
  }

  /**
   * Save relationship edit
   */
  saveEditRelationship(
    rowIndex: number,
    viewColumn: any,
    element: any,
    table: Table,
    onDataChanged: (event: any) => void
  ): void {
    // Implementation for saving relationship edits
    // This can be extended to handle relationship updates
  }
}



