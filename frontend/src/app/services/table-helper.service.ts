import { Injectable } from '@angular/core';
import { Table, TableColumn, Relationship } from '../models/table.model';

@Injectable({
  providedIn: 'root'
})
export class TableHelperService {

  /**
   * Ensures every table has an 'id' column (auto-generated, hidden from user)
   */
  ensureIdColumn(table: Table): Table {
    // Check if there's already an 'id' column (case insensitive)
    const hasId = table.columns.some(c => 
      c.name.toLowerCase() === 'id' && c.isPrimaryKey
    );
    
    if (!hasId) {
      // Check if there's any column named 'id' (even if not primary key)
      const hasAnyId = table.columns.some(c => c.name.toLowerCase() === 'id');
      
      if (hasAnyId) {
        console.warn('⚠️ Table already has an "id" column, skipping auto-generation');
        return table;
      }
      
      // ✅ Generate ID once and use it consistently for both id and internal_name
      const idColumnId = this.generateId();
      const idColumn: TableColumn = {
        id: idColumnId,
        name: 'id',
        internal_name: `c_${idColumnId}`, // ✅ Use same ID for internal_name
        type: 'UUID',
        isPrimaryKey: true,
        isNullable: false,
        isUnique: true,
        isAutoGenerate: true,
        isSystemGenerated: true, // Mark as system generated
        defaultValue: 'gen_random_uuid()'
      };
      
      // Insert at the beginning
      table.columns = [idColumn, ...table.columns];
    }
    
    return table;
  }

  /**
   * Get only user-created columns (hide system generated)
   */
  getUserColumns(table: Table): TableColumn[] {
    return table.columns.filter(c => !c.isSystemGenerated);
  }

  /**
   * Get all columns including system generated
   */
  getAllColumns(table: Table): TableColumn[] {
    return table.columns;
  }

  /**
   * Create a foreign key column when a relationship is created
   */
  createForeignKeyColumn(
    relationship: Relationship,
    fromTable: Table,
    toTable: Table
  ): TableColumn {
    // Determine which table gets the FK based on relationship type
    const referencedTable = relationship.type === 'one-to-one' || relationship.type === 'many-to-many'
      ? toTable
      : fromTable;
    
    const fkName = `${toTable.name.toLowerCase()}_id`;
    
    return {
      id: this.generateId(),
      name: fkName,
      type: 'UUID',
      isPrimaryKey: false,
      isNullable: relationship.type === 'one-to-one', // Can be null for 1:1
      isUnique: relationship.type === 'one-to-one',   // Unique for 1:1
      isSystemGenerated: true,  // Hidden from user
      isForeignKey: true,
      referencedTableId: toTable.id,
      referencedColumnId: relationship.toColumnId
    };
  }

  /**
   * Add FK column to table when relationship is created
   */
  addForeignKeyToTable(
    table: Table,
    relationship: Relationship,
    referencedTable: Table
  ): Table {
    const fkName = `${referencedTable.name.toLowerCase()}_id`;
    
    // Check if FK already exists
    const hasFk = table.columns.some(c => 
      c.name === fkName && c.isForeignKey && c.referencedTableId === referencedTable.id
    );
    
    if (!hasFk) {
      const fkColumn = this.createForeignKeyColumn(relationship, table, referencedTable);
      table.columns.push(fkColumn);
    }
    
    return table;
  }

  /**
   * Validate that user is not trying to create 'id' field manually
   */
  validateColumnName(columnName: string): { valid: boolean; error?: string } {
    const lowerName = columnName.toLowerCase().trim();
    
    if (lowerName === 'id') {
      return {
        valid: false,
        error: 'The "id" field is automatically generated as the primary key. You don\'t need to create it manually. Every table automatically gets a UUID-based id column.'
      };
    }
    
    // Check for common FK patterns that should be created via relationships
    if (lowerName.endsWith('_id')) {
      return {
        valid: false,
        error: `Foreign key fields like "${columnName}" should be created by linking tables together using the Link button (🔗), not manually. This ensures referential integrity.`
      };
    }
    
    return { valid: true };
  }

  /**
   * Get visual representation of relationships for a table
   */
  getRelationshipFields(
    table: Table,
    allRelationships: Relationship[],
    allTables: Table[]
  ): Array<{ name: string; type: string; relationshipType: string; linkedTable: string }> {
    const fields: Array<{ name: string; type: string; relationshipType: string; linkedTable: string }> = [];
    
    // Outgoing relationships (this table references others)
    const outgoing = allRelationships.filter(r => r.fromTableId === table.id);
    outgoing.forEach(rel => {
      const linkedTable = allTables.find(t => t.id === rel.toTableId);
      if (linkedTable) {
        fields.push({
          name: linkedTable.name.toLowerCase(),
          type: rel.type === 'one-to-one' ? linkedTable.name : `${linkedTable.name}[]`,
          relationshipType: rel.type,
          linkedTable: linkedTable.name
        });
      }
    });
    
    // Incoming relationships (other tables reference this one)
    const incoming = allRelationships.filter(r => r.toTableId === table.id);
    incoming.forEach(rel => {
      const linkedTable = allTables.find(t => t.id === rel.fromTableId);
      if (linkedTable) {
        fields.push({
          name: rel.type === 'one-to-many' ? `${linkedTable.name.toLowerCase()}s` : linkedTable.name.toLowerCase(),
          type: rel.type === 'one-to-many' ? `${linkedTable.name}[]` : linkedTable.name,
          relationshipType: rel.type,
          linkedTable: linkedTable.name
        });
      }
    });
    
    return fields;
  }

  private generateId(): string {
    return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}




