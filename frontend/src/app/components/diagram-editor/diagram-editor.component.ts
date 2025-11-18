import { Component, ElementRef, ViewChild, AfterViewInit, signal, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Table, Relationship, TableColumn, RelationshipDisplayColumn } from '../../models/table.model';
import { TableCardComponent } from '../table-card/table-card.component';
import { CanvasGridService } from '../../services/canvas-grid.service';
import { TableDialogComponent, TableDialogData } from '../table-dialog/table-dialog.component';
import { RelationshipDialogComponent, RelationshipDialogData } from '../relationship-dialog/relationship-dialog.component';
import { SimpleRelationshipDialogComponent, SimpleRelationshipDialogData } from '../simple-relationship-dialog/simple-relationship-dialog.component';
import { RelationshipLineComponent } from '../relationship-line/relationship-line.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ProjectService, ProjectSchema } from '../../services/project.service';
import { NotificationComponent } from '../notification/notification.component';
import { NotificationService } from '../../services/notification.service';
import { PlanLimitsService } from '../../services/plan-limits.service';
import { AuthService } from '../../services/auth.service';
import { EventDrivenSchemaService, EventDrivenResult } from '../../services/event-driven-schema.service';
import { SchemaChange } from '../../models/schema-change.model';
import { RealtimeCollaborationService } from '../../services/realtime-collaboration.service';
import { CanvasInteractionService } from '../../services/canvas-interaction.service';
import { TablePositionService } from '../../services/table-position.service';
import { SchemaChangeHandlerService } from '../../services/schema-change-handler.service';
import { RelationshipConversionService } from '../../services/relationship-conversion.service';
import { JunctionTableFilterService } from '../../services/junction-table-filter.service';
import { RelationshipDisplayService } from '../../services/relationship-display.service';

@Component({
  selector: 'app-diagram-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule,
    TableCardComponent,
    RelationshipLineComponent,
    NotificationComponent
  ],
  templateUrl: './diagram-editor.component.html',
  styleUrl: './diagram-editor.component.scss'
})
export class DiagramEditorComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true}) canvasRef!: ElementRef<HTMLDivElement>;

  // Signals for reactive state
  tables = signal<Table[]>([]);
  relationships = signal<Relationship[]>([]);
  relationshipDisplayColumns = signal<RelationshipDisplayColumn[]>([]);
  selectedTable = signal<Table | null>(null);
  isDrawing = signal(false);
  canvasTransform = signal('translate(0px, 0px) scale(1)');
  zoomLevel = signal(1);
  
  private projectId: string | null = null;
  private routeSubscription?: Subscription;
  
  // ✅ Track if we're currently applying schema changes
  private isApplyingSchemaChanges = false;

  constructor(
    public canvasGrid: CanvasGridService,
    private dialog: MatDialog,
    private projectService: ProjectService,
    private planLimitsService: PlanLimitsService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private eventDrivenSchema: EventDrivenSchemaService,
    private realtime: RealtimeCollaborationService,
    private route: ActivatedRoute,
    private router: Router,
    private canvasInteraction: CanvasInteractionService,
    private tablePosition: TablePositionService,
    private schemaHandler: SchemaChangeHandlerService,
    private relationshipConversion: RelationshipConversionService,
    private junctionFilter: JunctionTableFilterService,
    private relationshipDisplay: RelationshipDisplayService
  ) {}
  
  async ngOnInit() {
    // Listen for route parameter changes
    this.routeSubscription = this.route.params.subscribe(async (params) => {
      this.projectId = params['projectId'];
      
      if (!this.projectId) {
        console.error('No project ID provided');
        this.router.navigate(['/dashboard']);
        return;
      }
      
      // Load the project
      await this.loadProject(this.projectId);
      
      // Join realtime collaboration
      if (this.projectId) {
        try {
          await this.realtime.joinProject(this.projectId);
          console.log('✅ Joined realtime collaboration');
        } catch (error) {
          console.warn('⚠️ Failed to join realtime collaboration:', error);
        }
      }
    });
    
    // Listen for editor actions from the shared toolbar
    window.addEventListener('editor-action', this.handleEditorAction.bind(this) as EventListener);
    
    // Listen for realtime project updates
    window.addEventListener('project-updated', this.handleRealtimeUpdate.bind(this) as EventListener);
  }

  ngOnDestroy() {
    // Clean up route subscription
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    
    // Remove event listeners
    window.removeEventListener('editor-action', this.handleEditorAction.bind(this) as EventListener);
    window.removeEventListener('project-updated', this.handleRealtimeUpdate.bind(this) as EventListener);
    
    // Leave realtime collaboration
    if (this.projectId) {
      this.realtime.leaveProject();
    }
  }

  private handleEditorAction(event: Event) {
    const customEvent = event as CustomEvent;
    const action = customEvent.detail?.action;
    switch (action) {
      case 'addTable':
        this.addTable();
        break;
      case 'deleteTable':
        this.deleteSelectedTable();
        break;
      case 'addRelationship':
        this.addRelationship();
        break;
      case 'generateSQL':
        this.generateSQL();
        break;
      case 'viewMode':
        this.openViewMode();
        break;
    }
  }

  private handleRealtimeUpdate(event: Event) {
    const customEvent = event as CustomEvent;
    const { project, updatedBy } = customEvent.detail;
    
    // Only reload if updated by another user
    if (updatedBy !== this.authService.user()?.id) {
      console.log('🔄 Project updated by another user, reloading...');
      this.loadProject(this.projectId!);
    }
  }

  ngAfterViewInit() {
    this.initializeCanvas();
    this.setupEventListeners();
    this.setupResizeListener();
  }

  private initializeCanvas() {
    // Initialize the canvas grid service (no canvas needed)
    this.canvasGrid.initializeCanvas(null as any);
    
    // Update initial transform
    this.updateCanvasTransform();
  }

  private updateCanvasDimensions() {
    this.canvasGrid.updateCanvasSize();
  }

  private updateCanvasTransform() {
    this.canvasTransform.set(this.canvasGrid.getCSSTransform());
    this.zoomLevel.set(this.canvasGrid.getScale());
  }


  private setupEventListeners() {
    // Event listeners are now handled directly in the template
    // This method is kept for compatibility but can be removed
  }

  // Canvas event handlers - now using CanvasInteractionService
  onCanvasMouseDown(event: MouseEvent) {
    if (this.canvasInteraction.onMouseDown(event, this.canvasRef.nativeElement)) {
      // Close any open relationship context menus when clicking on canvas
      this.closeAllRelationshipContextMenus();
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    this.canvasInteraction.onMouseMove(event, (deltaX, deltaY) => {
      this.canvasGrid.pan(deltaX, deltaY);
      this.updateCanvasTransform();
    });
  }

  onCanvasMouseUp(event: MouseEvent) {
    this.canvasInteraction.onMouseUp(this.canvasRef.nativeElement);
  }

  onCanvasWheel(event: WheelEvent) {
    this.canvasInteraction.onWheel(event, (zoomAmount, centerX, centerY) => {
      this.canvasGrid.zoom(zoomAmount, centerX, centerY);
      this.updateCanvasTransform();
    });
  }

  onCanvasTouchStart(event: TouchEvent) {
    this.canvasInteraction.onTouchStart(event);
  }

  onCanvasTouchMove(event: TouchEvent) {
    this.canvasInteraction.onTouchMove(
      event,
      (zoomAmount, centerX, centerY) => {
        this.canvasGrid.zoom(zoomAmount, centerX, centerY);
      },
      (deltaX, deltaY) => {
        this.canvasGrid.pan(deltaX, deltaY);
      }
    );
    this.updateCanvasTransform();
  }

  onCanvasTouchEnd(event: TouchEvent) {
    // Handle touch end if needed
  }


  private setupResizeListener() {
    window.addEventListener('resize', () => {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        this.updateCanvasDimensions();
        this.updateCanvasTransform();
      }, 0);
    });
  }

  private addTableAtPosition(x: number, y: number) {
    const gridPos = this.tablePosition.screenToWorldAndSnap(x, y);
    this.createNewTable(gridPos.x, gridPos.y);
  }

  async addTable() {
    // Check table limit first
    if (this.projectId) {
      const limitCheck = await this.planLimitsService.canAddTable(this.projectId);
      
      if (!limitCheck.canCreate) {
        // Show limit reached dialog
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          width: '500px',
          data: {
            title: `Table Limit Reached (${limitCheck.current}/${limitCheck.max})`,
            message: `Your ${limitCheck.tier.toUpperCase()} plan allows ${limitCheck.max} table(s) per project. This project has ${limitCheck.current}.\n\n${this.planLimitsService.getUpgradeMessage(limitCheck.tier, 'tables')}`,
            confirmText: 'Upgrade Plan',
            cancelText: 'Cancel'
          }
        });

        dialogRef.afterClosed().subscribe((confirmed) => {
          if (confirmed) {
            // TODO: Redirect to upgrade page
            this.notificationService.showInfo('Upgrade functionality coming soon!');
          }
        });
        return;
      }

      // Show warning if approaching limit
      if (limitCheck.remaining <= 2 && limitCheck.max !== 999999) {
        this.notificationService.showWarning(
          `You can add ${limitCheck.remaining} more table(s) on your ${limitCheck.tier.toUpperCase()} plan`
        );
      }
    }

    // Add table at center of current view
    this.updateCanvasDimensions(); // Ensure dimensions are current
    const gridPos = this.tablePosition.getViewCenterSnapped();
    this.openTableDialog('create', gridPos.x, gridPos.y);
  }

  private async createNewTable(x: number, y: number) {
    if (!this.projectId) {
      this.notificationService.showError('No project ID available');
      return;
    }

    try {
      // Ensure we have the latest project version before creating table
      await this.loadProject(this.projectId!);
      const currentProject = this.projectService.getCurrentProject()();
      if (!currentProject) {
        throw new Error('No current project found');
      }

      console.log('📊 Current project version before creating table:', currentProject.version);

      const newTable: Table = {
        id: this.generateId(),
        name: 'New Table',
        x: x,
        y: y,
        width: 280,
        height: 150,
        columns: [
          {
            id: this.generateId(),
            name: 'id',
            type: 'SERIAL',
            isPrimaryKey: true,
            isNullable: false,
            isUnique: false,
            isAutoIncrement: true
          }
        ]
      };

      // Use SchemaChangeHandlerService to create table
      await this.schemaHandler.createTable(
        this.projectId!,
        newTable,
        this.tables(),
        this.relationships(),
        this.relationshipDisplayColumns(),
        currentProject.version
      );

      // Reload project from Master to get updated version (Edge Function already updated it)
      // This will automatically filter junction tables
      await this.loadProject(this.projectId!);
      console.log('✅ Table created and synced to Slave');

    } catch (error: any) {
      console.error('❌ Failed to create table:', error);
      
      // Check if it's a version conflict - reload project and show helpful message
      if (error.message && error.message.includes('VERSION_CONFLICT')) {
        console.log('⚠️ Version conflict detected, reloading project...');
        await this.loadProject(this.projectId!);
        this.notificationService.showError('The project was modified. Please try creating the table again.');
      } else {
        const errorMessage = error.message || 'Unknown error occurred';
        this.notificationService.showError(`Failed to create table: ${errorMessage}`);
      }
    }
  }

  // Event handlers for table cards
  onTablePositionChanged(table: Table, position: {x: number, y: number}) {
    // Position is already in world coordinates since the card is inside the transformed container
    // Just snap to grid
    const gridPos = this.tablePosition.snapTablePosition(table, position);
    
    this.tables.update(tables => 
      tables.map(t => t.id === table.id ? { ...t, x: gridPos.x, y: gridPos.y } : t)
    );
    
    // Auto-save after position change
    this.debouncedSave();
  }

  onTableDragPositionChanged(event: {table: Table, x: number, y: number}) {
    // Update table position in real-time during drag (no grid snapping, no auto-save)
    this.tables.update(tables => 
      tables.map(t => t.id === event.table.id ? { ...t, x: event.x, y: event.y } : t)
    );
  }


  onTableSelected(table: Table) {
    this.selectedTable.set(table);
  }

  onTableEdited(table: Table) {
    this.openTableDialog('edit', table.x, table.y, table);
  }

  async onTableDeleted(table: Table) {
    if (!this.projectId) {
      this.notificationService.showError('No project ID available');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete the table "${table.name}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      // Get current project version - ensure we have the latest
      await this.loadProject(this.projectId);
      const currentProject = this.projectService.getCurrentProject()();
      if (!currentProject) {
        throw new Error('No current project found');
      }

      console.log('🗑️ Deleting table:', {
        tableId: table.id,
        tableName: table.name,
        tableInternalName: table.internal_name,
        currentVersion: currentProject.version
      });

      // Use SchemaChangeHandlerService to delete table
      await this.schemaHandler.deleteTable(
        this.projectId!,
        table.id,
        this.tables(),
        this.relationships(),
        this.relationshipDisplayColumns(),
        currentProject.version
      );

      // Reload project to sync state (Edge Function already updated Master)
      console.log('🔄 Reloading project after table deletion...');
      await this.loadProject(this.projectId);
      
      // Clear selection if this table was selected
      if (this.selectedTable()?.id === table.id) {
        this.selectedTable.set(null);
      }

    } catch (error: any) {
      console.error('Failed to delete table:', error);
      
      // Check if it's a version conflict - reload project and show helpful message
      if (error.message && error.message.includes('VERSION_CONFLICT')) {
        console.log('⚠️ Version conflict detected, reloading project...');
        await this.loadProject(this.projectId);
        this.notificationService.showError('The project was modified. Please try deleting the table again.');
      } else {
        this.notificationService.showError(`Failed to delete table: ${error.message}`);
      }
    }
  }

  private openTableDialog(mode: 'create' | 'edit', x: number, y: number, table?: Table) {
    const dialogData: TableDialogData = {
      mode: mode,
      table: table
    };

    const dialogRef = this.dialog.open(TableDialogComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      console.log('📝 Table dialog closed with result:', result);
      
      if (result) {
        if (mode === 'create') {
          // Set position for new table
          result.x = x;
          result.y = y;
          console.log('📝 Creating new table via Edge Function:', result.name);
          
          // Use SchemaChangeHandlerService to create table
          await this.schemaHandler.createTable(
            this.projectId!,
            result,
            this.tables(),
            this.relationships(),
            this.relationshipDisplayColumns(),
            this.projectService.getCurrentProject()()?.version || 0
          );
          
          // Reload project to sync state
          await this.loadProject(this.projectId!);
        } else {
          // Update existing table
          console.log('Updating existing table:', result);
          console.log('🔍 Mode: edit | ProjectId:', this.projectId, '| Has old table:', !!table);
          
          if (this.projectId && table) {
            // Use SchemaChangeHandlerService to update table
            await this.schemaHandler.applyTableEdits(
              this.projectId!,
              table,
              result,
              this.tables(),
              this.relationships(),
              this.relationshipDisplayColumns()
            );
            
            // Reload project to sync state
            await this.loadProject(this.projectId!);
          } else {
            // Fallback: just update JSON
            console.log('⚠️ Skipping table update - projectId:', this.projectId, 'table:', !!table);
            this.tables.update(tables => 
              tables.map(t => t.id === result.id ? result : t)
            );
            this.debouncedSave();
          }
        }
      } else {
        console.log('Table dialog cancelled');
      }
    });
  }

  private generateId(): string {
    return this.relationshipDisplay.generateId();
  }

  /**
   * Filter out junction tables from the tables array
   * Delegates to JunctionTableFilterService
   */
  private filterJunctionTablesFromState(tables: Table[], relationships: Relationship[]): Table[] {
    return this.junctionFilter.filterJunctionTables(tables, relationships);
  }

  private getCurrentSchema(): ProjectSchema {
    const currentProject = this.projectService.getCurrentProject()();
    return {
      tables: this.tables(),
      relationships: this.relationships(),
      relationshipDisplayColumns: this.relationshipDisplayColumns(),
      metadata: {
        name: currentProject?.name || 'Untitled Project',
        description: currentProject?.description || '',
        version: '1.0.0'
      }
    };
  }



  async deleteSelectedTable() {
    const selected = this.selectedTable();
    if (!selected || !this.projectId) {
      return;
    }

    // ✅ Delegate to onTableDeleted which uses Edge Function for Slave sync
    await this.onTableDeleted(selected);
  }

  generateSQL() {
    // TODO: Implement SQL generation
  }

  openViewMode() {
    // Get current project ID from route
    const projectId = this.route.snapshot.paramMap.get('projectId');
    if (projectId) {
      this.router.navigate(['/view-mode', projectId]);
    } else {
      console.error('No project ID found in route');
    }
  }

  private async loadProject(projectId: string) {
    try {
      console.log('Loading project:', projectId);
      await this.projectService.loadProject(projectId);
      
      const project = this.projectService.getCurrentProject()();
      if (project) {
        console.log('Project loaded:', {
          name: project.name,
          tablesCount: project.schemaData.tables.length
        });
        
        // ✅ Filter out junction tables before setting state (double-check)
        const filteredTables = this.filterJunctionTablesFromState(
          project.schemaData.tables,
          project.schemaData.relationships
        );
        
        const filteredCount = project.schemaData.tables.length - filteredTables.length;
        console.log(`🔍 Filtering junction tables: ${filteredCount} filtered out of ${project.schemaData.tables.length}`);
        if (filteredCount > 0) {
          const junctionTables = project.schemaData.tables.filter(t => 
            !filteredTables.some(ft => ft.id === t.id)
          );
          console.log('🔍 Junction tables found:', junctionTables.map(t => ({ id: t.id, name: t.name })));
        }
        
        this.tables.set(filteredTables);
        this.relationships.set(project.schemaData.relationships);
        
        // Load existing relationship display columns or create them for existing relationships
        const existingDisplayColumns = project.schemaData.relationshipDisplayColumns || [];
        const createdDisplayColumns = this.relationshipDisplay.createMissingRelationshipDisplayColumns(
          project.schemaData.relationships,
          existingDisplayColumns,
          filteredTables
        );
        
        this.relationshipDisplayColumns.set([...existingDisplayColumns, ...createdDisplayColumns]);
        
        // If we created new display columns, save them
        if (createdDisplayColumns.length > 0) {
          this.debouncedSave();
        }
      } else {
        this.notificationService.showError('Failed to load project');
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Error loading project:', error);
      this.notificationService.showError('Failed to load project');
      this.router.navigate(['/dashboard']);
    }
  }


  private async saveCurrentState() {
    const currentProject = this.projectService.getCurrentProject()();
    if (!currentProject) {
      console.warn('No current project found, cannot save state');
      return;
    }

    const schemaData: ProjectSchema = {
      tables: this.tables(),
      relationships: this.relationships(),
      relationshipDisplayColumns: this.relationshipDisplayColumns(),
      metadata: {
        name: currentProject.name,
        description: currentProject.description,
        version: '1.0.0'
      }
    };

    console.log('Saving current state:', {
      projectId: currentProject.id,
      tablesCount: this.tables().length,
      relationshipsCount: this.relationships().length,
      schemaData
    });

    try {
      await this.projectService.autoSave(schemaData);
      console.log('State saved successfully');
    } catch (error) {
      console.error('Error saving current state:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
  }

  // Debounced save to avoid too many API calls
  private saveTimeout: any;
  private debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentState();
    }, 1000); // Save after 1 second of inactivity
  }


  // Relationship methods - Simple approach
  onLinkRequested(fromTable: Table): void {
    // Get other tables (exclude the selected one)
    const availableTables = this.tables().filter(t => t.id !== fromTable.id);

    const dialogData: SimpleRelationshipDialogData = {
      fromTable: fromTable,
      availableTables: availableTables
    };

    const dialogRef = this.dialog.open(SimpleRelationshipDialogComponent, {
      width: '500px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(async (toTable: Table | undefined) => {
      if (toTable) {
        await this.createAutoRelationship(fromTable, toTable);
      }
    });
  }

  private async createAutoRelationship(fromTable: Table, toTable: Table): Promise<void> {
    // Validate that both tables have primary keys
    const fromPK = fromTable.columns.find(c => c.isPrimaryKey);
    const toPK = toTable.columns.find(c => c.isPrimaryKey);

    if (!fromPK) {
      this.notificationService.showError(`Table "${fromTable.name}" must have a primary key to create relationships`);
      return;
    }

    if (!toPK) {
      this.notificationService.showError(`Table "${toTable.name}" must have a primary key to create relationships`);
      return;
    }

    // Create foreign key column in the target table (toTable)
    const foreignKeyColumnName = `${fromTable.name.toLowerCase()}_id`;
    
    // Check if foreign key column already exists
    const existingFK = toTable.columns.find(c => c.name === foreignKeyColumnName);
    if (existingFK) {
      this.notificationService.showError(`Foreign key column "${foreignKeyColumnName}" already exists in table "${toTable.name}"`);
      return;
    }

    // Create the foreign key column
    const foreignKeyColumn: TableColumn = {
      id: this.generateId(),
      name: foreignKeyColumnName,
      internal_name: `c_${this.generateId()}`, // ✅ Generate internal_name for foreign key column
      type: fromPK.type, // Match the type of the primary key
      isPrimaryKey: false,
      isNullable: true, // Foreign keys can be nullable
      isUnique: false,
      isForeignKey: true,
      referencedTableId: fromTable.id,
      referencedColumnId: fromPK.id
    };

    // Add the foreign key column to the target table
    const updatedToTable = {
      ...toTable,
      columns: [...toTable.columns, foreignKeyColumn]
    };

    // Update the tables array
    this.tables.update(tables => 
      tables.map(table => table.id === toTable.id ? updatedToTable : table)
    );

    // Create relationship automatically (1:1 by default)
    const newRelationship: Relationship = {
      id: this.generateId(),
      fromTableId: fromTable.id,
      toTableId: toTable.id,
      fromColumnId: fromPK.id,
      toColumnId: foreignKeyColumn.id, // Use the newly created foreign key column
      type: 'one-to-one',
      name: `${fromTable.name}_${toTable.name}`,
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      displayColumnId: fromPK.id, // Default to showing the primary key
      displayColumnName: `${fromTable.name}_${fromPK.name}`
    };

    // Create relationship display column with default field
    const relationshipDisplayColumn: RelationshipDisplayColumn = {
      id: this.generateId(),
      relationshipId: newRelationship.id,
      tableId: toTable.id, // Display in the target table
      sourceTableId: fromTable.id,
      fields: [{
        sourceColumnId: fromPK.id,
        displayName: `${fromTable.name}_${fromPK.name}`,
        isVisible: true
      }],
      isVisible: true
    };

    this.relationships.update(rels => [...rels, newRelationship]);
    this.relationshipDisplayColumns.update(displayCols => [...displayCols, relationshipDisplayColumn]);
    
    // ✅ Apply DDL to Slave atomically
    if (this.projectId) {
      const changes: SchemaChange[] = [];
      
      // 1. Add the FK column to the target table
      const tableNameForDB = updatedToTable.internal_name || `t_${updatedToTable.id}`;
      changes.push({
        type: 'add_column',
        table_name: tableNameForDB,
        column: {
          id: foreignKeyColumn.id, // ✅ Include column ID for masked name generation
          name: foreignKeyColumn.name,
          internal_name: foreignKeyColumn.internal_name || `c_${foreignKeyColumn.id}`, // ✅ Include internal_name
          type: foreignKeyColumn.type,
          nullable: foreignKeyColumn.isNullable,
          default: foreignKeyColumn.defaultValue
        }
      });
      
      // 2. Add the foreign key constraint
      const fromTableNameForDB = fromTable.internal_name || `t_${fromTable.id}`;
      changes.push({
        type: 'add_foreign_key',
        foreign_key: {
          table_name: tableNameForDB,
          column_name: foreignKeyColumn.internal_name || `c_${foreignKeyColumn.id}`,
          column_internal_name: foreignKeyColumn.internal_name, // ✅ Send internal_name directly
          referenced_table: fromTableNameForDB,
          referenced_column: fromPK.internal_name || `c_${fromPK.id}`,
          referenced_column_internal_name: fromPK.internal_name, // ✅ Send internal_name directly
          constraint_name: `fk_${newRelationship.name}`
        }
      });
      
      // Apply changes using SchemaChangeHandlerService
      // Use toTable as both old and new since we're just adding a column to it
      await this.schemaHandler.applyTableEdits(
        this.projectId!,
        toTable,
        updatedToTable,
        this.tables(),
        this.relationships(),
        this.relationshipDisplayColumns()
      );
      
      // Reload project to sync state
      await this.loadProject(this.projectId!);
    }
    
    this.notificationService.showSuccess(`Created relationship: ${fromTable.name} -> ${toTable.name} (added ${foreignKeyColumnName} column)`);
  }

  // Advanced relationship creation (from menu)
  addRelationship(): void {
    const dialogData: RelationshipDialogData = {
      mode: 'create',
      tables: this.tables()
    };

    const dialogRef = this.dialog.open(RelationshipDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && this.projectId) {
        const relationship = result as Relationship;
        
        // 1. Update local state optimistically
        this.relationships.update(rels => [...rels, relationship]);

        // 2. Prepare schema change
        // ✅ Use internal_name for table references
        const toTable = this.getTableById(relationship.toTableId);
        const fromTable = this.getTableById(relationship.fromTableId);
        
        if (!toTable || !fromTable) {
          this.notificationService.showError('Cannot create relationship: Table not found');
          this.relationships.update(rels => rels.filter(r => r.id !== relationship.id)); // Remove from local state
          return;
        }
        
        const toColumn = toTable.columns.find(c => c.id === relationship.toColumnId);
        const fromColumn = fromTable.columns.find(c => c.id === relationship.fromColumnId);
        
        if (!toColumn || !fromColumn) {
          this.notificationService.showError('Cannot create relationship: Column not found');
          this.relationships.update(rels => rels.filter(r => r.id !== relationship.id)); // Remove from local state
          return;
        }
        
        const change: SchemaChange = {
          type: 'add_foreign_key',
          foreign_key: {
            table_name: toTable.internal_name || `t_${toTable.id}`,
            table_internal_name: toTable.internal_name, // ✅ Send internal_name explicitly
            column_name: toColumn.internal_name || `c_${toColumn.id}`,
            column_internal_name: toColumn.internal_name, // ✅ Send internal_name directly
            referenced_table: fromTable.internal_name || `t_${fromTable.id}`,
            referenced_table_internal_name: fromTable.internal_name, // ✅ Send internal_name explicitly
            referenced_column: fromColumn.internal_name || `c_${fromColumn.id}`,
            referenced_column_internal_name: fromColumn.internal_name, // ✅ Send internal_name directly
            constraint_name: relationship.name ? `fk_${relationship.name.replace(/\s+/g, '_')}` : `fk_${toTable.internal_name || toTable.id}_${toColumn.internal_name || toColumn.id}`,
            on_delete: relationship.onDelete || 'NO ACTION',
            on_update: relationship.onUpdate || 'NO ACTION'
          }
        };

        // 3. Get current schema data and version
        const currentProject = this.projectService.getCurrentProject()();
        if (!currentProject) {
          this.notificationService.showError('No current project found');
          this.relationships.update(rels => rels.filter(r => r.id !== relationship.id));
          return;
        }

        const currentSchema = this.getCurrentSchema();
        const currentVersion = currentProject.version;

        // 4. Use synchronous approach - call applySchemaChange directly with the properly formatted change
        try {
          const result = await this.notificationService.showOperationStatus(
            async () => {
              const changeResult = await this.eventDrivenSchema.applySchemaChange(
                this.projectId!,
                change,
                currentSchema,
                currentVersion
              );

              if (!changeResult.success) {
                throw new Error(changeResult.error || 'Failed to create relationship');
              }

              return changeResult;
            },
            'Creating relationship...',
            'Relationship created successfully'
          );

          // Reload project to get updated version
          await this.loadProject(this.projectId!);
        } catch (error: any) {
          // Rollback local state if error
          this.relationships.update(rels => rels.filter(r => r.id !== relationship.id));
          
          // Error notification already shown by showOperationStatus
          // Just reload project if version conflict
          if (error.message && error.message.includes('VERSION_CONFLICT')) {
            await this.loadProject(this.projectId!);
          }
        }
      }
    });
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    if (!this.projectId) {
      this.notificationService.showError('No project ID available');
      return;
    }

    const relationship = this.relationships().find(r => r.id === relationshipId);
    if (!relationship) {
      return;
    }

    // 1. Update local state optimistically
    this.relationships.update(rels => rels.filter(r => r.id !== relationshipId));

    // 2. Prepare schema change
    // ✅ Use internal_name for table references
    const toTable = this.getTableById(relationship.toTableId);
    const fromTable = this.getTableById(relationship.fromTableId);
    
    const toColumn = toTable?.columns.find(c => c.id === relationship.toColumnId);
    const fromColumn = fromTable?.columns.find(c => c.id === relationship.fromColumnId);
    
    const change: SchemaChange = {
      type: 'drop_foreign_key',
      foreign_key: {
        table_name: toTable?.internal_name || toTable?.name || '',
        column_name: toColumn?.name || '',
        column_id: toColumn?.id, // ✅ Include column ID for masked name generation
        referenced_table: fromTable?.internal_name || fromTable?.name || '',
        referenced_column: fromColumn?.name || '',
        referenced_column_id: fromColumn?.id, // ✅ Include referenced column ID for masked name generation
        constraint_name: `fk_${relationship.name}`
      }
    };

    // 3. Get current schema data
    const currentSchema = this.getCurrentSchema();

    // 4. Use synchronous approach
    try {
      const result = await this.eventDrivenSchema.deleteRelationship(
        this.projectId,
        relationshipId,
        this.getCurrentSchema(),
        this.projectService.getCurrentProject()()?.version || 0
      );

      if (!result.success) {
        // Rollback local state if failed
        this.relationships.update(rels => [...rels, relationship]);
        this.notificationService.showError(result.error || 'Failed to delete relationship');
      }
    } catch (error: any) {
      // Rollback local state if error
      this.relationships.update(rels => [...rels, relationship]);
      this.notificationService.showError(error.message || 'Failed to delete relationship');
    }
  }

  // Navigation methods (now handled by shared layout)

  
  // Helper to get table by ID
  getTableById(id: string): Table | undefined {
    return this.tables().find(t => t.id === id);
  }

  // Helper to get relationship display columns for a table
  getRelationshipDisplayColumns(tableId: string): RelationshipDisplayColumn[] {
    return this.relationshipDisplayColumns().filter(col => col.tableId === tableId && col.isVisible);
  }

  // Helper to get relationship display column for a specific relationship
  getRelationshipDisplayColumnForRelationship(relationshipId: string): RelationshipDisplayColumn | undefined {
    return this.relationshipDisplay.getRelationshipDisplayColumnForRelationship(
      relationshipId,
      this.relationshipDisplayColumns(),
      this.relationships(),
      this.tables()
    );
  }

  // Update relationship display column
  updateRelationshipDisplayColumn(displayColumn: RelationshipDisplayColumn, newSourceColumnId: string, newDisplayName?: string): void {
    const sourceTable = this.getTableById(displayColumn.sourceTableId);
    if (!sourceTable) return;

    const newSourceColumn = sourceTable.columns.find(c => c.id === newSourceColumnId);
    if (!newSourceColumn) return;

    // Use provided display name or generate default
    const displayName = newDisplayName || `${sourceTable.name}_${newSourceColumn.name}`;

    // Update the display column (update the first field for now)
    const updatedDisplayColumn: RelationshipDisplayColumn = {
      ...displayColumn,
      fields: displayColumn.fields.map((field, index) => 
        index === 0 ? {
          ...field,
          sourceColumnId: newSourceColumnId,
          displayName: displayName
        } : field
      )
    };

    // Update the relationship display columns array
    this.relationshipDisplayColumns.update(displayCols => 
      displayCols.map(col => col.id === displayColumn.id ? updatedDisplayColumn : col)
    );

    // Update the relationship's display configuration
    this.relationships.update(rels => 
      rels.map(rel => 
        rel.id === displayColumn.relationshipId 
          ? { ...rel, displayColumnId: newSourceColumnId, displayColumnName: displayName }
          : rel
      )
    );

    this.notificationService.showSuccess(`Updated relationship display to show ${newSourceColumn.name}`);
    this.debouncedSave();
  }

  updateRelationshipDisplayColumnFields(
    displayColumn: RelationshipDisplayColumn, 
    newFields: any[]
  ): void {
    // Update the display column with new fields
    const updatedDisplayColumn: RelationshipDisplayColumn = {
      ...displayColumn,
      fields: newFields
    };

    // Update the relationship display columns array
    this.relationshipDisplayColumns.update(displayCols => 
      displayCols.map(col => col.id === displayColumn.id ? updatedDisplayColumn : col)
    );

    this.notificationService.showSuccess(`Updated relationship fields (${newFields.length} fields)`);
    this.debouncedSave();
  }

  // Handle relationship type change from context menu
  async onRelationshipTypeChanged(event: { relationship: Relationship; newType: string }): Promise<void> {
    const { relationship, newType } = event;
    
    // Get the tables involved in the relationship
    const fromTable = this.getTableById(relationship.fromTableId);
    const toTable = this.getTableById(relationship.toTableId);
    
    if (!fromTable || !toTable) {
      this.notificationService.showError('Could not find tables for this relationship');
      return;
    }
    
    // Validate that both tables have primary keys
    const fromPK = fromTable.columns.find(c => c.isPrimaryKey);
    const toPK = toTable.columns.find(c => c.isPrimaryKey);
    
    if (!fromPK || !toPK) {
      this.notificationService.showError('Both tables must have primary keys to maintain relationships');
      return;
    }
    
    // Handle different relationship types using RelationshipConversionService
    if (newType === 'one-to-many') {
      await this.relationshipConversion.convertToOneToMany(
        this.projectId!,
        relationship,
        fromTable,
        toTable,
        fromPK,
        this.tables()
      );
    } else if (newType === 'many-to-many') {
      const junctionInfo = await this.relationshipConversion.convertToManyToMany(
        this.projectId!,
        relationship,
        fromTable,
        toTable,
        fromPK,
        toPK,
        this.tables(),
        this.relationships()
      );
      
      // Update relationship with junction table info
      const updatedRelationship: Relationship = {
        ...relationship,
        type: 'many-to-many',
        junctionTableId: junctionInfo.junctionTableId,
        junctionTableInternalName: junctionInfo.junctionTableInternalName
      };
      
      this.relationships.update(rels => 
        rels.map(rel => rel.id === relationship.id ? updatedRelationship : rel)
      );
    } else if (newType === 'one-to-one') {
      await this.relationshipConversion.convertToOneToOne(
        this.projectId!,
        relationship,
        fromTable,
        toTable,
        fromPK
      );
    }
    
    // Update the relationships array (already updated for many-to-many above)
    if (newType !== 'many-to-many') {
      const updatedRelationship: Relationship = {
        ...relationship,
        type: newType as 'one-to-one' | 'one-to-many' | 'many-to-many'
      };
      
      this.relationships.update(rels => 
        rels.map(rel => rel.id === relationship.id ? updatedRelationship : rel)
      );
    }
    
    // Show notification
    this.notificationService.showSuccess(
      `Relationship type changed to ${this.getRelationshipTypeLabel(newType)}`
    );
    
    // Save changes
    this.debouncedSave();
  }


  // Handle relationship deletion from context menu
  async onRelationshipDeleted(relationship: Relationship): Promise<void> {
    if (!this.projectId) {
      this.notificationService.showError('No project ID available');
      return;
    }

    try {
      // Get current project version
      const currentProject = this.projectService.getCurrentProject()();
      if (!currentProject) {
        throw new Error('No current project found');
      }

      // ✅ If it's a many-to-many relationship, need to delete junction table and FKs from Slave
      if (relationship.type === 'many-to-many') {
        // First, delete the foreign keys from the junction table
        const fromTable = this.getTableById(relationship.fromTableId);
        const toTable = this.getTableById(relationship.toTableId);
        
        if (!fromTable || !toTable) {
          throw new Error('Cannot find tables for relationship');
        }

        // Get junction table info from relationship
        const junctionTableInternalName = relationship.junctionTableInternalName;
        
        if (junctionTableInternalName) {
          // Delete the junction table (which will cascade delete the FKs)
          const deleteTableChange: SchemaChange = {
            type: 'drop_table',
            table_name: junctionTableInternalName
          };

          const currentSchema = this.getCurrentSchema();
          const schemaWithoutRelationship = {
            ...currentSchema,
            relationships: currentSchema.relationships.filter(rel => rel.id !== relationship.id),
            relationshipDisplayColumns: currentSchema.relationshipDisplayColumns.filter(col => col.relationshipId !== relationship.id)
          };

          const result = await this.eventDrivenSchema.applySchemaChange(
            this.projectId,
            deleteTableChange,
            schemaWithoutRelationship,
            currentProject.version
          );

          if (!result.success) {
            throw new Error(result.error || 'Failed to delete junction table');
          }

          // Reload project to sync state
          await this.loadProject(this.projectId);
          this.notificationService.showSuccess('Many-to-many relationship and junction table deleted successfully');
          return;
        }
      }

      // For regular relationships (1:1, 1:M), delete the foreign key constraint
      console.log('🗑️ Deleting relationship:', {
        relationshipId: relationship.id,
        relationshipType: relationship.type,
        fromTableId: relationship.fromTableId,
        toTableId: relationship.toTableId,
        currentVersion: currentProject.version
      });

      const currentSchema = this.getCurrentSchema();
      const schemaWithoutRelationship = {
        ...currentSchema,
        relationships: currentSchema.relationships.filter(rel => rel.id !== relationship.id),
        relationshipDisplayColumns: currentSchema.relationshipDisplayColumns.filter(col => col.relationshipId !== relationship.id)
      };

      const result = await this.notificationService.showOperationStatus(
        async () => {
          const deleteResult = await this.eventDrivenSchema.deleteRelationship(
            this.projectId!,
            relationship.id,
            schemaWithoutRelationship,
            currentProject.version
          );

          console.log('🗑️ Delete relationship result:', deleteResult);

          if (!deleteResult.success) {
            throw new Error(deleteResult.error || 'Failed to delete relationship');
          }

          return deleteResult;
        },
        'Deleting relationship...',
        'Relationship deleted successfully'
      );

      // Reload project to sync state
      console.log('🔄 Reloading project after relationship deletion...');
      await this.loadProject(this.projectId);

    } catch (error: any) {
      console.error('Failed to delete relationship:', error);
      this.notificationService.showError(`Failed to delete relationship: ${error.message}`);
    }
  }

  // Helper to get relationship type label
  private getRelationshipTypeLabel(type: string): string {
    switch (type) {
      case 'one-to-one':
        return 'One to One (1:1)';
      case 'one-to-many':
        return 'One to Many (1:N)';
      case 'many-to-many':
        return 'Many to Many (N:M)';
      default:
        return type;
    }
  }

  // Close all relationship context menus
  private closeAllRelationshipContextMenus(): void {
    // This will be handled by the individual relationship line components
    // through their own click outside detection
  }
}

