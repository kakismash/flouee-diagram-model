import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
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

  constructor(
    private supabase: SupabaseService,
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

  // Project CRUD operations
  async loadProjects(): Promise<Project[]> {
    try {
      const { data, error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('projects')
          .select('*')
          .eq('organization_id', this.authService.getCurrentOrganizationId() || '550e8400-e29b-41d4-a716-446655440001')
          .order('updated_at', { ascending: false });
      });

      if (error) throw error;

      const projects = data?.map(this.mapProjectFromDB) || [];
      this.projects.set(projects);
      return projects;
    } catch (error) {
      console.error('Error loading projects:', error);
      throw error;
    }
  }

  async createProject(name: string, description?: string): Promise<Project> {
    try {
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

      const { data, error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('projects')
          .insert({
            name,
            description,
            organization_id: this.authService.getCurrentOrganizationId() || '550e8400-e29b-41d4-a716-446655440001',
            schema_data: schemaData,
            version: 1
          })
          .select()
          .single();
      });

      if (error) throw error;

      const project = this.mapProjectFromDB(data);
      this.projects.update(projects => [project, ...projects]);
      this.currentProject.set(project);
      
      // Show success notification
      this.notificationService.showSuccess('Project created successfully');
      
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
      const { data, error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('organization_id', this.authService.getCurrentOrganizationId() || '550e8400-e29b-41d4-a716-446655440001')
          .single();
      });

      if (error) throw error;

      const project = this.mapProjectFromDB(data);
      this.currentProject.set(project);
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

      // Update project
      const { error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('projects')
          .update({
            schema_data: schemaData,
            version: currentProject.version + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentProject.id);
      });

      if (error) throw error;

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
      const { data, error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('projects')
          .update({
            name: updates.name,
            description: updates.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId)
          .select()
          .single();
      });

      if (error) throw error;

      // Update in projects list
      this.projects.update(projects => 
        projects.map(p => p.id === projectId ? data : p)
      );

      // Update current project if it's the one being updated
      if (this.currentProject()?.id === projectId) {
        this.currentProject.set(data);
      }

      return data;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      const { error } = await this.supabase.executeRequest(async () => {
        return await this.supabase.client
          .from('projects')
          .delete()
          .eq('id', projectId);
      });

      if (error) throw error;

      this.projects.update(projects => projects.filter(p => p.id !== projectId));
      
      if (this.currentProject()?.id === projectId) {
        this.currentProject.set(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
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
      await this.supabase.client
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
      const { data, error } = await this.supabase.client
        .from('project_history')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading project history:', error);
      throw error;
    }
  }

  // Utility methods
  private mapProjectFromDB(data: any): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      organizationId: data.organization_id,
      schemaData: data.schema_data || { tables: [], relationships: [], metadata: { name: data.name, version: '1.0.0' } },
      version: data.version || 1,
      createdAt: data.created_at,
      updatedAt: data.updated_at
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
