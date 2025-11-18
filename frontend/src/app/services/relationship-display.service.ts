import { Injectable } from '@angular/core';
import { Table, Relationship, RelationshipDisplayColumn } from '../models/table.model';

/**
 * Service to handle relationship display columns
 * Extracted from diagram-editor.component.ts for reusability
 */
@Injectable({
  providedIn: 'root'
})
export class RelationshipDisplayService {
  /**
   * Generate a unique ID
   */
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create relationship display columns for existing relationships that don't have them
   */
  createMissingRelationshipDisplayColumns(
    relationships: Relationship[],
    existingDisplayColumns: RelationshipDisplayColumn[],
    tables: Table[]
  ): RelationshipDisplayColumn[] {
    const createdColumns: RelationshipDisplayColumn[] = [];
    
    relationships.forEach(relationship => {
      // Check if this relationship already has a display column
      const hasDisplayColumn = existingDisplayColumns.some(col => col.relationshipId === relationship.id);
      
      if (!hasDisplayColumn) {
        // Get the tables involved in the relationship
        const fromTable = tables.find(t => t.id === relationship.fromTableId);
        const toTable = tables.find(t => t.id === relationship.toTableId);
        
        if (fromTable && toTable) {
          // Find the primary key of the source table
          const fromPK = fromTable.columns.find(c => c.isPrimaryKey);
          
          if (fromPK) {
            // Create a relationship display column for the target table
            const relationshipDisplayColumn: RelationshipDisplayColumn = {
              id: this.generateId(),
              relationshipId: relationship.id,
              tableId: toTable.id, // Display in the target table
              sourceTableId: fromTable.id,
              fields: [{
                sourceColumnId: fromPK.id,
                displayName: `${fromTable.name}_${fromPK.name}`,
                isVisible: true
              }],
              isVisible: true
            };
            
            createdColumns.push(relationshipDisplayColumn);
          }
        }
      }
    });
    
    return createdColumns;
  }

  /**
   * Get relationship display column for a specific relationship
   */
  getRelationshipDisplayColumnForRelationship(
    relationshipId: string,
    relationshipDisplayColumns: RelationshipDisplayColumn[],
    relationships: Relationship[],
    tables: Table[]
  ): RelationshipDisplayColumn | undefined {
    const displayColumn = relationshipDisplayColumns.find(
      col => col.relationshipId === relationshipId && col.isVisible
    );
    
    // If no display column found, create one on the fly
    if (!displayColumn) {
      const relationship = relationships.find(r => r.id === relationshipId);
      if (relationship) {
        const fromTable = tables.find(t => t.id === relationship.fromTableId);
        const toTable = tables.find(t => t.id === relationship.toTableId);
        
        if (fromTable && toTable) {
          const fromPK = fromTable.columns.find(c => c.isPrimaryKey);
          if (fromPK) {
            return {
              id: this.generateId(),
              relationshipId: relationshipId,
              tableId: toTable.id,
              sourceTableId: fromTable.id,
              fields: [{
                sourceColumnId: fromPK.id,
                displayName: `${fromTable.name}_${fromPK.name}`,
                isVisible: true
              }],
              isVisible: true
            };
          }
        }
      }
    }
    
    return displayColumn;
  }
}

