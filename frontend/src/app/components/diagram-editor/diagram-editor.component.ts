import { Component, ElementRef, ViewChild, AfterViewInit, signal, OnInit, ViewChildren, QueryList } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { ProjectService, ProjectSchema } from '../../services/project.service';
import { NotificationComponent } from '../notification/notification.component';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

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
export class DiagramEditorComponent implements AfterViewInit, OnInit {
  @ViewChild('canvasContainer', { static: true}) canvasRef!: ElementRef<HTMLDivElement>;
  @ViewChildren(RelationshipLineComponent) relationshipLines!: QueryList<RelationshipLineComponent>;

  // Signals for reactive state
  tables = signal<Table[]>([]);
  relationships = signal<Relationship[]>([]);
  relationshipDisplayColumns = signal<RelationshipDisplayColumn[]>([]);
  selectedTable = signal<Table | null>(null);
  isDrawing = signal(false);
  canvasTransform = signal('translate(0px, 0px) scale(1)');
  
  private projectId: string | null = null;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private lastTouchDistance = 0;
  private lastTouchCenter = { x: 0, y: 0 };

  constructor(
    public canvasGrid: CanvasGridService,
    private dialog: MatDialog,
    private projectService: ProjectService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}
  
  async ngOnInit() {
    // Get project ID from route
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    
    if (!this.projectId) {
      console.error('No project ID provided');
      this.router.navigate(['/dashboard']);
      return;
    }
    
    // Load the project
    await this.loadProject(this.projectId);
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
  }


  private setupEventListeners() {
    // Event listeners are now handled directly in the template
    // This method is kept for compatibility but can be removed
  }

  // Canvas event handlers
  onCanvasMouseDown(event: MouseEvent) {
    if (event.button === 0) { // Left click
      this.isDragging = true;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.canvasRef.nativeElement.style.cursor = 'grabbing';
      event.preventDefault();
      
      // Close any open relationship context menus when clicking on canvas
      this.closeAllRelationshipContextMenus();
    }
  }

  onCanvasMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragStart.x;
      const deltaY = event.clientY - this.dragStart.y;
      
      this.canvasGrid.pan(deltaX, deltaY);
      this.updateCanvasTransform();
      
      this.dragStart = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }

  onCanvasMouseUp(event: MouseEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvasRef.nativeElement.style.cursor = 'grab';
    }
  }

  onCanvasWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    this.canvasGrid.zoom(delta, event.offsetX, event.offsetY);
    this.updateCanvasTransform();
  }

  onCanvasTouchStart(event: TouchEvent) {
    if (event.touches.length >= 2) {
      const touch0 = event.touches[0];
      const touch1 = event.touches[1];
      
      this.lastTouchDistance = this.getDistance(touch0, touch1);
      this.lastTouchCenter = this.getCenter(touch0, touch1);
    }
  }

  onCanvasTouchMove(event: TouchEvent) {
    event.preventDefault();
    
    if (event.touches.length >= 2) {
      const touch0 = event.touches[0];
      const touch1 = event.touches[1];
      
      const currentDistance = this.getDistance(touch0, touch1);
      const currentCenter = this.getCenter(touch0, touch1);
      
      if (this.lastTouchDistance > 0) {
        const zoomAmount = currentDistance / this.lastTouchDistance;
        this.canvasGrid.zoom(zoomAmount, currentCenter.x, currentCenter.y);
      }
      
      const deltaX = currentCenter.x - this.lastTouchCenter.x;
      const deltaY = currentCenter.y - this.lastTouchCenter.y;
      this.canvasGrid.pan(deltaX, deltaY);
      
      this.lastTouchDistance = currentDistance;
      this.lastTouchCenter = currentCenter;
      
      this.updateCanvasTransform();
    }
  }

  onCanvasTouchEnd(event: TouchEvent) {
    // Handle touch end if needed
  }

  private setupEventListenersOld() {
    const container = this.canvasRef.nativeElement;
    
    // Canvas click handler
    container.addEventListener('click', (event: MouseEvent) => {
      if (event.target === container) {
        this.selectedTable.set(null);
        
        // Add table at click position if Ctrl/Cmd is held
        if (event.ctrlKey || event.metaKey) {
          this.addTableAtPosition(event.offsetX, event.offsetY);
        }
      }
    });

    // Canvas drag handler for panning
    container.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.target === container && event.button === 0) {
        this.isDragging = true;
        this.dragStart = { x: event.clientX, y: event.clientY };
        container.style.cursor = 'grabbing';
        event.preventDefault();
      }
    });

    // Global mouse move for panning
    document.addEventListener('mousemove', (event: MouseEvent) => {
      if (this.isDragging) {
        const deltaX = event.clientX - this.dragStart.x;
        const deltaY = event.clientY - this.dragStart.y;
        
        this.canvasGrid.pan(deltaX, deltaY);
        this.updateCanvasTransform();
        
        this.dragStart = { x: event.clientX, y: event.clientY };
        event.preventDefault();
      }
    });

    // Global mouse up
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        container.style.cursor = 'grab';
      }
    });

    // Zoom handler with mouse wheel
    container.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      this.canvasGrid.zoom(delta, event.offsetX, event.offsetY);
      this.updateCanvasTransform();
    });

    // Touch events for mobile
    container.addEventListener('touchstart', (event: TouchEvent) => {
      this.onTouchStart(event.touches);
    });

    container.addEventListener('touchmove', (event: TouchEvent) => {
      event.preventDefault();
      this.onTouchMove(event.touches);
    });
  }

  private onTouchStart(touches: TouchList) {
    if (touches.length >= 2) {
      const touch0 = touches[0];
      const touch1 = touches[1];
      
      this.lastTouchDistance = this.getDistance(touch0, touch1);
      this.lastTouchCenter = this.getCenter(touch0, touch1);
    }
  }

  private onTouchMove(touches: TouchList) {
    if (touches.length >= 2) {
      const touch0 = touches[0];
      const touch1 = touches[1];
      
      const currentDistance = this.getDistance(touch0, touch1);
      const currentCenter = this.getCenter(touch0, touch1);
      
      // Zoom
      if (this.lastTouchDistance > 0) {
        const zoomAmount = currentDistance / this.lastTouchDistance;
        this.canvasGrid.zoom(zoomAmount, currentCenter.x, currentCenter.y);
      }
      
      // Pan
      const deltaX = currentCenter.x - this.lastTouchCenter.x;
      const deltaY = currentCenter.y - this.lastTouchCenter.y;
      this.canvasGrid.pan(deltaX, deltaY);
      
      this.lastTouchDistance = currentDistance;
      this.lastTouchCenter = currentCenter;
      
      this.updateCanvasTransform();
    }
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getCenter(touch1: Touch, touch2: Touch): { x: number, y: number } {
    return {
      x: (touch1.pageX + touch2.pageX) / 2,
      y: (touch1.pageY + touch2.pageY) / 2
    };
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
    // Convert screen coordinates to world coordinates
    const worldPos = this.canvasGrid.screenToWorld(x, y);
    
    // Snap to grid
    const gridPos = this.canvasGrid.snapToGrid(worldPos.x, worldPos.y);
    
    this.createNewTable(gridPos.x, gridPos.y);
  }

  addTable() {
    // Add table at center of current view
    this.updateCanvasDimensions(); // Ensure dimensions are current
    const centerX = 400;
    const centerY = 300;
    const worldPos = this.canvasGrid.screenToWorld(centerX, centerY);
    
    // Snap to grid
    const gridPos = this.canvasGrid.snapToGrid(worldPos.x, worldPos.y);
    
    this.openTableDialog('create', gridPos.x, gridPos.y);
  }

  private createNewTable(x: number, y: number) {
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

    this.tables.update(tables => [...tables, newTable]);
  }

  // Event handlers for table cards
  onTablePositionChanged(table: Table, position: {x: number, y: number}) {
    // Position is already in world coordinates since the card is inside the transformed container
    // Just snap to grid
    const gridPos = this.canvasGrid.snapToGrid(position.x, position.y);
    
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
    
    // Update relationship lines in real-time
    this.updateRelationshipLines();
  }

  private updateRelationshipLines() {
    // Force update all relationship line components
    this.relationshipLines.forEach(line => {
      line.updatePath();
    });
  }

  onTableSelected(table: Table) {
    this.selectedTable.set(table);
  }

  onTableEdited(table: Table) {
    this.openTableDialog('edit', table.x, table.y, table);
  }

  onTableDeleted(table: Table) {
    this.tables.update(tables => tables.filter(t => t.id !== table.id));
    this.relationships.update(rels => 
      rels.filter(r => r.fromTableId !== table.id && r.toTableId !== table.id)
    );
    if (this.selectedTable()?.id === table.id) {
      this.selectedTable.set(null);
    }
    
    // Auto-save after deletion
    this.debouncedSave();
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

        dialogRef.afterClosed().subscribe(result => {
          console.log('Table dialog closed with result:', result);
          
          if (result) {
            if (mode === 'create') {
              // Set position for new table
              result.x = x;
              result.y = y;
              console.log('Creating new table:', result);
              this.tables.update(tables => [...tables, result]);
            } else {
              // Update existing table
              console.log('Updating existing table:', result);
              this.tables.update(tables => 
                tables.map(t => t.id === result.id ? result : t)
              );
            }
            
            // Auto-save after create/edit
            console.log('Triggering debounced save after table operation');
            this.debouncedSave();
          } else {
            console.log('Table dialog cancelled');
          }
        });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  deleteSelectedTable() {
    const selected = this.selectedTable();
    if (selected) {
      this.tables.update(tables => tables.filter(t => t.id !== selected.id));
      this.relationships.update(rels => 
        rels.filter(r => r.fromTableId !== selected.id && r.toTableId !== selected.id)
      );
      this.selectedTable.set(null);
    }
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
        
        this.tables.set(project.schemaData.tables);
        this.relationships.set(project.schemaData.relationships);
        
        // Load existing relationship display columns or create them for existing relationships
        const existingDisplayColumns = project.schemaData.relationshipDisplayColumns || [];
        const createdDisplayColumns = this.createMissingRelationshipDisplayColumns(
          project.schemaData.relationships,
          existingDisplayColumns
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

  private async initializeProject() {
    console.log('Initializing project...');
    const currentProject = this.projectService.getCurrentProject()();
    console.log('Current project:', currentProject);
    
    if (currentProject) {
      console.log('Loading existing project data:', {
        tablesCount: currentProject.schemaData.tables.length,
        relationshipsCount: currentProject.schemaData.relationships.length,
        tables: currentProject.schemaData.tables
      });
      // Load existing project
      this.tables.set(currentProject.schemaData.tables);
      this.relationships.set(currentProject.schemaData.relationships);
    } else {
      console.log('No current project found, creating demo project');
      // Create a demo project for testing
      await this.createDemoProject();
    }
  }

  private async createDemoProject() {
    try {
      console.log('Creating demo project...');
      const project = await this.projectService.createProject('Demo Project', 'A sample project to get started');
      console.log('Demo project created:', project);
      
      // Add a sample table
      const sampleTable: Table = {
        id: this.generateId(),
        name: 'users',
        x: 100,
        y: 100,
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
          },
          {
            id: this.generateId(),
            name: 'email',
            type: 'VARCHAR(255)',
            isPrimaryKey: false,
            isNullable: false,
            isUnique: true
          },
          {
            id: this.generateId(),
            name: 'name',
            type: 'VARCHAR(255)',
            isPrimaryKey: false,
            isNullable: false,
            isUnique: false
          }
        ]
      };

      console.log('Setting sample table:', sampleTable);
      this.tables.set([sampleTable]);
      console.log('Saving current state after demo project creation...');
      await this.saveCurrentState();
    } catch (error) {
      console.error('Error creating demo project:', error);
      console.error('Demo project error details:', JSON.stringify(error, null, 2));
      console.log('Falling back to local test table');
      // Fallback to local test table
      this.addTestTable();
    }
  }

  private addTestTable() {
    // Add a test table at the center (fallback)
    const testTable: Table = {
      id: this.generateId(),
      name: 'Test Table',
      x: 100,
      y: 100,
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
        },
        {
          id: this.generateId(),
          name: 'name',
          type: 'VARCHAR(255)',
          isPrimaryKey: false,
          isNullable: false,
          isUnique: false
        }
      ]
    };

    this.tables.update(tables => [...tables, testTable]);
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

  // Test method to trigger error notification
  testErrorNotification(): void {
    this.notificationService.showError('This is a test error message to verify the notification system is working correctly.');
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

    dialogRef.afterClosed().subscribe((toTable: Table | undefined) => {
      if (toTable) {
        this.createAutoRelationship(fromTable, toTable);
      }
    });
  }

  private createAutoRelationship(fromTable: Table, toTable: Table): void {
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
    this.notificationService.showSuccess(`Created relationship: ${fromTable.name} -> ${toTable.name} (added ${foreignKeyColumnName} column)`);
    this.debouncedSave();
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

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.relationships.update(rels => [...rels, result as Relationship]);
        this.debouncedSave();
      }
    });
  }

  deleteRelationship(relationshipId: string): void {
    this.relationships.update(rels => rels.filter(r => r.id !== relationshipId));
    this.debouncedSave();
  }

  // Navigation methods
  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  // Logout method
  logout(): void {
    this.authService.signOut();
  }
  
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
    const displayColumn = this.relationshipDisplayColumns().find(col => col.relationshipId === relationshipId && col.isVisible);
    
    // If no display column found, create one on the fly
    if (!displayColumn) {
      const relationship = this.relationships().find(r => r.id === relationshipId);
      if (relationship) {
        const fromTable = this.tables().find(t => t.id === relationship.fromTableId);
        const toTable = this.tables().find(t => t.id === relationship.toTableId);
        
        if (fromTable && toTable) {
          const fromPK = fromTable.columns.find(c => c.isPrimaryKey);
          if (fromPK) {
            const newDisplayColumn: RelationshipDisplayColumn = {
              id: this.generateId(),
              relationshipId: relationshipId,
              tableId: toTable.id,
              sourceTableId: fromTable.id,
              fields: [{
                sourceColumnId: fromPK.id,
                displayName: `${fromTable.name}_${fromPK.name}`,
                isVisible: true
              }],
              isVisible: true
            };
            
            // Add it to the signal
            this.relationshipDisplayColumns.update(cols => [...cols, newDisplayColumn]);
            return newDisplayColumn;
          }
        }
      }
    }
    
    return displayColumn;
  }

  // Create relationship display columns for existing relationships that don't have them
  private createMissingRelationshipDisplayColumns(
    relationships: Relationship[], 
    existingDisplayColumns: RelationshipDisplayColumn[]
  ): RelationshipDisplayColumn[] {
    const createdColumns: RelationshipDisplayColumn[] = [];
    
    relationships.forEach(relationship => {
      // Check if this relationship already has a display column
      const hasDisplayColumn = existingDisplayColumns.some(col => col.relationshipId === relationship.id);
      
      if (!hasDisplayColumn) {
        // Get the tables involved in the relationship
        const fromTable = this.tables().find(t => t.id === relationship.fromTableId);
        const toTable = this.tables().find(t => t.id === relationship.toTableId);
        
        if (fromTable && toTable) {
          // Find the primary key of the source table
          const fromPK = fromTable.columns.find(c => c.isPrimaryKey);
          
          if (fromPK) {
            // Create a relationship display column for the target table
            const relationshipDisplayColumn: RelationshipDisplayColumn = {
              id: this.generateId(),
              relationshipId: relationship.id,
              tableId: toTable.id, // Display in the target table
              sourceTableId: fromTable.id,
              fields: [{
                sourceColumnId: fromPK.id,
                displayName: `${fromTable.name}_${fromPK.name}`,
                isVisible: true
              }],
              isVisible: true
            };
            
            createdColumns.push(relationshipDisplayColumn);
          }
        }
      }
    });
    
    return createdColumns;
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
  onRelationshipTypeChanged(event: { relationship: Relationship; newType: string }): void {
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
    
    // Update the relationship type
    const updatedRelationship: Relationship = {
      ...relationship,
      type: newType as 'one-to-one' | 'one-to-many' | 'many-to-many'
    };
    
    // Update the relationships array
    this.relationships.update(rels => 
      rels.map(rel => rel.id === relationship.id ? updatedRelationship : rel)
    );
    
    // Show notification
    this.notificationService.showSuccess(
      `Relationship type changed to ${this.getRelationshipTypeLabel(newType)}`
    );
    
    // Save changes
    this.debouncedSave();
  }

  // Handle relationship deletion from context menu
  onRelationshipDeleted(relationship: Relationship): void {
    // Get the tables involved in the relationship
    const fromTable = this.getTableById(relationship.fromTableId);
    const toTable = this.getTableById(relationship.toTableId);
    
    if (fromTable && toTable) {
      // Find the foreign key column that was created for this relationship
      const foreignKeyColumn = toTable.columns.find(col => 
        col.isForeignKey && 
        col.referencedTableId === relationship.fromTableId &&
        col.referencedColumnId === relationship.fromColumnId
      );
      
      if (foreignKeyColumn) {
        // Remove the foreign key column from the target table
        const updatedToTable = {
          ...toTable,
          columns: toTable.columns.filter(col => col.id !== foreignKeyColumn.id)
        };
        
        // Update the tables array
        this.tables.update(tables => 
          tables.map(table => table.id === toTable.id ? updatedToTable : table)
        );
        
        this.notificationService.showSuccess(
          `Relationship deleted and foreign key column "${foreignKeyColumn.name}" removed from table "${toTable.name}"`
        );
      } else {
        this.notificationService.showSuccess('Relationship deleted successfully');
      }
    } else {
      this.notificationService.showSuccess('Relationship deleted successfully');
    }
    
    // Remove the relationship from the array
    this.relationships.update(rels => 
      rels.filter(rel => rel.id !== relationship.id)
    );
    
    // Remove the relationship display column
    this.relationshipDisplayColumns.update(displayCols => 
      displayCols.filter(col => col.relationshipId !== relationship.id)
    );
    
    // Save changes
    this.debouncedSave();
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

