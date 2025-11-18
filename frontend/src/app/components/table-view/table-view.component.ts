import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, computed, effect, DestroyRef, inject, AfterViewInit, Injector, runInInjectionContext, HostListener, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

import { Table, TableColumn, Relationship, RelationshipDisplayColumn } from '../../models/table.model';
import { TableView } from '../../models/table-view.model';
import { TableViewService } from '../../services/table-view.service';
import { TableEditService } from '../../services/table-edit.service';
import { TableRelationshipService } from '../../services/table-relationship.service';
import { TableDataService, DataChangeEvent } from '../../services/table-data.service';
import { TableFilterSortService } from '../../services/table-filter-sort.service';
import { TableFieldManagerService } from '../../services/table-field-manager.service';
import { TablePhaseService } from '../../services/table-phase.service';
import { TableKeyboardService } from '../../services/table-keyboard.service';
import { NotificationService } from '../../services/notification.service';
import { SchemaChangeHandlerService } from '../../services/schema-change-handler.service';
import { ProjectService } from '../../services/project.service';
import { TableDataEditorService } from '../../services/table-data-editor.service';
import { TableViewManagerService } from '../../services/table-view-manager.service';
import { TableColumnNameEditorService } from '../../services/table-column-name-editor.service';
import { ViewConfigDialogComponent } from '../view-config-dialog/view-config-dialog.component';
import { SchemaEditorDialogComponent } from '../schema-editor-dialog/schema-editor-dialog.component';
import { RealtimeTableDataService } from '../../services/realtime-table-data.service';

// Import existing components
import { TableToolbarComponent } from '../table-toolbar/table-toolbar.component';
import { TablePaginationComponent } from '../table-pagination/table-pagination.component';
import { TableBodyComponent } from './table-body/table-body.component';

// Import new design system components
import { TableViewFiltersComponent, FilterCondition } from './table-view-filters/table-view-filters.component';
import { TableViewSorterComponent, SortColumn } from './table-view-sorter/table-view-sorter.component';
import { TableViewColumnManagerComponent, ColumnSetting } from './table-view-column-manager/table-view-column-manager.component';
import { TableSkeletonComponent } from './table-skeleton/table-skeleton.component';

// DataChangeEvent moved to table-data.service.ts

@Component({
  selector: 'app-table-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDialogModule,
    DragDropModule,
    TableToolbarComponent,
    TablePaginationComponent,
    TableBodyComponent,
    TableViewFiltersComponent,
    TableSkeletonComponent
  ],
  template: `
    <mat-card class="table-content" id="table-{{table.id}}">
      <!-- Toolbar -->
      <app-table-toolbar
        [selectedCount]="getSelectedCount()"
        [isMultiSelectMode]="isMultiSelectMode()"
        [activeFiltersCount]="getActiveFiltersForComponent().length"
        (openFilters)="onOpenFilters()"
        (openSort)="onOpenSort()"
        (openColumns)="onOpenColumns()"
        (openViewManager)="onOpenViewManager()"
        (toggleMultiSelect)="onToggleMultiSelect()"
        (deleteSelected)="onDeleteSelected()"
        (clearSelection)="onClearSelection()"
        (editSchema)="onEditSchema()"
        (searchChanged)="onSearchChanged($event)">
      </app-table-toolbar>

      <!-- Filters Panel (shown as overlay when opened) -->
      @if (filtersExpanded) {
        <div class="filters-overlay" (click)="onCloseFilters()">
          <div class="filters-panel" (click)="$event.stopPropagation()">
            <app-table-view-filters
              [availableColumns]="getAvailableColumnsForFilters()"
              [activeFilters]="getActiveFiltersForComponent()"
              [expanded]="true"
              (filtersChanged)="onFiltersChanged($event)">
            </app-table-view-filters>
          </div>
        </div>
      }

      <!-- Table -->
      <div class="table-wrapper">
        <!-- Skeleton Loader while table initializes -->
        @if (isTableInputReady() && (isInitializing() || regularColumns.length === 0)) {
          <app-table-skeleton></app-table-skeleton>
        }
        
        <!-- Actual Table -->
        @if (isTableInputReady()) {
        <div class="table-container" 
             [class.multiselect-active]="isMultiSelectMode()"
             [class.hidden]="regularColumns.length === 0"
             cdkDropList="table-columns" 
             cdkDropListOrientation="horizontal"
             (cdkDropListDropped)="onColumnDrop($event)">
          <app-table-body
            [dataSource]="paginatedData"
            [regularColumns]="getRegularColumns"
            [relationshipColumns]="getRelationshipColumns"
            [isMultiSelectMode]="isMultiSelectMode"
            [canDrag]="!!activeView"
            [allTables]="allTables"
            [allTableData]="allTableData"
            [isEditing]="isEditing"
            [editingValue]="editingValue"
            [isEditingColumnName]="isEditingColumnName"
            [editingColumnNameValue]="editingColumnNameValue"
            [isRowSelected]="isRowSelected"
            [isAllSelected]="isAllSelected"
            [isPartiallySelected]="isPartiallySelected"
            [isEditingRelationship]="isEditingRelationship"
            [getRelationshipType]="getRelationshipType"
            [getRelationshipDisplayColumn]="getRelationshipDisplayColumn"
            [getRelationshipOptions]="getRelationshipOptions"
            (onStartEdit)="onStartEdit($event)"
            (onValueChange)="onValueChange($event)"
            (onSaveEdit)="onSaveEdit($event.rowIndex, $event.columnName, $event.element)"
            (onCancelEdit)="onCancelEdit()"
            (onStartEditColumnName)="onStartEditColumnName($event)"
            (onUpdateEditingColumnNameValue)="onUpdateEditingColumnNameValue($event)"
            (onSaveColumnName)="onSaveColumnName($event)"
            (onCancelEditColumnName)="onCancelEditColumnName()"
            (onStartEditRelationship)="onStartEditRelationship($event)"
            (onSaveEditRelationship)="onSaveEditRelationship($event.rowIndex, $event.viewColumn, $event.element)"
            (onRowClick)="onRowClick($event.rowIndex, $event.event)"
            (onRowSelectionChange)="onRowSelectionChange($event.rowIndex, {checked: $event.checked})"
            (onSelectAllChange)="onSelectAllChange($event)"
            (onAddField)="onAddField()"
            (onDeleteRow)="onDeleteRow($event)"
            [getColumnWidth]="getColumnWidth"
            (onColumnResized)="onColumnResized($event)"
            [hasPhases]="getHasPhases()"
            [phases]="getPhases"
            [getPhaseIdForRow]="getPhaseIdForRow"
            (onPhaseChanged)="onPhaseChanged($event)"
            (onStartAddRecord)="onStartAddRecord()"
            (onTabNext)="onTabNext($event)"
            [hasTemporaryRecord]="hasTemporaryRecord"
            [getRequiredColumns]="getRequiredColumns"
            [isTemporaryRecordValid]="isTemporaryRecordValid"
            [onSaveTemporaryRecord]="onSaveTemporaryRecord">
          </app-table-body>
        </div>
        }
      </div>

      <!-- Pagination -->
      <app-table-pagination
        [totalRecords]="filteredData().length"
        [pageSize]="pageSize"
        [currentPage]="currentPage"
        [data]="filteredData()"
        (pageChanged)="onPageChange($event)"
        (paginatedDataChanged)="onPaginatedDataChanged($event)">
      </app-table-pagination>
    </mat-card>
  `,
  styles: [`
    /* Override mat-card default styles */
    ::ng-deep .table-content.mat-mdc-card {
      padding: 0 !important;
      background-color: var(--theme-surface);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      overflow-x: hidden; /* Prevent pagination from scrolling horizontally */
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
      max-height: 100% !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important; /* Allow flexbox shrinking */
      box-sizing: border-box !important;
    }

    .table-content {
      background-color: var(--theme-surface);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      overflow-x: hidden; /* Prevent pagination from scrolling horizontally */
      display: flex;
      flex-direction: column;
      height: 100%; /* Use available height from parent container */
      max-height: 100%; /* Ensure it doesn't exceed parent */
      width: 100%;
      max-width: 100%;
      min-width: 0; /* Allow flexbox shrinking */
      box-sizing: border-box;
    }

    .table-wrapper {
      overflow-y: auto; /* Vertical scroll for table content */
      overflow-x: auto; /* Horizontal scroll for table content only */
      flex: 1;
      min-height: 0; /* Allow flexbox shrinking */
      min-width: 0; /* Allow flexbox shrinking */
      max-height: 100%; /* Ensure it doesn't exceed parent */
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .table-container {
      position: relative;
      width: 100%;
      max-width: 100%;
      min-width: 0; /* Allow flexbox shrinking */
      height: 100%;
      max-height: 100%;
      box-sizing: border-box;
    }

    .table-container.hidden {
      visibility: hidden;
      height: 0;
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      background-color: var(--theme-surface);
    }

    .sticky-header {
      position: sticky;
      top: 0;
      background-color: var(--theme-surface);
      z-index: 10;
    }

    .relationship-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 16px;
    }

    .relationship-title {
      font-weight: 600;
      color: var(--theme-text-primary);
    }

    .relationship-type {
      font-size: 12px;
      color: var(--theme-text-secondary);
    }

    .multiselect-active .data-table tr {
      cursor: pointer;
    }

    .data-table tr.selected {
      background-color: var(--theme-primary-container);
    }

    .data-table tr:hover {
      background-color: var(--theme-surface-variant);
    }

    /* Drag and drop styles */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 4px;
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                  0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12);
      z-index: 10000 !important;
    }

    .cdk-drag-placeholder {
      opacity: 0.2 !important;
      background-color: var(--theme-surface-variant) !important;
      border: 2px dashed var(--theme-outline) !important;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* Ensure table container and headers remain visible during drag */
    .table-container {
      position: relative;
      z-index: 1;
    }

    .table-container th.sticky-header {
      opacity: 1 !important;
      visibility: visible !important;
    }

    .table-container th.sticky-header:not(.cdk-drag-dragging):not(.cdk-drag-placeholder) {
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Filters Overlay */
    .filters-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 80px;
      animation: fadeIn 150ms ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .filters-panel {
      background-color: var(--theme-surface);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideDown 200ms ease-out;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Ensure pagination doesn't scroll horizontally */
    app-table-pagination {
      overflow-x: hidden;
      width: 100%;
      flex-shrink: 0; /* Prevent pagination from shrinking */
    }

  `]
})
export class TableViewComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() table!: Table;
  @Input() relationships: Relationship[] = [];
  @Input() relationshipDisplayColumns: RelationshipDisplayColumn[] = [];
  @Input() allTables: Table[] = [];
  @Input() allTableData: { [tableName: string]: any[] } = {};
  @Input() views: TableView[] = [];
  @Input() activeView: TableView | null = null;

  @Output() dataChanged = new EventEmitter<DataChangeEvent>();
  @Output() viewSelected = new EventEmitter<TableView>();
  @Output() viewCreated = new EventEmitter<TableView>();
  @Output() viewUpdated = new EventEmitter<TableView>();
  @Output() viewDeleted = new EventEmitter<string>();
  @Output() relationshipDisplayColumnsUpdated = new EventEmitter<RelationshipDisplayColumn[]>();

  private destroyRef = inject(DestroyRef);

  /** Helper to check if table input is valid and ready for initialization */
  readonly isTableInputReady = computed(() => {
    return !!(
      this.table && 
      this.table.columns && 
      this.table.columns.length > 0
    );
  });

  regularColumns: TableColumn[] = [];
  relationshipColumns: any[] = [];
  private isReorderingColumns = false; // Flag to prevent effect from recalculating during drag and drop
  private previousTableId: string | null = null; // Track previous table for cleanup
  private subscribedTableId: string | null = null; // Track which table we're subscribed to
  private currentDataSignal: ReturnType<typeof signal<any[]>> | null = null; // Current data signal from realtime service
  
  // Getters for table-body component
  getRegularColumns = () => this.regularColumns;
  getRelationshipColumns = () => this.relationshipColumns;
  
  // Phase-related getters
  getHasPhases = () => !!(this.table?.phases && this.table.phases.length > 0);
  getPhases = () => this.table ? this.phaseService.getPhases(this.table) : [];
  getPhaseIdForRow = (element: any) => element._phaseId || null;
  
  // Track if initialization has been attempted
  private initializationAttempted = false;
  
  // Track if we're still initializing (show skeleton during this time)
  readonly isInitializing = signal<boolean>(true);

  // Data management - using realtime service
  tableData = signal<any[]>([]); // Data from realtime subscription
  filteredData = signal<any[]>([]); // Filtered and sorted data
  searchQuery = signal<string>(''); // Search query
  
  // Temporary record management - simplified to single object
  temporaryRecord: any | null = null; // Single temporary record (appended to filtered data)
  private autoSaveTimeout: any = null;
  
  // Pagination properties
  pageSize = 25;
  currentPage = 0;
  paginatedData: any[] = [];

  // Filters, Sort, and Column Management
  filtersExpanded = false;
  columnSettings: ColumnSetting[] = [];
  
  // Computed getter for hasTemporaryRecord
  hasTemporaryRecord = () => this.temporaryRecord !== null;
  
  // Getter for required columns
  getRequiredColumns = () => {
    if (!this.table) return [];
    return this.table.columns.filter(col => !col.isNullable && !col.isAutoIncrement && !col.isAutoGenerate);
  }

  isTemporaryRecordValid = (element: any): boolean => {
    if (!element._isTemporary || !this.table) return false;
    return this.dataEditorService.validateRequiredFields(element, this.table) as boolean;
  }

  onSaveTemporaryRecord = (element: any) => {
    if (!element._isTemporary) return;
    // Validate one more time
    if (!this.dataEditorService.validateRequiredFields(element, this.table)) {
      const validationDetails = this.dataEditorService.validateRequiredFields(
        element,
        this.table,
        true
      ) as { isValid: boolean; missingFields: string[] };
      const missingFieldsStr = validationDetails.missingFields.join(', ');
      this.notificationService.showError(
        `Cannot save: missing required fields: ${missingFieldsStr}`
      );
      return;
    }
    // Save the record
    this.autoSaveTemporaryRecord();
  };

  private injector = inject(Injector);

  constructor(
    private dialog: MatDialog,
    private tableViewService: TableViewService,
    private tableEditService: TableEditService,
    private tableRelationshipService: TableRelationshipService,
    private tableDataService: TableDataService,
    public tableFilterSortService: TableFilterSortService,
    private fieldManager: TableFieldManagerService,
    private phaseService: TablePhaseService,
    private keyboardService: TableKeyboardService,
    private notificationService: NotificationService,
    private schemaChangeHandler: SchemaChangeHandlerService,
    private projectService: ProjectService,
    private dataEditorService: TableDataEditorService,
    private viewManagerService: TableViewManagerService,
    private columnNameEditorService: TableColumnNameEditorService,
    private cdr: ChangeDetectorRef,
    private realtimeTableDataService: RealtimeTableDataService
  ) {
    // React to table changes - subscribe/unsubscribe to realtime data
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const table = this.table;
        if (!table || !this.isTableInputReady()) {
          return;
        }

        // Only subscribe if we haven't already subscribed to this table
        if (this.subscribedTableId !== table.id) {
          // Unsubscribe from previous table if exists
          if (this.subscribedTableId) {
            this.realtimeTableDataService.unsubscribeFromTable(this.subscribedTableId);
            this.currentDataSignal = null;
          }

          // Subscribe to new table
          this.subscribeToTableData(table);
          this.subscribedTableId = table.id;
          this.previousTableId = table.id;
        }
      });

      // React to tableData changes - apply filters and sort
      // Also watch the current data signal from realtime service
      effect(() => {
        // Watch both our tableData signal and the realtime signal
        if (this.currentDataSignal) {
          const realtimeData = this.currentDataSignal();
          this.tableData.set(realtimeData);
        }
        const data = this.tableData();
        this.applyFiltersAndSort();
      });

      // React to activeView changes and apply view to table
      effect(() => {
        // Skip if we're currently reordering columns to avoid recalculating during drag and drop
        if (this.isReorderingColumns) {
          return;
        }
        
        const view = this.activeView;
        const table = this.table;
        
        if (view && table && this.isTableInputReady()) {
          this.applyViewToTable(view);
          // Mark initialization as complete after applying view
          if (this.isInitializing()) {
            this.isInitializing.set(false);
          }
        } else if (table && this.isTableInputReady() && !view) {
          // No view - show all columns
          this.applyDefaultColumns();
          // Mark initialization as complete after applying default
          if (this.isInitializing()) {
            this.isInitializing.set(false);
          }
        }
      });
    });

    // Register keyboard shortcuts
    this.registerKeyboardShortcuts();
  }

  /**
   * Register keyboard shortcuts for table operations
   */
  private registerKeyboardShortcuts(): void {
    // Enter - Start editing current cell
    this.keyboardService.registerShortcut({
      key: 'Enter',
      action: () => {
        const selectedRows = Array.from(this.tableEditService.selectedRows());
        if (selectedRows.length === 1) {
          const rowIndex = selectedRows[0];
          // Find first editable column
          const editableColumn = this.regularColumns.find(col => !col.isAutoIncrement);
          if (editableColumn) {
            const element = this.paginatedData[rowIndex];
            if (element) {
              this.onStartEdit({
                rowIndex,
                columnName: 'reg_' + editableColumn.name,
                value: element[editableColumn.name]
              });
            }
          }
        }
      },
      description: 'Edit selected cell'
    });

    // Escape - Cancel editing
    this.keyboardService.registerShortcut({
      key: 'Escape',
      action: () => {
        this.onCancelEdit();
      },
      description: 'Cancel editing'
    });

    // Ctrl/Cmd+A - Select all visible rows
    this.keyboardService.registerShortcut({
      key: 'a',
      ctrl: true,
      action: () => {
        this.onSelectAllChange(true);
      },
      description: 'Select all rows'
    });

    // Delete - Delete selected rows
    this.keyboardService.registerShortcut({
      key: 'Delete',
      action: () => {
        const selectedRows = Array.from(this.tableEditService.selectedRows());
        if (selectedRows.length > 0) {
          this.deleteSelectedRows();
        }
      },
      description: 'Delete selected rows'
    });
  }

  ngAfterViewInit() {
    // If columns haven't been initialized yet and table is ready, do it now
    // This is a fallback in case effect() didn't run
    if (this.isTableInputReady() && this.regularColumns.length === 0 && !this.initializationAttempted) {
      if (this.activeView) {
        this.applyViewToTable(this.activeView);
      } else {
        this.applyDefaultColumns();
      }
      this.updatePagination();
      this.initializationAttempted = true;
      this.isInitializing.set(false);
    }
  }

  ngOnInit() {
    // Reset initializing flag when component initializes
    // Subscription will be handled by the effect() in constructor
    this.isInitializing.set(true);
  }

  ngOnDestroy() {
    // Cleanup subscription when component is destroyed
    if (this.subscribedTableId) {
      this.realtimeTableDataService.unsubscribeFromTable(this.subscribedTableId);
      this.subscribedTableId = null;
      this.currentDataSignal = null;
    }
  }

  /**
   * Subscribe to realtime data for a table
   */
  private async subscribeToTableData(table: Table): Promise<void> {
    try {
      const project = this.projectService.getCurrentProjectSync();
      if (!project) {
        console.warn('⚠️ [TableView] Cannot subscribe: no project');
        return;
      }

      const dataSignal = await this.realtimeTableDataService.subscribeToTable(
        project.organizationId,
        table
      );

      // Store the current data signal - the effect in constructor will watch it
      this.currentDataSignal = dataSignal;
      
      // Set initial data
      this.tableData.set(dataSignal());
    } catch (error) {
      console.error('❌ [TableView] Failed to subscribe to table data:', error);
      this.notificationService.showError('Failed to load table data');
    }
  }
  


  ngOnChanges(changes: SimpleChanges) {
    // Table changes are handled by the effect() in constructor
    // Just reinitialize columns if table changed
    if (changes['table'] && this.table && this.isTableInputReady()) {
      // Reinitialize columns
      if (this.activeView) {
        this.applyViewToTable(this.activeView);
      } else {
        this.applyDefaultColumns();
      }
    }
    
    // Handle activeView changes - apply view immediately
    if (changes['activeView']) {
      if (this.isTableInputReady()) {
        if (this.activeView) {
          this.applyViewToTable(this.activeView);
        } else {
          this.applyDefaultColumns();
        }
      }
    }
    
    // Always check if we need to initialize columns
    // This handles cases when table is passed but initialization hasn't happened yet
    if (this.isTableInputReady() && this.regularColumns.length === 0 && !this.initializationAttempted) {
      this.isInitializing.set(true);
      if (this.activeView) {
        this.applyViewToTable(this.activeView);
      } else {
        this.applyDefaultColumns();
      }
      this.updatePagination();
      this.initializationAttempted = true;
      this.isInitializing.set(false);
    }
  }

  // Delegate to services - simplified getters
  get isEditing() { return (rowIndex: number, columnName: string) => this.tableEditService.isEditing(rowIndex, columnName); }
  get isEditingColumnName() { return (columnId: string) => this.tableEditService.isEditingColumnName(columnId); }
  get editingValue() { return () => this.tableEditService.editingValue(); }
  get editingColumnNameValue() { return () => this.tableEditService.editingColumnNameValue(); }
  get isMultiSelectMode() { return () => this.tableEditService.isMultiSelectMode(); }
  get isRowSelected() { return (rowIndex: number) => this.tableEditService.isRowSelected(rowIndex); }
  get getSelectedCount() { return () => this.tableEditService.getSelectedCount(); }

  // Event handlers - inline simple ones, keep complex ones
  onOpenFilters = () => {
    this.filtersExpanded = !this.filtersExpanded;
  };

  onCloseFilters = () => {
    this.filtersExpanded = false;
  };

  onOpenSort = () => {
    // Open sort menu - will be handled by dropdown in toolbar
    // For now, toggle the sort panel (can be converted to dropdown later)
    // This is a placeholder - sort will be handled via menu
  };

  onOpenColumns = () => {
    // Open columns menu - will be handled by dropdown in toolbar
    // This is a placeholder - columns will be handled via menu
  };

  onSearchChanged = (searchValue: string) => {
    this.searchQuery.set(searchValue);
    this.applyFiltersAndSort();
  };
  onOpenViewManager = () => this.openViewManager();
  onToggleMultiSelect = () => this.tableEditService.toggleMultiSelectMode();
  onDeleteSelected = () => this.deleteSelectedRows();
  onClearSelection = () => this.tableEditService.clearSelection();
  onStartEdit = (event: {rowIndex: number, columnName: string, value: any}) => 
    this.tableEditService.startEdit(event.rowIndex, event.columnName, event.value);

  onTabNext = (event: {rowIndex: number, columnName: string}) => {
    if (!this.temporaryRecord) return;
    
    // First, ensure the current field value is saved to the record
    const currentColumnName = event.columnName.replace('reg_', '');
    const currentColumn = this.table.columns.find(col => col.name === currentColumnName);
    if (currentColumn) {
      let currentValue = this.temporaryRecord[currentColumn.name];
      if (currentValue === undefined || currentValue === null || currentValue === '') {
        currentValue = this.tableEditService.editingValue();
      }
      const parsedValue = this.tableEditService.parseValue(String(currentValue || ''), currentColumn.name, this.table);
      this.temporaryRecord[currentColumn.name] = parsedValue;
    }
    
    // Validate that previous required fields are filled
    const validation = this.dataEditorService.validatePreviousRequiredFields(
      this.temporaryRecord,
      this.table,
      currentColumnName
    );
    
    if (!validation.isValid) {
      const missingFieldsStr = validation.missingFields.join(', ');
      this.notificationService.showError(
        `Please fill required fields before proceeding: ${missingFieldsStr}`
      );
      
      const rowElement = document.querySelector(`tr[mat-row].temporary-row`);
      if (rowElement) {
        rowElement.classList.add('bounce');
        setTimeout(() => rowElement.classList.remove('bounce'), 600);
      }
      return;
    }
    
    // Get next editable column
    const nextColumn = this.dataEditorService.getNextEditableColumn(this.table, currentColumnName);
    
    if (nextColumn) {
      const nextColumnName = 'reg_' + nextColumn.name;
      setTimeout(() => {
        const inputElement = document.querySelector(
          `tr[mat-row].temporary-row td[mat-cell] app-table-cell[ng-reflect-column-name="${nextColumnName}"] input`
        ) as HTMLInputElement;
        if (inputElement) {
          inputElement.focus();
          inputElement.select();
        }
      }, 0);
    } else {
      // No more columns, check if all required fields are filled and save
      if (this.dataEditorService.validateRequiredFields(this.temporaryRecord, this.table)) {
        this.autoSaveTemporaryRecord();
      } else {
        const validationDetails = this.dataEditorService.validateRequiredFields(
          this.temporaryRecord,
          this.table,
          true
        ) as { isValid: boolean; missingFields: string[] };
        const missingFieldsStr = validationDetails.missingFields.join(', ');
        this.notificationService.showError(
          `Please fill all required fields: ${missingFieldsStr}`
        );
        
        const rowElement = document.querySelector(`tr[mat-row].temporary-row`);
        if (rowElement) {
          rowElement.classList.add('bounce');
          setTimeout(() => rowElement.classList.remove('bounce'), 600);
        }
      }
    }
  };
  onValueChange = (valueOrEvent: any) => {
    // Check if this is an always-editing mode event (has columnName and rowIndex)
    if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.columnName && valueOrEvent.rowIndex !== undefined) {
      // Always-editing mode: update the record directly
      if (this.temporaryRecord) {
        const columnName = valueOrEvent.columnName.replace('reg_', '');
        const column = this.table.columns.find(col => col.name === columnName);
        if (column) {
          const parsedValue = this.tableEditService.parseValue(String(valueOrEvent.value || ''), column.name, this.table);
          this.temporaryRecord[column.name] = parsedValue;
          
          // Update filtered data to reflect change
          this.applyFiltersAndSort();
          
          // Check if all required fields are now complete
          if (this.dataEditorService.validateRequiredFields(this.temporaryRecord, this.table)) {
            if (this.autoSaveTimeout) {
              clearTimeout(this.autoSaveTimeout);
            }
            this.autoSaveTimeout = setTimeout(() => {
              this.autoSaveTemporaryRecord();
              this.autoSaveTimeout = null;
            }, 1000);
          }
        }
      }
    } else {
      // Regular editing mode: update the editing value
      this.tableEditService.updateEditingValue(valueOrEvent);
    }
  };
  
  onSaveEdit = (rowIndex: number, columnName: string, element: any) => {
    // For temporary records in always-editing mode
    if (element._isTemporary && element === this.temporaryRecord) {
      const actualColumnName = columnName.replace('reg_', '');
      const column = this.table.columns.find(col => col.name === actualColumnName);
      if (column) {
        let currentValue = element[column.name];
        if (currentValue === undefined || currentValue === null || currentValue === '') {
          const inputElement = document.querySelector(
            `tr[mat-row].temporary-row td[mat-cell] app-table-cell[ng-reflect-column-name="${columnName}"] input`
          ) as HTMLInputElement;
          if (inputElement) {
            currentValue = inputElement.value;
          } else {
            currentValue = this.tableEditService.editingValue();
          }
        }
        
        const parsedValue = this.tableEditService.parseValue(String(currentValue || ''), column.name, this.table);
        this.temporaryRecord[column.name] = parsedValue;
        
        // Update filtered data
        this.applyFiltersAndSort();
        
        // Validate and auto-save if valid
        setTimeout(() => {
          const isValid = this.dataEditorService.validateRequiredFields(this.temporaryRecord, this.table);
          if (isValid) {
            this.autoSaveTemporaryRecord();
          } else {
            const validationDetails = this.dataEditorService.validateRequiredFields(
              this.temporaryRecord,
              this.table,
              true
            ) as { isValid: boolean; missingFields: string[] };
            if (validationDetails.missingFields.length > 0) {
              const missingFieldsStr = validationDetails.missingFields.join(', ');
              this.notificationService.showError(
                `Please fill all required fields before saving: ${missingFieldsStr}`
              );
              
              const rowElement = document.querySelector(`tr[mat-row].temporary-row`);
              if (rowElement) {
                rowElement.classList.add('bounce');
                setTimeout(() => rowElement.classList.remove('bounce'), 600);
              }
            }
          }
        }, 0);
      }
      return;
    }
    
    // Regular record save - realtime will handle the update
    this.dataEditorService.saveEdit(
      rowIndex,
      columnName,
      element,
      this.table,
      this.tableData(),
      (event) => this.dataChanged.emit(event)
    );
  };
  
  private autoSaveTemporaryRecord() {
    if (!this.temporaryRecord) {
      return;
    }
    
    // Validate one more time before saving
    if (!this.dataEditorService.validateRequiredFields(this.temporaryRecord, this.table)) {
      const validationDetails = this.dataEditorService.validateRequiredFields(
        this.temporaryRecord,
        this.table,
        true
      ) as { isValid: boolean; missingFields: string[] };
      const missingFieldsStr = validationDetails.missingFields.join(', ');
      this.notificationService.showError(
        `Cannot save: missing required fields: ${missingFieldsStr}`
      );
      return;
    }
    
    // Store reference to the record before clearing
    const recordToSave = { ...this.temporaryRecord };
    delete recordToSave._isTemporary;
    
    // Save the record
    this.notificationService.showOperationStatus(
      async () => {
        // Emit data change event (parent will handle Supabase insert)
        // Realtime subscription will automatically add the new record
        const event = this.tableDataService.prepareCreateEvent(this.table, recordToSave);
        this.dataChanged.emit(event);
        
        // Clear temporary record - realtime will add the permanent record
        this.temporaryRecord = null;
        
        // Update display
        this.applyFiltersAndSort();
        
        return { success: true };
      },
      'Saving record...',
      'Record saved successfully'
    );
  }
  onCancelEdit = () => {
    // If canceling edit on temporary record, remove it
    if (this.temporaryRecord) {
      this.temporaryRecord = null;
      // Update display
      this.applyFiltersAndSort();
    }
    this.tableEditService.cancelEdit();
  };
  onStartEditColumnName = (event: {columnId: string, currentName: string}) => 
    this.tableEditService.startEditColumnName(event.columnId, event.currentName);
  onUpdateEditingColumnNameValue = (value: string) => this.tableEditService.updateEditingColumnNameValue(value);
  onSaveColumnName = (event: {columnId: string, newName: string}) => 
    this.columnNameEditorService.saveColumnName(
      event.columnId,
      event.newName,
      this.table,
      this.allTables,
      this.relationships,
      this.relationshipDisplayColumns
    );
  onCancelEditColumnName = () => this.tableEditService.cancelEditColumnName();
  onStartEditRelationship = (event: {rowIndex: number, relCol: RelationshipDisplayColumn, field: any, element: any}) => {
    // Relationship editing handled by relationship service
    this.tableRelationshipService.startEditRelationship(event.rowIndex, event.relCol, event.field, event.element);
  };
  onSaveEditRelationship = (rowIndex: number, viewColumn: any, element: any) => {
    // Relationship saving handled by relationship service
    this.tableRelationshipService.saveEditRelationship(rowIndex, viewColumn, element, this.table, (event: DataChangeEvent) => this.dataChanged.emit(event));
  };
  onRowClick = (rowIndex: number, event: MouseEvent) => {
    if (this.tableEditService.isMultiSelectMode()) {
      this.tableEditService.toggleRowSelection(rowIndex);
    }
  }
  onRowSelectionChange = (rowIndex: number, event: any) => 
    this.tableEditService.toggleRowSelection(rowIndex);
  onSelectAllChange = (checked: boolean) => {
    if (checked) {
      this.tableEditService.selectAllVisibleRows(this.paginatedData.length);
    } else {
      this.tableEditService.clearSelection();
    }
  }

  onAddField = async () => {
    if (!this.table) {
      return;
    }

    const newColumn = await this.fieldManager.addField(this.table);
    
    if (newColumn) {
      // Refresh table columns - the schema change will trigger a reload
      // We need to wait for the project to update, then refresh the view
      // The effect() in constructor should handle this automatically
    }
  }

  onPageChange(event: any) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.updatePagination();
  }

  onPaginatedDataChanged(data: any[]) {
    this.paginatedData = data;
  }

  getColumnWidth = (columnId: string): number | undefined => {
    if (!this.activeView || !this.activeView.columnSettings) {
      return undefined;
    }
    
    const setting = this.activeView.columnSettings.find(s => s.columnId === columnId);
    return setting?.width;
  }

  onColumnResized = (event: {columnId: string, width: number}) => {
    if (!this.activeView) {
      return;
    }

    // Update the column width in the view settings
    const setting = this.activeView.columnSettings.find(s => s.columnId === event.columnId);
    if (setting) {
      setting.width = event.width;
      // Persist the view update
      this.viewUpdated.emit(this.activeView);
    }
  }

  onPhaseChanged = (event: {rowIndex: number, phaseId: string | null}) => {
    if (event.rowIndex >= 0 && event.rowIndex < this.paginatedData.length) {
      const row = this.paginatedData[event.rowIndex];
      if (row) {
        row._phaseId = event.phaseId;
        // Emit data change event to persist the phase
        this.dataChanged.emit({
          type: 'UPDATE',
          table: this.table!.name,
          data: row,
          id: row.id
        });
      }
    }
  }

  // Helper methods
  
  /**
   * Applies a view to the table - updates regularColumns and relationshipColumns
   * This is called automatically when activeView changes via effect()
   */
  private applyViewToTable(view: TableView): void {
    const result = this.viewManagerService.applyViewToTable(this.table, view);
    this.regularColumns = result.regularColumns;
    this.relationshipColumns = result.relationshipColumns;
    this.updatePagination();
  }

  /**
   * Applies default columns (all columns) when no view is active
   */
  private applyDefaultColumns(): void {
    const result = this.viewManagerService.applyDefaultColumns(this.table);
    this.regularColumns = result.regularColumns;
    this.relationshipColumns = result.relationshipColumns;
    this.updatePagination();
  }


  private updatePagination() {
    try {
      const filtered = this.filteredData();
      const startIndex = this.currentPage * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      
      if (!filtered || filtered.length === 0) {
        this.paginatedData = [];
        return;
      }
      
      this.paginatedData = [...filtered.slice(startIndex, endIndex)];
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('❌ updatePagination - error:', error);
      this.paginatedData = [];
      throw error;
    }
  }

  onStartAddRecord = () => {
    // Prevent adding if there's already a temporary record
    if (this.temporaryRecord) {
      return;
    }
    
    // Create temporary record
    const currentData = this.tableData();
    const newRecord = this.tableDataService.createRecord(this.table, currentData);
    newRecord._isTemporary = true; // Mark as temporary
    
    // Set as single temporary record
    this.temporaryRecord = newRecord;
    
    // Update display (will append temporary record to filtered data)
    this.applyFiltersAndSort();
    
    // Navigate to last page where temporary record will appear
    const filteredData = this.filteredData();
    const recordIndex = filteredData.length - 1; // Always at end
    const recordPage = Math.floor(recordIndex / this.pageSize);
    if (recordPage !== this.currentPage) {
      this.currentPage = recordPage;
    }
    
    this.updatePagination();
    
    // Focus the first editable field after a short delay
    setTimeout(() => {
      if (newRecord) {
        const editableColumn = this.table.columns.find(col => !col.isAutoIncrement && !col.isAutoGenerate && !col.isPrimaryKey);
        if (editableColumn) {
          setTimeout(() => {
            const inputElement = document.querySelector(
              `tr[mat-row].temporary-row td[mat-cell] app-table-cell[ng-reflect-column-name="reg_${editableColumn.name}"] input`
            ) as HTMLInputElement;
            if (inputElement) {
              inputElement.focus();
            }
          }, 100);
        }
      }
    }, 100);
  }



  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Check if click is outside the temporary record row
    if (this.temporaryRecord) {
      const target = event.target as HTMLElement;
      const tableElement = document.getElementById(`table-${this.table?.id}`);
      
      // Check if click is on an input, button, or other interactive element within the table
      const isInteractiveElement = target.tagName === 'INPUT' || 
                                   target.tagName === 'BUTTON' || 
                                   target.tagName === 'SELECT' ||
                                   target.closest('mat-form-field') ||
                                   target.closest('app-modern-input') ||
                                   target.closest('.mat-mdc-form-field');
      
      // If clicking on interactive elements within the table, don't remove
      if (tableElement && tableElement.contains(target) && isInteractiveElement) {
        return;
      }
      
      // Check if click is on the temporary row or its cells
      const clickedRow = target.closest('tr[mat-row]');
      const isTemporaryRow = clickedRow && clickedRow.classList.contains('temporary-row');
      
      // If clicking on the temporary row itself, don't remove it
      if (isTemporaryRow) {
        return;
      }
      
      if (tableElement && !tableElement.contains(target)) {
        // Click outside table - remove temporary record if incomplete
        if (!this.dataEditorService.validateRequiredFields(this.temporaryRecord, this.table)) {
          this.temporaryRecord = null;
          this.applyFiltersAndSort();
        }
      } else if (clickedRow && !isTemporaryRow) {
        // Click on a different row - remove temporary record if incomplete
        if (!this.dataEditorService.validateRequiredFields(this.temporaryRecord, this.table)) {
          this.temporaryRecord = null;
          this.applyFiltersAndSort();
        }
      }
    }
  }



  private deleteSelectedRows() {
    const selectedIndices = Array.from(this.tableEditService.selectedRows());
    selectedIndices.sort((a, b) => b - a); // Sort in descending order
    
    selectedIndices.forEach(index => {
      const element = this.paginatedData[index];
      if (element && !element._isTemporary) {
        // Emit delete event - realtime will handle removal
        this.dataChanged.emit(this.tableDataService.prepareDeleteEvent(this.table, element));
      }
    });
    
    this.tableEditService.clearSelection();
  }

  onDeleteRow = (event: {rowIndex: number, element: any}) => {
    const { rowIndex, element } = event;
    
    // Don't delete temporary records this way
    if (element._isTemporary) {
      return;
    }
    
    // Emit delete event - realtime will handle removal
    this.dataChanged.emit(this.tableDataService.prepareDeleteEvent(this.table, element));
  };

  onEditSchema = () => {
    if (!this.table) {
      return;
    }

    const dialogRef = this.dialog.open(SchemaEditorDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: {
        table: this.table,
        allTables: this.allTables
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (result) {
          // Schema was updated, the effect() will handle refreshing the view
          this.notificationService.showSuccess('Schema updated successfully');
        }
      });
  }

  private openViewManager() {
    const dialogRef = this.dialog.open(ViewConfigDialogComponent, {
      width: '800px',
      data: {
        table: this.table,
        views: this.views,
        activeView: this.activeView
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
      if (result) {
        if (this.activeView) {
          this.viewUpdated.emit(result);
        } else {
          this.viewCreated.emit(result);
        }
      }
    });
  }

  onColumnDrop(event: CdkDragDrop<any[]>) {
    // Set flag to prevent effect from recalculating during reorder
    this.isReorderingColumns = true;
    
    try {
      this.viewManagerService.handleColumnDrop(
        event,
        this.regularColumns,
        this.activeView,
        this.table,
        (view) => this.viewUpdated.emit(view),
        (regularColumns, relationshipColumns) => {
          this.regularColumns = regularColumns;
          this.relationshipColumns = relationshipColumns;
        }
      );
      
      this.updatePagination();
    } catch (error: any) {
      // Error handled by viewManagerService
    } finally {
      // Reset flag after a short delay to allow the emit to complete
      setTimeout(() => {
        this.isReorderingColumns = false;
      }, 100);
    }
  }

  getRelationshipType = (viewColumn: any): string => 
    this.tableRelationshipService.getRelationshipType(viewColumn);

  getRelationshipDisplayColumn = (viewColumn: any): RelationshipDisplayColumn | null => 
    this.tableRelationshipService.getRelationshipDisplayColumn(viewColumn, this.relationshipDisplayColumns);

  getRelationshipOptions = (viewColumn: any): { value: string; label: string }[] => 
    this.tableRelationshipService.getRelationshipOptions(viewColumn);

  isEditingRelationship = (rowIndex: number, relColId: string, fieldIndex: number): boolean => 
    this.tableRelationshipService.isEditingRelationship(rowIndex, relColId, fieldIndex);

  isAllSelected(): boolean {
    return this.paginatedData.length > 0 && this.paginatedData.every((_, index) => this.isRowSelected(index));
  }

  isPartiallySelected(): boolean {
    const selectedCount = this.paginatedData.filter((_, index) => this.isRowSelected(index)).length;
    return selectedCount > 0 && selectedCount < this.paginatedData.length;
  }
  // Filters, Sort, and Column Management Methods
  getAvailableColumnsForFilters(): Array<{ id: string; name: string }> {
    return this.tableFilterSortService.getAvailableColumnsForFilters(this.table);
  }

  getActiveFiltersForComponent(): FilterCondition[] {
    const serviceFilters = this.tableFilterSortService.activeFilters();
    return serviceFilters.map(f => {
      const column = this.table.columns.find(c => c.id === f.columnId);
      return {
        columnId: f.columnId,
        columnName: column?.name || f.columnId,
        operator: f.operator as any,
        value: String(f.value || '')
      };
    });
  }

  getSortColumnsForComponent(): SortColumn[] {
    const serviceSorts = this.tableFilterSortService.sortColumns();
    return serviceSorts.map(s => {
      const column = this.table.columns.find(c => c.id === s.columnId);
      return {
        columnId: s.columnId,
        columnName: column?.name || s.columnId,
        direction: s.direction
      };
    });
  }

  private isUpdatingFilters = false; // Flag to prevent infinite loops

  onFiltersChanged(filters: FilterCondition[]): void {
    if (this.isUpdatingFilters) {
      return;
    }
    
    try {
      this.isUpdatingFilters = true;
      // Convert component FilterCondition to service FilterCondition
      const serviceFilters = filters.map(f => ({
        columnId: f.columnId,
        operator: f.operator === 'starts_with' ? 'startsWith' as const :
                  f.operator === 'ends_with' ? 'endsWith' as const :
                  f.operator === 'greater_than' ? 'greaterThan' as const :
                  f.operator === 'less_than' ? 'lessThan' as const :
                  f.operator === 'equals' ? 'equals' as const :
                  'contains' as const,
        value: f.value
      }));
      
      this.tableFilterSortService.setFilters(serviceFilters);
      this.applyFiltersAndSort();
      
      setTimeout(() => {
        this.isUpdatingFilters = false;
      }, 0);
    } catch (error: any) {
      this.isUpdatingFilters = false;
      throw error;
    }
  }

  onSortChanged(sorts: SortColumn[]): void {
    // Convert component SortColumn to service SortColumn
    const serviceSorts = sorts.map(s => ({
      columnId: s.columnId,
      direction: s.direction
    }));
    this.tableFilterSortService.setSortColumns(serviceSorts);
    this.applyFiltersAndSort();
  }

  private applyFiltersAndSort(): void {
    try {
      // Get current table data
      let data = this.tableData();
      
      // Apply search filter first
      const searchQuery = this.searchQuery().toLowerCase().trim();
      if (searchQuery) {
        data = data.filter(record => {
          // Search across all column values
          return this.table.columns.some(column => {
            const value = record[column.name];
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(searchQuery);
          });
        });
      }
      
      // Apply filters and sort to table data
      const processedData = this.tableFilterSortService.applyFiltersAndSort(data, this.table);
      
      // Append temporary record at the end if it exists
      const finalData = this.temporaryRecord 
        ? [...processedData, this.temporaryRecord]
        : processedData;
      
      // Update filtered data signal
      this.filteredData.set(finalData);
      
      // Don't reset page when filters change if we have a temporary record
      if (!this.temporaryRecord) {
        this.currentPage = 0; // Reset to first page when filters change
      }
      
      this.updatePagination();
    } catch (error: any) {
      console.error('❌ applyFiltersAndSort - ERROR:', error);
      throw error;
    }
  }

  onColumnsChanged(settings: ColumnSetting[]): void {
    this.columnSettings = settings;
    // Update column visibility and order
    // TODO: Apply column settings to active view or create new view
    if (this.activeView) {
      this.applyViewToTable(this.activeView);
    } else {
      this.applyDefaultColumns();
    }
  }
}


