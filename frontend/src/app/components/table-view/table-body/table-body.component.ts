import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Table, TableColumn, RelationshipDisplayColumn, Phase } from '../../../models/table.model';

// Import child components
import { TableHeaderComponent } from '../../table-header/table-header.component';
import { TableCellComponent } from '../../table-cell/table-cell.component';
import { RelationshipCellComponent } from '../../relationship-cell/relationship-cell.component';
import { PhaseCellComponent } from '../../phase-cell/phase-cell.component';

@Component({
  selector: 'app-table-body',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TableHeaderComponent,
    TableCellComponent,
    RelationshipCellComponent,
    PhaseCellComponent
  ],
  template: `
    <!-- Skeleton Loader while no columns -->
    @if (!hasColumns()) {
      <div class="table-skeleton">
        <div class="skeleton-header">
          @for (col of [1, 2, 3, 4]; track col) {
            <div class="skeleton-header-cell"></div>
          }
        </div>
        @for (row of [1, 2, 3, 4, 5]; track row) {
          <div class="skeleton-row">
            @for (col of [1, 2, 3, 4]; track col) {
              <div class="skeleton-cell"></div>
            }
          </div>
        }
      </div>
    }
    
    <!-- Table - Only render when we have columns -->
    @if (hasColumns()) {
    <table mat-table #matTable [dataSource]="dataSourceWithAddRow()" class="data-table">
      <!-- Regular Columns -->
      @for (column of regularColumns(); track column.id; let colIndex = $index) {
        <ng-container [matColumnDef]="'reg_' + column.name">
          <th mat-header-cell *matHeaderCellDef class="sticky-header">
            <app-table-header
              [column]="column"
              [canDrag]="canDrag"
              [isEditingColumnName]="getSafeIsEditingColumnName(column.id)"
              [editingColumnNameValue]="editingColumnNameValue?.() || ''"
              [columnWidth]="getColumnWidth?.(column.id)"
              (startEditColumnName)="onStartEditColumnName.emit($event)"
              (updateEditingColumnNameValue)="onUpdateEditingColumnNameValue.emit($event)"
              (saveColumnName)="onSaveColumnName.emit($event)"
              (cancelEditColumnName)="onCancelEditColumnName.emit()"
              (columnResized)="onColumnResized.emit($event)">
            </app-table-header>
          </th>
          
          <td mat-cell *matCellDef="let element; let i = index"
              [class.required-field]="isRequiredFieldEmpty(element, column)"
              [class.required-field-filled]="isRequiredFieldFilled(element, column)"
              [attr.colspan]="element._isAddRow && colIndex === 0 ? displayedColumns().length - 1 : null">
            @if (!element._isAddRow) {
              <!-- Render cell for regular rows and temporary rows -->
              <app-table-cell
                [rowIndex]="i"
                [columnName]="'reg_' + column.name"
                [value]="element[column.name]"
                [column]="column"
                [isEditing]="getSafeIsEditing(i, 'reg_' + column.name)"
                [editingValue]="editingValue?.()"
                [selectOptions]="[]"
                [isTemporaryRow]="element._isTemporary || false"
                (startEdit)="onStartEdit.emit($event)"
                (valueChange)="onValueChange.emit($event)"
                (save)="onSaveEdit.emit({rowIndex: i, columnName: 'reg_' + column.name, element})"
                (cancel)="onCancelEdit.emit()"
                (tabNext)="onTabNext.emit({rowIndex: i, columnName: 'reg_' + column.name})">
              </app-table-cell>
            } @else if (colIndex === 0) {
              <!-- Add Record Button Row -->
              <div class="add-row-cell" (click)="$event.stopPropagation()">
                <button class="add-row-button" 
                        (click)="handleAddRecordClick($event)" 
                        type="button"
                        #addRecordButton>
                  <mat-icon>add</mat-icon>
                  <span>Add Record</span>
                </button>
              </div>
            }
          </td>
        </ng-container>
      }

      <!-- Relationship Columns -->
      @for (viewColumn of relationshipColumns(); track viewColumn.columnId) {
        <ng-container [matColumnDef]="'rel_' + viewColumn.columnId">
          <th mat-header-cell *matHeaderCellDef class="sticky-header">
            <div class="relationship-header">
              <span class="relationship-title">{{ viewColumn.displayName }}</span>
              <span class="relationship-type">{{ getRelationshipType?.(viewColumn) }}</span>
            </div>
          </th>
          
          <td mat-cell *matCellDef="let element; let i = index">
            @if (!element._isAddRow && getRelationshipDisplayColumn?.(viewColumn)) {
              <app-relationship-cell
                [rowIndex]="i"
                [relationshipDisplayColumn]="getRelationshipDisplayColumn!(viewColumn)!"
                [element]="element"
                [allTables]="allTables"
                [allTableData]="allTableData"
                [isEditing]="getSafeIsEditingRelationship(i, viewColumn.columnId, 0)"
                [editingValue]="editingValue?.()"
                [relationshipOptions]="getSafeRelationshipOptions(viewColumn)"
                (startEdit)="onStartEditRelationship.emit($event)"
                (valueChange)="onValueChange.emit($event)"
                (save)="onSaveEditRelationship.emit({rowIndex: i, viewColumn, element})"
                (cancel)="onCancelEdit.emit()">
              </app-relationship-cell>
            }
          </td>
        </ng-container>
      }

      <!-- Phase Column (if table has phases) -->
      @if (hasPhases && phases().length > 0) {
        <ng-container matColumnDef="phase">
          <th mat-header-cell *matHeaderCellDef class="sticky-header">
            <div class="phase-header">Phase</div>
          </th>
          <td mat-cell *matCellDef="let element; let i = index">
            @if (!element._isAddRow) {
              <app-phase-cell
                [phases]="phases()"
                [currentPhaseId]="getPhaseIdForRow?.(element) || null"
                [isEditing]="getSafeIsEditingPhase(i)"
                (phaseChanged)="onPhaseChanged.emit({rowIndex: i, phaseId: $event})">
              </app-phase-cell>
            }
          </td>
        </ng-container>
      }

      <!-- Row Selection Column -->
      @if (isMultiSelectMode?.()) {
        <ng-container matColumnDef="select">
          <th mat-header-cell *matHeaderCellDef class="sticky-header">
            <mat-checkbox 
              [checked]="getSafeIsAllSelected()"
              [indeterminate]="getSafeIsPartiallySelected()"
              (change)="onSelectAllChange.emit($event.checked)">
            </mat-checkbox>
          </th>
          <td mat-cell *matCellDef="let element; let i = index">
            @if (!element._isAddRow) {
              <mat-checkbox 
                [checked]="getSafeIsRowSelected(i)"
                (change)="onRowSelectionChange.emit({rowIndex: i, checked: $event.checked})">
              </mat-checkbox>
            }
          </td>
        </ng-container>
      }

      <!-- Actions Column -->
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef class="sticky-header actions-header">
          <button mat-icon-button 
                  class="add-field-button"
                  (click)="onAddField.emit()"
                  matTooltip="Add Field"
                  matTooltipPosition="below">
            <mat-icon>add</mat-icon>
          </button>
        </th>
        <td mat-cell *matCellDef="let element; let i = index" class="actions-cell">
          @if (element._isTemporary && isTemporaryRecordValid && isTemporaryRecordValid(element)) {
            <!-- Check button for valid temporary records -->
            <button mat-icon-button 
                    class="save-temporary-record-button"
                    (click)="onSaveTemporaryRecord && onSaveTemporaryRecord(element); $event.stopPropagation()"
                    matTooltip="Save Record"
                    matTooltipPosition="below"
                    [class.valid]="true">
              <mat-icon>check</mat-icon>
            </button>
          } @else if (!element._isAddRow && !element._isTemporary) {
            <!-- Delete button for regular rows -->
            <button mat-icon-button 
                    class="delete-row-button"
                    (click)="onDeleteRow && onDeleteRow.emit({rowIndex: i, element}); $event.stopPropagation()"
                    matTooltip="Delete Row"
                    matTooltipPosition="below">
              <mat-icon>delete</mat-icon>
            </button>
          }
        </td>
      </ng-container>

      <!-- ROWS - Always render when table is rendered (we already checked displayedColumns.length > 0) -->
      <tr mat-header-row *matHeaderRowDef="displayedColumns(); sticky: true"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns(); let i = index"
          [class.selected]="!row._isAddRow && !row._isTemporary && getSafeIsRowSelected(i)"
          [class.hover]="false"
          [class.add-row]="row._isAddRow"
          [class.temporary-row]="row._isTemporary"
          (click)="row._isAddRow ? handleAddRecordClick($event) : (row._isTemporary ? null : onRowClick.emit({rowIndex: i, event: $event}))"
          (mouseenter)="row._isAddRow || row._isTemporary ? null : onRowHover.emit({rowIndex: i, isHovering: true})"
          (mouseleave)="row._isAddRow || row._isTemporary ? null : onRowHover.emit({rowIndex: i, isHovering: false})">
        @if (row._isTemporary) {
          <!-- Debug: Log temporary row -->
          <!-- This will help us see if the row is being rendered -->
        }
      </tr>
    </table>
    }
  `,
  styles: [`
    .data-table {
      width: 100%;
      max-width: 100%;
      table-layout: auto;
      display: table;
      box-sizing: border-box;
      border-collapse: separate;
      border-spacing: 0;
    }

    /* Ensure table respects container width */
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    /* Prevent table cells from expanding when editing */
    .data-table td[mat-cell] {
      overflow: hidden;
      position: relative;
    }

    /* Ensure cell content doesn't expand beyond cell width */
    .data-table td[mat-cell] app-table-cell {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
      box-sizing: border-box;
    }

    tr[mat-row] {
      transition: background-color 150ms ease-out;
      cursor: pointer;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    tr[mat-row]:hover:not(.add-row):not(.temporary-row) {
      background-color: rgba(0, 0, 0, 0.02);
    }

    tr[mat-row].selected {
      background-color: var(--theme-primary-container);
    }

    tr[mat-row].selected:hover {
      background-color: var(--theme-primary-container);
      opacity: 0.95;
    }

    td[mat-cell] {
      transition: background-color 150ms ease-out;
      border-right: 1px solid rgba(0, 0, 0, 0.04);
      overflow: visible; /* Allow editing border to show */
      position: relative;
      vertical-align: middle;
    }

    td[mat-cell]:last-child {
      border-right: none;
    }

    /* Prevent cells from expanding when editing */
    td[mat-cell] app-table-cell {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      overflow: visible; /* Allow editing border to show */
    }
    
    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: rgba(0, 0, 0, 0.02);
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      height: 44px;
    }

    .actions-header {
      min-width: 60px;
      text-align: center;
      padding: 8px;
    }

    .actions-cell {
      text-align: center;
      padding: 4px !important;
      width: 60px;
    }

    .add-field-button {
      color: var(--theme-primary);
    }

    .add-field-button:hover {
      background-color: var(--theme-primary-container);
    }

    .delete-row-button {
      color: var(--theme-error);
      opacity: 0.6;
      transition: opacity 0.2s ease;
    }

    .delete-row-button:hover {
      opacity: 1;
      background-color: var(--theme-error-container);
    }
    
    .relationship-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .relationship-title {
      font-weight: 500;
      color: var(--theme-text-primary);
    }
    
    .relationship-type {
      font-size: 12px;
      color: var(--theme-text-secondary);
    }

    .phase-header {
      font-weight: 500;
      color: var(--theme-text-primary);
    }

    /* Add Row Button Styles - Clean inline design */
    tr[mat-row].add-row {
      background-color: transparent;
      border-top: none;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      min-height: 40px;
    }

    tr[mat-row].add-row:hover {
      background-color: transparent;
    }

    .add-row-cell {
      padding: 8px 12px !important;
      text-align: left;
      height: 40px;
    }

    .add-row-button {
      width: auto;
      height: auto;
      padding: 6px 12px;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
      gap: 6px;
      color: var(--theme-text-secondary);
      font-size: 13px;
      font-weight: 500;
      transition: all 150ms ease-out;
      position: relative;
    }
    
    .add-row-button:disabled,
    .add-row-button[disabled] {
      opacity: 1 !important;
      cursor: pointer !important;
      pointer-events: auto !important;
    }

    .add-row-button:hover {
      background-color: rgba(0, 0, 0, 0.04);
      color: var(--theme-primary);
    }

    .add-row-button:active {
      background-color: rgba(0, 0, 0, 0.06);
    }

    .add-row-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Temporary Row Styles - Clean inline editing */
    tr[mat-row].temporary-row {
      background-color: transparent;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    tr[mat-row].temporary-row:hover {
      opacity: 1;
      border-color: var(--theme-primary);
    }

    tr[mat-row].temporary-row td {
      padding: 2px 4px !important;
      height: auto;
      min-height: 32px;
      vertical-align: middle;
    }

    tr[mat-row].temporary-row td[mat-cell] {
      padding: 2px 4px !important;
    }

    tr[mat-row].temporary-row td.required-field,
    tr[mat-row].temporary-row td.required-field-filled {
      padding: 2px 4px !important;
      border-width: 1px !important;
    }

    tr[mat-row].temporary-row.bounce {
      animation: bounce 0.6s ease;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      25% { transform: translateY(-10px); }
      50% { transform: translateY(0); }
      75% { transform: translateY(-5px); }
    }

    @keyframes pulse {
      0%, 100% { 
        background-color: var(--theme-primary-container);
        border-color: var(--theme-outline);
      }
      50% { 
        background-color: var(--theme-secondary-container);
        border-color: var(--theme-primary);
      }
    }

    /* Responsive styles for temporary row */
    @media (max-width: 768px) {
      tr[mat-row].temporary-row td {
        padding: 8px 12px;
        font-size: 14px;
      }
    }

    /* Required Field Styles */
    td[mat-cell].required-field {
      background-color: var(--theme-error-container);
      border: 2px solid var(--theme-error);
    }

    td[mat-cell].required-field-filled {
      background-color: var(--theme-success-container);
      border: 2px solid var(--theme-success, #4caf50);
    }

    .add-field-cell {
      text-align: center;
    }
    
    /* Skeleton Loader Styles */
    .table-skeleton {
      width: 100%;
      padding: 16px;
      background-color: var(--theme-surface);
      border-radius: 8px;
    }

    .skeleton-header {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--theme-divider);
    }

    .skeleton-header-cell {
      flex: 1;
      height: 32px;
      background: linear-gradient(
        90deg,
        var(--theme-surface-variant) 25%,
        var(--theme-background) 50%,
        var(--theme-surface-variant) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }

    .skeleton-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }

    .skeleton-cell {
      flex: 1;
      height: 48px;
      background: linear-gradient(
        90deg,
        var(--theme-surface-variant) 25%,
        var(--theme-background) 50%,
        var(--theme-surface-variant) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }

    @keyframes skeleton-loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `]
})
export class TableBodyComponent implements OnInit, OnChanges {
  // Data inputs
  @Input() dataSource: any[] = [];
  private dataSourceSignal = signal<any[]>([]);
  @Input() regularColumns: () => TableColumn[] = () => [];
  @Input() relationshipColumns: () => any[] = () => [];
  
  // Configuration inputs
  @Input() isMultiSelectMode?: () => boolean;
  @Input() canDrag = false;
  @Input() allTables: Table[] = [];
  @Input() allTableData: { [tableName: string]: any[] } = {};
  
  // Callback functions
  @Input() isEditing?: (rowIndex: number, columnName: string) => boolean;
  @Input() editingValue?: () => any;
  @Input() isEditingColumnName?: (columnId: string) => boolean;
  @Input() editingColumnNameValue?: () => string;
  @Input() isRowSelected?: (rowIndex: number) => boolean;
  @Input() isAllSelected?: () => boolean;
  @Input() isPartiallySelected?: () => boolean;
  @Input() isEditingRelationship?: (rowIndex: number, relCol: string, fieldIndex: number) => boolean;
  
  // Helper functions
  @Input() getRelationshipType?: (viewColumn: any) => string;
  @Input() getRelationshipDisplayColumn?: (viewColumn: any) => RelationshipDisplayColumn | null;
  @Input() getRelationshipOptions?: (viewColumn: any) => { value: string; label: string }[];
  
  // Phase-related inputs
  @Input() hasPhases = false;
  @Input() phases: () => Phase[] = () => [];
  @Input() getPhaseIdForRow?: (element: any) => string | null;
  @Input() isEditingPhase?: (rowIndex: number) => boolean;
  
  // Helper methods to safely get values with proper types
  getSafeRelationshipOptions(viewColumn: any): { value: string; label: string }[] {
    return this.getRelationshipOptions?.(viewColumn) ?? [];
  }
  
  getSafeIsEditingRelationship(rowIndex: number, relCol: string, fieldIndex: number): boolean {
    return this.isEditingRelationship?.(rowIndex, relCol, fieldIndex) ?? false;
  }
  
  getSafeIsEditing(rowIndex: number, columnName: string): boolean {
    // For temporary rows, return true only for editable fields (not primary key, not autogenerated)
    const dataSource = this.dataSourceSignal();
    const element = dataSource[rowIndex];
    if (element?._isTemporary) {
      // Extract column name from columnName (format: 'reg_columnName')
      const actualColumnName = columnName.replace('reg_', '');
      
      // Find the column to check if it's editable
      const column = this.regularColumns().find(col => col.name === actualColumnName);
      
      if (column) {
        // Never allow editing of primary keys, autogenerated, or autoincrement fields
        if (column.isPrimaryKey || column.isAutoGenerate || column.isAutoIncrement) {
          return false;
        }
        // For all other fields in temporary rows, show input
        return true;
      }
      
      // If column not found, don't show as editing
      return false;
    }
    return this.isEditing?.(rowIndex, columnName) ?? false;
  }
  
  getSafeIsEditingColumnName(columnId: string): boolean {
    return this.isEditingColumnName?.(columnId) ?? false;
  }
  
  getSafeIsRowSelected(rowIndex: number): boolean {
    return this.isRowSelected?.(rowIndex) ?? false;
  }
  
  getSafeIsAllSelected(): boolean {
    return this.isAllSelected?.() ?? false;
  }
  
  getSafeIsPartiallySelected(): boolean {
    return this.isPartiallySelected?.() ?? false;
  }

  getSafeIsEditingPhase(rowIndex: number): boolean {
    return this.isEditingPhase?.(rowIndex) ?? false;
  }
  
  // Event outputs
  @Output() onStartEdit = new EventEmitter<any>();
  @Output() onValueChange = new EventEmitter<any>();
  @Output() onSaveEdit = new EventEmitter<any>();
  @Output() onCancelEdit = new EventEmitter<void>();
  @Output() onStartEditColumnName = new EventEmitter<any>();
  @Output() onUpdateEditingColumnNameValue = new EventEmitter<string>();
  @Output() onSaveColumnName = new EventEmitter<any>();
  @Output() onCancelEditColumnName = new EventEmitter<void>();
  @Output() onStartEditRelationship = new EventEmitter<any>();
  @Output() onSaveEditRelationship = new EventEmitter<any>();
  @Output() onRowClick = new EventEmitter<{rowIndex: number, event: MouseEvent}>();
  @Output() onRowSelectionChange = new EventEmitter<{rowIndex: number, checked: boolean}>();
  @Output() onSelectAllChange = new EventEmitter<boolean>();
  @Output() onAddField = new EventEmitter<void>();
  @Output() onDeleteRow = new EventEmitter<{rowIndex: number, element: any}>();
  @Output() onColumnResized = new EventEmitter<{columnId: string, width: number}>();
  @Output() onPhaseChanged = new EventEmitter<{rowIndex: number, phaseId: string | null}>();
  @Output() onRowHover = new EventEmitter<{rowIndex: number, isHovering: boolean}>();
  @Output() onAddNewRow = new EventEmitter<{columnId: string}>();
  @Output() onStartAddRecord = new EventEmitter<void>();
  @Output() onTabNext = new EventEmitter<{rowIndex: number, columnName: string}>();
  
  // Method to handle add record button click
  handleAddRecordClick(event: Event) {
    console.log('🟠 handleAddRecordClick - START');
    event.stopPropagation();
    event.preventDefault();
    console.log('🟠 Emitting onStartAddRecord');
    this.onStartAddRecord.emit();
    console.log('🟠 handleAddRecordClick - END');
  }
  
  @Input() getColumnWidth?: (columnId: string) => number | undefined;
  @Input() hasTemporaryRecord?: () => boolean;
  @Input() getRequiredColumns?: () => TableColumn[];
  @Input() isTemporaryRecordValid?: (element: any) => boolean;
  @Input() onSaveTemporaryRecord?: (element: any) => void;
  
  private hoveredRowIndex = -1;

  /** Displayed columns - computed directly from column data */
  // Angular Material Table will match these with matColumnDef directives
  // The template structure ensures columns are rendered before rows
  readonly displayedColumns = computed(() => {
    const regularCols = this.regularColumns();
    const relationshipCols = this.relationshipColumns();
    
    // Build requested columns directly from data, including addField
    const requested = [
      ...(this.isMultiSelectMode?.() ? ['select'] : []),
      ...(this.hasPhases && this.phases().length > 0 ? ['phase'] : []),
      ...regularCols.map(col => 'reg_' + col.name),
      ...relationshipCols.map(col => 'rel_' + col.columnId),
      'actions' // Always include actions column
    ];
    
    return requested;
  });

  /** Data source with add row button (only when no temporary record exists) */
  readonly dataSourceWithAddRow = computed(() => {
    const source = this.dataSourceSignal();
    const hasTemp = this.hasTemporaryRecord?.() ?? false;
    
    // Only add the "Add Record" button row if there's NO temporary record
    // Temporary record is already at the end of the data from table-view
    if (!hasTemp) {
      return [...(source || []), { _isAddRow: true }];
    }
    
    // If there's a temporary record, don't show the button
    return source || [];
  });

  ngOnInit() {
    // Component initialization
    // Column definitions are registered automatically by Angular Material
    // when the template renders the ng-container[matColumnDef] elements
    // The template structure ensures columns are rendered before rows
    this.dataSourceSignal.set(this.dataSource || []);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['dataSource']) {
      const newDataSource = changes['dataSource'].currentValue || [];
      this.dataSourceSignal.set(newDataSource);
    }
  }

  /** Check if we have columns defined (before checking DOM availability) */
  readonly hasColumns = computed(() => {
    const regularCols = this.regularColumns();
    const relationshipCols = this.relationshipColumns();
    
    // We have columns if we have at least some columns (regular OR relationship)
    return (regularCols && regularCols.length > 0) || 
           (relationshipCols && relationshipCols.length > 0);
  });

  readonly isTableReady = computed(() => {
    // Table is ready if we have columns AND displayed columns are available in DOM
    return this.hasColumns() && this.displayedColumns().length > 0;
  });

  isRequiredFieldEmpty(element: any, column: any): boolean {
    if (!element._isTemporary || !this.getRequiredColumns) return false;
    const requiredColumns = this.getRequiredColumns();
    const isRequired = requiredColumns.some((col: TableColumn) => col.id === column.id);
    if (!isRequired) return false;
    const value = element[column.name];
    return value === null || value === undefined || value === '';
  }

  isRequiredFieldFilled(element: any, column: any): boolean {
    if (!element._isTemporary || !this.getRequiredColumns) return false;
    const requiredColumns = this.getRequiredColumns();
    const isRequired = requiredColumns.some((col: TableColumn) => col.id === column.id);
    if (!isRequired) return false;
    const value = element[column.name];
    return value !== null && value !== undefined && value !== '';
  }
}

