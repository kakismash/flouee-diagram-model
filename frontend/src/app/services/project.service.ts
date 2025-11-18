import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DeploymentService } from './deployment.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { PlanLimitsService } from './plan-limits.service';
import { Table, Relationship, RelationshipDisplayColumn } from '../models/table.model';
import { TableView } from '../models/table-view.model';

export interface Project {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  schemaData: ProjectSchema;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSchema {
  tables: Table[];
  relationships: Relationship[];
  relationshipDisplayColumns: RelationshipDisplayColumn[];
  tableViews?: { [tableId: string]: TableView[] }; // Add table views to schema
  metadata: {
    name: string;
    description?: string;
    version: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private currentProject = signal<Project | null>(null);
  private projects = signal<Project[]>([]);
  private isSaving = signal<boolean>(false);
  private lastSaved = signal<Date | null>(null);

  private planLimitsService = inject(PlanLimitsService);

  constructor(
    private supabase: SupabaseService,
    private deploymentService: DeploymentService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  // Getters
  getCurrentProject() {
    return this.currentProject.asReadonly();
  }

  getCurrentProjectSync() {
    return this.currentProject();
  }

  getProjects() {
    return this.projects.asReadonly();
  }

  getIsSaving() {
    return this.isSaving.asReadonly();
  }

  getLastSaved() {
    return this.lastSaved.asReadonly();
  }

  /**
   * Helper: Get the appropriate client for data operations
   * Returns data client (Slave) if available, falls back to master
   */
  private getClientForDataOperations() {
    try {
      return this.deploymentService.getDataClient();
    } catch (error) {
      console.warn('Using master client as fallback');
      return this.supabase.client;
    }
  }

  /**
   * Helper: Get current organization ID
   */
  private getCurrentOrgId(): string {
    const org = this.deploymentService.getCurrentOrganization();
    return org?.id || this.authService.getCurrentOrganizationId() || '550e8400-e29b-41d4-a716-446655440001';
  }

  // Project CRUD operations
  async loadProjects(): Promise<Project[]> {
    try {
      // Projects are stored in Master database, not Slave
      const client = this.supabase.client;
      
      // Get current user's organization
      const orgId = this.getCurrentOrgId();
      
      console.log('📊 Loading projects for organization:', orgId);

      const { data, error } = await client
        .from('projects')
        .select('*')
        .eq('organization_id', orgId) // Filter by organization
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading projects:', error);
        throw error;
      }

      console.log('📊 Raw data received from Supabase:', {
        dataLength: data?.length || 0,
        data: data,
        orgId: orgId
      });

      const projects = data?.map((item: any) => {
        try {
          console.log('📊 Mapping project:', {
            id: item.id,
            name: item.name,
            organization_id: item.organization_id,
            has_schema_data: !!item.schema_data
          });
          const mapped = this.mapProjectFromDB(item);
          console.log('📊 Project mapped successfully:', { id: mapped.id, name: mapped.name });
          return mapped;
        } catch (error) {
          console.error('❌ Error mapping project:', error, item);
          throw error;
        }
      }) || [];
      
      console.log(`✅ Loaded ${projects.length} projects for organization ${orgId}:`, projects.map(p => ({ id: p.id, name: p.name })));
      
      this.projects.set(projects);
      
      return projects;
    } catch (error) {
      console.error('Error loading projects:', error);
      throw error;
    }
  }

  async createProject(name: string, description?: string): Promise<Project> {
    console.log('📊 createProject called with:', { name, description });
    try {
      // Check if user can create more projects - use planLimitsService which queries DB directly
      // This ensures we always have up-to-date counts (not cached data)
      const orgId = this.getCurrentOrgId();
      console.log('📊 Checking if user can create project (querying DB)...', orgId);
      const limitCheck = await this.planLimitsService.canCreateProject(orgId);
      
      if (!limitCheck.canCreate) {
        console.warn('⚠️ Project limit reached:', limitCheck.current, '/', limitCheck.max);
        throw new Error(`Project limit reached (${limitCheck.current}/${limitCheck.max}). Please upgrade your plan.`);
      }
      console.log('✅ User can create project:', limitCheck);

      const schemaData: ProjectSchema = {
        tables: [],
        relationships: [],
        relationshipDisplayColumns: [],
        metadata: {
          name,
          description,
          version: '1.0.0'
        }
      };

      // Projects are stored in Master database, not Slave
      const client = this.supabase.client;
      
      console.log('📊 Creating project in Master...', { name, description, orgId });

      const { data, error } = await client
        .from('projects')
        .insert({
          name,
          description,
          organization_id: orgId,
          schema_data: schemaData,
          version: 1,
          status: 'ready' // Temporary: until Edge Function accepts both 'ready' and 'active'
        })
        .select()
        .single();

      if (error) throw error;

      const project = this.mapProjectFromDB(data);
      this.projects.update(projects => [project, ...projects]);
      this.currentProject.set(project);
      
      // Note: Schema in Slave will be created automatically when the first table is added
      // via apply-schema-change-atomic Edge Function (which includes CREATE SCHEMA IF NOT EXISTS)
      // This maintains consistency: all Slave operations go through the Edge Function
      
      // Show success notification
      this.notificationService.showSuccess('Project created successfully');
      
      console.log(`✅ Project created: ${project.name}`);
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show error notification with more context
      const errorMessage = this.getErrorMessage(error, 'Failed to create project');
      this.notificationService.showError(errorMessage);
      
      // Re-throw error to see it in console
      throw error;
    }
  }

  async loadProject(projectId: string): Promise<Project> {
    try {
      // Projects are stored in Master database, not Slave
      const client = this.supabase.client;
      
      console.log('📊 Loading project:', projectId);

      const { data, error } = await client
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('❌ Error loading project:', error);
        throw error;
      }

      const project = this.mapProjectFromDB(data);
      this.currentProject.set(project);
      
      console.log('✅ Project loaded:', project.name);
      return project;
    } catch (error) {
      console.error('Error loading project:', error);
      throw error;
    }
  }

  async saveProject(schemaData: ProjectSchema): Promise<void> {
    const currentProject = this.currentProject();
    if (!currentProject) {
      throw new Error('No current project to save');
    }

    this.isSaving.set(true);

    try {
      // Create history entry before updating
      await this.createHistoryEntry(currentProject.id, currentProject.schemaData, currentProject.version);

      // Projects are stored in Master database, not Slave
      const client = this.supabase.client;
      
      const { error } = await client
        .from('projects')
        .update({
          schema_data: schemaData,
          version: currentProject.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentProject.id);

      if (error) {
        console.error('❌ Error saving project:', error);
        throw error;
      }

      // Update local state
      const updatedProject: Project = {
        ...currentProject,
        schemaData,
        version: currentProject.version + 1,
        updatedAt: new Date().toISOString()
      };

      this.currentProject.set(updatedProject);
      this.projects.update(projects => 
        projects.map(p => p.id === currentProject.id ? updatedProject : p)
      );
      this.lastSaved.set(new Date());

      // Show success notification
      this.notificationService.showSuccess();

    } catch (error) {
      console.error('Error saving project:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show error notification with more context
      const errorMessage = this.getErrorMessage(error, 'Failed to save project');
      this.notificationService.showError(errorMessage);
      
      // Re-throw error to see it in console
      throw error;
    } finally {
      this.isSaving.set(false);
    }
  }

  async updateProject(projectId: string, updates: { name?: string; description?: string }): Promise<Project> {
    try {
      // Projects are stored in Master database, not Slave
      const client = this.supabase.client;

      const { data, error } = await client
        .from('projects')
        .update({
          name: updates.name,
          description: updates.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating project:', error);
        throw error;
      }

      // Update in projects list
      this.projects.update(projects => 
        projects.map(p => p.id === projectId ? this.mapProjectFromDB(data) : p)
      );

      // Update current project if it's the one being updated
      if (this.currentProject()?.id === projectId) {
        this.currentProject.set(this.mapProjectFromDB(data));
      }

      return this.mapProjectFromDB(data);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      // Projects are stored in Master database, not Slave
      const client = this.supabase.client;

      console.log('🗑️ Attempting to delete project:', projectId);

      const { data, error, count } = await client
        .from('projects')
        .delete()
        .eq('id', projectId)
        .select();

      console.log('🗑️ Delete response:', { data, error, count });

      if (error) {
        console.error('❌ Delete error:', error);
        throw new Error(`Failed to delete project: ${error.message}`);
      }

      // Check if actually deleted
      if (!data || data.length === 0) {
        console.warn('⚠️ No rows were deleted. This might be an RLS permission issue.');
        throw new Error('Project could not be deleted. You may not have permission to delete this project.');
      }

      console.log('✅ Project deleted successfully:', data);

      this.projects.update(projects => projects.filter(p => p.id !== projectId));
      
      if (this.currentProject()?.id === projectId) {
        console.log('🗑️ Clearing current project');
        this.currentProject.set(null);
      }
      
      // Ensure isSaving is false after delete
      this.isSaving.set(false);
      console.log('✅ Project deleted and state cleared');
    } catch (error: any) {
      console.error('❌ Error deleting project:', error);
      throw error;
    }
  }

  // Auto-save functionality
  async autoSave(schemaData: ProjectSchema): Promise<void> {
    if (!this.currentProject()) return;

    try {
      await this.saveProject(schemaData);
    } catch (error) {
      console.error('Auto-save failed:', error);
      console.error('Auto-save error details:', JSON.stringify(error, null, 2));
      
      // Show error notification for auto-save failures with more context
      const errorMessage = this.getErrorMessage(error, 'Auto-save failed');
      this.notificationService.showError(errorMessage);
      
      // Don't throw error for auto-save failures, but log it
      console.warn('Auto-save error not thrown to prevent app crash');
    }
  }

  // History management
  private async createHistoryEntry(projectId: string, schemaData: ProjectSchema, version: number): Promise<void> {
    try {
      // Project history is stored in Master database, not Slave
      const client = this.supabase.client;
      
      await client
        .from('project_history')
        .insert({
          project_id: projectId,
          schema_data: schemaData,
          version,
          description: `Auto-save at ${new Date().toLocaleString()}`
        });
    } catch (error) {
      console.error('Error creating history entry:', error);
      // Don't throw error for history failures
    }
  }

  async getProjectHistory(projectId: string): Promise<any[]> {
    try {
      // Project history is stored in Master database, not Slave
      const client = this.supabase.client;
      
      const { data, error } = await client
        .from('project_history')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading project history:', error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('Error loading project history:', error);
      throw error;
    }
  }

  // Utility methods
  private mapProjectFromDB(data: any): Project {
    const rawSchemaData = data.schema_data || { tables: [], relationships: [], metadata: { name: data.name, version: '1.0.0' } };
    
    // ✅ Filter out junction tables from the schema data
    const filteredSchemaData = this.filterJunctionTables(rawSchemaData);
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      organizationId: data.organization_id,
      schemaData: filteredSchemaData,
      version: data.version || 1,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Filter out junction tables from schema data
   * Junction tables are identified by:
   * 1. Explicit isJunctionTable flag
   * 2. Tables that are referenced as junctionTableInternalName in many-to-many relationships
   * 3. Tables whose name matches a many-to-many relationship name
   * 4. Tables with pattern fromTable_toTable or toTable_fromTable
   * 5. Tables with exactly 2 columns that are both foreign keys
   */
  private filterJunctionTables(schemaData: any): any {
    if (!schemaData.tables || !schemaData.relationships) {
      return schemaData;
    }
    
    console.log('🔍 filterJunctionTables: Starting with', schemaData.tables.length, 'tables');

    // Get all junction table IDs/names from many-to-many relationships
    const junctionTableIds = new Set<string>();
    const junctionTableNames = new Set<string>();
    const junctionTableInternalNames = new Set<string>();

    // Get many-to-many relationships
    const manyToManyRels = schemaData.relationships.filter((rel: any) => rel.type === 'many-to-many');
    
    manyToManyRels.forEach((rel: any) => {
      if (rel.junctionTableId) junctionTableIds.add(rel.junctionTableId);
      if (rel.junctionTableName) junctionTableNames.add(rel.junctionTableName);
      if (rel.junctionTableInternalName) junctionTableInternalNames.add(rel.junctionTableInternalName);
      
      // ✅ Also check if relationship name matches a table name (common pattern)
      if (rel.name) {
        const matchingTable = schemaData.tables.find((t: any) => 
          t.name && t.name.toLowerCase() === rel.name.toLowerCase()
        );
        if (matchingTable) {
          junctionTableIds.add(matchingTable.id);
        }
      }
      
      // ✅ Check if table name pattern matches: fromTable_toTable or toTable_fromTable
      const fromTable = schemaData.tables.find((t: any) => t.id === rel.fromTableId);
      const toTable = schemaData.tables.find((t: any) => t.id === rel.toTableId);
      if (fromTable && toTable && fromTable.name && toTable.name) {
        const fromName = fromTable.name.toLowerCase();
        const toName = toTable.name.toLowerCase();
        const pattern1 = `${fromName}_${toName}`;
        const pattern2 = `${toName}_${fromName}`;
        
        schemaData.tables.forEach((t: any) => {
          if (t.name && (t.name.toLowerCase() === pattern1 || t.name.toLowerCase() === pattern2)) {
            junctionTableIds.add(t.id);
          }
        });
      }
    });

    // ✅ Also identify junction tables by structure: exactly 2 columns that are both foreign keys
    const potentialJunctionTables = new Set<string>();
    schemaData.tables.forEach((table: any) => {
      if (table.columns && table.columns.length === 2) {
        const fkColumns = table.columns.filter((col: any) => 
          col.isForeignKey === true || col.referencedTableId || col.referencedColumnId
        );
        // If both columns are foreign keys, it's likely a junction table
        if (fkColumns.length === 2) {
          potentialJunctionTables.add(table.id);
        }
      }
    });

    // Filter tables: exclude junction tables
    const filteredTables = schemaData.tables.filter((table: any) => {
      // Exclude if explicitly marked as junction table
      if (table.isJunctionTable === true) {
        return false;
      }

      // Exclude if ID matches a junction table ID
      if (junctionTableIds.has(table.id)) {
        return false;
      }
      
      // Exclude if identified as potential junction table by structure
      if (potentialJunctionTables.has(table.id)) {
        return false;
      }

      // Exclude if internal_name matches a junction table internal name
      if (table.internal_name && junctionTableInternalNames.has(table.internal_name)) {
        return false;
      }

      // Exclude if name matches a junction table name pattern
      if (table.name && Array.from(junctionTableNames).some(jtName => table.name === jtName)) {
        return false;
      }

      return true;
    });

    const filteredCount = schemaData.tables.length - filteredTables.length;
    console.log(`🔍 filterJunctionTables: Filtered ${filteredCount} junction tables`);
    if (filteredCount > 0) {
      const junctionTables = schemaData.tables.filter((t: any) => 
        !filteredTables.some((ft: any) => ft.id === t.id)
      );
      console.log('🔍 Junction tables identified:', junctionTables.map((t: any) => ({ id: t.id, name: t.name, isJunctionTable: t.isJunctionTable })));
    }
    
    return {
      ...schemaData,
      tables: filteredTables
    };
  }

  // Clear current project (for logout, etc.)
  clearCurrentProject(): void {
    this.currentProject.set(null);
  }

  // Helper method to generate descriptive error messages
  private getErrorMessage(error: any, defaultMessage: string): string {
    if (error?.message) {
      // Handle NavigatorLockAcquireTimeoutError
      if (error.message.includes('NavigatorLockAcquireTimeoutError') || 
          error.message.includes('lock:sb-')) {
        // Reset the Supabase client to clear stuck connections
        this.supabase.resetClient();
        return 'Connection timeout. Please try again.';
      }
      
      // Handle Supabase errors
      if (error.code) {
        switch (error.code) {
          case '42P17':
            return 'Database policy error. Please check your permissions.';
          case '23505':
            return 'Duplicate entry. This item already exists.';
          case '23503':
            return 'Reference error. Related data not found.';
          case '42501':
            return 'Permission denied. You don\'t have access to this resource.';
          case 'PGRST301':
            return 'Connection error. Please check your internet connection.';
          default:
            return `${defaultMessage}: ${error.message}`;
        }
      }
      
      // Handle network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return 'Network error. Please check your internet connection.';
      }
      
      // Handle timeout errors
      if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
        return 'Request timeout. Please try again.';
      }
      
      return `${defaultMessage}: ${error.message}`;
    }
    
    return defaultMessage;
  }
}
