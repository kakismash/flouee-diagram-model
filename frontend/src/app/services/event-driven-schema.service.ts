import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';

export interface EventDrivenResult {
  success: boolean;
  error?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventDrivenSchemaService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  /**
   * Apply a specific schema change directly to the Edge Function
   */
  async applySchemaChange(
    projectId: string,
    change: any,
    newSchemaData: any,
    currentVersion: number
  ): Promise<EventDrivenResult> {
    try {
      const user = this.auth.user();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get organization_id
      const { data: project } = await this.supabase.client
        .from('projects')
        .select('organization_id')
        .eq('id', projectId)
        .single();

      if (!project) {
        throw new Error('Project not found');
      }

      // Call the Edge Function with bounded retries for 409 conflicts
      const invokeWithRetry = async (maxAttempts = 3): Promise<{ data: any; error: any } > => {
        let attempt = 0;
        let lastError: any = null;
        let lastData: any = null;
        
        while (attempt < maxAttempts) {
          const { data, error } = await this.supabase.client.functions.invoke('apply-schema-change-atomic', {
            body: {
              organization_id: project.organization_id,
              project_id: projectId,
              change: change,
              new_schema_data: newSchemaData,
              current_version: currentVersion,
              user_id: user.id
            }
          });
          
          // Check if successful (no error AND data.success === true)
          if (!error && data && data.success) {
            return { data, error: null };
          }
          
          // Track errors
          if (error) {
            lastError = error;
          }
          if (data) {
            lastData = data;
          }
          
          // Check status code from error or data
          const status = (error as any)?.status || 
                         (error as any)?.context?.response?.status ||
                         (lastData?.status_code);
          
          // Retry on conflict/locked (409) or if data.success is false and it's a version conflict
          const isConflict = status === 409 || status === 423 || 
                            (lastData && !lastData.success && lastData.error && 
                             (lastData.error.includes('Version conflict') || 
                              lastData.error.includes('update failed')));
          
          if (isConflict && attempt < maxAttempts - 1) {
            console.log(`⚠️ Conflict detected (attempt ${attempt + 1}/${maxAttempts}), retrying immediately...`);
            // No delay needed - if conflict is real, immediate retry will handle it
            // If conflict is transient (optimistic locking), immediate retry may succeed
            attempt++;
            continue;
          }
          
          break;
        }
        
        // Return the last error or data
        if (lastData) {
          return { data: lastData, error: null };
        }
        return { data: null, error: lastError };
      };

      const { data, error } = await invokeWithRetry(3);

      if (error) {
        throw new Error(error.message || 'Unknown error occurred');
      }

      if (!data || !data.success) {
        // Check if it's a version conflict
        const errorMessage = data?.error || 'Failed to apply schema change';
        if (errorMessage.includes('Version conflict') || errorMessage.includes('modified by another user')) {
          throw new Error(`VERSION_CONFLICT: ${errorMessage}`);
        }
        throw new Error(errorMessage);
      }

      return {
        success: true,
        message: 'Schema change applied successfully'
      };

    } catch (error: any) {
      console.error('Failed to apply schema change:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update project schema - synchronously applies changes to Master and Slave
   * @deprecated Use applySchemaChange directly for more control
   */
  async updateProjectSchema(
    projectId: string, 
    newSchemaData: any, 
    version: number
  ): Promise<EventDrivenResult> {
    // This method is kept for backwards compatibility but should be replaced
    // with direct calls to applySchemaChange for specific changes
    console.warn('updateProjectSchema is deprecated - use applySchemaChange for specific changes');
    return {
      success: false,
      error: 'updateProjectSchema is deprecated. Use applySchemaChange with a specific change instead.'
    };
  }

  /**
   * Delete project - deletes from Master (Slave cleanup handled separately if needed)
   */
  async deleteProject(projectId: string): Promise<EventDrivenResult> {
    try {
      const user = this.auth.user();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Delete project from Master
      const { error } = await this.supabase.client
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        message: 'Project deleted successfully from Master.'
      };

    } catch (error: any) {
      console.error('Failed to delete project:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create table - synchronously applies to Master and Slave
   */
  async createTable(
    projectId: string,
    tableData: any,
    newSchemaData: any,
    version: number
  ): Promise<EventDrivenResult> {
    return await this.applySchemaChange(
      projectId,
      {
        type: 'add_table',
        table: tableData
      },
      newSchemaData,
      version
    );
  }

  /**
   * Delete table - synchronously applies to Master and Slave
   */
  async deleteTable(
    projectId: string,
    tableId: string,
    newSchemaData: any,
    version: number
  ): Promise<EventDrivenResult> {
    // Find the table to get its internal_name
    const table = newSchemaData.tables?.find((t: any) => t.id === tableId);
    const tableName = table?.internal_name || `t_${tableId}`;

    return await this.applySchemaChange(
      projectId,
      {
        type: 'drop_table',
        table_name: tableName
      },
      newSchemaData,
      version
    );
  }

  /**
   * Update relationship (add foreign key) - synchronously applies to Master and Slave
   */
  async updateRelationship(
    projectId: string,
    relationshipData: any,
    newSchemaData: any,
    version: number
  ): Promise<EventDrivenResult> {
    return await this.applySchemaChange(
      projectId,
      {
        type: 'add_foreign_key',
        foreign_key: relationshipData
      },
      newSchemaData,
      version
    );
  }

  /**
   * Delete relationship (drop foreign key) - synchronously applies to Master and Slave
   */
  async deleteRelationship(
    projectId: string,
    relationshipId: string,
    newSchemaData: any,
    version: number
  ): Promise<EventDrivenResult> {
    // Find the relationship to get foreign key details
    const relationship = newSchemaData.relationships?.find((r: any) => r.id === relationshipId);
    if (!relationship) {
      return {
        success: false,
        error: 'Relationship not found'
      };
    }

    // ✅ Get table and column info from schema
    const toTable = newSchemaData.tables?.find((t: any) => t.id === relationship.toTableId);
    const fromTable = newSchemaData.tables?.find((t: any) => t.id === relationship.fromTableId);
    
    if (!toTable || !fromTable) {
      return {
        success: false,
        error: 'Tables not found for relationship'
      };
    }

    const toColumn = toTable.columns?.find((c: any) => c.id === relationship.toColumnId);
    const fromColumn = fromTable.columns?.find((c: any) => c.id === relationship.fromColumnId);

    if (!toColumn) {
      return {
        success: false,
        error: 'Foreign key column not found'
      };
    }

    // ✅ Construct proper foreign_key object with table_name and constraint_name
    // Use internal_name if available, otherwise generate it
    const tableName = toTable.internal_name || `t_${toTable.id}`;
    const constraintName = relationship.name 
      ? `fk_${relationship.name.replace(/\s+/g, '_')}` 
      : `fk_${tableName}_${toColumn.internal_name || `c_${toColumn.id}`}_${fromTable.internal_name || `t_${fromTable.id}`}`;

    console.log('🔍 deleteRelationship - Constructed foreign_key:', {
      table_name: tableName,
      constraint_name: constraintName,
      relationship_name: relationship.name,
      relationship_type: relationship.type
    });

    return await this.applySchemaChange(
      projectId,
      {
        type: 'drop_foreign_key',
        foreign_key: {
          table_name: tableName,
          table_internal_name: toTable.internal_name,
          column_name: toColumn.internal_name || `c_${toColumn.id}`,
          column_internal_name: toColumn.internal_name,
          referenced_table: fromTable.internal_name || `t_${fromTable.id}`,
          referenced_table_internal_name: fromTable.internal_name,
          referenced_column: fromColumn?.internal_name || (fromColumn?.id ? `c_${fromColumn.id}` : ''),
          referenced_column_internal_name: fromColumn?.internal_name,
          constraint_name: constraintName
        }
      },
      newSchemaData,
      version
    );
  }

  /**
   * Get schema changes history from schema_changes table (for audit purposes)
   */
  async getSchemaChangesHistory(projectId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data: changes, error } = await this.supabase.client
        .from('schema_changes')
        .select('*')
        .eq('project_id', projectId)
        .order('applied_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      return changes || [];
    } catch (error: any) {
      console.error('Failed to get schema changes history:', error);
      return [];
    }
  }
}
