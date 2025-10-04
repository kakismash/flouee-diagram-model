import { Component, OnInit, OnDestroy, signal } from '@angular/core';
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
import { DataSimulationService, TableData } from '../../services/data-simulation.service';
import { ProjectService } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';
import { TableViewComponent, DataChangeEvent } from '../table-view/table-view.component';

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
    TableViewComponent
  ],
  template: `
    <div class="view-mode-container">
      <!-- Header -->
      <mat-toolbar class="view-mode-header">
        <div class="header-content">
          <div class="header-left">
            <button mat-icon-button (click)="goBack()" matTooltip="Back to Editor">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <h2>{{ projectName() }}</h2>
          </div>
          <div class="header-right">
            <mat-chip-set>
              <mat-chip>{{ tables().length }} Tables</mat-chip>
              <mat-chip>{{ relationships().length }} Relationships</mat-chip>
              <mat-chip [color]="validationResult()?.isValid ? 'primary' : 'warn'">
                {{ validationResult()?.isValid ? 'Valid' : 'Invalid' }}
              </mat-chip>
            </mat-chip-set>
            <button mat-raised-button color="primary" (click)="exportSchema()">
              <mat-icon>download</mat-icon>
              Export
            </button>
          </div>
        </div>
      </mat-toolbar>

      <!-- Content -->
      <div class="view-mode-content">
        <div *ngIf="isLoading()" class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Loading schema data...</p>
        </div>

        <div *ngIf="!isLoading() && tables().length === 0" class="empty-state">
          <mat-icon>table_chart</mat-icon>
          <h3>No Tables Found</h3>
          <p>This project doesn't have any tables defined yet.</p>
          <button mat-raised-button color="primary" (click)="goBack()">
            <mat-icon>edit</mat-icon>
            Go to Editor
          </button>
        </div>

        <div *ngIf="!isLoading() && tables().length > 0" class="tables-container">
          <mat-tab-group class="tables-tabs" animationDuration="300ms">
            <mat-tab *ngFor="let table of tables()" [label]="table.name">
              <ng-template mat-tab-label>
                <div class="tab-label">
                  <mat-icon>table_chart</mat-icon>
                  <span>{{ table.name }}</span>
                  <mat-chip class="tab-chip">{{ getTableData(table.id).length }} records</mat-chip>
                </div>
              </ng-template>
              
              <div class="tab-content">
                <app-table-view 
                  [table]="table"
                  [data]="getTableData(table.id)"
                  [relationships]="getTableRelationships(table.id)"
                  [relationshipDisplayColumns]="getRelationshipDisplayColumns(table.id)"
                  [allTables]="tables()"
                  [allTableData]="tableData()"
                  [views]="getTableViews(table.id)"
                  [activeView]="getActiveView(table.id)"
                  (dataChanged)="onDataChanged($event)"
                  (viewSelected)="onViewSelected($event)"
                  (viewCreated)="onViewCreated($event)"
                  (viewUpdated)="onViewUpdated($event)"
                  (viewDeleted)="onViewDeleted($event)">
                </app-table-view>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>
      </div>

      <!-- Schema Info Panel -->
      <div class="schema-info-panel" *ngIf="!isLoading() && tables().length > 0">
        <mat-card class="schema-card">
          <mat-card-header>
            <mat-card-title>Schema Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="schema-stats">
              <div class="stat-item">
                <mat-icon>table_chart</mat-icon>
                <div>
                  <span class="stat-number">{{ tables().length }}</span>
                  <span class="stat-label">Tables</span>
                </div>
              </div>
              <div class="stat-item">
                <mat-icon>link</mat-icon>
                <div>
                  <span class="stat-number">{{ relationships().length }}</span>
                  <span class="stat-label">Relationships</span>
                </div>
              </div>
              <div class="stat-item">
                <mat-icon>data_object</mat-icon>
                <div>
                  <span class="stat-number">{{ getTotalRecords() }}</span>
                  <span class="stat-label">Total Records</span>
                </div>
              </div>
            </div>
            
            <div class="validation-info" *ngIf="validationResult()">
              <h4>Validation Status</h4>
              <div class="validation-errors" *ngIf="validationResult()!.errors.length > 0">
                <h5>Errors:</h5>
                <ul>
                  <li *ngFor="let error of validationResult()!.errors">{{ error }}</li>
                </ul>
              </div>
              <div class="validation-warnings" *ngIf="validationResult()!.warnings.length > 0">
                <h5>Warnings:</h5>
                <ul>
                  <li *ngFor="let warning of validationResult()!.warnings">{{ warning }}</li>
                </ul>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .view-mode-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--theme-background);
      color: var(--theme-text-primary);
    }

    .view-mode-header {
      background: var(--theme-background-paper);
      box-shadow: 0 2px 4px var(--theme-card-shadow);
      z-index: 1000;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-left h2 {
      margin: 0;
      color: var(--theme-text-primary);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .view-mode-content {
      flex: 1;
      display: flex;
      position: relative;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
    }

    .loading-container p {
      color: var(--theme-text-secondary);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
      text-align: center;
    }

    .empty-state h3 {
      color: var(--theme-text-primary);
    }

    .empty-state p {
      color: var(--theme-text-secondary);
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--theme-text-disabled);
    }

    .tables-container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .tables-tabs {
      flex: 1;
    }

    .tab-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--theme-text-primary);
    }

    .tab-label span {
      color: var(--theme-text-primary);
    }

    .tab-chip {
      font-size: 10px;
      height: 20px;
      background-color: var(--theme-surface-variant);
      color: var(--theme-text-secondary);
    }

    .tab-content {
      padding: 24px;
      height: 100%;
      overflow-y: auto;
      background: var(--theme-background);
    }

    .schema-info-panel {
      width: 300px;
      background: var(--theme-background-paper);
      border-left: 1px solid var(--theme-border);
      overflow-y: auto;
    }

    .schema-card {
      margin: 16px;
      background: var(--theme-card-background);
      border: 1px solid var(--theme-card-border);
    }

    .schema-stats {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-item mat-icon {
      color: var(--theme-primary);
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: var(--theme-text-primary);
    }

    .stat-label {
      font-size: 14px;
      color: var(--theme-text-secondary);
    }

    .validation-info h4 {
      margin: 0 0 12px 0;
      color: var(--theme-text-primary);
    }

    .validation-info h5 {
      margin: 8px 0 4px 0;
      color: var(--theme-text-secondary);
      font-size: 14px;
    }

    .validation-errors ul,
    .validation-warnings ul {
      margin: 0;
      padding-left: 16px;
    }

    .validation-errors li {
      color: var(--theme-error);
      font-size: 12px;
    }

    .validation-warnings li {
      color: var(--theme-warning);
      font-size: 12px;
    }
  `]
})
export class ViewModeComponent implements OnInit, OnDestroy {
  // Signals
  projectName = signal<string>('');
  tables = signal<Table[]>([]);
  relationships = signal<Relationship[]>([]);
  relationshipDisplayColumns = signal<RelationshipDisplayColumn[]>([]);
  tableData = signal<TableData>({});
  validationResult = signal<ValidationResult | null>(null);
  isLoading = signal<boolean>(true);
  tableViews = signal<{ [tableId: string]: TableView[] }>({});
  activeViews = signal<{ [tableId: string]: string }>({});

  constructor(
    private projectService: ProjectService,
    private schemaTranslationService: SchemaTranslationService,
    private dataSimulationService: DataSimulationService,
    private tableViewService: TableViewService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProjectData();
  }

  ngOnDestroy() {
    // Cleanup if needed
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
      this.tables.set(project.schemaData.tables || []);
      this.relationships.set(project.schemaData.relationships || []);
      this.relationshipDisplayColumns.set(project.schemaData.relationshipDisplayColumns || []);
      
      // Initialize views
      this.initializeViews(project.schemaData.tables || [], (project.schemaData as any).tableViews || {});

      // Validate schema
      const validation = this.schemaTranslationService.validateSchema(project.schemaData);
      this.validationResult.set(validation);

      if (!validation.isValid) {
        this.notificationService.showWarning(`Schema has ${validation.errors.length} errors`);
      }

      // Initialize simulated data
      const data = this.dataSimulationService.initializeData(project.schemaData);
      this.tableData.set(data);

      this.isLoading.set(false);
    } catch (error) {
      console.error('Error loading project data:', error);
      this.notificationService.showError('Failed to load project data');
      this.isLoading.set(false);
    }
  }

  getTableData(tableId: string): any[] {
    const table = this.tables().find(t => t.id === tableId);
    if (!table) return [];
    
    return this.tableData()[table.name] || [];
  }

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
    const data = this.tableData();
    return Object.values(data).reduce((total, records) => total + records.length, 0);
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

  private handleCreateRecord(event: DataChangeEvent) {
    const tableData = this.tableData();
    if (tableData[event.table]) {
      tableData[event.table].push(event.data);
      this.tableData.set({ ...tableData });
      this.notificationService.showSuccess(`Record added to ${event.table}`);
    }
  }

  private handleUpdateRecord(event: DataChangeEvent) {
    const tableData = this.tableData();
    if (tableData[event.table]) {
      const index = tableData[event.table].findIndex((record: any) => record.id === event.id);
      if (index !== -1) {
        tableData[event.table][index] = event.data;
        this.tableData.set({ ...tableData });
        this.notificationService.showSuccess(`Record updated in ${event.table}`);
      }
    }
  }

  private handleDeleteRecord(event: DataChangeEvent) {
    const tableData = this.tableData();
    if (tableData[event.table]) {
      const index = tableData[event.table].findIndex((record: any) => record.id === event.id);
      if (index !== -1) {
        tableData[event.table].splice(index, 1);
        this.tableData.set({ ...tableData });
        this.notificationService.showSuccess(`Record deleted from ${event.table}`);
      }
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

  // View management methods
  private initializeViews(tables: Table[], existingViews?: { [tableId: string]: TableView[] }) {
    const views: { [tableId: string]: TableView[] } = {};
    const activeViews: { [tableId: string]: string } = {};

    tables.forEach(table => {
      if (existingViews && existingViews[table.id]) {
        views[table.id] = existingViews[table.id];
        // Set first view as active
        if (views[table.id].length > 0) {
          activeViews[table.id] = views[table.id][0].id;
        }
      } else {
        // Create default view
        const defaultView = this.tableViewService.createDefaultView(table);
        views[table.id] = [defaultView];
        activeViews[table.id] = defaultView.id;
      }
    });

    this.tableViews.set(views);
    this.activeViews.set(activeViews);
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

  onViewCreated(view: TableView) {
    const currentViews = this.tableViews();
    const tableViews = currentViews[view.tableId] || [];
    
    this.tableViews.set({
      ...currentViews,
      [view.tableId]: [...tableViews, view]
    });

    // Set as active view
    this.onViewSelected(view);
    
    // Save to project
    this.saveViewsToProject();
  }

  onViewUpdated(view: TableView) {
    const currentViews = this.tableViews();
    const tableViews = currentViews[view.tableId] || [];
    
    const updatedViews = tableViews.map(v => v.id === view.id ? view : v);
    
    this.tableViews.set({
      ...currentViews,
      [view.tableId]: updatedViews
    });

    // Save to project
    this.saveViewsToProject();
  }

  onViewDeleted(viewId: string) {
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
    this.saveViewsToProject();
  }

  private saveViewsToProject() {
    // This would save the views to the project data
    // For now, we'll just log it
    console.log('Saving views:', this.tableViews());
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
}
