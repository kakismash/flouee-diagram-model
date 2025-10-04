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
                 [class.primary-key]="column.isPrimaryKey">
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
            
            <div *ngIf="table.columns.length > maxVisibleColumns" class="more-indicator">
              <span>+{{ table.columns.length - maxVisibleColumns }} more</span>
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
        .table-card {
          position: relative;
          width: 280px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: grab;
          transition: all 0.2s ease;
          user-select: none;
          z-index: 10;
          border: 2px solid transparent;
          overflow: visible;
        }
    
    .table-card:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-1px);
      border-color: #e3f2fd;
    }
    
    .table-card.dragging {
      cursor: grabbing;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      transform: rotate(1deg) scale(1.02);
      z-index: 1000;
      border-color: #1976d2;
    }
    
    .table-card.selected {
      border-color: #1976d2;
      box-shadow: 0 4px 16px rgba(25, 118, 210, 0.2);
    }
    
        .table-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-bottom: 1px solid #e9ecef;
          border-radius: 12px;
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
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      margin-right: 12px;
      box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
    }
    
    .table-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: white;
    }
    
    .table-info {
      flex: 1;
      min-width: 0;
    }
    
    .table-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: #2c3e50;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    
    .table-count {
      font-size: 12px;
      color: #6c757d;
      font-weight: 500;
    }
    
    .table-actions {
      display: flex;
      gap: 4px;
    }
    
    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.8);
      transition: all 0.2s ease;
    }
    
    .action-btn:hover {
      background: rgba(255, 255, 255, 1);
      transform: scale(1.05);
    }
    
    .action-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #6c757d;
    }
    
    .action-btn.link-btn mat-icon {
      color: #2196F3;
    }
    
    .action-btn.link-btn:hover {
      background: rgba(33, 150, 243, 0.1);
    }
    
    .table-content {
      padding: 0;
    }
    
        .columns-container {
          max-height: 200px;
          overflow-y: auto;
          overflow-x: visible;
        }
    
        .column-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px;
          border-bottom: 1px solid #f1f3f4;
          transition: background-color 0.2s ease;
          gap: 12px;
          min-height: 50px;
        }
    
    .column-item:hover {
      background-color: #f8f9fa;
    }
    
    .column-item:last-child {
      border-bottom: none;
    }
    
    .column-item.primary-key {
      background: linear-gradient(90deg, rgba(25, 118, 210, 0.05) 0%, transparent 100%);
      border-left: 3px solid #1976d2;
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
          color: #2c3e50;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }
        
        .column-type {
          font-size: 11px;
          color: #495057;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 500;
          white-space: nowrap;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          align-self: flex-start;
          border: 1px solid transparent;
        }
        
        /* Type-specific colors */
        .column-type.serial {
          background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
          color: #1976d2;
          border-color: #bbdefb;
        }
        
        .column-type.varchar {
          background: linear-gradient(135deg, #e8f5e8 0%, #f1f8e9 100%);
          color: #388e3c;
          border-color: #c8e6c9;
        }
        
        .column-type.text {
          background: linear-gradient(135deg, #fff3e0 0%, #fce4ec 100%);
          color: #f57c00;
          border-color: #ffcc02;
        }
        
        .column-type.timestamp {
          background: linear-gradient(135deg, #f3e5f5 0%, #e8eaf6 100%);
          color: #7b1fa2;
          border-color: #ce93d8;
        }
        
        .column-type.integer {
          background: linear-gradient(135deg, #e0f2f1 0%, #e8f5e8 100%);
          color: #00695c;
          border-color: #a5d6a7;
        }
        
        .column-type.boolean {
          background: linear-gradient(135deg, #fce4ec 0%, #f8bbd9 100%);
          color: #c2185b;
          border-color: #f48fb1;
        }
        
        .column-type.default {
          background: linear-gradient(135deg, #f5f5f5 0%, #eeeeee 100%);
          color: #616161;
          border-color: #bdbdbd;
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
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    }
    
    .badge.nn {
      background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    }
    
    .badge.u {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    }
    
    .badge.d {
      background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
    }
    
    .badge.ai {
      background: linear-gradient(135deg, #fd7e14 0%, #ffc107 100%);
    }
    
    .badge.ag {
      background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
    }
    
    .badge.rel {
      background: #e3f2fd;
      color: #1976d2;
    }
    
    .relationship-columns-container {
      border-top: 2px solid #e0e0e0;
      margin-top: 8px;
      padding-top: 8px;
    }
    
    .relationship-column-item {
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 3px solid #1976d2;
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
      color: #1976d2;
      font-weight: 500;
      font-size: 14px;
    }
    
    .relationship-column-type {
      background: #e3f2fd;
      color: #1976d2;
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
      background: #ffffff;
      border-radius: 3px;
      margin-bottom: 2px;
      border: 1px solid #e0e0e0;
    }
    
    .field-name {
      color: #555;
      font-size: 12px;
      font-weight: 400;
    }
    
    .field-type {
      background: #f5f5f5;
      color: #666;
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
    }
    
    .relationship-column-edit-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      line-height: 14px;
    }
    
    .more-indicator {
      padding: 12px 16px;
      text-align: center;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      font-size: 12px;
      color: #6c757d;
      font-weight: 500;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      color: #adb5bd;
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
      background: #f1f1f1;
    }
    
    .columns-container::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 2px;
    }
    
    .columns-container::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
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
  maxVisibleColumns = 4;
  
  constructor(
    private tableHelper: TableHelperService,
    private dialog: MatDialog
  ) {}
  
  ngOnInit(): void {
    this.initialPosition = {x: this.x, y: this.y};
  }
  
  getVisibleColumns(): TableColumn[] {
    // Only show user-created columns (hide system generated like 'id' and FKs)
    const userColumns = this.tableHelper.getUserColumns(this.table);
    return userColumns.slice(0, this.maxVisibleColumns);
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
