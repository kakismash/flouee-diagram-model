import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Table, ProjectSchema } from '../models/table.model';
import { SupabaseService } from './supabase.service';

export interface TableData {
  [tableName: string]: any[];
}

@Injectable({
  providedIn: 'root'
})
export class SlaveDataService {
  private supabaseService = inject(SupabaseService);
  private slaveClient: SupabaseClient | null = null;

  /**
   * Get the master client from SupabaseService
   * This ensures we use the same client that manages the session
   */
  private get masterClient(): SupabaseClient {
    return this.supabaseService.client;
  }

  /**
   * Initialize Slave client for a specific organization
   */
  async initializeSlaveClient(organizationId: string): Promise<void> {
    try {
      // Get session from SupabaseService's client (which manages the session)
      const { data: { session } } = await this.masterClient.auth.getSession();
      if (!session) {
        throw new Error('No session available. Please log in to continue.');
      }

      console.log('🔍 [SlaveData] Calling initialize-slave-client for organization:', organizationId);
      console.log('🔍 [SlaveData] Session token available:', !!session.access_token);
      
      const { data: configData, error } = await this.masterClient.functions.invoke('initialize-slave-client', {
        body: {
          organizationId: organizationId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('❌ [SlaveData] Failed to get deployment config:', error);
        console.error('❌ [SlaveData] Error details:', {
          message: error.message,
          name: error.name,
          context: error.context
        });
        
        // If it's a 401, the token might be expired - try refreshing
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          console.log('🔄 [SlaveData] Token might be expired, attempting to refresh session...');
          const { data: { session: newSession } } = await this.masterClient.auth.refreshSession();
          if (newSession) {
            console.log('✅ [SlaveData] Session refreshed, retrying...');
            // Retry with new session
            const { data: retryData, error: retryError } = await this.masterClient.functions.invoke('initialize-slave-client', {
              body: {
                organizationId: organizationId
              },
              headers: {
                Authorization: `Bearer ${newSession.access_token}`
              }
            });
            
            if (retryError) {
              throw new Error(`Failed to get deployment configuration after refresh: ${retryError.message}`);
            }
            
            // Use retry data
            if (!retryData?.success || !retryData?.slaveClient) {
              throw new Error('No deployment configuration found after refresh');
            }
            
            const slaveClient = retryData.slaveClient;
            const projectUrl = slaveClient.projectUrl;
            const anonKey = slaveClient.anonKey;
            
            if (!projectUrl || !anonKey) {
              throw new Error('Invalid deployment configuration after refresh');
            }
            
            this.slaveClient = createClient(projectUrl, anonKey);
            console.log('✅ [SlaveData] Slave client initialized after session refresh');
            return;
          }
        }
        
        throw new Error(`Failed to get deployment configuration: ${error.message}`);
      }

      if (!configData?.success || !configData?.slaveClient) {
        console.error('No deployment config found for organization:', organizationId);
        throw new Error('No deployment configuration found. Please ensure a deployment configuration exists in the Master database.');
      }

      const slaveClient = configData.slaveClient;
      const projectUrl = slaveClient.projectUrl;
      const anonKey = slaveClient.anonKey;

      // Validate required fields
      if (!projectUrl || !anonKey) {
        console.error('Invalid deployment config - missing required fields:', {
          slaveClient,
          hasProjectUrl: !!projectUrl,
          hasAnonKey: !!anonKey
        });
        throw new Error('Invalid deployment configuration: missing project URL or anon key');
      }

      // Use anon key (service_role_key is no longer exposed for security)
      // NOTE: For operations requiring service_role_key, they should be done via Edge Functions
      const keyToUse = anonKey;
      
      // Create Slave client WITHOUT JWT token
      // The Slave cannot validate JWT tokens from the Master (different projects, different signing keys)
      // RPC functions use SECURITY DEFINER, so they don't require a valid JWT token
      // Security is enforced by:
      // 1. Schema name validation (org_ + 32 hex chars matching organization_id)
      // 2. RPC functions validate schema format and organization_id
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

      // Find primary key column to ensure it's always mapped to 'id'
      const primaryKeyColumn = table.columns?.find(col => col.isPrimaryKey);
      const primaryKeyInternalName = primaryKeyColumn ? (primaryKeyColumn.internal_name || `c_${primaryKeyColumn.id}`) : null;

      console.log('🔍 [SlaveData] Column mapping setup:', {
        tableName: table.name,
        primaryKeyColumn: primaryKeyColumn ? {
          name: primaryKeyColumn.name,
          internalName: primaryKeyColumn.internal_name || `c_${primaryKeyColumn.id}`,
          isPrimaryKey: primaryKeyColumn.isPrimaryKey
        } : null,
        primaryKeyInternalName
      });

      // Create mapping from internal column names (in DB) to display names (from schema)
      const columnMapping: { [internalName: string]: string } = {};
      table.columns?.forEach(col => {
        const internalColName = col.internal_name || `c_${col.id}`;
        // If this is the primary key column, always map it to 'id' for consistency
        if (col.isPrimaryKey) {
          columnMapping[internalColName] = 'id';
          console.log(`🔑 [SlaveData] Mapping primary key: ${internalColName} → id`);
        } else {
          columnMapping[internalColName] = col.name; // Map internal → display name
        }
      });

      console.log('📋 [SlaveData] Column mapping:', columnMapping);
      console.log('📊 [SlaveData] Raw data sample (first row):', rawData.length > 0 ? rawData[0] : null);
      console.log('🔍 [SlaveData] Raw data keys:', rawData.length > 0 ? Object.keys(rawData[0]) : []);
      console.log('🔍 [SlaveData] Mapping keys:', Object.keys(columnMapping));
      
      // Verify mapping coverage
      if (rawData.length > 0) {
        const rawKeys = Object.keys(rawData[0]);
        const unmappedKeys = rawKeys.filter(key => !columnMapping[key] && !key.startsWith('_'));
        if (unmappedKeys.length > 0) {
          console.warn('⚠️ [SlaveData] Unmapped keys in raw data:', unmappedKeys);
        }
      }

      // Transform data: replace internal column names with display names
      const transformedData = rawData.map((row, index) => {
        const transformedRow: any = {};
        Object.keys(row).forEach(key => {
          // If we have a mapping for this internal column name, use display name
          // Otherwise, keep original key (for system columns like created_at, etc.)
          const displayName = columnMapping[key] || key;
          transformedRow[displayName] = row[key];
          
          // Log mapping for first row
          if (index === 0) {
            console.log(`🔀 [SlaveData] Mapping: ${key} → ${displayName}, value:`, row[key]);
          }
        });
        
        // Log first row for debugging
        if (index === 0) {
          console.log('🔄 [SlaveData] Transformed row (first):', transformedRow);
          console.log('🆔 [SlaveData] Has id field?', !!transformedRow.id, 'id value:', transformedRow.id);
          console.log('🔑 [SlaveData] All keys in transformed row:', Object.keys(transformedRow));
        }
        
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
   * Search table data using Supabase Native API
   * More efficient than loading all data and filtering in memory
   * Uses .schema().from() to access custom schemas and .ilike() for case-insensitive search
   */
  async searchTableData(
    organizationId: string,
    table: Table,
    searchQuery: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    if (!this.slaveClient) {
      await this.initializeSlaveClient(organizationId);
    }

    const schemaName = `org_${organizationId.replace(/-/g, '')}`;
    const internalName = table.internal_name || `t_${table.id}`;

    try {
      console.log('🔍 [SlaveData] Searching table data:', {
        tableName: table.name,
        searchQuery,
        limit,
        offset,
        schemaName,
        internalName
      });

      // Build search conditions for all searchable columns
      // Filter out relationship columns and only search in text/number columns
      const searchableColumns = table.columns?.filter(col => {
        // Skip relationship columns and system columns
        return col.type !== 'RELATIONSHIP' && 
               col.name !== 'id' && 
               !col.name.startsWith('_');
      }) || [];

      if (searchableColumns.length === 0) {
        console.warn('⚠️ [SlaveData] No searchable columns found for table:', table.name);
        return [];
      }

      // Build OR conditions for ILIKE search across all columns
      const orConditions = searchableColumns.map(col => {
        const internalColName = col.internal_name || `c_${col.id}`;
        return `${internalColName}.ilike.%${searchQuery}%`;
      }).join(',');

      // Build query using Supabase Native API
      let query = this.slaveClient!
        .schema(schemaName)
        .from(internalName)
        .select('*');

      // Apply OR conditions for multi-column search
      if (orConditions) {
        query = query.or(orConditions);
      }

      // Add pagination using range (Supabase uses range instead of offset)
      query = query.range(offset, offset + limit - 1);

      // Execute query
      const { data, error } = await query;

      if (error) {
        console.error('❌ [SlaveData] Search error:', error);
        // Fallback to empty array if search fails
        return [];
      }

      if (!data || !Array.isArray(data)) {
        console.warn('⚠️ [SlaveData] Invalid search response:', data);
        return [];
      }

      console.log(`✅ [SlaveData] Search returned ${data.length} results`);

      // Map internal column names to display names
      const columnMapping: { [internalName: string]: string } = {};
      table.columns?.forEach(col => {
        const internalColName = col.internal_name || `c_${col.id}`;
        if (col.isPrimaryKey) {
          columnMapping[internalColName] = 'id'; // Always map primary key to 'id'
        } else {
          columnMapping[internalColName] = col.name; // Map internal → display name
        }
      });

      // Transform data: replace internal column names with display names
      const transformedData = data.map((row: any) => {
        const transformedRow: any = {};
        Object.keys(row).forEach(key => {
          const displayName = columnMapping[key] || key;
          transformedRow[displayName] = row[key];
        });
        return transformedRow;
      });

      return transformedData;
    } catch (error: any) {
      console.error('❌ [SlaveData] Error searching table data:', error);
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

    // Build schema name: org_ + 32 hex chars (UUID without hyphens)
    const cleanOrgId = organizationId.replace(/-/g, '');
    const schemaName = `org_${cleanOrgId}`;
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
          const value = processedRecord[key];
          
          // Skip undefined values (they cause issues with JSONB serialization)
          if (value !== undefined) {
            // Convert null to null (explicit), keep other values as-is
            mappedRecord[internalColName] = value === null ? null : value;
          }
        }
      }
      
      // Validate schema name format (must be org_ + 32 hex chars)
      // Remove all hyphens from organizationId to get the 32-char hex string
      const cleanOrgId = organizationId.replace(/-/g, '');
      if (cleanOrgId.length !== 32 || !/^[a-f0-9]{32}$/i.test(cleanOrgId)) {
        console.error('Invalid organizationId format:', organizationId, 'cleaned:', cleanOrgId);
        return {
          success: false,
          error: `Invalid organization ID format. Expected UUID format.`
        };
      }
      
      // Ensure schema name is correct format
      const validatedSchemaName = `org_${cleanOrgId}`;
      
      // Log for debugging
      console.log('🔍 [SlaveData] Inserting record:', {
        schemaName: validatedSchemaName,
        tableName: internalName,
        mappedRecord,
        recordKeys: Object.keys(mappedRecord)
      });
      
      // Use RPC function to insert into custom schema table
      // This is more reliable than .schema().from().insert() when schemas might not be fully exposed
      const { data, error } = await this.slaveClient!
        .rpc('insert_table_record', {
          p_schema: validatedSchemaName,
          p_table: internalName,
          p_data: mappedRecord
        });

      if (error) {
        console.error('Error inserting record:', error);
        return {
          success: false,
          error: error.message || 'Unknown error inserting record'
        };
      }

      // RPC function returns JSON, parse it if needed
      let parsedData: any;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing RPC response:', parseError);
          return {
            success: false,
            error: 'Failed to parse response from database'
          };
        }
      } else {
        parsedData = data;
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
      for (const key in parsedData) {
        if (columnMapping[key]) {
          // Map internal column name to display name
          mappedData[columnMapping[key]] = parsedData[key];
        } else {
          // Keep unmapped keys as-is (e.g., system columns)
          mappedData[key] = parsedData[key];
        }
      }
      
      // Ensure 'id' is present - the primary key might be returned with its internal name
      // Find the primary key column and ensure it's mapped to 'id'
      const primaryKeyColumn = table.columns?.find(col => col.isPrimaryKey);
      if (primaryKeyColumn) {
        const internalIdName = primaryKeyColumn.internal_name || `c_${primaryKeyColumn.id}`;
        const displayIdName = primaryKeyColumn.name; // Usually 'id' but could be different
        
        // If the id is in the data with its internal name, map it to the display name
        if (parsedData[internalIdName] !== undefined && !mappedData[displayIdName]) {
          mappedData[displayIdName] = parsedData[internalIdName];
        }
        
        // Also ensure 'id' is set if the display name is 'id'
        if (displayIdName === 'id' && parsedData[internalIdName] !== undefined) {
          mappedData.id = parsedData[internalIdName];
        }
      } else if (parsedData.id !== undefined && !mappedData.id) {
        // Fallback: if there's an 'id' in the data, use it
        mappedData.id = parsedData.id;
      }
      
      // Debug: log the mapping to help troubleshoot
      console.log('Insert result mapping:', {
        originalData: parsedData,
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

      // Use RPC function to update record in custom schema table
      // PostgREST cannot directly access tables in custom schemas without configuration
      // This is more reliable than .schema().from().update() when schemas might not be fully exposed
      const { data, error } = await this.slaveClient!
        .rpc('update_table_record', {
          p_schema: schemaName,
          p_table: internalName,
          p_id: recordId,
          p_data: mappedUpdates
        });

      if (error) {
        console.error('Error updating record:', error);
        return {
          success: false,
          error: error.message || 'Unknown error updating record'
        };
      }

      // RPC function returns JSON, parse it if needed
      let parsedData: any;
      if (typeof data === 'string') {
        try {
          parsedData = JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing RPC response:', parseError);
          return {
            success: false,
            error: 'Failed to parse response from database'
          };
        }
      } else {
        parsedData = data;
      }

      // Map internal column names back to display names
      const mappedData = this.mapInternalToDisplayNames(parsedData, table);

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
   * Uses the delete_table_record RPC function for consistency and robustness
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

    // Validate schema name format
    if (!/^org_[a-f0-9]{32}$/.test(schemaName)) {
      return { success: false, error: `Invalid schema name format: ${schemaName}` };
    }

    try {
      const { data, error } = await this.slaveClient!
        .rpc('delete_table_record', {
          p_schema: schemaName,
          p_table: internalName,
          p_id: recordId
        });

      if (error) {
        console.error('Error deleting record:', error);
        return { success: false, error: error.message || 'Unknown error deleting record' };
      }

      // RPC returns boolean indicating if record was deleted
      if (data === false) {
        return { success: false, error: 'Record not found or could not be deleted' };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Exception deleting record:', error);
      return { success: false, error: error.message || 'Unknown error deleting record' };
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






