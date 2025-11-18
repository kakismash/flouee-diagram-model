import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Relationship, Table, RelationshipDisplayColumn } from '../../models/table.model';

@Component({
  selector: 'app-relationship-line',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatDividerModule],
  template: `
    <div class="relationship-container">
      <svg class="relationship-line" [style.pointer-events]="'none'">
      <defs>
          <!-- Arrow marker for one-to-one -->
          <marker id="arrow-one-to-one" markerWidth="10" markerHeight="10" 
                refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#666" />
        </marker>
        
          <!-- Circle marker for one-to-many (one side) -->
          <marker id="circle-one" markerWidth="8" markerHeight="8" 
                refX="4" refY="4" orient="auto">
            <circle cx="4" cy="4" r="3" fill="white" stroke="#666" stroke-width="1.5" />
        </marker>
        
          <!-- Crow's foot marker for one-to-many (many side) -->
          <marker id="crow-foot" markerWidth="12" markerHeight="12" 
                refX="10" refY="6" orient="auto">
            <path d="M0,0 L10,6 L0,12" stroke="#666" stroke-width="1.5" fill="none" />
        </marker>
        
          <!-- Double crow's foot marker for many-to-many (both sides) -->
          <marker id="crow-foot-many-to-many" markerWidth="12" markerHeight="12" 
                refX="10" refY="6" orient="auto">
            <path d="M0,0 L10,6 L0,12" stroke="#FF9800" stroke-width="2" fill="none" />
        </marker>
      </defs>
      
        <!-- The relationship line -->
      <path 
        [attr.d]="pathData"
        [attr.stroke]="getLineColor()"
        stroke-width="2"
        fill="none"
        [attr.marker-start]="getStartMarker()"
        [attr.marker-end]="getEndMarker()"
          class="relationship-path"
      />
    </svg>
    
      <!-- Always visible three dots button -->
    <button mat-icon-button 
              class="three-dots-button"
              [style.left.px]="dotsPosition.x"
              [style.top.px]="dotsPosition.y"
            [matMenuTriggerFor]="relationshipMenu"
              (click)="onDotsClick($event)">
      <mat-icon>more_vert</mat-icon>
    </button>
    
      <!-- Context menu for relationship -->
      <mat-menu #relationshipMenu="matMenu" class="relationship-context-menu">
        <ng-container matMenuContent>
          <!-- Relationship Type Section -->
      <div class="menu-section">
            <div class="menu-section-title">Relationship Type</div>
            <button mat-menu-item (click)="changeRelationshipType('one-to-one')" 
                [class.selected]="relationship.type === 'one-to-one'">
          <mat-icon>link</mat-icon>
              <span>One to One (1:1)</span>
        </button>
            <button mat-menu-item (click)="changeRelationshipType('one-to-many')" 
                [class.selected]="relationship.type === 'one-to-many'">
          <mat-icon>account_tree</mat-icon>
              <span>One to Many (1:N)</span>
        </button>
            <button mat-menu-item (click)="changeRelationshipType('many-to-many')" 
                [class.selected]="relationship.type === 'many-to-many'">
          <mat-icon>share</mat-icon>
              <span>Many to Many (N:M)</span>
        </button>
      </div>
      
          <!-- Divider -->
      <mat-divider></mat-divider>
      
          <!-- Actions Section -->
          <div class="menu-section">
            <button mat-menu-item (click)="deleteRelationship()" class="delete-action">
        <mat-icon>delete</mat-icon>
              <span>Delete Relationship</span>
      </button>
          </div>
        </ng-container>
    </mat-menu>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
    
    .relationship-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1;
      overflow: visible;
    }

    .relationship-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    }

    .relationship-path {
      transition: stroke 0.2s ease;
    }

    .relationship-path:hover {
      stroke-width: 3;
      cursor: pointer;
    }
    
    .three-dots-button {
      position: absolute;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #e0e0e0;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      transition: all 0.2s ease;
      min-width: 24px;
      min-height: 24px;
      pointer-events: auto;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .three-dots-button:hover {
      background: #f5f5f5;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
      transform: scale(1.1);
    }
    
    .three-dots-button mat-icon {
      font-size: 16px;
      color: #666;
      line-height: 1;
    }
    
    .relationship-context-menu {
      margin-top: 8px;
    }
    
    .menu-section {
      padding: 8px 0;
    }
    
    .menu-section-title {
      padding: 8px 16px 4px 16px;
      font-size: 12px;
      font-weight: 500;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .menu-section button {
      width: 100%;
      text-align: left;
      justify-content: flex-start;
    }
    
    .menu-section button.selected {
      background-color: #e3f2fd;
      color: #1976d2;
    }
    
    .menu-section button.selected mat-icon {
      color: #1976d2;
    }
    
    .delete-action {
      color: #d32f2f;
    }
    
    .delete-action mat-icon {
      color: #d32f2f;
    }
    
    .delete-action:hover {
      background-color: #ffebee;
    }
  `]
})
export class RelationshipLineComponent implements OnInit, OnChanges {
  @Input() relationship!: Relationship;
  @Input() fromTable!: Table;
  @Input() toTable!: Table;
  @Input() zoomLevel: number = 1;
  @Input() relationshipDisplayColumn?: RelationshipDisplayColumn;
  
  @Output() relationshipTypeChanged = new EventEmitter<{ relationship: Relationship; newType: string }>();
  @Output() relationshipDeleted = new EventEmitter<Relationship>();

  pathData: string = '';
  dotsPosition = { x: 0, y: 0 };

  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngOnInit() {
    // Use setTimeout to ensure DOM is rendered
    setTimeout(() => {
      this.calculatePath();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fromTable'] || changes['toTable'] || changes['zoomLevel'] || changes['relationshipDisplayColumn']) {
      // Use setTimeout to ensure DOM is rendered
      setTimeout(() => {
        this.calculatePath();
      }, 0);
    }
  }

  // Method to force recalculation (called from parent when positions change)
  updatePath() {
    setTimeout(() => {
      this.calculatePath();
    }, 0);
  }

  calculatePath() {
    if (!this.fromTable || !this.toTable) return;

    // ✅ For many-to-many relationships, use table centers (junction table is hidden)
    // For other relationships, calculate specific column positions
    let fromPoint: {x: number, y: number};
    let toPoint: {x: number, y: number};
    
    if (this.relationship.type === 'many-to-many') {
      // Many-to-many: connect from table centers (junction table is hidden)
      fromPoint = {
        x: this.fromTable.x + (this.fromTable.width || 280) / 2,
        y: this.fromTable.y + (this.fromTable.height || 200) / 2
      };
      toPoint = {
        x: this.toTable.x + (this.toTable.width || 280) / 2,
        y: this.toTable.y + (this.toTable.height || 200) / 2
      };
    } else {
      // Calculate specific column positions for 1:1 and 1:M
      fromPoint = this.getColumnPosition(this.fromTable, this.relationship.fromColumnId, 'from');
      toPoint = this.getColumnPosition(this.toTable, this.relationship.toColumnId, 'to');
    }

    // Validate no NaN values
    if (isNaN(fromPoint.x) || isNaN(fromPoint.y) || isNaN(toPoint.x) || isNaN(toPoint.y)) {
      console.error('Invalid coordinates, using table centers as fallback');
      fromPoint.x = this.fromTable.x + (this.fromTable.width || 280) / 2;
      fromPoint.y = this.fromTable.y + (this.fromTable.height || 200) / 2;
      toPoint.x = this.toTable.x + (this.toTable.width || 280) / 2;
      toPoint.y = this.toTable.y + (this.toTable.height || 200) / 2;
    }

    // Create path with bezier curve for smooth connection
    const midX = (fromPoint.x + toPoint.x) / 2;
    const control1X = fromPoint.x + (fromPoint.x < toPoint.x ? 120 : -120);
    const control2X = toPoint.x + (toPoint.x < fromPoint.x ? 120 : -120);
    
    this.pathData = `M ${fromPoint.x},${fromPoint.y} C ${control1X},${fromPoint.y} ${control2X},${toPoint.y} ${toPoint.x},${toPoint.y}`;

    // Calculate dots position (middle of the line)
    this.dotsPosition = {
      x: midX - 12,
      y: (fromPoint.y + toPoint.y) / 2 - 12
    };
  }

  // ✅ Calculate specific column position (canvas only, no DOM)
  private getColumnPosition(table: Table, columnId: string, direction: 'from' | 'to'): {x: number, y: number} {
    // Find the column
    const column = table.columns.find(c => c.id === columnId);
    if (!column) {
      // Fallback: table center
      return {
        x: table.x + (table.width || 280) / 2,
        y: table.y + (table.height || 200) / 2
      };
    }

    // Calculate column index
    const columnIndex = table.columns.findIndex(c => c.id === columnId);
    const headerHeight = 50;
    const rowHeight = 32;
    
    // Calculate Y based on index
    const columnY = table.y + headerHeight + (columnIndex * rowHeight) + (rowHeight / 2);
    
    // Determine X: connect from the edge closest to the other table
    const otherTable = direction === 'from' ? this.toTable : this.fromTable;
    const tableWidth = table.width || 280;
    
    const tableCenterX = table.x + tableWidth / 2;
    const otherCenterX = otherTable.x + (otherTable.width || 280) / 2;
    
    let columnX: number;
    if (direction === 'from') {
      // FROM: connect from the side facing TO
      columnX = otherCenterX > tableCenterX 
        ? table.x + tableWidth  // TO is on the right → connect from right edge
        : table.x;              // TO is on the left → connect from left edge
        } else {
      // TO: connect to the side facing FROM
      columnX = otherCenterX < tableCenterX 
        ? table.x               // FROM is on the left → connect to left edge
        : table.x + tableWidth; // FROM is on the right → connect to right edge
    }
    
    return { x: columnX, y: columnY };
  }

  getConnectionPoint(from: {x: number, y: number}, to: {x: number, y: number}, table: Table) {
    // Calculate which side of the table to connect to based on direction
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    const angle = Math.atan2(dy, dx);
    const abs = Math.abs(angle);
    
    // Determine side: right, left, top, or bottom
    if (abs < Math.PI / 4) {
      // Right side
      return { x: table.x + table.width, y: from.y };
    } else if (abs > 3 * Math.PI / 4) {
      // Left side
      return { x: table.x, y: from.y };
    } else if (angle > 0) {
      // Bottom side
      return { x: from.x, y: table.y + table.height };
    } else {
      // Top side
      return { x: from.x, y: table.y };
    }
  }

  getRelationshipDisplayColumnPosition(): { x: number; y: number } {
    if (!this.relationshipDisplayColumn || !this.toTable) {
      return {
        x: this.toTable.x + this.toTable.width / 2,
        y: this.toTable.y + this.toTable.height / 2
      };
    }

    // Try to get the exact position from the DOM element
    const elementId = `relationship-column-${this.relationshipDisplayColumn.id}`;
    const element = this.document.getElementById(elementId);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      const canvasContainer = this.document.querySelector('.table-cards-container');
      
      if (canvasContainer) {
        const containerRect = canvasContainer.getBoundingClientRect();
        
        // Calculate position relative to the canvas container
        const x = rect.left - containerRect.left + rect.width / 2;
        const y = rect.top - containerRect.top + rect.height / 2;
        
        return { x, y };
      }
    }

    // Fallback to calculated position if DOM element not found
    const tableHeaderHeight = 40;
    const regularColumnsHeight = this.toTable.columns.filter(c => !c.isSystemGenerated && !c.isForeignKey).length * 32;
    const relationshipColumnsStartY = this.toTable.y + tableHeaderHeight + regularColumnsHeight + 8;
    const relationshipColumnHeight = 32;
    const relationshipColumnY = relationshipColumnsStartY + relationshipColumnHeight / 2;
    
    return {
      x: this.toTable.x + this.toTable.width / 2,
      y: relationshipColumnY
    };
  }

  getConnectionPointToTarget(target: {x: number, y: number}, table: Table) {
    // If we have a relationship display column, connect directly to it
    if (this.relationshipDisplayColumn) {
      return target;
    }
    
    // Otherwise, use the standard connection point logic
    return this.getConnectionPoint(target, target, table);
  }

  getLineColor(): string {
    switch (this.relationship.type) {
      case 'one-to-one':
        return '#4CAF50'; // Green
      case 'one-to-many':
        return '#2196F3'; // Blue
      case 'many-to-many':
        return '#FF9800'; // Orange
      default:
        return '#666';
    }
  }

  getStartMarker(): string | null {
    switch (this.relationship.type) {
      case 'one-to-one':
        return 'url(#arrow-one-to-one)';
      case 'one-to-many':
        return 'url(#circle-one)';
      case 'many-to-many':
        return 'url(#crow-foot-many-to-many)'; // Crow's foot on both sides for M:M
      default:
        return null;
    }
  }

  getEndMarker(): string | null {
    switch (this.relationship.type) {
      case 'one-to-one':
        return 'url(#arrow-one-to-one)';
      case 'one-to-many':
        return 'url(#crow-foot)';
      case 'many-to-many':
        return 'url(#crow-foot-many-to-many)'; // Crow's foot on both sides for M:M
      default:
        return null;
    }
  }

  onDotsClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  changeRelationshipType(newType: string): void {
    if (this.relationship.type !== newType) {
      this.relationshipTypeChanged.emit({
        relationship: this.relationship,
        newType: newType
      });
    }
  }

  deleteRelationship(): void {
    this.relationshipDeleted.emit(this.relationship);
  }
}
