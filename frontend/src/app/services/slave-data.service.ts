import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Table, ProjectSchema } from '../models/table.model';
import { environment } from '../../environments/environment';

export interface TableData {
  [tableName: string]: any[];
}

@Injectable({
  providedIn: 'root'
})
export class SlaveDataService {
  private masterClient: SupabaseClient;
  private slaveClient: SupabaseClient | null = null;

  constructor() {
    // Create Master client with unique storage key to avoid NavigatorLock conflicts
    this.masterClient = createClient(
      environment.supabase.url,
      environment.supabase.anonKey,
      {
        auth: {
          persistSession: false, // Don't persist - we use SupabaseService for auth
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: undefined // No storage to avoid lock conflicts
        }
      }
    );
  }

  /**
   * Initialize Slave client for a specific organization
   */
  async initializeSlaveClient(organizationId: string): Promise<void> {
    try {
      // Get deployment config using RPC (same as DeploymentService)
      const { data: configs, error } = await this.masterClient
        .rpc('get_deployment_config', { p_organization_id: organizationId });

      if (error) {
        console.error('Failed to get deployment config:', error);
        throw new Error(`Failed to get deployment configuration: ${error.message}`);
      }

      if (!configs || configs.length === 0) {
        console.error('No deployment config found for organization:', organizationId);
        throw new Error('No deployment configuration found. Please ensure a deployment configuration exists in the Master database.');
      }

      const deployment = configs[0];

      // Access fields using the same naming convention as DeploymentService
      // The RPC may transform column names (snake_case -> camelCase or vice versa)
      const projectUrl = deployment.supabase_project_url || deployment.project_url;
      const anonKey = deployment.supabase_anon_key || deployment.anon_key;

      // Validate required fields
      if (!projectUrl || !anonKey) {
        console.error('Invalid deployment config - missing required fields:', {
          deployment,
          hasProjectUrl: !!projectUrl,
          hasAnonKey: !!anonKey
        });
        throw new Error('Invalid deployment configuration: missing project URL or anon key');
      }

      // Use service role key if available, otherwise use anon key
      // Service role key is needed for direct inserts into custom schemas
      const serviceRoleKey = deployment.supabase_service_role_key || deployment.service_role_key;
      const keyToUse = serviceRoleKey || anonKey;
      
      // Create Slave client without session persistence to avoid NavigatorLock conflicts
      this.slaveClient = createClient(projectUrl, keyToUse, {
        auth: {
          persistSession: false, // Don't persist - auth is in Master
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: undefined // No storage to avoid lock conflicts
        }
      });

      console.log('✅ Slave client initialized for organization:', organizationId);
    } catch (error: any) {
      console.error('Error initializing Slave client:', error);
      throw error;
    }
  }

  /**
   * Load real data from Slave database for all tables in a project
   */
  async loadProjectData(
    projectId: string,
    organizationId: string,
    schema: ProjectSchema
  ): Promise<TableData> {
    if (!this.slaveClient) {
      await this.initializeSlaveClient(organizationId);
    }

    const tableData: TableData = {};
    const schemaName = `org_${organizationId.replace(/-/g, '')}`;

    console.log('📊 Loading data from Slave:', {
      projectId,
      organizationId,
      schemaName,
      tables: schema.tables.length
    });

    // Load data for each table
    for (const table of schema.tables) {
      try {
        const internalName = table.internal_name || `t_${table.id}`;
        console.log('🔍 [SlaveData] Loading data for table:', {
          tableName: table.name,
          tableId: table.id,
          internalName,
          columnCount: table.columns?.length || 0,
          columns: table.columns?.map(c => ({ 
            id: c.id, 
            name: c.name, 
            internal_name: c.internal_name || `c_${c.id}`,
            type: c.type 
          })) || []
        });
        
        const rawData = await this.loadTableData(schemaName, internalName);
        
        // Create mapping from internal column names (in DB) to display names (from schema)
        const columnMapping: { [internalName: string]: string } = {};
        table.columns?.forEach(col => {
          const internalColName = col.internal_name || `c_${col.id}`;
          columnMapping[internalColName] = col.name; // Map internal → display name
        });
        
        // Transform data: replace internal column names with display names
        const transformedData = rawData.map(row => {
          const transformedRow: any = {};
          Object.keys(row).forEach(key => {
            // If we have a mapping for this internal column name, use display name
            // Otherwise, keep original key (for system columns like id, created_at, etc.)
            const displayName = columnMapping[key] || key;
            transformedRow[displayName] = row[key];
          });
          return transformedRow;
        });
        
        tableData[table.name] = transformedData;
        
        console.log(`✅ [SlaveData] Loaded and transformed ${transformedData.length} records from ${table.name} (${internalName})`, {
          rawColumnNames: rawData.length > 0 ? Object.keys(rawData[0]) : [],
          displayColumnNames: transformedData.length > 0 ? Object.keys(transformedData[0]) : [],
          columnMapping,
          firstRecord: transformedData.length > 0 ? transformedData[0] : null
        });
      } catch (error) {
        console.error(`❌ [SlaveData] Failed to load data for table ${table.name}:`, error);
        // Initialize with empty array on error
        tableData[table.name] = [];
      }
    }

    return tableData;
  }

  /**
   * Load data for a single table from Slave database
   * Returns data with column names mapped from internal to display names
   */
  async loadSingleTableData(
    organizationId: string,
    table: Table
  ): Promise<any[]> {
    if (!this.slaveClient) {
      await this.initializeSlaveClient(organizationId);
    }

    const schemaName = `org_${organizationId.replace(/-/g, '')}`;
    const internalName = table.internal_name || `t_${table.id}`;

    try {
      console.log('🔄 [SlaveData] Refreshing data for table:', {
        tableName: table.name,
        tableId: table.id,
        internalName,
        schemaName
      });

      const rawData = await this.loadTableData(schemaName, internalName);

      // Create mapping from internal column names (in DB) to display names (from schema)
      const columnMapping: { [internalName: string]: string } = {};
      table.columns?.forEach(col => {
        const internalColName = col.internal_name || `c_${col.id}`;
        columnMapping[internalColName] = col.name; // Map internal → display name
      });

      // Transform data: replace internal column names with display names
      const transformedData = rawData.map(row => {
        const transformedRow: any = {};
        Object.keys(row).forEach(key => {
          // If we have a mapping for this internal column name, use display name
          // Otherwise, keep original key (for system columns like id, created_at, etc.)
          const displayName = columnMapping[key] || key;
          transformedRow[displayName] = row[key];
        });
        return transformedRow;
      });

      console.log(`✅ [SlaveData] Refreshed ${transformedData.length} records from ${table.name} (${internalName})`);
      return transformedData;
    } catch (error) {
      console.error(`❌ [SlaveData] Failed to refresh data for table ${table.name}:`, error);
      return [];
    }
  }

  /**
   * Load data from a specific table in Slave
   * Uses RPC function to read from custom schemas (org_xxx)
   */
  private async loadTableData(schemaName: string, tableName: string): Promise<any[]> {
    if (!this.slaveClient) {
      throw new Error('Slave client not initialized');
    }

    try {
      // Don't specify order_by - let the RPC function use the first available column
      // This avoids errors when 'id' or 'created_at' don't exist
      const { data, error } = await this.slaveClient.rpc('read_table_data', {
        p_schema: schemaName,
        p_table: tableName,
        p_limit: 1000,
        p_offset: 0,
        p_order_by: null, // Let function determine first column
        p_order_direction: 'desc'
      });

      if (error) {
        // Check if error is because table doesn't exist yet
        if (error.message.includes('does not exist') || 
            error.message.includes('undefined_table') ||
            error.code === 'PGRST116') {
          console.warn(`⚠️  Table ${schemaName}.${tableName} doesn't exist in Slave yet`);
          return [];
        }
        
        console.warn(`⚠️  Could not load data from ${schemaName}.${tableName}:`, error.message);
        return [];
      }

        // Parse JSON result
        let parsedData: any[] = [];
        if (typeof data === 'string') {
          try {
            const parsed = JSON.parse(data);
            parsedData = Array.isArray(parsed) ? parsed : [];
          } catch (parseError) {
            console.error('❌ [SlaveData] Error parsing JSON response:', parseError, data);
            return [];
          }
        } else {
          parsedData = Array.isArray(data) ? data : [];
        }
        
        console.log('🔍 [SlaveData] Parsed table data (before mapping):', {
          rowCount: parsedData.length,
          columnNames: parsedData.length > 0 ? Object.keys(parsedData[0]) : [],
          sampleRow: parsedData.length > 0 ? parsedData[0] : null
        });

        // Return data as-is - column mapping will happen in loadProjectData
        return parsedData;
    } catch (error: any) {
      console.error('Error in loadTableData:', error);
      return [];
    }
  }

  /**
   * Insert a record into Slave database
   * Uses the insert_table_record RPC function (standard approach for custom schemas)
   * PostgREST cannot directly access tables in custom schemas without configuration
   */
  async insertRecord(
    organizationId: string,
    table: Table,
    record: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Initialize slave client if needed
    if (!this.slaveClient) {
      await this.initializeSlaveClient(organizationId);
    }

    const schemaName = `org_${organizationId.replace(/-/g, '')}`;
    const internalName = table.internal_name || `t_${table.id}`;

    try {
      // Process the record to handle SQL functions like gen_random_uuid()
      // and remove auto-generated fields
      const processedRecord = this.processRecordForInsert(record, table);
      
      // Map display column names to internal (masked) column names
      // The database uses internal names (c_xxx), but the record uses display names
      const mappedRecord: any = {};
      for (const key in processedRecord) {
        const column = table.columns.find(col => col.name === key);
        if (column) {
          // Use internal column name (masked) for the database
          const internalColName = column.internal_name || `c_${column.id}`;
          mappedRecord[internalColName] = processedRecord[key];
        }
      }
      
      // Use standard Supabase .schema().from().insert() method
      // IMPORTANT: This requires PostgREST to be configured to expose the org_xxx schemas
      // In Supabase Dashboard: Settings > API > Exposed Schemas
      // Add the org_xxx schemas or configure to expose all org_* schemas
      // This allows us to use all Supabase capabilities (filters, sorting, pagination, etc.)
      const { data, error } = await this.slaveClient!
        .schema(schemaName)
        .from(internalName)
        .insert([mappedRecord])
        .select()
        .single();

      if (error) {
        console.error('Error inserting record:', error);
        // If error is 404/406, it means the schema is not exposed in PostgREST
        const errorMessage = error.message || '';
        const isSchemaNotExposed = 
          error.code === 'PGRST205' || 
          error.code === 'PGRST116' ||
          errorMessage.includes('not found') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('Could not find') ||
          errorMessage.includes('Not Acceptable');
        
        if (isSchemaNotExposed) {
          return {
            success: false,
            error: `Schema ${schemaName} not exposed in PostgREST. Please configure PostgREST to expose this schema in Supabase Dashboard (Settings > API > Exposed Schemas). See docs/setup/EXPOSE_ORG_SCHEMAS.md for instructions.`
          };
        }
        return {
          success: false,
          error: error.message || 'Unknown error inserting record'
        };
      }

      // Map internal column names back to display names
      // The database returns data with internal names (c_xxx), we need to map to display names
      const columnMapping: { [internalName: string]: string } = {};
      table.columns?.forEach(col => {
        const internalColName = col.internal_name || `c_${col.id}`;
        columnMapping[internalColName] = col.name; // Map internal → display name
      });

      const mappedData: any = {};
      
      // First, map all columns using the column mapping
      for (const key in data) {
        if (columnMapping[key]) {
          // Map internal column name to display name
          mappedData[columnMapping[key]] = data[key];
        } else {
          // Keep unmapped keys as-is (e.g., system columns)
          mappedData[key] = data[key];
        }
      }
      
      // Ensure 'id' is present - the primary key might be returned with its internal name
      // Find the primary key column and ensure it's mapped to 'id'
      const primaryKeyColumn = table.columns?.find(col => col.isPrimaryKey);
      if (primaryKeyColumn) {
        const internalIdName = primaryKeyColumn.internal_name || `c_${primaryKeyColumn.id}`;
        const displayIdName = primaryKeyColumn.name; // Usually 'id' but could be different
        
        // If the id is in the data with its internal name, map it to the display name
        if (data[internalIdName] !== undefined && !mappedData[displayIdName]) {
          mappedData[displayIdName] = data[internalIdName];
        }
        
        // Also ensure 'id' is set if the display name is 'id'
        if (displayIdName === 'id' && data[internalIdName] !== undefined) {
          mappedData.id = data[internalIdName];
        }
      } else if (data.id !== undefined && !mappedData.id) {
        // Fallback: if there's an 'id' in the data, use it
        mappedData.id = data.id;
      }
      
      // Debug: log the mapping to help troubleshoot
      console.log('Insert result mapping:', {
        originalData: data,
        columnMapping: columnMapping,
        mappedData: mappedData,
        primaryKeyColumn: primaryKeyColumn
      });

      return {
        success: true,
        data: mappedData
      };
    } catch (error: any) {
      console.error('Exception inserting record:', error);
      return {
        success: false,
        error: error.message || 'Unknown error inserting record'
      };
    }
  }

  /**
   * Process record to handle SQL functions and convert them to actual values
   * Removes auto-generated fields and fields with SQL function defaults
   */
  private processRecordForInsert(record: any, table: Table): any {
    const processed: any = { ...record };
    
    // Remove fields that should be auto-generated by the database
    for (const key in processed) {
      const column = table.columns.find(col => col.name === key);
      
      if (!column) {
        continue; // Skip if column not found
      }
      
      // Only remove primary keys if they are auto-generated
      // If a primary key is NOT auto-generated, we need to include it in the insert
      const isAutoGeneratedPrimaryKey = column.isPrimaryKey && (column.isAutoGenerate || column.isAutoIncrement);
      
      // Remove auto-generated fields (they will be generated by the database)
      if (column.isAutoGenerate || column.isAutoIncrement || isAutoGeneratedPrimaryKey) {
        delete processed[key];
        continue;
      }
      
      // Handle SQL functions in the record
      if (processed[key] === 'gen_random_uuid()') {
        // Remove it - let the database generate the UUID using the default value
        delete processed[key];
      } else if (typeof processed[key] === 'string' && processed[key].endsWith('()')) {
        // Handle other SQL functions - remove them and let the database handle defaults
        if (column && column.defaultValue) {
          // If column has a default value, remove this field to let DB use default
          delete processed[key];
        }
      }
      
      // Remove fields with empty string values if they have defaults
      if (processed[key] === '' && column && column.defaultValue) {
        delete processed[key];
      }
    }
    
    return processed;
  }

  /**
   * Update a record in Slave database
   * Uses standard Supabase .schema().from().update() method
   * IMPORTANT: Requires PostgREST to be configured to expose the org_xxx schemas
   */
  async updateRecord(
    organizationId: string,
    table: Table,
    recordId: string,
    updates: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.slaveClient) {
      await this.initializeSlaveClient(organizationId);
    }

    const schemaName = `org_${organizationId.replace(/-/g, '')}`;
    const internalName = table.internal_name || `t_${table.id}`;

    try {
      // Find the primary key column to get its internal name for the filter
      const primaryKeyColumn = table.columns?.find(col => col.isPrimaryKey);
      if (!primaryKeyColumn) {
        return {
          success: false,
          error: 'Table does not have a primary key column'
        };
      }
      
      // Get the internal (masked) name of the primary key column
      const primaryKeyInternalName = primaryKeyColumn.internal_name || `c_${primaryKeyColumn.id}`;
      const primaryKeyDisplayName = primaryKeyColumn.name;

      // Map display column names to internal (masked) column names
      // The database uses internal names (c_xxx), but the updates use display names
      // Exclude primary key, auto-generated, and auto-increment fields
      const mappedUpdates: any = {};
      for (const key in updates) {
        // Skip primary key - it's used in the .eq() filter, not in the update body
        if (key === primaryKeyDisplayName || key === 'id') {
          continue;
        }

        const column = table.columns.find(col => col.name === key);
        if (column) {
          // Skip auto-generated and auto-increment fields
          if (column.isAutoGenerate || column.isAutoIncrement) {
            continue;
          }

          // Use internal column name (masked) for the database
          const internalColName = column.internal_name || `c_${column.id}`;
          mappedUpdates[internalColName] = updates[key];
        }
      }

      // Use standard Supabase .schema().from().update() method
      // This works with realtime subscriptions and is more efficient
      // Use the internal name of the primary key column in the filter
      const { data, error } = await this.slaveClient!
        .schema(schemaName)
        .from(internalName)
        .update(mappedUpdates)
        .eq(primaryKeyInternalName, recordId)
        .select()
        .single();

      if (error) {
        console.error('Error updating record:', error);
        // If error is 404/406, it means the schema is not exposed in PostgREST
        const errorMessage = error.message || '';
        const isSchemaNotExposed = 
          error.code === 'PGRST205' || 
          error.code === 'PGRST116' ||
          errorMessage.includes('not found') ||
          errorMessage.includes('does not exist');
        
        if (isSchemaNotExposed) {
          return {
            success: false,
            error: `Schema ${schemaName} is not exposed in PostgREST. Please configure it in Supabase Dashboard > Settings > API > Exposed Schemas`
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      // Map internal column names back to display names
      const mappedData = this.mapInternalToDisplayNames(data, table);

      return {
        success: true,
        data: mappedData
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error updating record'
      };
    }
  }

  /**
   * Delete a record from Slave database
   * Uses standard Supabase .schema().from().delete() method
   * IMPORTANT: Requires PostgREST to be configured to expose the org_xxx schemas
   */
  async deleteRecord(
    organizationId: string,
    table: Table,
    recordId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.slaveClient) {
      await this.initializeSlaveClient(organizationId);
    }

    const schemaName = `org_${organizationId.replace(/-/g, '')}`;
    const internalName = table.internal_name || `t_${table.id}`;

    try {
      // Use standard Supabase .schema().from().delete() method
      // This works with realtime subscriptions and is more efficient
      const { error } = await this.slaveClient!
        .schema(schemaName)
        .from(internalName)
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('Error deleting record:', error);
        // If error is 404/406, it means the schema is not exposed in PostgREST
        const errorMessage = error.message || '';
        const isSchemaNotExposed = 
          error.code === 'PGRST205' || 
          error.code === 'PGRST116' ||
          errorMessage.includes('not found') ||
          errorMessage.includes('does not exist');
        
        if (isSchemaNotExposed) {
          return {
            success: false,
            error: `Schema ${schemaName} is not exposed in PostgREST. Please configure it in Supabase Dashboard > Settings > API > Exposed Schemas`
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error deleting record'
      };
    }
  }

  /**
   * Map internal column names (c_xxx) to display names
   */
  private mapInternalToDisplayNames(data: any, table: Table): any {
    const columnMapping: { [internalName: string]: string } = {};
    table.columns?.forEach(col => {
      const internalColName = col.internal_name || `c_${col.id}`;
      columnMapping[internalColName] = col.name; // Map internal → display name
    });

    const mappedData: any = {};
    
    // Map all columns using the column mapping
    for (const key in data) {
      if (columnMapping[key]) {
        // Map internal column name to display name
        mappedData[columnMapping[key]] = data[key];
      } else {
        // Keep unmapped keys as-is (e.g., system columns like id, created_at)
        mappedData[key] = data[key];
      }
    }
    
    return mappedData;
  }

  /**
   * Check if table exists in Slave
   * Attempts to query the table - if it exists and is accessible, returns true
   */
  async tableExists(organizationId: string, internalName: string): Promise<boolean> {
    if (!this.slaveClient) {
      await this.initializeSlaveClient(organizationId);
    }

    try {
      // Try to query the table - if it exists and is accessible, this will succeed
      const { error } = await this.slaveClient!
        .from(internalName)
        .select('id')
        .limit(1);

      // If we get a "table doesn't exist" error, return false
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          return false;
        }
        // Other errors (permissions, etc.) - assume table exists but we can't access it
        // Return true since table likely exists
        return true;
      }

      return true;
    } catch {
      return false;
    }
  }
}






