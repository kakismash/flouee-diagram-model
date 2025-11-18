import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { Table, TableColumn, RelationshipDisplayColumn } from '../../models/table.model';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableHelperService } from '../../services/table-helper.service';
import { RelationshipColumnDialogComponent, RelationshipColumnDialogData } from '../relationship-column-dialog/relationship-column-dialog.component';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule, MatTooltipModule],
  template: `
    <div class="table-card-container" [style.left.px]="x" [style.top.px]="y">
      <div 
        class="table-card"
        [class.dragging]="isDragging"
        [class.selected]="isSelected"
        [attr.data-table-id]="table.id"
        (mousedown)="onMouseDown($event)"
        (dblclick)="onDoubleClick($event)">
        
        <!-- Header -->
        <div class="table-header">
          <div class="table-title-section">
            <div class="table-icon">
              <mat-icon>table_chart</mat-icon>
            </div>
            <div class="table-info">
              <h3 class="table-title">{{ table.name }}</h3>
              <span class="table-count">{{ table.columns.length }} columns</span>
            </div>
          </div>
          <div class="table-actions">
            <button mat-icon-button (click)="onLink($event)" title="Link to another table" class="action-btn link-btn">
              <mat-icon>link</mat-icon>
            </button>
            <button mat-icon-button (click)="onEdit()" title="Edit Table" class="action-btn">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button (click)="onDelete()" title="Delete Table" class="action-btn">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </div>
        
        <!-- Columns List -->
        <div class="table-content">
          <div class="columns-container" *ngIf="table.columns.length > 0">
            <div class="column-item" 
                 *ngFor="let column of getVisibleColumns(); let i = index"
                 [class.primary-key]="column.isPrimaryKey"
                 [attr.data-column-id]="column.id">
              <div class="column-main">
                <div class="column-name">{{ column.name }}</div>
                <div class="column-type" [class]="getTypeClass(column.type)">{{ getShortType(column.type) }}</div>
              </div>
              <div class="column-badges">
                <span *ngIf="column.isPrimaryKey" 
                      class="badge pk" 
                      matTooltip="Primary Key: Unique identifier for the table. Cannot be null and must be unique."
                      matTooltipPosition="above">PK</span>
                <span *ngIf="!column.isNullable" 
                      class="badge nn" 
                      matTooltip="Not Null: This column cannot contain null values. Must have a value."
                      matTooltipPosition="above">NN</span>
                <span *ngIf="column.isUnique" 
                      class="badge u" 
                      matTooltip="Unique: All values in this column must be unique across all rows."
                      matTooltipPosition="above">U</span>
                <span *ngIf="column.defaultValue" 
                      class="badge d" 
                      matTooltip="Default Value: This column has a default value that will be used when no value is provided."
                      matTooltipPosition="above">D</span>
                <span *ngIf="column.isAutoIncrement" 
                      class="badge ai" 
                      matTooltip="Auto Increment: This column automatically increments its value for each new row."
                      matTooltipPosition="above">AI</span>
                <span *ngIf="column.isAutoGenerate" 
                      class="badge ag" 
                      matTooltip="Auto Generate: This column automatically generates its value (e.g., UUID)."
                      matTooltipPosition="above">AG</span>
              </div>
            </div>
            
            <div *ngIf="getUserColumns().length > maxVisibleColumns" 
                 class="more-indicator"
                 (click)="toggleExpanded()">
              <span *ngIf="!isExpanded">+{{ getUserColumns().length - getVisibleColumns().length }} more</span>
              <span *ngIf="isExpanded">Show less</span>
            </div>
          </div>
          
          <!-- Relationship Display Columns -->
          <div class="relationship-columns-container" *ngIf="relationshipDisplayColumns.length > 0">
            <div class="relationship-column-item" 
                 [id]="'relationship-column-' + relCol.id"
                 *ngFor="let relCol of relationshipDisplayColumns; let i = index">
              <div class="relationship-column-header">
                <div class="relationship-column-title">
                  <span class="relationship-column-source">{{ getSourceTableName(relCol.sourceTableId) }}</span>
                  <div class="column-type relationship-column-type">REL</div>
                </div>
                <button mat-icon-button 
                        class="relationship-column-edit-btn"
                        (click)="onEditRelationshipColumn($event, relCol)"
                        matTooltip="Edit relationship fields"
                        matTooltipPosition="above">
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
              
              <!-- Display multiple fields -->
              <div class="relationship-fields" *ngFor="let field of relCol.fields">
                <div class="relationship-field-item" *ngIf="field.isVisible">
                  <div class="field-name">{{ field.displayName }}</div>
                  <div class="field-type">REL</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="empty-state" *ngIf="table.columns.length === 0">
            <mat-icon>table_chart</mat-icon>
            <span>No columns</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
        // Global styles to force theme colors
        .table-card * {
          color: inherit;
        }
        
        .table-card .table-header * {
          color: var(--theme-text-primary) !important;
        }
        
        .table-card {
          position: relative;
          width: 280px;
          background: var(--theme-surface);
          border-radius: 12px;
          box-shadow: 0 2px 8px var(--theme-card-shadow);
          cursor: grab;
          transition: all 0.2s ease;
          user-select: none;
          z-index: 10;
          border: 2px solid transparent;
          overflow: visible;
        }
    
    .table-card:hover {
      box-shadow: 0 4px 16px var(--theme-card-shadow);
      transform: translateY(-1px);
      border-color: var(--theme-primary-container);
    }
    
    .table-card.dragging {
      cursor: grabbing;
      box-shadow: 0 8px 24px var(--theme-card-shadow);
      transform: rotate(1deg) scale(1.02);
      z-index: 1000;
      border-color: var(--theme-primary);
    }
    
    .table-card.selected {
      border-radius: 4px;
      border-color: var(--theme-primary);
      box-shadow: 0 4px 16px var(--theme-primary);
    }
    
        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          background: var(--theme-primary);
          border-bottom: 1px solid var(--theme-primary-dark);
          border-radius: 12px;
          color: var(--theme-on-primary);
          
          // Ensure all text elements in header respect theme
          * {
            color: var(--theme-on-primary) !important;
          }
          
          h1, h2, h3, h4, h5, h6 {
            color: var(--theme-on-primary) !important;
          }
          
          span, div, p {
            color: var(--theme-on-primary) !important;
          }
        }
    
    .table-title-section {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
    }
    
    .table-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--theme-primary-dark);
      margin-right: 12px;
      box-shadow: 0 2px 4px var(--theme-primary);
    }
    
    .table-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--theme-on-primary);
    }
    
    .table-info {
      flex: 1;
      min-width: 0;
      
      // Force all text elements inside table-info to respect theme
      * {
        color: var(--theme-text-primary) !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: var(--theme-text-primary) !important;
      }
      
      span, div, p {
        color: var(--theme-text-primary) !important;
      }
    }
    
    .table-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: var(--theme-text-primary) !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    
    // Ensure h3 elements in table headers respect theme
    h3.table-title {
      color: var(--theme-text-primary) !important;
    }
    
    // Specific selectors for table-info elements
    .table-info h3.table-title {
      color: var(--theme-text-primary) !important;
    }
    
    .table-info span.table-count {
      color: var(--theme-text-primary) !important;
    }
    
    // Maximum specificity selectors to override any Material Design styles
    .table-header .table-info h3[_ngcontent-c617701278] {
      color: var(--theme-text-primary) !important;
    }
    
    .table-header .table-info span[_ngcontent-c617701278] {
      color: var(--theme-text-primary) !important;
    }
    
    // Alternative approach - target by class combination
    .table-header .table-info .table-title {
      color: var(--theme-text-primary) !important;
    }
    
    .table-header .table-info .table-count {
      color: var(--theme-text-primary) !important;
    }
    
    // Ultra-specific selectors to force theme colors
    .table-card .table-header .table-info h3 {
      color: var(--theme-text-primary) !important;
    }
    
    .table-card .table-header .table-info span {
      color: var(--theme-text-primary) !important;
    }
    
    // Force all text in table headers
    .table-card .table-header * {
      color: var(--theme-text-primary) !important;
    }
    
    // Specific for the exact elements mentioned
    .table-card .table-header .table-info .table-title {
      color: var(--theme-text-primary) !important;
    }
    
    .table-card .table-header .table-info .table-count {
      color: var(--theme-text-primary) !important;
    }
    
    .table-count {
      font-size: 12px;
      color: var(--theme-text-primary) !important;
      font-weight: 500;
      opacity: 0.8;
    }
    
    .table-actions {
      display: flex;
      gap: 4px;
    }
    
    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: var(--theme-primary-container);
      transition: all 0.2s ease;
    }
    
    .action-btn:hover {
      background: var(--theme-primary-dark);
      transform: scale(1.05);
    }
    
    .action-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--theme-on-primary-container);
    }
    
    .action-btn.link-btn mat-icon {
      color: var(--theme-info);
    }
    
    .action-btn.link-btn:hover {
      background: var(--theme-info);
    }
    
    .action-btn.link-btn:hover mat-icon {
      color: var(--theme-on-primary);
    }
    
    .table-content {
      padding: 0;
    }
    
        .columns-container {
          max-height: 500px; /* ✅ Increased height to show more columns */
          overflow-y: auto;
          overflow-x: visible;
          /* ✅ Dynamic height based on content */
          min-height: fit-content;
        }
    
        .column-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          border-bottom: 1px solid var(--theme-divider);
          transition: background-color 0.2s ease;
          gap: 12px;
          min-height: 50px;
          background: var(--theme-surface);
        }
    
    .column-item:hover {
      background-color: var(--theme-surface-variant);
    }
    
    .column-item:last-child {
      border-bottom: none;
    }
    
    .column-item.primary-key {
      background: var(--theme-primary-container);
      border-left: 3px solid var(--theme-primary);
    }
    
        .column-main {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          justify-content: center;
          gap: 4px;
        }
        
        .column-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--theme-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        
        .column-type {
          font-size: 11px;
          color: var(--theme-text-secondary);
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 500;
          white-space: nowrap;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          align-self: flex-start;
          border: 1px solid var(--theme-outline);
          background: var(--theme-surface-variant);
        }
        
        /* Type-specific colors */
        .column-type.serial {
          background: var(--theme-primary-container);
          color: var(--theme-primary);
          border-color: var(--theme-primary);
        }
        
        .column-type.varchar {
          background: var(--theme-success);
          color: var(--theme-on-primary);
          border-color: var(--theme-success);
        }
        
        .column-type.text {
          background: var(--theme-warning);
          color: var(--theme-on-primary);
          border-color: var(--theme-warning);
        }
        
        .column-type.timestamp {
          background: var(--theme-secondary);
          color: var(--theme-on-primary);
          border-color: var(--theme-secondary);
        }
        
        .column-type.integer {
          background: var(--theme-info);
          color: var(--theme-on-primary);
          border-color: var(--theme-info);
        }
        
        .column-type.boolean {
          background: var(--theme-error);
          color: var(--theme-on-primary);
          border-color: var(--theme-error);
        }
        
        .column-type.default {
          background: var(--theme-surface-variant);
          color: var(--theme-text-secondary);
          border-color: var(--theme-outline);
        }
    
    .column-badges {
      display: flex;
      flex-direction: row;
      gap: 4px;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    
    .badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      color: white;
      text-align: center;
      line-height: 1.2;
    }
    
    .badge.pk {
      background: var(--theme-primary);
      color: var(--theme-on-primary);
    }
    
    .badge.nn {
      background: var(--theme-error);
      color: var(--theme-on-primary);
    }
    
    .badge.u {
      background: var(--theme-success);
      color: var(--theme-on-primary);
    }
    
    .badge.d {
      background: var(--theme-secondary);
      color: var(--theme-on-primary);
    }
    
    .badge.ai {
      background: var(--theme-warning);
      color: var(--theme-on-primary);
    }
    
    .badge.ag {
      background: var(--theme-info);
      color: var(--theme-on-primary);
    }
    
    .badge.rel {
      background: var(--theme-primary-container);
      color: var(--theme-primary);
    }
    
    .relationship-columns-container {
      border-top: 2px solid var(--theme-divider);
      margin-top: 8px;
      padding-top: 8px;
    }
    
    .relationship-column-item {
      background: var(--theme-primary-container);
      border-radius: 4px;
      border-left: 3px solid var(--theme-primary);
      margin: 2px 0;
      padding: 8px 12px;
    }
    
    .relationship-column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    
    .relationship-column-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .relationship-column-source {
      color: var(--theme-primary);
      font-weight: 500;
      font-size: 14px;
    }
    
    .relationship-column-type {
      background: var(--theme-primary);
      color: var(--theme-on-primary);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    
    .relationship-fields {
      margin-left: 8px;
    }
    
    .relationship-field-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: var(--theme-surface);
      border-radius: 3px;
      margin-bottom: 2px;
      border: 1px solid var(--theme-border);
    }
    
    .field-name {
      color: var(--theme-text-primary);
      font-size: 12px;
      font-weight: 400;
    }
    
    .field-type {
      background: var(--theme-surface-variant);
      color: var(--theme-text-secondary);
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 2px;
      font-weight: 500;
    }
    
    .relationship-column-edit-btn {
      width: 20px;
      height: 20px;
      line-height: 20px;
      pointer-events: auto;
      z-index: 10;
      position: relative;
      color: var(--theme-primary) !important;
    }
    
    .relationship-column-edit-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      line-height: 14px;
      color: var(--theme-primary) !important;
    }
    
    .more-indicator {
      padding: 12px 16px;
      text-align: center;
      background: var(--theme-surface-variant);
      border-top: 1px solid var(--theme-divider);
      font-size: 12px;
      color: var(--theme-text-secondary);
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }
    
    .more-indicator:hover {
      background: var(--theme-hover);
      color: var(--theme-text-primary);
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      color: var(--theme-text-disabled);
      font-size: 14px;
    }
    
    .empty-state mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      opacity: 0.5;
    }
    
    .table-card-container {
      position: absolute;
    }
    
    /* Scrollbar styling */
    .columns-container::-webkit-scrollbar {
      width: 4px;
    }
    
    .columns-container::-webkit-scrollbar-track {
      background: var(--theme-surface-variant);
    }
    
    .columns-container::-webkit-scrollbar-thumb {
      background: var(--theme-outline);
      border-radius: 2px;
    }
    
    .columns-container::-webkit-scrollbar-thumb:hover {
      background: var(--theme-text-secondary);
    }
  `]
})
export class TableCardComponent implements OnInit {
  @Input() table!: Table;
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Input() zoomLevel: number = 1;
  @Input() isSelected: boolean = false;
  @Input() relationshipDisplayColumns: RelationshipDisplayColumn[] = [];
  @Input() allTables: Table[] = [];
  
  @Output() positionChanged = new EventEmitter<{x: number, y: number}>();
  @Output() tableSelected = new EventEmitter<Table>();
  @Output() tableEdited = new EventEmitter<Table>();
  @Output() tableDeleted = new EventEmitter<Table>();
  @Output() linkRequested = new EventEmitter<Table>();
  @Output() relationshipDisplayColumnUpdated = new EventEmitter<{displayColumn: RelationshipDisplayColumn, newFields: any[]}>();
  @Output() dragPositionChanged = new EventEmitter<{table: Table, x: number, y: number}>();
  
  isDragging = false;
  private initialPosition = {x: 0, y: 0};
  private dragStart = {x: 0, y: 0};
  maxVisibleColumns = 10; // ✅ Show more columns by default
  isExpanded = false; // ✅ Track if columns are expanded
  
  constructor(
    private tableHelper: TableHelperService,
    private dialog: MatDialog
  ) {}
  
  ngOnInit(): void {
    this.initialPosition = {x: this.x, y: this.y};
  }
  
  getUserColumns(): TableColumn[] {
    // Only show user-created columns (hide system generated like 'id' and FKs)
    return this.tableHelper.getUserColumns(this.table);
  }

  getVisibleColumns(): TableColumn[] {
    // ✅ Show all columns when expanded, otherwise limit
    const userColumns = this.getUserColumns();
    if (this.isExpanded) {
      return userColumns; // Show all when expanded
    }
    return userColumns.length > this.maxVisibleColumns 
      ? userColumns.slice(0, this.maxVisibleColumns)
      : userColumns;
  }

      getShortType(type: string): string {
        // Convert long type names to shorter versions
        const typeMap: { [key: string]: string } = {
          'VARCHAR': 'VARCHAR',
          'TEXT': 'TEXT',
          'INTEGER': 'INT',
          'BIGINT': 'BIGINT',
          'SERIAL': 'SERIAL',
          'BOOLEAN': 'BOOL',
          'TIMESTAMP': 'TS',
          'DATE': 'DATE',
          'TIME': 'TIME',
          'DECIMAL': 'DEC',
          'FLOAT': 'FLOAT',
          'DOUBLE': 'DOUBLE',
          'JSON': 'JSON',
          'UUID': 'UUID'
        };

        // Extract base type (remove length specifications)
        const baseType = type.split('(')[0].toUpperCase();
        return typeMap[baseType] || baseType;
      }

      getTypeClass(type: string): string {
        // Extract base type (remove length specifications)
        const baseType = type.split('(')[0].toLowerCase();
        
        // Map types to CSS classes
        const typeClassMap: { [key: string]: string } = {
          'serial': 'serial',
          'varchar': 'varchar',
          'text': 'text',
          'timestamp': 'timestamp',
          'integer': 'integer',
          'int': 'integer',
          'bigint': 'integer',
          'boolean': 'boolean',
          'bool': 'boolean',
          'date': 'timestamp',
          'time': 'timestamp',
          'decimal': 'integer',
          'float': 'integer',
          'double': 'integer',
          'json': 'text',
          'uuid': 'varchar'
        };
        
        return typeClassMap[baseType] || 'default';
      }
  
  onMouseDown(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const isInteractiveElement = this.isInteractiveElement(target);
    
    if (event.button === 0 && !isInteractiveElement) {
      this.isDragging = true;
      this.dragStart = {x: event.clientX, y: event.clientY};
      this.initialPosition = {x: this.x, y: this.y};
      this.tableSelected.emit(this.table);
      event.preventDefault();
      event.stopPropagation();
    }
  }
  
  private isInteractiveElement(element: HTMLElement): boolean {
    let current = element;
    while (current && current !== document.body) {
      if (current.tagName === 'BUTTON' || 
          current.tagName === 'A' || 
          current.classList.contains('no-drag') ||
          current.classList.contains('action-btn')) {
        return true;
      }
      current = current.parentElement as HTMLElement;
    }
    return false;
  }
  
  @HostListener('document:mousemove', ['$event'])
  onGlobalMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragStart.x;
      const deltaY = event.clientY - this.dragStart.y;
      
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        this.x = this.initialPosition.x + (deltaX / this.zoomLevel);
        this.y = this.initialPosition.y + (deltaY / this.zoomLevel);
        
        // Emit real-time position changes for relationship lines
        this.dragPositionChanged.emit({
          table: this.table,
          x: this.x,
          y: this.y
        });
      }
      
      event.preventDefault();
    }
  }
  
  @HostListener('document:mouseup', ['$event'])
  onGlobalMouseUp(event: MouseEvent) {
    if (this.isDragging) {
      this.isDragging = false;
      
      const hasPositionChanged = Math.abs(this.x - this.initialPosition.x) > 1 || 
                                Math.abs(this.y - this.initialPosition.y) > 1;
      
      if (hasPositionChanged) {
        this.positionChanged.emit({x: this.x, y: this.y});
      } else {
        this.x = this.initialPosition.x;
        this.y = this.initialPosition.y;
      }
      
      event.preventDefault();
    }
  }
  
      onDoubleClick(event: MouseEvent) {
        // Prevent drag if double clicking
        this.isDragging = false;
        this.x = this.initialPosition.x;
        this.y = this.initialPosition.y;
        
        // Only trigger edit if we haven't moved much (to distinguish from drag)
        const hasMoved = Math.abs(this.x - this.initialPosition.x) > 5 || 
                        Math.abs(this.y - this.initialPosition.y) > 5;
        
        if (!hasMoved) {
          this.onEdit();
        }
        
        event.preventDefault();
        event.stopPropagation();
      }
  
  onEdit() {
    this.tableEdited.emit(this.table);
  }
  
  onDelete() {
    this.tableDeleted.emit(this.table);
  }

  onLink(event: Event) {
    event.stopPropagation();
    this.linkRequested.emit(this.table);
  }

  getSourceTableName(sourceTableId: string): string {
    const sourceTable = this.allTables.find(t => t.id === sourceTableId);
    return sourceTable ? sourceTable.name : 'Unknown';
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
  }

  onEditRelationshipColumn(event: Event, displayColumn: RelationshipDisplayColumn) {
    console.log('Edit relationship column clicked:', displayColumn);
    event.stopPropagation();

    // Find the source table
    const sourceTable = this.allTables.find(t => t.id === displayColumn.sourceTableId);
    if (!sourceTable) {
      console.error('Source table not found for relationship display column');
      return;
    }

    console.log('Source table found:', sourceTable);

    // Open the dialog
    const dialogData: RelationshipColumnDialogData = {
      displayColumn: displayColumn,
      sourceTable: sourceTable,
      targetTable: this.table
    };

    console.log('Opening dialog with data:', dialogData);

    try {
      const dialogRef = this.dialog.open(RelationshipColumnDialogComponent, {
        width: '600px',
        data: dialogData
      });
      
      console.log('Dialog opened successfully');

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed with result:', result);
      if (result && result.fields) {
        this.relationshipDisplayColumnUpdated.emit({
          displayColumn: displayColumn,
          newFields: result.fields
        });
      }
    });
    } catch (error) {
      console.error('Error opening dialog:', error);
    }
  }
}
