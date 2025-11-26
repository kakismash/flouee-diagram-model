import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400'
};

// ============================================
// TYPE DEFINITIONS
// ============================================

type SchemaChangeType =
  | 'add_table'
  | 'drop_table'
  | 'add_column'
  | 'drop_column'
  | 'add_foreign_key'
  | 'drop_foreign_key'
  | 'add_unique_constraint'
  | 'drop_unique_constraint'
  | 'alter_column_default'
  | 'alter_column_nullable'
  | 'rename_column'
  | 'alter_column_type';

interface SlaveConfig {
  id: string;
  organization_id: string | null;
  supabase_project_ref: string;
  supabase_project_url: string;
  supabase_anon_key: string;
  supabase_service_role_key?: string;
  schema_name: string | null;
  status: 'active' | 'migrating' | 'inactive';
}

interface ChangeValidationResult {
  valid: boolean;
  error?: string;
  normalizedChange?: any;
}

// ============================================
// SLAVE CONFIG HELPERS
// ============================================

/**
 * Get slave configuration for an organization
 */
async function getSlaveConfig(masterClient: any, organizationId: string): Promise<SlaveConfig> {
  try {
    // Try organization-specific deployment first
    const { data: orgConfig, error: orgError } = await masterClient
      .from('deployment_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (!orgError && orgConfig) {
      return {
        id: orgConfig.id,
        organization_id: orgConfig.organization_id,
        supabase_project_ref: orgConfig.supabase_project_ref,
        supabase_project_url: orgConfig.supabase_project_url,
        supabase_anon_key: orgConfig.supabase_anon_key,
        supabase_service_role_key: orgConfig.supabase_service_role_key,
        schema_name: orgConfig.schema_name,
        status: orgConfig.status,
      };
    }

    // Fallback to shared deployment
    const { data: sharedConfig, error: sharedError } = await masterClient
      .from('deployment_configs')
      .select('*')
      .is('organization_id', null)
      .eq('status', 'active')
      .single();

    if (sharedError || !sharedConfig) {
      throw new Error(
        `No deployment configuration found for organization ${organizationId} and no shared deployment available`
      );
    }

    return {
      id: sharedConfig.id,
      organization_id: sharedConfig.organization_id,
      supabase_project_ref: sharedConfig.supabase_project_ref,
      supabase_project_url: sharedConfig.supabase_project_url,
      supabase_anon_key: sharedConfig.supabase_anon_key,
      supabase_service_role_key: sharedConfig.supabase_service_role_key,
      schema_name: sharedConfig.schema_name,
      status: sharedConfig.status,
    };
  } catch (error: any) {
    throw new Error(`Failed to get slave config: ${error.message}`);
  }
}

/**
 * Validate slave configuration
 */
function validateSlaveConfig(config: SlaveConfig): void {
  if (!config.supabase_project_url) {
    throw new Error('Slave project URL is required');
  }
  if (!config.supabase_anon_key && !config.supabase_service_role_key) {
    throw new Error('Slave requires either anon key or service role key');
  }
  if (config.status !== 'active') {
    throw new Error(`Slave deployment is not active (status: ${config.status})`);
  }
}

// ============================================
// CHANGE VALIDATION HELPERS
// ============================================

/**
 * Normalize and validate a change object
 */
function normalizeAndValidateChange(change: any): ChangeValidationResult {
  if (!change || typeof change !== 'object') {
    return { valid: false, error: 'Change object is required and must be an object' };
  }

  const type = change.type;
  if (!type || typeof type !== 'string') {
    return { valid: false, error: 'Change type is required' };
  }

  // Normalize based on type
  let normalized: any = { type };

  try {
    switch (type) {
      case 'add_table':
        const table = change.table || change.data?.table;
        if (!table) {
          return { valid: false, error: 'Table definition required for add_table' };
        }
        normalized.table = table;
        break;

      case 'drop_table':
        normalized.table_name =
          change.table_name ||
          change.data?.table_name ||
          (change.table?.internal_name || (change.table?.id ? `t_${change.table.id}` : null));
        if (!normalized.table_name) {
          return { valid: false, error: 'Table name required for drop_table' };
        }
        break;

      case 'add_column':
        normalized.table_name = change.table_name || change.data?.table_name;
        normalized.column = change.column || change.data?.column;
        // Preserve table_id if present (used by realtime handler)
        if (change.table_id) {
          normalized.table_id = change.table_id;
        }
        if (!normalized.table_name || !normalized.column) {
          return { valid: false, error: 'Table name and column required for add_column' };
        }
        break;

      case 'drop_column':
        normalized.table_name = change.table_name || change.data?.table_name;
        normalized.column_name =
          change.column_name ||
          change.data?.column_name ||
          (change.column?.internal_name || (change.column?.id ? `c_${change.column.id}` : null));
        // Preserve table_id if present (used by realtime handler)
        if (change.table_id) {
          normalized.table_id = change.table_id;
        }
        if (!normalized.table_name || !normalized.column_name) {
          return { valid: false, error: 'Table name and column name required for drop_column' };
        }
        break;

      case 'add_foreign_key':
      case 'drop_foreign_key':
        normalized.foreign_key = change.foreign_key || change.data?.foreign_key || change.relationship;
        if (!normalized.foreign_key) {
          return { valid: false, error: 'Foreign key definition required' };
        }
        break;

      case 'add_unique_constraint':
      case 'drop_unique_constraint':
        normalized.table_name = change.table_name || change.data?.table_name;
        normalized.column_name =
          change.column_name ||
          change.data?.column_name ||
          (change.column?.internal_name || (change.column?.id ? `c_${change.column.id}` : null));
        if (!normalized.table_name || !normalized.column_name) {
          return { valid: false, error: 'Table name and column name required' };
        }
        break;

      case 'alter_column_default':
        normalized.table_name = change.table_name || change.data?.table_name;
        normalized.column_name =
          change.column_name ||
          change.data?.column_name ||
          (change.column?.internal_name || (change.column?.id ? `c_${change.column.id}` : null));
        normalized.new_default = change.new_default !== undefined ? change.new_default : change.data?.new_default;
        if (!normalized.table_name || !normalized.column_name) {
          return { valid: false, error: 'Table name and column name required for alter_column_default' };
        }
        break;

      case 'alter_column_nullable':
        normalized.table_name = change.table_name || change.data?.table_name;
        normalized.column_name =
          change.column_name ||
          change.data?.column_name ||
          (change.column?.internal_name || (change.column?.id ? `c_${change.column.id}` : null));
        normalized.nullable = change.nullable !== undefined ? change.nullable : change.data?.nullable ?? true;
        if (!normalized.table_name || !normalized.column_name) {
          return { valid: false, error: 'Table name and column name required for alter_column_nullable' };
        }
        break;

      case 'rename_column':
        normalized.table_name = change.table_name || change.data?.table_name;
        normalized.old_name =
          change.old_name ||
          change.data?.old_name ||
          (change.column?.internal_name || (change.column?.id ? `c_${change.column.id}` : null));
        normalized.new_name =
          change.new_name ||
          change.data?.new_name ||
          (change.column?.new_internal_name || (change.column?.new_id ? `c_${change.column.new_id}` : null));
        if (!normalized.table_name || !normalized.old_name || !normalized.new_name) {
          return { valid: false, error: 'Table name, old name, and new name required for rename_column' };
        }
        break;

      case 'alter_column_type':
        normalized.table_name = change.table_name || change.data?.table_name;
        normalized.column_name =
          change.column_name ||
          change.data?.column_name ||
          (change.column?.internal_name || (change.column?.id ? `c_${change.column.id}` : null));
        normalized.new_type = change.new_type || change.data?.new_type;
        // Preserve table_id if present (used by realtime handler)
        if (change.table_id) {
          normalized.table_id = change.table_id;
        }
        if (!normalized.table_name || !normalized.column_name || !normalized.new_type) {
          return { valid: false, error: 'Table name, column name, and new type required for alter_column_type' };
        }
        break;

      default:
        return { valid: false, error: `Unsupported change type: ${type}` };
    }

    return { valid: true, normalizedChange: normalized };
  } catch (error: any) {
    return { valid: false, error: `Error normalizing change: ${error.message}` };
  }
}

// ============================================
// SCHEMA NAME HELPER
// ============================================

function getSchemaName(organizationId: string): string {
  return `org_${organizationId.replace(/-/g, '')}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests FIRST - before any async operations
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 [apply-schema-change-atomic] Request received');
    const requestStartTime = Date.now();
    
    const { organization_id, project_id, change, new_schema_data, current_version, user_id } = await req.json();
    console.log('📥 [apply-schema-change-atomic] Request parsed:', {
      organization_id,
      project_id,
      changeType: change?.type,
      current_version,
      hasUser: !!user_id
    });

    // Validate required fields
    if (!organization_id || !project_id || !change || !new_schema_data || current_version === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: organization_id, project_id, change, new_schema_data, current_version'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get Supabase clients
    const masterUrl = Deno.env.get('SUPABASE_URL'); // Master project URL (default)
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Master project key (default)

    console.log('🔍 Configuration:');
    console.log('   Master URL:', masterUrl);
    if (!masterUrl || !masterKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const masterClient = createClient(masterUrl, masterKey);

    // 1. Get current project state (with optimistic lock check)
    const { data: project, error: fetchError } = await masterClient
      .from('projects')
      .select('id, version, status, schema_data, locked_by, locked_at, lock_expires_at')
      .eq('id', project_id)
      .single();

    if (fetchError || !project) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Project not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Check if project is locked by another user
    if (project.locked_by && project.locked_by !== user_id) {
      const lockExpired = project.lock_expires_at && new Date(project.lock_expires_at) < new Date();
      if (!lockExpired) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Project is locked by another user. Please wait...'
        }), {
          status: 423,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Check if another change is being applied
    if (project.status === 'applying') {
      // ✅ Auto-fix stuck projects (older than 5 minutes)
      const updatedAt = project.updated_at ? new Date(project.updated_at) : new Date(0);
      const timeSinceUpdate = Date.now() - updatedAt.getTime();
      const minutesSinceUpdate = Math.floor(timeSinceUpdate / (1000 * 60));

      if (minutesSinceUpdate > 5) {
        console.log(`🔧 Auto-fixing stuck project ${project_id} (stuck for ${minutesSinceUpdate} minutes)`);
        // Force reset to 'active' status
        const { error: resetError } = await masterClient
          .from('projects')
          .update({
            status: 'active',
            locked_by: null,
            locked_at: null,
            lock_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', project_id);

        if (resetError) {
          console.error('Failed to auto-fix stuck project:', resetError);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to auto-fix stuck project. Please try again.'
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } else {
          console.log('✅ Project auto-fixed, re-reading project state...');
          // Re-read project after auto-fix
          const { data: refreshedProject, error: refreshError } = await masterClient
            .from('projects')
            .select('id, version, status, schema_data, locked_by, locked_at, lock_expires_at')
            .eq('id', project_id)
            .single();

          if (refreshError || !refreshedProject) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to read project after auto-fix'
            }), {
              status: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          // Update project reference for the rest of the function
          Object.assign(project, refreshedProject);
        }
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: 'Another change is being applied. Please wait...'
        }), {
          status: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Check version for optimistic locking
    if (project.version !== current_version) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Version conflict: Project was modified by another user. Please reload and try again.',
        current_version: project.version,
        expected_version: current_version
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const oldSchemaData = project.schema_data;
    const newVersion = current_version + 1;

    // 2. Acquire lock ONLY (don't update schema_data yet - wait for Slave success)
    const lockExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes lock
    const { data: updatedData, error: updateError, count } = await masterClient
      .from('projects')
      .update({
        status: 'applying',
        locked_by: user_id,
        locked_at: new Date().toISOString(),
        lock_expires_at: lockExpiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', project_id)
      .eq('version', current_version) // ← Optimistic lock
      .in('status', ['ready', 'active']) // Only lock if ready or active
      .select();

    // Check if update was successful (at least one row affected)
    if (updateError) {
      console.error('Lock acquisition error:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Version conflict or update failed. Another user may have modified the project.',
        details: updateError.message
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (!updatedData || updatedData.length === 0) {
      console.error('No rows updated - version conflict or status mismatch');
      return new Response(JSON.stringify({
        success: false,
        error: 'Version conflict or update failed. Another user may have modified the project.',
        details: 'No rows were updated. The project may have been modified or is in an incompatible status.'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const updated = updatedData[0];

    console.log(`✅ Lock acquired for project ${project_id} by user ${user_id}`);

    // 3. Validate and normalize change
    const validation = normalizeAndValidateChange(change);
    if (!validation.valid || !validation.normalizedChange) {
      // Rollback Master lock if validation fails
      await masterClient
        .from('projects')
        .update({
          status: 'active',
          locked_by: null,
          locked_at: null,
          lock_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

      return new Response(JSON.stringify({
        success: false,
        error: validation.error || 'Invalid change format'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const normalizedChange = validation.normalizedChange;

    // 4. Get Slave configuration
    let slaveConfig: SlaveConfig;
    try {
      slaveConfig = await getSlaveConfig(masterClient, organization_id);
      validateSlaveConfig(slaveConfig);
    } catch (error: any) {
      // Rollback Master lock if Slave config fails
      await masterClient
        .from('projects')
        .update({
          status: 'active',
          locked_by: null,
          locked_at: null,
          lock_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

      return new Response(JSON.stringify({
        success: false,
        error: `Failed to get slave configuration: ${error.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // 5. Generate SQL for the change
    const schemaName = getSchemaName(organization_id);
    let sql: string;
    try {
      sql = generateSQL(normalizedChange, organization_id);
    } catch (error: any) {
      // Rollback Master lock if SQL generation fails
      await masterClient
        .from('projects')
        .update({
          status: 'active',
          locked_by: null,
          locked_at: null,
          lock_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

      return new Response(JSON.stringify({
        success: false,
        error: `Failed to generate SQL: ${error.message}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // 6. Apply change to Slave FIRST (fail-fast approach)
    try {
      const slaveClient = createClient(
        slaveConfig.supabase_project_url,
        slaveConfig.supabase_service_role_key || slaveConfig.supabase_anon_key
      );

      console.log(`🔧 [apply-schema-change-atomic] Applying change to Slave: ${slaveConfig.supabase_project_url}`);
      console.log(`🔧 [apply-schema-change-atomic] Schema: ${schemaName}`);
      console.log(`🔧 [apply-schema-change-atomic] Generated SQL:`, sql);

      // Ensure schema exists
      console.log(`🔧 [apply-schema-change-atomic] Creating schema if not exists...`);
      const schemaStartTime = Date.now();
      
      // Add timeout wrapper for exec_sql (30 seconds max)
      const schemaTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Schema creation timeout after 30 seconds')), 30000);
      });
      
      const schemaPromise = slaveClient.rpc('exec_sql', {
        query: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`
      });
      
      const { error: schemaError } = await Promise.race([schemaPromise, schemaTimeoutPromise]) as any;
      const schemaDuration = Date.now() - schemaStartTime;
      console.log(`⏱️ [apply-schema-change-atomic] Schema creation took ${schemaDuration}ms`);
      
      if (schemaError) {
        console.error(`❌ [apply-schema-change-atomic] Failed to create schema:`, schemaError);
        throw new Error(`Failed to create schema: ${schemaError.message}`);
      }
      console.log(`✅ [apply-schema-change-atomic] Schema created/verified`);

      // Apply the SQL change
      console.log(`🔧 [apply-schema-change-atomic] Splitting SQL into statements...`);
      const sqlStatements = sql.split(';').filter(s => s.trim().length > 0 && !s.trim().startsWith('--'));
      console.log(`🔧 [apply-schema-change-atomic] Found ${sqlStatements.length} SQL statements (excluding comments)`);
      
      // If no SQL statements (e.g., no-op change), skip execution but still update schema_data
      if (sqlStatements.length === 0) {
        console.log(`ℹ️ [apply-schema-change-atomic] No SQL to execute (no-op change), skipping Slave DDL execution`);
      }
      
      for (let i = 0; i < sqlStatements.length; i++) {
        const statement = sqlStatements[i].trim();
        if (statement && !statement.startsWith('--')) {
          const finalStatement = statement + ';';
          console.log(`🔧 [apply-schema-change-atomic] Executing statement ${i + 1}/${sqlStatements.length}:`, finalStatement);
          
          const statementStartTime = Date.now();
          
          // Add timeout wrapper for exec_sql (30 seconds max per statement)
          const statementTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Statement ${i + 1} timeout after 30 seconds`)), 30000);
          });
          
          const statementPromise = slaveClient.rpc('exec_sql', { 
            query: finalStatement 
          });
          
          const { error: execError, data: execData } = await Promise.race([statementPromise, statementTimeoutPromise]) as any;
          const statementDuration = Date.now() - statementStartTime;
          console.log(`⏱️ [apply-schema-change-atomic] Statement ${i + 1} took ${statementDuration}ms`);
          
          if (execError) {
            console.error(`❌ [apply-schema-change-atomic] Failed to execute statement ${i + 1}:`, execError);
            console.error(`❌ [apply-schema-change-atomic] Statement was:`, finalStatement);
            throw new Error(`Failed to execute SQL statement ${i + 1}: ${execError.message}`);
          }
          
          console.log(`✅ [apply-schema-change-atomic] Statement ${i + 1} executed successfully`, execData ? `Result: ${JSON.stringify(execData)}` : '');
        }
      }

      // If this is an add_column change, ensure the table is in realtime publication
      // This ensures new columns are immediately available for realtime
      if (normalizedChange.type === 'add_column') {
        try {
          console.log(`📡 [apply-schema-change-atomic] Ensuring table ${schemaName}.${normalizedChange.table_name} is in realtime publication...`);
          
          if (!slaveConfig.supabase_service_role_key) {
            console.warn(`⚠️ Service role key not available, skipping realtime setup`);
          } else {
            const realtimeSlaveClient = createClient(
              slaveConfig.supabase_project_url,
              slaveConfig.supabase_service_role_key
            );
            
            // Add timeout to prevent hanging (5 seconds max)
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Realtime setup timeout after 5 seconds')), 5000);
            });
            
            const realtimePromise = realtimeSlaveClient.rpc('add_table_to_realtime', {
              p_schema_name: schemaName,
              p_table_name: normalizedChange.table_name
            });
            
            await Promise.race([realtimePromise, timeoutPromise]);
            console.log(`✅ Table ${schemaName}.${normalizedChange.table_name} added to realtime`);
          }
        } catch (realtimeError: any) {
          // Log but don't fail - realtime is optional
          console.warn(`⚠️ Failed to add table to realtime (non-fatal):`, realtimeError.message);
        }
      }

      // If this is a create_table change, add the table to realtime publication
      // Use service_role_key to ensure we have proper permissions
      if (normalizedChange.type === 'create_table' && normalizedChange.table) {
        const tableName = normalizedChange.table.internal_name || `t_${normalizedChange.table.id}`;
        try {
          console.log(`📡 Adding table ${schemaName}.${tableName} to realtime publication...`);
          
          // Ensure we're using service_role_key for this operation
          if (!slaveConfig.supabase_service_role_key) {
            console.warn(`⚠️ Service role key not available, skipping realtime setup`);
          } else {
            // Create a client with service_role_key specifically for this operation
            const realtimeSlaveClient = createClient(
              slaveConfig.supabase_project_url,
              slaveConfig.supabase_service_role_key
            );
            
            // Add timeout to prevent hanging (5 seconds max)
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Realtime setup timeout after 5 seconds')), 5000);
            });
            
            const realtimePromise = realtimeSlaveClient.rpc('add_table_to_realtime', {
              p_schema_name: schemaName,
              p_table_name: tableName
            });
            
            await Promise.race([realtimePromise, timeoutPromise]);
            console.log(`✅ Table ${schemaName}.${tableName} added to realtime`);
          }
        } catch (realtimeError: any) {
          // Log but don't fail - realtime is optional
          console.warn(`⚠️ Failed to add table to realtime (non-fatal):`, realtimeError.message);
        }
      }

      console.log(`✅ Change applied to Slave successfully`);
    } catch (error: any) {
      // Rollback Master lock if Slave application fails
      await masterClient
        .from('projects')
        .update({
          status: 'active',
          locked_by: null,
          locked_at: null,
          lock_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', project_id);

      console.error(`❌ Failed to apply change to Slave:`, error);
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to apply change to Slave database: ${error.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

        // 7. If Slave succeeded, NOW update Master with new schema_data and version
        const { data: masterUpdateData, error: masterUpdateError } = await masterClient
          .from('projects')
          .update({
            schema_data: new_schema_data,
            version: newVersion,
            status: 'active',
            last_applied_version: newVersion,
            last_applied_at: new Date().toISOString(),
            locked_by: null,
            locked_at: null,
            lock_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', project_id)
          .eq('version', current_version) // Double-check version hasn't changed
          .select();

        if (masterUpdateError || !masterUpdateData || masterUpdateData.length === 0) {
          // This is bad - Slave was updated but Master update failed
          console.error(`❌ CRITICAL: Slave updated but Master update failed:`, masterUpdateError);
          // Note: We don't rollback Slave here as that could cause data loss
          // The system should be manually checked if this happens
          return new Response(JSON.stringify({
            success: false,
            error: `Slave was updated but Master update failed. Manual intervention may be required.`,
            details: masterUpdateError?.message || 'No rows were updated'
          }), {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

    // 8. Log the change to schema_changes for audit
    const insertStartTime = Date.now();
    console.log(`📝 [apply-schema-change-atomic] Logging change to schema_changes:`, {
      organization_id,
      project_id,
      change_type: normalizedChange.type,
      table_id: normalizedChange.table_id,
      change_data: normalizedChange,
      timestamp: new Date().toISOString()
    });
    console.log(`📝 [apply-schema-change-atomic] Project ID for realtime filter: ${project_id}`);
    console.log(`📝 [apply-schema-change-atomic] Expected filter: project_id=eq.${project_id}`);
    
    const insertPayload = {
      organization_id,
      project_id,
      change_type: normalizedChange.type,
      change_data: normalizedChange,
      old_value: oldSchemaData,
      new_value: new_schema_data,
      status: 'applied',
      sql_executed: sql,
      applied_at: new Date().toISOString(),
      created_by: user_id
    };
    
    console.log(`📝 [apply-schema-change-atomic] Insert payload project_id: ${insertPayload.project_id}`);
    
    const { data: insertedData, error: insertError } = await masterClient
      .from('schema_changes')
      .insert(insertPayload)
      .select()
      .single();

    const insertDuration = Date.now() - insertStartTime;
    
    if (insertError) {
      console.error(`❌ [apply-schema-change-atomic] Failed to log change to schema_changes:`, insertError);
      console.error(`❌ [apply-schema-change-atomic] Insert duration: ${insertDuration}ms`);
      // Don't fail the entire operation if logging fails, but log the error
    } else {
      console.log(`✅ [apply-schema-change-atomic] Change logged to schema_changes successfully`);
      console.log(`✅ [apply-schema-change-atomic] Insert duration: ${insertDuration}ms`);
      console.log(`✅ [apply-schema-change-atomic] Inserted record ID: ${insertedData?.id}`);
      console.log(`✅ [apply-schema-change-atomic] Inserted record project_id: ${insertedData?.project_id}`);
      console.log(`✅ [apply-schema-change-atomic] This INSERT should trigger realtime event for project ${project_id}`);
      console.log(`✅ [apply-schema-change-atomic] Realtime filter should match: project_id=eq.${project_id}`);
      console.log(`✅ [apply-schema-change-atomic] Actual inserted project_id: ${insertedData?.project_id}`);
      if (insertedData?.project_id !== project_id) {
        console.error(`❌ [apply-schema-change-atomic] PROJECT_ID MISMATCH! Expected: ${project_id}, Got: ${insertedData?.project_id}`);
      }
    }

    const totalDuration = Date.now() - requestStartTime;
    console.log(`🎉 Atomic change completed successfully for project ${project_id} in ${totalDuration}ms`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Schema change applied synchronously to Master and Slave',
      new_version: newVersion
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Atomic change failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

/**
 * Generate SQL for schema changes
 */
function generateSQL(change: any, organizationId: string): string {
  const schema = `org_${organizationId.replace(/-/g, '')}`;

  switch (change.type) {
    case 'add_table':
      if (!change.table) throw new Error('Table definition required for add_table');
      return generateCreateTableSQL(change.table, schema);

    case 'drop_table':
      if (!change.table_name) throw new Error('Table name required for drop_table');
      return `DROP TABLE IF EXISTS ${schema}.${change.table_name} CASCADE;`;

    case 'add_column':
      if (!change.table_name || !change.column) throw new Error('Table name and column required for add_column');
      return generateAddColumnSQL(change.table_name, change.column, schema);

    case 'drop_column':
      if (!change.table_name || !change.column_name) throw new Error('Table name and column name required for drop_column');
      return `ALTER TABLE ${schema}.${change.table_name} DROP COLUMN IF EXISTS ${change.column_name};`;

    case 'add_foreign_key':
      if (!change.foreign_key) throw new Error('Foreign key definition required for add_foreign_key');
      return generateAddForeignKeySQL(change.foreign_key, schema);

    case 'drop_foreign_key':
      if (!change.foreign_key) throw new Error('Foreign key definition required for drop_foreign_key');
      return `ALTER TABLE ${schema}.${change.foreign_key.table_name} DROP CONSTRAINT IF EXISTS ${change.foreign_key.constraint_name};`;

    case 'drop_unique_constraint':
      if (!change.table_name || !change.column_name) throw new Error('Table and column required for drop_unique_constraint');
      const dropConstraintName = `${change.table_name}_${change.column_name}_key`;
      return `ALTER TABLE ${schema}.${change.table_name} DROP CONSTRAINT IF EXISTS ${dropConstraintName};`;

    case 'add_unique_constraint':
      if (!change.table_name || !change.column_name) throw new Error('Table and column required for add_unique_constraint');
      const addConstraintName = `${change.table_name}_${change.column_name}_key`;
      return `ALTER TABLE ${schema}.${change.table_name} ADD CONSTRAINT ${addConstraintName} UNIQUE (${change.column_name});`;

    case 'alter_column_default':
      if (!change.table_name || !change.column_name) throw new Error('Table and column required for alter_column_default');
      if (change.new_default === null || change.new_default === undefined || change.new_default === '') {
        return `ALTER TABLE ${schema}.${change.table_name} ALTER COLUMN ${change.column_name} DROP DEFAULT;`;
      } else {
        return `ALTER TABLE ${schema}.${change.table_name} ALTER COLUMN ${change.column_name} SET DEFAULT ${change.new_default};`;
      }

    case 'alter_column_nullable':
      if (!change.table_name || !change.column_name) throw new Error('Table and column required for alter_column_nullable');
      // Check if this is a no-op (same value) - if so, return empty SQL
      // The schema_data will still be updated, but no DDL will be executed
      // This is used for cases like column reordering where only metadata changes
      if (change.nullable === undefined || change.nullable === null) {
        // If nullable is not specified, treat as no-op
        return '-- No-op: nullable value unchanged';
      }
      if (change.nullable) {
        return `ALTER TABLE ${schema}.${change.table_name} ALTER COLUMN ${change.column_name} DROP NOT NULL;`;
      } else {
        return `ALTER TABLE ${schema}.${change.table_name} ALTER COLUMN ${change.column_name} SET NOT NULL;`;
      }

    case 'rename_column':
      if (!change.table_name || !change.old_name || !change.new_name) {
        throw new Error('Table name, old name, and new name required for rename_column');
      }
      // In PostgreSQL, we need to use the internal_name (masked name) for the old column
      // The new_name should also be the internal_name if we're renaming the internal column
      // However, if we're just renaming the display name, we need to check the schema
      // For now, we'll assume old_name and new_name are internal_names (masked)
      return `ALTER TABLE ${schema}.${change.table_name} RENAME COLUMN ${change.old_name} TO ${change.new_name};`;

    case 'alter_column_type':
      if (!change.table_name || !change.column_name || !change.new_type) {
        throw new Error('Table name, column name, and new type required for alter_column_type');
      }
      return `ALTER TABLE ${schema}.${change.table_name} ALTER COLUMN ${change.column_name} TYPE ${change.new_type};`;

    default:
      throw new Error(`Unsupported change type: ${change.type}`);
  }
}

function generateCreateTableSQL(table: any, schema: string): string {
  // 🔍 DEBUG: Log table object to see what we're receiving
  console.log('🔍 generateCreateTableSQL DEBUG:');
  console.log('  table.name:', table.name);
  console.log('  table.id:', table.id);
  console.log('  table.internal_name:', table.internal_name);
  console.log('  table object:', JSON.stringify(table, null, 2));

  // Ensure table has an 'id' column as primary key if none exists
  let hasPrimaryKey = false;
  let hasIdColumn = false;
  
  for (const col of table.columns || []) {
    const isPrimaryKey = col.isPrimaryKey || col.primary_key;
    if (isPrimaryKey) {
      hasPrimaryKey = true;
    }
    const colName = (col.name || '').toLowerCase();
    if (colName === 'id' && isPrimaryKey) {
      hasIdColumn = true;
    }
  }
  
  // If no primary key or no 'id' primary key, add one
  if (!hasPrimaryKey || !hasIdColumn) {
    const idColumn = {
      id: `id_${Date.now()}`,
      name: 'id',
      internal_name: `c_${Date.now()}`,
      type: 'UUID',
      isPrimaryKey: true,
      primary_key: true,
      isNullable: false,
      nullable: false,
      isUnique: true,
      isAutoGenerate: true,
      defaultValue: 'gen_random_uuid()',
      default_value: 'gen_random_uuid()'
    };
    
    // Add id column at the beginning
    table.columns = [idColumn, ...(table.columns || [])];
    console.log('  ⚠️ Added default id column to table');
  }

  const columns = table.columns.map((col: any) => {
    // ✅ Use internal_name for column if available, otherwise generate masked name
    const columnName = col.internal_name || `c_${col.id}`;
    let sql = `${columnName} ${col.type}`;
    
    // Check both camelCase and snake_case for primary key
    const isPrimaryKey = col.isPrimaryKey || col.primary_key;
    if (isPrimaryKey) sql += ' PRIMARY KEY';
    
    // Check both camelCase and snake_case for nullable
    const isNullable = col.isNullable !== false && col.nullable !== false;
    if (!isNullable) sql += ' NOT NULL';
    
    // Check both camelCase and snake_case for default value
    const defaultValue = col.defaultValue || col.default_value;
    if (defaultValue) sql += ` DEFAULT ${defaultValue}`;
    
    return sql;
  }).join(',\n  ');

  // ✅ Use internal_name if available, otherwise generate masked name
  const tableName = table.internal_name || `t_${table.id}`;
  console.log('  Generated tableName:', tableName);

  return `CREATE TABLE IF NOT EXISTS ${schema}.${tableName} (
  ${columns}
);`;
}

function generateAddColumnSQL(tableName: string, column: any, schema: string): string {
  // ✅ Use internal_name for column if available, otherwise generate masked name
  const columnName = column.internal_name || `c_${column.id}`;
  console.log(`🔧 [generateAddColumnSQL] Generating SQL for column:`, {
    tableName,
    schema,
    columnName,
    columnType: column.type,
    nullable: column.nullable,
    default_value: column.default_value,
    isUnique: column.isUnique || column.unique
  });
  
  let sql = `ALTER TABLE ${schema}.${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${column.type}`;
  if (column.nullable === false || column.isNullable === false) {
    sql += ' NOT NULL';
  }
  if (column.default_value || column.defaultValue) {
    sql += ` DEFAULT ${column.default_value || column.defaultValue}`;
  }
  sql += ';';

  // Add unique constraint if needed
  const isUnique = column.isUnique === true || column.unique === true;
  if (isUnique) {
    const constraintName = `${tableName}_${columnName}_key`;
    sql += `\nCREATE UNIQUE INDEX IF NOT EXISTS ${constraintName} ON ${schema}.${tableName} (${columnName});`;
  }

  console.log(`🔧 [generateAddColumnSQL] Generated SQL:`, sql);
  return sql;
}

function generateAddForeignKeySQL(foreignKey: any, schema: string): string {
  // 🔍 DEBUG: Log foreign key object to see what we're receiving
  console.log('🔍 generateAddForeignKeySQL DEBUG:');
  console.log('  foreignKey object:', JSON.stringify(foreignKey, null, 2));

  // Validate required fields
  if (!foreignKey.table_name && !foreignKey.table_internal_name) {
    throw new Error('Foreign key requires table_name or table_internal_name');
  }
  if (!foreignKey.referenced_table && !foreignKey.referenced_table_internal_name) {
    throw new Error('Foreign key requires referenced_table or referenced_table_internal_name');
  }
  if (!foreignKey.column_name && !foreignKey.column_internal_name) {
    throw new Error('Foreign key requires column_name or column_internal_name');
  }
  if (!foreignKey.referenced_column && !foreignKey.referenced_column_internal_name) {
    throw new Error('Foreign key requires referenced_column or referenced_column_internal_name');
  }

  // ✅ Use internal_name if available, otherwise use name and add prefix
  const tableName = foreignKey.table_internal_name || 
                   (foreignKey.table_name?.startsWith('t_') ? foreignKey.table_name : `t_${foreignKey.table_name}`);
  const referencedTable = foreignKey.referenced_table_internal_name || 
                         (foreignKey.referenced_table?.startsWith('t_') ? foreignKey.referenced_table : `t_${foreignKey.referenced_table}`);

  // ✅ Use internal_name directly if available, otherwise fallback to column_name
  const columnName = foreignKey.column_internal_name || foreignKey.column_name;
  const referencedColumn = foreignKey.referenced_column_internal_name || foreignKey.referenced_column;

  // Generate constraint name if not provided
  const constraintName = foreignKey.constraint_name || 
                        `fk_${tableName}_${columnName}_${referencedTable}`;

  // Add ON DELETE and ON UPDATE actions if provided
  let onDeleteClause = '';
  let onUpdateClause = '';
  
  if (foreignKey.on_delete && foreignKey.on_delete !== 'NO ACTION') {
    onDeleteClause = ` ON DELETE ${foreignKey.on_delete}`;
  }
  if (foreignKey.on_update && foreignKey.on_update !== 'NO ACTION') {
    onUpdateClause = ` ON UPDATE ${foreignKey.on_update}`;
  }

  console.log('  Generated tableName:', tableName);
  console.log('  Generated referencedTable:', referencedTable);
  console.log('  Generated columnName:', columnName);
  console.log('  Generated referencedColumn:', referencedColumn);
  console.log('  Generated constraintName:', constraintName);

  return `ALTER TABLE ${schema}.${tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${columnName}) REFERENCES ${schema}.${referencedTable}(${referencedColumn})${onDeleteClause}${onUpdateClause};`;
}
