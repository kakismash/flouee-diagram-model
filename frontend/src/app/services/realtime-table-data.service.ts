import { Injectable, signal, DestroyRef, inject, OnDestroy } from '@angular/core';
import { RealtimeChannel, createClient, SupabaseClient } from '@supabase/supabase-js';
import { Table } from '../models/table.model';
import { SlaveDataService } from './slave-data.service';
import { SupabaseService } from './supabase.service';
import { ProjectService } from './project.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class RealtimeTableDataService implements OnDestroy {
  private slaveDataService = inject(SlaveDataService);
  private supabaseService = inject(SupabaseService);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  
  // Store subscriptions: tableId -> channel
  private subscriptions = new Map<string, RealtimeChannel>();
  
  // Store data signals: tableId -> signal
  private dataSignals = new Map<string, ReturnType<typeof signal<any[]>>>();
  
  // Store column mappings: tableId -> { internalName: displayName }
  private columnMappings = new Map<string, { [internalName: string]: string }>();
  
  // Store slave clients: organizationId -> client
  private slaveClients = new Map<string, SupabaseClient>();
  
  // Store table and organization info for reloading after changes
  private tableCache = new Map<string, Table>();
  private organizationIdCache = new Map<string, string>();

  /**
   * Subscribe to realtime updates for a table
   * Returns a signal that updates automatically when data changes
   */
  async subscribeToTable(
    organizationId: string,
    table: Table
  ): Promise<ReturnType<typeof signal<any[]>>> {
    const tableId = table.id;
    
    // If already subscribed, return existing signal
    if (this.dataSignals.has(tableId)) {
      console.log(`📡 [RealtimeTableData] Already subscribed to table ${table.name}`);
      return this.dataSignals.get(tableId)!;
    }

    console.log(`📡 [RealtimeTableData] Subscribing to table ${table.name} (${tableId})`);

    // Get or create slave client for this organization
    let slaveClient = this.slaveClients.get(organizationId);
    if (!slaveClient) {
      // Initialize slave client
      await this.slaveDataService.initializeSlaveClient(organizationId);
      
      // Get deployment config using Edge Function (secure, no service_role_key exposed)
      const masterClient = this.supabaseService.client;
      const { data: { session } } = await masterClient.auth.getSession();
      if (!session) {
        throw new Error('No session available');
      }

      const { data: configData, error } = await masterClient.functions.invoke('initialize-slave-client', {
        body: {
          organizationId: organizationId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error || !configData?.success || !configData?.slaveClient) {
        throw new Error('Failed to get deployment configuration');
      }

      const slaveConfig = configData.slaveClient;
      const projectUrl = slaveConfig.projectUrl;
      const anonKey = slaveConfig.anonKey;
      // Use anon key (service_role_key is no longer exposed for security)
      const keyToUse = anonKey;

      if (!projectUrl || !keyToUse) {
        throw new Error('Invalid deployment configuration');
      }

      // Create slave client WITHOUT JWT token
      // The Slave cannot validate JWT tokens from the Master (different projects, different signing keys)
      // RPC functions use SECURITY DEFINER, so they don't require a valid JWT token
      // Security is enforced by:
      // 1. Schema name validation (org_ + 32 hex chars matching organization_id)
      // 2. RPC functions validate schema format and organization_id
      // 3. Realtime subscriptions work with anon key (no JWT needed for subscriptions)
      slaveClient = createClient(projectUrl, keyToUse, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: undefined
        }
      });
      
      this.slaveClients.set(organizationId, slaveClient);
    }

    // Create column mapping (internal -> display names)
    // IMPORTANT: Primary key column should always be mapped to 'id' for consistency
    const columnMapping: { [internalName: string]: string } = {};
    table.columns?.forEach(col => {
      const internalColName = col.internal_name || `c_${col.id}`;
      // If this is the primary key column, always map it to 'id'
      if (col.isPrimaryKey) {
        columnMapping[internalColName] = 'id';
      } else {
        columnMapping[internalColName] = col.name;
      }
    });
    this.columnMappings.set(tableId, columnMapping);

    // Create data signal
    const dataSignal = signal<any[]>([]);
    this.dataSignals.set(tableId, dataSignal);
    
    // Cache table and organization for reloading after changes
    this.tableCache.set(tableId, table);
    this.organizationIdCache.set(tableId, organizationId);

    // Load initial data
    const initialData = await this.loadInitialData(organizationId, table, columnMapping);
    dataSignal.set(initialData);

    // Set up realtime subscription
    const schemaName = `org_${organizationId.replace(/-/g, '')}`;
    const internalTableName = table.internal_name || `t_${table.id}`;

    console.log(`📡 [RealtimeTableData] Setting up realtime subscription:`, {
      tableName: table.name,
      tableId,
      schemaName,
      internalTableName,
      organizationId
    });

    // Create channel for this table
    // Note: broadcast: { self: true } allows receiving events from our own inserts
    // This is needed because we insert from the same client that subscribes
    const channel = slaveClient
      .channel(`table_data:${tableId}`, {
        config: {
          broadcast: { self: true } // Changed to true to receive our own INSERT events
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: schemaName,
          table: internalTableName
        },
        async (payload) => {
          console.log(`📥 [RealtimeTableData] INSERT event for ${table.name}:`, payload);
          await this.handleInsert(tableId, payload.new, columnMapping);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: schemaName,
          table: internalTableName
        },
        async (payload) => {
          console.log(`📥 [RealtimeTableData] UPDATE event received for ${table.name}`);
          console.log(`📦 [RealtimeTableData] UPDATE payload:`, {
            new: payload.new,
            old: payload.old,
            eventType: payload.eventType,
            schema: payload.schema,
            table: payload.table
          });
          console.log(`🗺️ [RealtimeTableData] Column mapping for UPDATE:`, columnMapping);
          await this.handleUpdate(tableId, payload.new, columnMapping);
        }
      )
            .on(
              'postgres_changes',
              {
                event: 'DELETE',
                schema: schemaName,
                table: internalTableName
              },
              (payload) => {
                console.log(`📥 [RealtimeTableData] DELETE event received for ${table.name}:`, payload);
                console.log(`📦 [RealtimeTableData] payload.old (raw):`, payload.old);
                console.log(`🗺️ [RealtimeTableData] Column mapping:`, columnMapping);
                // Map internal column names to display names before handling delete
                const mappedDeletedRecord = this.mapInternalToDisplayNames(payload.old, columnMapping);
                console.log(`🗺️ [RealtimeTableData] Mapped deleted record:`, mappedDeletedRecord);
                this.handleDelete(tableId, mappedDeletedRecord);
              }
            )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [RealtimeTableData] Subscribed to ${table.name} (${schemaName}.${internalTableName})`);
          console.log(`📡 [RealtimeTableData] Listening for INSERT, UPDATE, DELETE events`);
          console.log(`🔍 [RealtimeTableData] Subscription details:`, {
            schemaName,
            internalTableName,
            tableId,
            channelName: `table_data:${tableId}`
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [RealtimeTableData] Failed to subscribe to ${table.name}:`, err);
          console.error(`❌ [RealtimeTableData] Error details:`, {
            error: err,
            schemaName,
            internalTableName,
            tableId
          });
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ [RealtimeTableData] Subscription timed out for ${table.name}`);
        } else if (status === 'CLOSED') {
          console.warn(`🔒 [RealtimeTableData] Subscription closed for ${table.name}`);
        } else {
          console.log(`ℹ️ [RealtimeTableData] Subscription status for ${table.name}:`, status, err);
        }
      });

    this.subscriptions.set(tableId, channel);

    return dataSignal;
  }

  /**
   * Unsubscribe from a table
   */
  unsubscribeFromTable(tableId: string): void {
    const channel = this.subscriptions.get(tableId);
    if (channel) {
      console.log(`🔌 [RealtimeTableData] Unsubscribing from table ${tableId}`);
      channel.unsubscribe();
      this.subscriptions.delete(tableId);
    }
    
    // Clean up signal and mapping
    this.dataSignals.delete(tableId);
    this.columnMappings.delete(tableId);
  }

  /**
   * Get the data signal for a table (if subscribed)
   */
  getTableDataSignal(tableId: string): ReturnType<typeof signal<any[]>> | null {
    return this.dataSignals.get(tableId) || null;
  }

  /**
   * Subscribe to schema changes from Master
   * When a schema change is detected, reload the affected table and remap columns
   */
  subscribeToSchemaChanges(projectId: string, onSchemaChange: (tableId: string) => void): Promise<void> {
    const masterClient = this.supabaseService.client;
    const channelName = `schema_changes:${projectId}`;

    // Check if already subscribed and active
    if (this.subscriptions.has(channelName)) {
      const existingChannel = this.subscriptions.get(channelName);
      const existingState = existingChannel?.state as string | undefined;
      
      // Only consider SUBSCRIBED as truly active - 'joined' is not enough to receive events
      if (existingState === 'SUBSCRIBED') {
        console.log(`📡 [RealtimeTableData] Already subscribed and active for project ${projectId} (state: ${existingState})`);
        return Promise.resolve();
      } else {
        console.log(`⚠️ [RealtimeTableData] Existing subscription found but not fully active (state: ${existingState}), cleaning up...`);
        console.log(`⚠️ [RealtimeTableData] State 'joined' is not sufficient - need 'SUBSCRIBED' to receive events`);
        // Clean up inactive subscription
        existingChannel?.unsubscribe();
        this.subscriptions.delete(channelName);
      }
    }

    console.log(`📡 [RealtimeTableData] Subscribing to schema changes for project ${projectId}`);
    console.log(`📡 [RealtimeTableData] Channel name: ${channelName}`);
    console.log(`📡 [RealtimeTableData] Filter: project_id=eq.${projectId}`);

    // Create a promise that resolves when subscription is active
    return new Promise<void>((resolve, reject) => {
      const channel = masterClient
        .channel(channelName, {
          config: {
            broadcast: { self: true } // ✅ Receive our own schema changes
          }
        })
        // Add a debug listener for ALL postgres_changes events (without filter) to see if we're receiving anything
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'schema_changes'
            // No filter - this is just for debugging
          } as any,
          (debugPayload) => {
            const debugData = debugPayload.new as any;
            console.log(`🔍 [RealtimeTableData] DEBUG: Received ANY schema_changes INSERT event:`, {
              event_project_id: debugData?.project_id,
              expected_project_id: projectId,
              matches: debugData?.project_id === projectId,
              full_payload: debugPayload.new
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'schema_changes',
            filter: `project_id=eq.${projectId}`
          } as any, // Type assertion to avoid TypeScript issues
          async (payload) => {
            try {
            console.log(`📥 [RealtimeTableData] ==========================================`);
            console.log(`📥 [RealtimeTableData] Schema change event received!`);
            console.log(`📥 [RealtimeTableData] ==========================================`);
            console.log(`📥 [RealtimeTableData] Schema change detected:`, payload.new);
            console.log(`📦 [RealtimeTableData] Full payload:`, JSON.stringify(payload.new, null, 2));
            
            // Verify project_id matches filter
            const changeData = payload.new as any;
            if (changeData.project_id !== projectId) {
              console.warn(`⚠️ [RealtimeTableData] Received event for different project! Expected: ${projectId}, Got: ${changeData.project_id}`);
              return;
            }
            console.log(`✅ [RealtimeTableData] Project ID matches filter: ${changeData.project_id}`);
            
            // Check if this change was made by the current user
            // If so, skip reload since UI should already be updated from Edge Function response
            const currentUserId = this.authService.user()?.id;
            if (changeData.created_by && changeData.created_by === currentUserId) {
              console.log(`ℹ️ [RealtimeTableData] Schema change was made by current user (${currentUserId}), skipping reload`);
              console.log(`ℹ️ [RealtimeTableData] UI should already be updated from Edge Function response`);
              console.log(`ℹ️ [RealtimeTableData] Change type: ${changeData.change_type}`);
              return; // Skip reload to avoid unnecessary update
            }
            
            // Otherwise, it's a change from another user - reload to sync
            if (changeData.created_by && changeData.created_by !== currentUserId) {
              console.log(`🔄 [RealtimeTableData] Schema change from another user (${changeData.created_by}), reloading to sync...`);
            } else {
              console.log(`🔄 [RealtimeTableData] Schema change detected (created_by: ${changeData.created_by || 'unknown'}), reloading...`);
            }
            
            const changeType = changeData.change_type;
            
            console.log(`🔍 [RealtimeTableData] Change type: ${changeType}`);
            
            // Determine which table was affected
            let affectedTableId: string | null = null;
            let tableInternalName: string | null = null;
            
            if (changeData.change_data) {
              const changeDataObj = typeof changeData.change_data === 'string' 
                ? JSON.parse(changeData.change_data) 
                : changeData.change_data;
              
              console.log(`📋 [RealtimeTableData] Parsed change_data:`, changeDataObj);
              
              // Extract table ID from change data based on change type
              if (changeType === 'add_table' || changeType === 'drop_table') {
                affectedTableId = changeDataObj.table?.id || changeDataObj.table_id;
                tableInternalName = changeDataObj.table?.internal_name || changeDataObj.table_name;
                console.log(`📊 [RealtimeTableData] Table change - ID: ${affectedTableId}, Internal Name: ${tableInternalName}`);
              } else if (changeType === 'add_column' || changeType === 'drop_column' || 
                         changeType === 'alter_column_type' || changeType === 'rename_column') {
                // For column changes, extract table info
                tableInternalName = changeDataObj.table_name;
                affectedTableId = changeDataObj.table_id || changeDataObj.table?.id;
                
                // If we have column info, try to extract table_id from column
                if (!affectedTableId && changeDataObj.column) {
                  // Column object might have table reference
                  affectedTableId = changeDataObj.column.table_id || changeDataObj.column.table?.id;
                }
                
                console.log(`📊 [RealtimeTableData] Column change - Table ID: ${affectedTableId}, Table Internal Name: ${tableInternalName}`);
                console.log(`📊 [RealtimeTableData] Column info:`, changeDataObj.column || changeDataObj.column_name);
              }
            }
            
            if (affectedTableId) {
              console.log(`🔄 [RealtimeTableData] Reloading table ${affectedTableId} after schema change (${changeType})`);
              
              // For column changes (add_column, drop_column), fetch updated table structure
              // and update the cached table and column mapping
              if (changeType === 'add_column' || changeType === 'drop_column' || 
                  changeType === 'alter_column_type' || changeType === 'rename_column') {
                try {
                  // Fetch updated project to get the latest table structure
                  const currentProject = this.projectService.getCurrentProjectSync();
                  if (currentProject) {
                    const updatedTable = currentProject.schemaData.tables.find(t => t.id === affectedTableId);
                    if (updatedTable) {
                      console.log(`📋 [RealtimeTableData] Found updated table structure for ${updatedTable.name}`);
                      console.log(`📊 [RealtimeTableData] Updated columns:`, updatedTable.columns.map(c => ({ id: c.id, name: c.name, internal_name: c.internal_name })));
                      
                      // Update table structure and column mapping
                      await this.updateTableStructure(affectedTableId, updatedTable);
                    } else {
                      console.warn(`⚠️ [RealtimeTableData] Updated table not found in project schema for ${affectedTableId}`);
                      // Fallback: just reload with cached table
                      await this.reloadTableData(affectedTableId);
                    }
                  } else {
                    console.warn(`⚠️ [RealtimeTableData] No current project found, using cached table structure`);
                    // Fallback: just reload with cached table
                    await this.reloadTableData(affectedTableId);
                  }
                } catch (error: any) {
                  console.error(`❌ [RealtimeTableData] Error updating table structure:`, error);
                  // Fallback: just reload with cached table
                  await this.reloadTableData(affectedTableId);
                }
              } else {
                // For other change types (add_table, drop_table), just reload data
                await this.reloadTableData(affectedTableId);
              }
              
              // Notify the component to update (this will reload the entire project)
              onSchemaChange(affectedTableId);
            } else {
              console.warn(`⚠️ [RealtimeTableData] Could not determine affected table ID from schema change`);
              console.warn(`⚠️ [RealtimeTableData] Change type: ${changeType}, Table internal name: ${tableInternalName}`);
              console.warn(`⚠️ [RealtimeTableData] Will reload entire project instead`);
              
              // If we can't find the specific table, reload the entire project
              // This is a fallback - the component's onSchemaChange will handle it
              // We'll use a dummy table ID to trigger the callback
              onSchemaChange('unknown');
            }
          } catch (error: any) {
            console.error(`❌ [RealtimeTableData] Error handling schema change:`, error);
            console.error(`❌ [RealtimeTableData] Error stack:`, error.stack);
            // Still notify the component to reload the project
            onSchemaChange('error');
          }
        }
      )
        .subscribe((status, err) => {
          console.log(`📡 [RealtimeTableData] ==========================================`);
          console.log(`📡 [RealtimeTableData] Subscription status changed:`, status);
          console.log(`📡 [RealtimeTableData] Channel state: ${channel.state}`);
          console.log(`📡 [RealtimeTableData] Timestamp: ${new Date().toISOString()}`);
          console.log(`📡 [RealtimeTableData] Channel name: ${channelName}`);
          console.log(`📡 [RealtimeTableData] Project ID: ${projectId}`);
          console.log(`📡 [RealtimeTableData] Error (if any):`, err);
          console.log(`📡 [RealtimeTableData] ==========================================`);
          
          // Log all possible statuses to understand the flow
          if (status === 'SUBSCRIBED') {
            console.log(`✅ [RealtimeTableData] Successfully subscribed to schema changes for project ${projectId}`);
            console.log(`✅ [RealtimeTableData] Listening for INSERT events on schema_changes table`);
            console.log(`✅ [RealtimeTableData] Channel: ${channelName}`);
            console.log(`✅ [RealtimeTableData] Filter: project_id=eq.${projectId}`);
            console.log(`✅ [RealtimeTableData] Channel state: ${channel.state}`);
            console.log(`✅ [RealtimeTableData] Subscription is now ACTIVE and ready to receive events`);
            
            // Verify subscription is actually active by checking channel state
            const verifyState = () => {
              const currentState = channel.state as string;
              console.log(`🔍 [RealtimeTableData] Verifying subscription state: ${currentState}`);
              if (currentState === 'joined' || currentState === 'SUBSCRIBED') {
                console.log(`✅ [RealtimeTableData] Subscription verified as active`);
              } else {
                console.warn(`⚠️ [RealtimeTableData] Subscription state mismatch: expected 'joined' or 'SUBSCRIBED', got '${currentState}'`);
              }
            };
            
            // Verify immediately and after a short delay
            verifyState();
            setTimeout(verifyState, 100);
            
            // Resolve promise when subscription is active
            resolve();
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ [RealtimeTableData] Failed to subscribe to schema changes:`, err);
            console.error(`❌ [RealtimeTableData] Error details:`, JSON.stringify(err, null, 2));
            reject(new Error(`Failed to subscribe: ${err?.message || 'Unknown error'}`));
          } else if (status === 'TIMED_OUT') {
            console.warn(`⏳ [RealtimeTableData] Schema changes subscription timed out`);
            reject(new Error('Subscription timed out'));
          } else if (status === 'CLOSED') {
            console.warn(`🚪 [RealtimeTableData] Schema changes subscription closed`);
            // Don't reject on CLOSED - it might be intentional
          } else if (status === 'JOINED') {
            console.log(`⏳ [RealtimeTableData] Subscription JOINED but waiting for SUBSCRIBED status...`);
            console.log(`⏳ [RealtimeTableData] Channel state: ${channel.state}`);
            console.log(`⏳ [RealtimeTableData] Note: 'JOINED' status means channel connected but may not receive postgres_changes events yet`);
            // Don't resolve yet - wait for SUBSCRIBED
          } else if (status === 'JOINING') {
            console.log(`⏳ [RealtimeTableData] Subscription is JOINING, waiting for SUBSCRIBED status...`);
            console.log(`⏳ [RealtimeTableData] Channel state: ${channel.state}`);
          } else {
            console.log(`ℹ️ [RealtimeTableData] Subscription status: ${status}`, err ? `Error: ${err}` : '');
            console.log(`ℹ️ [RealtimeTableData] Channel state: ${channel.state}`);
            // For other statuses, wait a bit more but don't resolve
          }
        });

      this.subscriptions.set(channelName, channel);
    });
  }

  /**
   * Get the current state of a schema changes subscription
   */
  getSubscriptionState(projectId: string): string | null {
    const channelName = `schema_changes:${projectId}`;
    const channel = this.subscriptions.get(channelName);
    if (!channel) {
      return null;
    }
    return (channel.state as string) || null;
  }

  /**
   * Verify subscription is active and log detailed state
   */
  verifySchemaChangesSubscription(projectId: string): void {
    const channelName = `schema_changes:${projectId}`;
    const channel = this.subscriptions.get(channelName);
    
    if (!channel) {
      console.warn(`⚠️ [RealtimeTableData] No subscription found for project ${projectId}`);
      return;
    }
    
    const state = channel.state as string;
    console.log(`🔍 [RealtimeTableData] Subscription verification for project ${projectId}:`);
    console.log(`🔍 [RealtimeTableData] Channel name: ${channelName}`);
    console.log(`🔍 [RealtimeTableData] Channel state: ${state}`);
    console.log(`🔍 [RealtimeTableData] Is active (SUBSCRIBED): ${state === 'SUBSCRIBED'}`);
    console.log(`🔍 [RealtimeTableData] Is joined (but may not receive events): ${state === 'joined'}`);
    
    if (state !== 'SUBSCRIBED') {
      if (state === 'joined') {
        console.warn(`⚠️ [RealtimeTableData] Subscription is 'joined' but NOT 'SUBSCRIBED' - will NOT receive events!`);
        console.warn(`⚠️ [RealtimeTableData] The subscription needs to be in 'SUBSCRIBED' state to receive postgres_changes events.`);
      } else {
        console.warn(`⚠️ [RealtimeTableData] Subscription is NOT active! State: ${state}`);
      }
    } else {
      console.log(`✅ [RealtimeTableData] Subscription is fully active and will receive events`);
    }
  }

  /**
   * Check if a schema changes subscription is active (SUBSCRIBED state)
   */
  isSchemaChangesSubscriptionActive(projectId: string): boolean {
    const state = this.getSubscriptionState(projectId);
    return state === 'SUBSCRIBED' || state === 'joined';
  }

  /**
   * Unsubscribe from schema changes
   */
  unsubscribeFromSchemaChanges(projectId: string): void {
    const channelName = `schema_changes:${projectId}`;
    const channel = this.subscriptions.get(channelName);
    
    if (channel) {
      const state = channel.state;
      console.log(`🔌 [RealtimeTableData] Unsubscribing from schema changes for project ${projectId}`);
      console.log(`🔌 [RealtimeTableData] Channel state before unsubscribe: ${state}`);
      channel.unsubscribe();
      this.subscriptions.delete(channelName);
      console.log(`✅ [RealtimeTableData] Unsubscribed and cleaned up subscription for project ${projectId}`);
    } else {
      console.log(`ℹ️ [RealtimeTableData] No active subscription found for project ${projectId}`);
    }
  }

  /**
   * Update table structure and column mapping when schema changes
   * This is called when columns are added/removed to ensure the column mapping is up-to-date
   */
  async updateTableStructure(tableId: string, updatedTable: Table): Promise<void> {
    console.log(`🔄 [RealtimeTableData] Updating table structure for ${updatedTable.name} (${tableId})`);
    
    // Update cached table
    this.tableCache.set(tableId, updatedTable);
    
    // Rebuild column mapping from updated table columns
    const columnMapping: { [internalName: string]: string } = {};
    updatedTable.columns?.forEach(col => {
      const internalColName = col.internal_name || `c_${col.id}`;
      // If this is the primary key column, always map it to 'id'
      if (col.isPrimaryKey) {
        columnMapping[internalColName] = 'id';
      } else {
        columnMapping[internalColName] = col.name;
      }
    });
    
    // Update column mapping cache
    this.columnMappings.set(tableId, columnMapping);
    console.log(`✅ [RealtimeTableData] Updated column mapping for ${updatedTable.name}:`, columnMapping);
    
    // Reload table data using the new structure
    await this.reloadTableData(tableId, updatedTable);
  }

  /**
   * Manually reload data for a table (fallback when realtime events don't arrive)
   * @param tableId - The ID of the table to reload
   * @param updatedTable - Optional updated table structure. If provided, uses this instead of cached table
   */
  async reloadTableData(tableId: string, updatedTable?: Table): Promise<void> {
    const signal = this.dataSignals.get(tableId);
    if (!signal) {
      console.warn(`⚠️ [RealtimeTableData] No signal found for table ${tableId}, cannot reload`);
      return;
    }

    // Use updated table if provided, otherwise use cached table
    const table = updatedTable || this.tableCache.get(tableId);
    if (!table) {
      console.warn(`⚠️ [RealtimeTableData] Table not found in cache for ${tableId}`);
      return;
    }

    const organizationId = this.organizationIdCache.get(tableId);
    if (!organizationId) {
      console.warn(`⚠️ [RealtimeTableData] Organization ID not found in cache for ${tableId}`);
      return;
    }

    try {
      console.log(`🔄 [RealtimeTableData] Manually reloading data for table ${table.name}`);
      const reloadedData = await this.slaveDataService.loadSingleTableData(organizationId, table);
      signal.set(reloadedData);
      console.log(`✅ [RealtimeTableData] Reloaded ${reloadedData.length} records for ${table.name}`);
    } catch (error) {
      console.error(`❌ [RealtimeTableData] Failed to reload data for ${table.name}:`, error);
    }
  }

  /**
   * Load initial data for a table
   */
  private async loadInitialData(
    organizationId: string,
    table: Table,
    columnMapping: { [internalName: string]: string }
  ): Promise<any[]> {
    try {
      const data = await this.slaveDataService.loadSingleTableData(organizationId, table);
      return data;
    } catch (error) {
      console.error(`❌ [RealtimeTableData] Failed to load initial data for ${table.name}:`, error);
      return [];
    }
  }

  /**
   * Handle INSERT event - reload data to ensure proper sorting and filtering
   */
  private async handleInsert(
    tableId: string,
    newRecord: any,
    columnMapping: { [internalName: string]: string }
  ): Promise<void> {
    const signal = this.dataSignals.get(tableId);
    if (!signal) return;

    console.log(`➕ [RealtimeTableData] INSERT event - reloading data for proper sorting/filtering`);
    
    // Instead of just adding the record, reload all data to ensure proper sorting and filtering
    // This ensures the new record appears in the correct position based on current sort order
    const table = this.tableCache.get(tableId);
    if (!table) {
      console.warn(`⚠️ [RealtimeTableData] Table not found in cache for ${tableId}`);
      return;
    }

    const organizationId = this.organizationIdCache.get(tableId);
    if (!organizationId) {
      console.warn(`⚠️ [RealtimeTableData] Organization ID not found in cache for ${tableId}`);
      return;
    }

    try {
      console.log(`🔄 [RealtimeTableData] Starting reload after INSERT for table ${table.name}`);
      // Reload data from server to get properly sorted and filtered results
      const reloadedData = await this.slaveDataService.loadSingleTableData(organizationId, table);
      console.log(`📊 [RealtimeTableData] Reloaded data:`, {
        recordCount: reloadedData.length,
        sampleRecord: reloadedData.length > 0 ? reloadedData[0] : null
      });
      signal.set(reloadedData);
      console.log(`✅ [RealtimeTableData] Signal updated with ${reloadedData.length} records after INSERT`);
    } catch (error: any) {
      console.error(`❌ [RealtimeTableData] Failed to reload data after INSERT:`, error);
      console.error(`❌ [RealtimeTableData] Error details:`, {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      // Fallback: add the record manually if reload fails
      console.log(`🔄 [RealtimeTableData] Using fallback: adding record manually`);
      const mappedRecord: any = {};
      Object.keys(newRecord).forEach(key => {
        const displayName = columnMapping[key] || key;
        mappedRecord[displayName] = newRecord[key];
      });
      const currentData = signal();
      const updatedData = [...currentData, mappedRecord];
      signal.set(updatedData);
      console.log(`✅ [RealtimeTableData] Fallback: added record manually, total records: ${updatedData.length}`);
    }
  }

  /**
   * Handle UPDATE event - reload data to ensure proper sorting and filtering
   */
  private async handleUpdate(
    tableId: string,
    updatedRecord: any,
    columnMapping: { [internalName: string]: string }
  ): Promise<void> {
    const signal = this.dataSignals.get(tableId);
    if (!signal) return;

    console.log(`🔄 [RealtimeTableData] UPDATE event - reloading data for proper sorting/filtering`);
    
    // Reload data to ensure proper sorting and filtering after update
    const table = this.tableCache.get(tableId);
    if (!table) {
      console.warn(`⚠️ [RealtimeTableData] Table not found in cache for ${tableId}`);
      return;
    }

    const organizationId = this.organizationIdCache.get(tableId);
    if (!organizationId) {
      console.warn(`⚠️ [RealtimeTableData] Organization ID not found in cache for ${tableId}`);
      return;
    }

    try {
      console.log(`🔄 [RealtimeTableData] Starting reload after UPDATE for table ${table.name}`);
      // Reload data from server to get properly sorted and filtered results
      const reloadedData = await this.slaveDataService.loadSingleTableData(organizationId, table);
      console.log(`📊 [RealtimeTableData] Reloaded data:`, {
        recordCount: reloadedData.length,
        sampleRecord: reloadedData.length > 0 ? reloadedData[0] : null
      });
      signal.set(reloadedData);
      console.log(`✅ [RealtimeTableData] Signal updated with ${reloadedData.length} records after UPDATE`);
    } catch (error: any) {
      console.error(`❌ [RealtimeTableData] Failed to reload data after UPDATE:`, error);
      console.error(`❌ [RealtimeTableData] Error details:`, {
        message: error?.message,
        stack: error?.stack,
        error: error
      });
      // Fallback: update the record manually if reload fails
      console.log(`🔄 [RealtimeTableData] Using fallback: updating record manually`);
      console.log(`📦 [RealtimeTableData] Updated record (raw):`, updatedRecord);
      const mappedRecord = this.mapInternalToDisplayNames(updatedRecord, columnMapping);
      console.log(`🗺️ [RealtimeTableData] Mapped record (display names):`, mappedRecord);
      const currentData = signal();
      const recordId = mappedRecord.id;
      if (!recordId) {
        console.warn(`⚠️ [RealtimeTableData] No ID found in updated record, cannot update manually`);
        return;
      }
      const updatedData = currentData.map((record: any) => {
        if (record.id && record.id === recordId) {
          console.log(`🔄 [RealtimeTableData] Updating record with ID ${recordId}`);
          return { ...record, ...mappedRecord };
        }
        return record;
      });
      signal.set(updatedData);
      console.log(`✅ [RealtimeTableData] Fallback: updated record manually, total records: ${updatedData.length}`);
    }
  }

  /**
   * Map internal column names to display names
   */
  private mapInternalToDisplayNames(record: any, columnMapping: { [internalName: string]: string }): any {
    if (!record || !columnMapping) return record;
    
    const mappedRecord: any = {};
    Object.keys(record).forEach(key => {
      const displayName = columnMapping[key] || key;
      mappedRecord[displayName] = record[key];
    });
    
    return mappedRecord;
  }

  /**
   * Handle DELETE event - reload data to ensure proper sorting and filtering
   */
  private async handleDelete(tableId: string, deletedRecord: any): Promise<void> {
    const signal = this.dataSignals.get(tableId);
    if (!signal) {
      console.warn(`⚠️ [RealtimeTableData] No signal found for table ${tableId}`);
      return;
    }

    console.log(`🗑️ [RealtimeTableData] DELETE event - reloading data for proper sorting/filtering`);
    
    // Reload data to ensure proper sorting and filtering after delete
    const table = this.tableCache.get(tableId);
    if (!table) {
      console.warn(`⚠️ [RealtimeTableData] Table not found in cache for ${tableId}`);
      return;
    }

    const organizationId = this.organizationIdCache.get(tableId);
    if (!organizationId) {
      console.warn(`⚠️ [RealtimeTableData] Organization ID not found in cache for ${tableId}`);
      return;
    }

    try {
      // Reload data from server to get properly sorted and filtered results
      const reloadedData = await this.slaveDataService.loadSingleTableData(organizationId, table);
      signal.set(reloadedData);
      console.log(`✅ [RealtimeTableData] Reloaded ${reloadedData.length} records after DELETE`);
    } catch (error) {
      console.error(`❌ [RealtimeTableData] Failed to reload data after DELETE:`, error);
      // Fallback: remove the record manually if reload fails
      const currentData = signal();
      const filteredData = currentData.filter((record: any) => {
        if (record.id && deletedRecord.id && record.id === deletedRecord.id) {
          return false;
        }
        return true;
      });
      signal.set(filteredData);
    }
  }

  /**
   * Cleanup all subscriptions (called on service destroy)
   */
  ngOnDestroy(): void {
    console.log('🧹 [RealtimeTableData] Cleaning up all subscriptions');
    this.subscriptions.forEach((channel, tableId) => {
      channel.unsubscribe();
    });
    this.subscriptions.clear();
    this.dataSignals.clear();
    this.columnMappings.clear();
  }
}

