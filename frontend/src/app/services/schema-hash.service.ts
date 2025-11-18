import { Injectable } from '@angular/core';

/**
 * Service to generate consistent hashes of schema data
 * Used for sync verification between Master (JSON) and Slave (DB)
 */
@Injectable({
  providedIn: 'root'
})
export class SchemaHashService {
  
  /**
   * Generate SHA256 hash of schema for sync verification
   * Uses Web Crypto API for consistent hashing
   */
  async generateSchemaHash(schemaData: any): Promise<string> {
    const normalized = this.normalizeSchema(schemaData);
    const jsonString = JSON.stringify(normalized);
    
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  }
  
  /**
   * Normalize schema for consistent hashing
   * Removes UI-specific fields and sorts deterministically
   */
  private normalizeSchema(schemaData: any): any {
    return {
      tables: (schemaData.tables || [])
        .map((table: any) => ({
          id: table.id,
          name: table.name,
          internal_name: table.internal_name || `t_${table.id}`,
          columns: (table.columns || [])
            .filter((col: any) => !col.isSystemGenerated) // Exclude system columns like auto-generated id
            .map((col: any) => ({
              id: col.id,
              name: col.name,
              type: col.type,
              isPrimaryKey: col.isPrimaryKey || false,
              isNullable: col.isNullable !== false, // Default true
              isUnique: col.isUnique || false,
              defaultValue: this.normalizeDefaultValue(col.defaultValue),
              isAutoGenerate: col.isAutoGenerate || false,
              isAutoIncrement: col.isAutoIncrement || false
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name)) // Sort for consistency
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)), // Sort tables
      relationships: (schemaData.relationships || [])
        .map((rel: any) => ({
          id: rel.id,
          from_table: rel.from_table,
          to_table: rel.to_table,
          from_column: rel.from_column,
          to_column: rel.to_column,
          type: rel.type || 'one-to-many'
        }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id)) // Sort relationships
    };
  }
  
  /**
   * Normalize default values for consistent comparison
   */
  private normalizeDefaultValue(value: any): any {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
    // Normalize common patterns
    const str = String(value).trim();
    
    if (str === 'gen_random_uuid()' || str === 'uuid_generate_v4()') {
      return 'gen_random_uuid()';
    }
    
    if (str === 'NOW()' || str === 'CURRENT_TIMESTAMP' || str === 'now()') {
      return 'NOW()';
    }
    
    return str;
  }
  
  /**
   * Compare two hashes
   */
  hashesMatch(hash1: string | null, hash2: string | null): boolean {
    if (!hash1 || !hash2) return false;
    return hash1 === hash2;
  }
}








