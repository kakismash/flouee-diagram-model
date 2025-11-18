import { Component, OnInit, signal, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Table, Relationship, RelationshipDisplayColumn, ProjectSchema } from '../../models/table.model';
import { TableView } from '../../models/table-view.model';
import { TableViewService } from '../../services/table-view.service';
import { SchemaTranslationService, ValidationResult } from '../../services/schema-translation.service';
import { DataSimulationService } from '../../services/data-simulation.service';
import { SlaveDataService } from '../../services/slave-data.service';
import { ProjectService } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';
import { ToolbarDataService } from '../../services/toolbar-data.service';
import { TableViewComponent } from '../table-view/table-view.component';
import { DataChangeEvent } from '../../services/table-data.service';
import { BadgeComponent } from '../design-system/badge/badge.component';
import { EmptyStateComponent } from '../design-system/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../design-system/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-view-mode',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    TableViewComponent,
    BadgeComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent
  ],
  template: `
    <div class="view-mode-container">
      <!-- Content -->
      <div class="view-mode-content">
        @if (isLoading()) {
          <ds-loading-spinner
            size="large"
            message="Loading schema data..."
            [center]="true">
          </ds-loading-spinner>
        }

        @if (!isLoading() && tables().length === 0) {
        <ds-empty-state
          icon="table_chart"
          title="No Tables Found"
          description="This project doesn't have any tables defined yet. Create your first table in the editor."
          actionLabel="Go to Editor"
          (actionClicked)="goBack()">
        </ds-empty-state>
        }

        @if (!isLoading() && tables().length > 0) {
        <div class="tables-container">
          <mat-tab-group class="tables-tabs" animationDuration="300ms">
            @for (table of tables(); track table.id) {
            <mat-tab [label]="table.name">
              <ng-template mat-tab-label>
                <div class="tab-label">
                  <mat-icon>table_chart</mat-icon>
                  <span>{{ table.name }}</span>
                  <ds-badge variant="info" size="small">-</ds-badge>
                </div>
              </ng-template>
              
              <div class="tab-content">
                <app-table-view 
                  [table]="table"
                  [relationships]="getTableRelationships(table.id)"
                  [relationshipDisplayColumns]="getRelationshipDisplayColumns(table.id)"
                  [allTables]="tables()"
                  [allTableData]="{}"
                  [views]="getTableViews(table.id)"
                  [activeView]="getActiveView(table.id)"
                  (dataChanged)="onDataChanged($event)"
                  (viewSelected)="onViewSelected($event)"
                  (viewCreated)="onViewCreated($event)"
                  (viewUpdated)="onViewUpdated($event)"
                  (viewDeleted)="onViewDeleted($event)"
                  (relationshipDisplayColumnsUpdated)="onRelationshipDisplayColumnsUpdated($event)">
                </app-table-view>
              </div>
            </mat-tab>
            }
          </mat-tab-group>
        </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .view-mode-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      max-height: calc(100vh - 64px);
      background: var(--theme-background);
      color: var(--theme-text-primary);
      overflow: hidden;
    }

    /* Content Area */
    .view-mode-content {
      flex: 1;
      min-height: 0;
      max-height: 100%;
      display: flex;
      position: relative;
      overflow: hidden;
    }

    .tables-container {
      flex: 1;
      min-height: 0;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      width: 100%;
      overflow: hidden;
    }

    .tables-tabs {
      flex: 1;
      min-height: 0;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .tab-label {
      display: flex;
      align-items: center;
      gap: var(--ds-spacing-xs, 4px);
      color: var(--theme-text-primary);
      font-weight: 500;
    }

    .tab-label mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--theme-primary);
    }

    .tab-label span {
      color: var(--theme-text-primary);
    }

    .tab-content {
      padding: 0; /* Remove padding - table has its own margin */
      height: 100%;
      max-height: 100%;
      min-width: 0; /* Allow flexbox shrinking */
      overflow: hidden; /* Let table handle its own scrolling */
      display: block;
      background: var(--theme-background);
      box-sizing: border-box;
    }

    /* Ensure mat-tab-group takes full height */
    ::ng-deep .tables-tabs .mat-mdc-tab-group {
      height: 100% !important;
      max-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }

    ::ng-deep .tables-tabs .mat-mdc-tab-body-wrapper {
      flex: 1 !important;
      min-height: 0 !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }

    ::ng-deep .tables-tabs .mat-mdc-tab-body {
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
    }

    ::ng-deep .tables-tabs .mat-mdc-tab-body-content {
      height: 100% !important;
      max-height: 100% !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
  `]
})
export class ViewModeComponent implements OnInit {
  // Signals
  projectName = signal<string>('');
  tables = signal<Table[]>([]);
  relationships = signal<Relationship[]>([]);
  relationshipDisplayColumns = signal<RelationshipDisplayColumn[]>([]);
  validationResult = signal<ValidationResult | null>(null);
  isLoading = signal<boolean>(true);
  tableViews = signal<{ [tableId: string]: TableView[] }>({});
  activeViews = signal<{ [tableId: string]: string }>({});

  private destroyRef = inject(DestroyRef);
  private handleViewModeActionBound: EventListener;

  constructor(
    private projectService: ProjectService,
    private schemaTranslationService: SchemaTranslationService,
    private dataSimulationService: DataSimulationService,
    private slaveDataService: SlaveDataService,
    private tableViewService: TableViewService,
    private notificationService: NotificationService,
    private toolbarDataService: ToolbarDataService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Bind event handler once
    this.handleViewModeActionBound = this.handleViewModeAction.bind(this) as EventListener;
  }

  ngOnInit() {
    this.loadProjectData();
    
    // Listen for view mode actions from the shared toolbar
    // Use DestroyRef for automatic cleanup
    window.addEventListener('view-mode-action', this.handleViewModeActionBound);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('view-mode-action', this.handleViewModeActionBound);
    });
    
    // Update shared toolbar with current data
    this.updateSharedToolbar();
  }

  private async loadProjectData() {
    try {
      this.isLoading.set(true);
      
      // Get project ID from route
      const projectId = this.route.snapshot.paramMap.get('projectId');
      if (!projectId) {
        this.notificationService.showError('No project ID provided');
        this.router.navigate(['/dashboard']);
        return;
      }
      
      // Load the project
      await this.projectService.loadProject(projectId);
      const project = this.projectService.getCurrentProjectSync();
      if (!project) {
        this.notificationService.showError('Project not found');
        this.router.navigate(['/dashboard']);
        return;
      }

      this.projectName.set(project.name);
      
      // Debug: Verify tables and columns structure
      const tables = project.schemaData.tables || [];
      console.log('🔍 [ViewMode] Loaded project tables:', {
        tableCount: tables.length,
        tables: tables.map(t => ({
          id: t.id,
          name: t.name,
          columnCount: t.columns?.length || 0,
          columns: t.columns?.map(c => ({ id: c.id, name: c.name, type: c.type })) || []
        }))
      });
      
      this.tables.set(tables);
      this.relationships.set(project.schemaData.relationships || []);
      this.relationshipDisplayColumns.set(project.schemaData.relationshipDisplayColumns || []);
      
      // Initialize views
      await this.initializeViews(project.schemaData.tables || [], (project.schemaData as any).tableViews || {});

      // Validate schema
      const validation = this.schemaTranslationService.validateSchema(project.schemaData);
      this.validationResult.set(validation);

      if (!validation.isValid) {
        this.notificationService.showWarning(`Schema has ${validation.errors.length} errors`);
      }

      // Data will be loaded by each table-view component via realtime subscriptions
      // No need to load all data upfront

      this.isLoading.set(false);
    } catch (error) {
      console.error('Error loading project data:', error);
      this.notificationService.showError('Failed to load project data');
      this.isLoading.set(false);
    }
  }

  // Data is now managed by each table-view component via realtime subscriptions
  // No need for getTableData() or refreshTableData() methods

  getTableRelationships(tableId: string): Relationship[] {
    return this.relationships().filter(rel => 
      rel.fromTableId === tableId || rel.toTableId === tableId
    );
  }

  getRelationshipDisplayColumns(tableId: string): RelationshipDisplayColumn[] {
    return this.relationshipDisplayColumns().filter(col => 
      col.tableId === tableId && col.isVisible
    );
  }

  getTotalRecords(): number {
    // Records are now managed by individual table-view components
    // Return 0 as placeholder - can be enhanced later if needed
    return 0;
  }

  onDataChanged(event: DataChangeEvent) {
    switch (event.type) {
      case 'CREATE':
        this.handleCreateRecord(event);
        break;
      case 'UPDATE':
        this.handleUpdateRecord(event);
        break;
      case 'DELETE':
        this.handleDeleteRecord(event);
        break;
      case 'SCHEMA_UPDATE':
        this.handleSchemaUpdate(event);
        break;
    }
  }

  private async handleCreateRecord(event: DataChangeEvent) {
    // Realtime subscription will handle adding the record automatically
    // We just need to insert it into the database
    try {
      const project = this.projectService.getCurrentProjectSync();
      if (!project) return;

      const table = this.tables().find(t => t.name === event.table);
      if (!table) {
        this.notificationService.showError(`Table ${event.table} not found`);
        return;
      }

      // Insert into Slave database - realtime will update the table automatically
      const result = await this.slaveDataService.insertRecord(
        project.organizationId,
        table,
        event.data
      );

      if (result.success) {
        const recordId = result.data?.id || 'new record';
        this.notificationService.showSuccess(`✓ Record added successfully to ${event.table}`);
      } else {
        this.notificationService.showError(`Failed to add record: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error creating record:', error);
      this.notificationService.showError(`Error creating record: ${error.message}`);
    }
  }

  private async handleUpdateRecord(event: DataChangeEvent) {
    // Realtime subscription will handle updating the record automatically
    try {
      const project = this.projectService.getCurrentProjectSync();
      if (!project) return;

      const table = this.tables().find(t => t.name === event.table);
      if (!table || !event.id) {
        this.notificationService.showError(`Table or record ID not found`);
        return;
      }

      // Update in Slave database - realtime will update the table automatically
      const result = await this.slaveDataService.updateRecord(
        project.organizationId,
        table,
        event.id,
        event.data
      );

      if (result.success) {
        this.notificationService.showSuccess(`Record updated in ${event.table}`);
      } else {
        this.notificationService.showError(`Failed to update record: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error updating record:', error);
      this.notificationService.showError(`Error updating record: ${error.message}`);
    }
  }

  private async handleDeleteRecord(event: DataChangeEvent) {
    // Realtime subscription will handle removing the record automatically
    try {
      const project = this.projectService.getCurrentProjectSync();
      if (!project) return;

      const table = this.tables().find(t => t.name === event.table);
      if (!table || !event.id) {
        this.notificationService.showError(`Table or record ID not found`);
        return;
      }

      // Delete from Slave database - realtime will update the table automatically
      const result = await this.slaveDataService.deleteRecord(
        project.organizationId,
        table,
        event.id
      );

      if (result.success) {
        this.notificationService.showSuccess(`Record deleted from ${event.table}`);
      } else {
        this.notificationService.showError(`Failed to delete record: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error deleting record:', error);
      this.notificationService.showError(`Error deleting record: ${error.message}`);
    }
  }

  private handleSchemaUpdate(event: DataChangeEvent) {
    this.notificationService.showInfo('Schema updates will be implemented in the next version');
  }

  goBack() {
    // Navigate back to editor mode
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if (projectId) {
      this.router.navigate(['/editor', projectId]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  private handleViewModeAction(event: Event) {
    const customEvent = event as CustomEvent;
    const action = customEvent.detail?.action;
    switch (action) {
      case 'export':
        this.exportSchema();
        break;
    }
  }

  private updateSharedToolbar() {
    // Update the shared toolbar with current data
    this.toolbarDataService.updateData({
      tableCount: this.tables().length,
      relationshipCount: this.relationships().length,
      totalRecords: this.getTotalRecords(),
      isValid: this.validationResult()?.isValid ?? true,
      errors: this.validationResult()?.errors.length ?? 0,
      warnings: this.validationResult()?.warnings.length ?? 0
    });
  }

  // View management methods
  private async initializeViews(tables: Table[], existingViews?: { [tableId: string]: TableView[] }) {
    const views: { [tableId: string]: TableView[] } = {};
    const activeViews: { [tableId: string]: string } = {};

    tables.forEach(table => {
      if (existingViews && existingViews[table.id] && existingViews[table.id].length > 0) {
        // Use existing views
        views[table.id] = existingViews[table.id];
        // Set first view as active
        activeViews[table.id] = views[table.id][0].id;
           } else {
             // Always create a default view if none exists
             const defaultView = this.tableViewService.createDefaultView(
               table, 
               this.relationships(), 
               this.relationshipDisplayColumns()
             );
             views[table.id] = [defaultView];
             activeViews[table.id] = defaultView.id;
           }
    });

    this.tableViews.set(views);
    this.activeViews.set(activeViews);
    
    // Save views to project if any default views were created
    await this.saveViewsToProject();
  }

  getTableViews(tableId: string): TableView[] {
    return this.tableViews()[tableId] || [];
  }

  getActiveView(tableId: string): TableView | null {
    const activeViewId = this.activeViews()[tableId];
    if (!activeViewId) return null;
    
    const views = this.getTableViews(tableId);
    return views.find(view => view.id === activeViewId) || null;
  }

  onViewSelected(view: TableView) {
    const currentViews = this.activeViews();
    this.activeViews.set({
      ...currentViews,
      [view.tableId]: view.id
    });
  }

  async onViewCreated(view: TableView) {
    const currentViews = this.tableViews();
    const tableViews = currentViews[view.tableId] || [];
    
    this.tableViews.set({
      ...currentViews,
      [view.tableId]: [...tableViews, view]
    });

    // Set as active view
    this.onViewSelected(view);
    
    // Save to project
    await this.saveViewsToProject();
  }

  async onViewUpdated(view: TableView) {
    const currentViews = this.tableViews();
    const tableViews = currentViews[view.tableId] || [];
    
    const updatedViews = tableViews.map(v => v.id === view.id ? view : v);
    
    this.tableViews.set({
      ...currentViews,
      [view.tableId]: updatedViews
    });

    // Save to project
    await this.saveViewsToProject();
  }

  async onViewDeleted(viewId: string) {
    // Find the view to get tableId
    let tableId: string | null = null;
    const currentViews = this.tableViews();
    
    for (const [tid, views] of Object.entries(currentViews)) {
      if (views.find(v => v.id === viewId)) {
        tableId = tid;
        break;
      }
    }

    if (!tableId) return;

    const tableViews = currentViews[tableId] || [];
    const updatedViews = tableViews.filter(v => v.id !== viewId);
    
    this.tableViews.set({
      ...currentViews,
      [tableId]: updatedViews
    });

    // Update active view if necessary
    const activeViewId = this.activeViews()[tableId];
    if (activeViewId === viewId && updatedViews.length > 0) {
      this.activeViews.set({
        ...this.activeViews(),
        [tableId]: updatedViews[0].id
      });
    }

    // Save to project
    await this.saveViewsToProject();
  }

  private async saveViewsToProject() {
    try {
      const project = this.projectService.getCurrentProjectSync();
      if (!project) {
        console.warn('No current project to save views to');
        return;
      }

      // Update project schema with table views
      const updatedSchema = {
        ...project.schemaData,
        tableViews: this.tableViews()
      };

      // Save to project
      await this.projectService.saveProject(updatedSchema);
      console.log('Views saved to project successfully');
    } catch (error) {
      console.error('Error saving views to project:', error);
      this.notificationService.showError('Failed to save views to project');
    }
  }

  // TrackBy function to ensure proper table rendering order
  trackByTableId(index: number, table: Table): string {
    return table.id;
  }

  exportSchema() {
    const project = this.projectService.getCurrentProjectSync();
    if (!project) return;

    const sql = this.schemaTranslationService.translateToSQL(project.schemaData);
    const ts = this.schemaTranslationService.translateToTypeScript(project.schemaData);

    // Create download links
    this.downloadFile(sql, `${project.name}_schema.sql`, 'text/sql');
    this.downloadFile(ts, `${project.name}_types.ts`, 'text/typescript');
    
    this.notificationService.showSuccess('Schema exported successfully');
  }

  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async onRelationshipDisplayColumnsUpdated(updatedColumns: RelationshipDisplayColumn[]) {
    console.log('🎨 Relationship Display Columns Updated:', updatedColumns);
    
    // Update the relationship display columns in the project data
    this.relationshipDisplayColumns.set(updatedColumns);
    
    // Save the updated project data
    await this.saveRelationshipDisplayColumnsToProject(updatedColumns);
  }

  private async saveRelationshipDisplayColumnsToProject(updatedColumns: RelationshipDisplayColumn[]) {
    try {
      const project = this.projectService.getCurrentProjectSync();
      if (!project) {
        console.warn('No current project to save relationship display columns to');
        return;
      }

      // Update project schema with relationship display columns
      const updatedSchema = {
        ...project.schemaData,
        relationshipDisplayColumns: updatedColumns
      };

      // Save to project
      await this.projectService.saveProject(updatedSchema);
      console.log('Relationship display columns saved to project successfully');
    } catch (error) {
      console.error('Failed to save relationship display columns to project:', error);
      this.notificationService.showError('Failed to save column colors');
    }
  }
}
