import { Injectable, inject } from '@angular/core';
import { DeploymentService } from './deployment.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

/**
 * User Data Service
 * Manages CRUD operations on user data tables in the Slave
 * All operations are protected by RLS (organization isolation)
 */
@Injectable({
  providedIn: 'root'
})
export class UserDataService {
  private deployment = inject(DeploymentService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  /**
   * Get the data client (Slave) with proper JWT
   */
  private getDataClient() {
    const client = this.deployment.getDataClient();
    if (!client) {
      throw new Error('Data client not initialized');
    }
    return client;
  }

  /**
   * Get the schema name for current organization
   */
  private getSchemaName(): string {
    const org = this.deployment.getCurrentOrganization();
    if (!org) {
      throw new Error('No organization context');
    }
    
    return `org_${org.id.replace(/-/g, '')}`;
  }

  /**
   * Get full table name (schema.table)
   */
  private getFullTableName(tableName: string): string {
    return `${this.getSchemaName()}.${tableName}`;
  }

  /**
   * Check if current user can modify data
   * Only org_admin and admin can modify data
   */
  canModifyData(): boolean {
    return this.auth.isOrgAdminOrHigher();
  }

  /**
   * Check if current user can modify schema
   * Only org_admin and admin can modify schema
   */
  canModifySchema(): boolean {
    return this.auth.isOrgAdminOrHigher();
  }

  /**
   * SELECT - Get records from a table
   * RLS automatically filters by organization_id from JWT
   */
  async select(tableName: string, options?: {
    columns?: string;
    filters?: { column: string; value: any }[];
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }) {
    try {
      const client = this.getDataClient();
      const fullTable = this.getFullTableName(tableName);
      
      let query = client.from(fullTable).select(options?.columns || '*');
      
      // Apply filters
      if (options?.filters) {
        for (const filter of options.filters) {
          query = query.eq(filter.column, filter.value);
        }
      }
      
      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }
      
      // Apply limit
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
      
    } catch (error: any) {
      console.error(`Error selecting from ${tableName}:`, error);
      this.notification.showError(`Failed to load data: ${error.message}`);
      throw error;
    }
  }

  /**
   * INSERT - Add a new record
   * Requires: canModifyData() = true
   * RLS automatically validates organization_id
   */
  async insert(tableName: string, record: any) {
    if (!this.canModifyData()) {
      throw new Error('You don\'t have permission to modify data');
    }

    try {
      const client = this.getDataClient();
      const fullTable = this.getFullTableName(tableName);
      
      const { data, error } = await client
        .from(fullTable)
        .insert(record)
        .select()
        .single();
      
      if (error) throw error;
      
      this.notification.showSuccess('Record created successfully');
      return data;
      
    } catch (error: any) {
      console.error(`Error inserting into ${tableName}:`, error);
      this.notification.showError(`Failed to create record: ${error.message}`);
      throw error;
    }
  }

  /**
   * UPDATE - Modify an existing record
   * Requires: canModifyData() = true
   * RLS automatically validates organization_id
   */
  async update(tableName: string, id: string, updates: any) {
    if (!this.canModifyData()) {
      throw new Error('You don\'t have permission to modify data');
    }

    try {
      const client = this.getDataClient();
      const fullTable = this.getFullTableName(tableName);
      
      const { data, error } = await client
        .from(fullTable)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      this.notification.showSuccess('Record updated successfully');
      return data;
      
    } catch (error: any) {
      console.error(`Error updating ${tableName}:`, error);
      this.notification.showError(`Failed to update record: ${error.message}`);
      throw error;
    }
  }

  /**
   * DELETE - Remove a record
   * Requires: canModifyData() = true
   * RLS automatically validates organization_id
   */
  async delete(tableName: string, id: string) {
    if (!this.canModifyData()) {
      throw new Error('You don\'t have permission to delete data');
    }

    try {
      const client = this.getDataClient();
      const fullTable = this.getFullTableName(tableName);
      
      const { error } = await client
        .from(fullTable)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      this.notification.showSuccess('Record deleted successfully');
      return true;
      
    } catch (error: any) {
      console.error(`Error deleting from ${tableName}:`, error);
      this.notification.showError(`Failed to delete record: ${error.message}`);
      throw error;
    }
  }

  /**
   * BULK INSERT - Add multiple records at once
   */
  async insertMany(tableName: string, records: any[]) {
    if (!this.canModifyData()) {
      throw new Error('You don\'t have permission to modify data');
    }

    try {
      const client = this.getDataClient();
      const fullTable = this.getFullTableName(tableName);
      
      const { data, error } = await client
        .from(fullTable)
        .insert(records)
        .select();
      
      if (error) throw error;
      
      this.notification.showSuccess(`${records.length} records created successfully`);
      return data;
      
    } catch (error: any) {
      console.error(`Error bulk inserting into ${tableName}:`, error);
      this.notification.showError(`Failed to create records: ${error.message}`);
      throw error;
    }
  }

  /**
   * COUNT - Get count of records
   */
  async count(tableName: string, filters?: { column: string; value: any }[]) {
    try {
      const client = this.getDataClient();
      const fullTable = this.getFullTableName(tableName);
      
      let query = client.from(fullTable).select('*', { count: 'exact', head: true });
      
      if (filters) {
        for (const filter of filters) {
          query = query.eq(filter.column, filter.value);
        }
      }
      
      const { count, error } = await query;
      
      if (error) throw error;
      return count || 0;
      
    } catch (error: any) {
      console.error(`Error counting ${tableName}:`, error);
      return 0;
    }
  }
}












