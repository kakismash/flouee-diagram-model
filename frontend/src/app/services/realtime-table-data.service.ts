import { Injectable, signal, DestroyRef, inject, OnDestroy } from '@angular/core';
import { RealtimeChannel, createClient, SupabaseClient } from '@supabase/supabase-js';
import { Table } from '../models/table.model';
import { SlaveDataService } from './slave-data.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class RealtimeTableDataService implements OnDestroy {
  private slaveDataService = inject(SlaveDataService);
  private supabaseService = inject(SupabaseService);
  private destroyRef = inject(DestroyRef);
  
  // Store subscriptions: tableId -> channel
  private subscriptions = new Map<string, RealtimeChannel>();
  
  // Store data signals: tableId -> signal
  private dataSignals = new Map<string, ReturnType<typeof signal<any[]>>>();
  
  // Store column mappings: tableId -> { internalName: displayName }
  private columnMappings = new Map<string, { [internalName: string]: string }>();
  
  // Store slave clients: organizationId -> client
  private slaveClients = new Map<string, SupabaseClient>();

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

      // Create slave client for realtime subscriptions
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
    const columnMapping: { [internalName: string]: string } = {};
    table.columns?.forEach(col => {
      const internalColName = col.internal_name || `c_${col.id}`;
      columnMapping[internalColName] = col.name;
    });
    this.columnMappings.set(tableId, columnMapping);

    // Create data signal
    const dataSignal = signal<any[]>([]);
    this.dataSignals.set(tableId, dataSignal);

    // Load initial data
    const initialData = await this.loadInitialData(organizationId, table, columnMapping);
    dataSignal.set(initialData);

    // Set up realtime subscription
    const schemaName = `org_${organizationId.replace(/-/g, '')}`;
    const internalTableName = table.internal_name || `t_${table.id}`;

    // Create channel for this table
    const channel = slaveClient
      .channel(`table_data:${tableId}`, {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: schemaName,
          table: internalTableName
        },
        (payload) => {
          console.log(`📥 [RealtimeTableData] INSERT event for ${table.name}:`, payload);
          this.handleInsert(tableId, payload.new, columnMapping);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: schemaName,
          table: internalTableName
        },
        (payload) => {
          console.log(`📥 [RealtimeTableData] UPDATE event for ${table.name}:`, payload);
          this.handleUpdate(tableId, payload.new, columnMapping);
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
          console.log(`📥 [RealtimeTableData] DELETE event for ${table.name}:`, payload);
          this.handleDelete(tableId, payload.old);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [RealtimeTableData] Subscribed to ${table.name}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [RealtimeTableData] Failed to subscribe to ${table.name}`);
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
   * Handle INSERT event - add new record to data
   */
  private handleInsert(
    tableId: string,
    newRecord: any,
    columnMapping: { [internalName: string]: string }
  ): void {
    const signal = this.dataSignals.get(tableId);
    if (!signal) return;

    // Map internal column names to display names
    const mappedRecord: any = {};
    Object.keys(newRecord).forEach(key => {
      const displayName = columnMapping[key] || key;
      mappedRecord[displayName] = newRecord[key];
    });

    // Add to data
    const currentData = signal();
    signal.set([...currentData, mappedRecord]);
  }

  /**
   * Handle UPDATE event - update existing record
   */
  private handleUpdate(
    tableId: string,
    updatedRecord: any,
    columnMapping: { [internalName: string]: string }
  ): void {
    const signal = this.dataSignals.get(tableId);
    if (!signal) return;

    // Map internal column names to display names
    const mappedRecord: any = {};
    Object.keys(updatedRecord).forEach(key => {
      const displayName = columnMapping[key] || key;
      mappedRecord[displayName] = updatedRecord[key];
    });

    // Find and update record (match by id or primary key)
    const currentData = signal();
    const updatedData = currentData.map((record: any) => {
      // Match by id field (could be 'id' or primary key column)
      if (record.id && mappedRecord.id && record.id === mappedRecord.id) {
        return { ...record, ...mappedRecord };
      }
      // Also check if there's a primary key match
      const primaryKey = Object.keys(mappedRecord).find(key => 
        record[key] !== undefined && record[key] === mappedRecord[key]
      );
      if (primaryKey) {
        return { ...record, ...mappedRecord };
      }
      return record;
    });

    signal.set(updatedData);
  }

  /**
   * Handle DELETE event - remove record from data
   */
  private handleDelete(tableId: string, deletedRecord: any): void {
    const signal = this.dataSignals.get(tableId);
    if (!signal) return;

    // Find and remove record (match by id or primary key)
    const currentData = signal();
    const filteredData = currentData.filter((record: any) => {
      // Match by id field
      if (record.id && deletedRecord.id && record.id === deletedRecord.id) {
        return false;
      }
      // Check if any key matches (for primary key matching)
      const matches = Object.keys(deletedRecord).some(key => 
        record[key] !== undefined && record[key] === deletedRecord[key]
      );
      return !matches;
    });

    signal.set(filteredData);
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

