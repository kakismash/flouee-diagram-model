import { Injectable } from '@angular/core';
import { Table, Relationship } from '../models/table.model';

/**
 * Service to filter junction tables from the tables array
 * Extracted from diagram-editor.component.ts for reusability
 */
@Injectable({
  providedIn: 'root'
})
export class JunctionTableFilterService {
  /**
   * Filter out junction tables from the tables array
   * This ensures junction tables never appear in the UI
   */
  filterJunctionTables(tables: Table[], relationships: Relationship[]): Table[] {
    // Get all junction table identifiers from many-to-many relationships
    const junctionTableIds = new Set<string>();
    const junctionTableInternalNames = new Set<string>();
    const junctionTableNames = new Set<string>();

    const manyToManyRels = relationships.filter(rel => rel.type === 'many-to-many');
    
    manyToManyRels.forEach(rel => {
      if (rel.junctionTableId) junctionTableIds.add(rel.junctionTableId);
      if (rel.junctionTableInternalName) junctionTableInternalNames.add(rel.junctionTableInternalName);
      if (rel.junctionTableName) junctionTableNames.add(rel.junctionTableName);
      
      // Also check if relationship name matches a table name
      if (rel.name) {
        const relName = rel.name.toLowerCase();
        const matchingTable = tables.find(t => t.name && t.name.toLowerCase() === relName);
        if (matchingTable) {
          junctionTableIds.add(matchingTable.id);
        }
      }
      
      // Check if table name pattern matches: fromTable_toTable or toTable_fromTable
      const fromTable = tables.find(t => t.id === rel.fromTableId);
      const toTable = tables.find(t => t.id === rel.toTableId);
      if (fromTable && toTable && fromTable.name && toTable.name) {
        const fromName = fromTable.name.toLowerCase();
        const toName = toTable.name.toLowerCase();
        const pattern1 = `${fromName}_${toName}`;
        const pattern2 = `${toName}_${fromName}`;
        
        tables.forEach(t => {
          if (t.name && (t.name.toLowerCase() === pattern1 || t.name.toLowerCase() === pattern2)) {
            junctionTableIds.add(t.id);
          }
        });
      }
    });

    // Also identify junction tables by structure: exactly 2 columns that are both foreign keys
    const potentialJunctionTables = new Set<string>();
    tables.forEach(table => {
      if (table.columns && table.columns.length === 2) {
        const fkColumns = table.columns.filter(col => 
          col.isForeignKey === true || col.referencedTableId || col.referencedColumnId
        );
        // If both columns are foreign keys, it's likely a junction table
        if (fkColumns.length === 2) {
          potentialJunctionTables.add(table.id);
        }
      }
    });

    // Filter tables: exclude junction tables
    return tables.filter(table => {
      // Exclude if explicitly marked as junction table
      if (table.isJunctionTable === true) {
        return false;
      }

      // Exclude if ID matches a junction table ID
      if (junctionTableIds.has(table.id)) {
        return false;
      }
      
      // Exclude if identified as potential junction table by structure
      if (potentialJunctionTables.has(table.id)) {
        return false;
      }

      // Exclude if internal_name matches a junction table internal name
      if (table.internal_name && junctionTableInternalNames.has(table.internal_name)) {
        return false;
      }

      // Exclude if name matches a junction table name
      if (table.name && Array.from(junctionTableNames).some(jtName => table.name === jtName)) {
        return false;
      }

      return true;
    });
  }
}

