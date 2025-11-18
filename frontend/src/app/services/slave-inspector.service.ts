import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface InspectMode {
  mode: 'schemas' | 'tables' | 'table_details' | 'all';
  organization_id?: string;
  schema_name?: string;
  table_name?: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
}

export interface TableDetails {
  schema: string;
  table: string;
  columns: ColumnInfo[];
  constraints: any[];
  indexes: any[];
}

export interface InspectResult {
  success: boolean;
  mode: string;
  timestamp: string;
  data: {
    schemas?: any[];
    tables?: {
      schema: string;
      tables: Array<{ table_name: string; column_count: number }>;
    };
    table_details?: TableDetails;
    all_tables?: any[];
  };
  error?: string;
}

/**
 * Service to inspect Slave database schemas and tables
 * Uses the inspect-slave-schema Edge Function
 */
@Injectable({
  providedIn: 'root'
})
export class SlaveInspectorService {
  private supabase = inject(SupabaseService);

  /**
   * List all organization schemas in Slave
   */
  async listSchemas(): Promise<any[]> {
    const { data, error } = await this.supabase.client.functions.invoke(
      'inspect-slave-schema',
      {
        body: { mode: 'schemas' }
      }
    );

    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    
    return data.data.schemas || [];
  }

  /**
   * List all tables in an organization's schema
   */
  async listTables(organizationId: string): Promise<any[]> {
    const { data, error } = await this.supabase.client.functions.invoke(
      'inspect-slave-schema',
      {
        body: {
          mode: 'tables',
          organization_id: organizationId
        }
      }
    );

    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    
    return data.data.tables?.tables || [];
  }

  /**
   * Get detailed information about a specific table
   */
  async getTableDetails(
    organizationId: string, 
    tableName: string
  ): Promise<TableDetails> {
    const { data, error } = await this.supabase.client.functions.invoke(
      'inspect-slave-schema',
      {
        body: {
          mode: 'table_details',
          organization_id: organizationId,
          table_name: tableName
        }
      }
    );

    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    
    return data.data.table_details;
  }

  /**
   * Get all information (schemas, tables, details)
   */
  async inspectAll(
    organizationId?: string, 
    tableName?: string
  ): Promise<InspectResult> {
    const { data, error } = await this.supabase.client.functions.invoke(
      'inspect-slave-schema',
      {
        body: {
          mode: 'all',
          organization_id: organizationId,
          table_name: tableName
        }
      }
    );

    if (error) throw error;
    return data;
  }

  /**
   * Check if a specific column exists in a table
   */
  async columnExists(
    organizationId: string,
    tableName: string,
    columnName: string
  ): Promise<boolean> {
    try {
      const details = await this.getTableDetails(organizationId, tableName);
      return details.columns.some(col => col.column_name === columnName);
    } catch (error) {
      console.error('Error checking column existence:', error);
      return false;
    }
  }

  /**
   * Get column details
   */
  async getColumnDetails(
    organizationId: string,
    tableName: string,
    columnName: string
  ): Promise<ColumnInfo | null> {
    try {
      const details = await this.getTableDetails(organizationId, tableName);
      return details.columns.find(col => col.column_name === columnName) || null;
    } catch (error) {
      console.error('Error getting column details:', error);
      return null;
    }
  }

  /**
   * Compare JSON schema with actual database schema
   * Useful for detecting desynchronization
   */
  async compareWithActual(
    organizationId: string,
    tableName: string,
    jsonColumns: any[]
  ): Promise<{
    missing: string[];
    extra: string[];
    synced: boolean;
  }> {
    try {
      const details = await this.getTableDetails(organizationId, tableName);
      const actualColumns = details.columns
        .map(c => c.column_name)
        .filter(name => name !== 'id'); // Exclude system id column
      
      const jsonColumnNames = jsonColumns
        .filter(c => !c.isSystemGenerated)
        .map(c => c.name);
      
      const missing = jsonColumnNames.filter(name => !actualColumns.includes(name));
      const extra = actualColumns.filter(name => !jsonColumnNames.includes(name));
      
      return {
        missing,
        extra,
        synced: missing.length === 0 && extra.length === 0
      };
    } catch (error) {
      console.error('Error comparing schemas:', error);
      return { missing: [], extra: [], synced: false };
    }
  }
}








