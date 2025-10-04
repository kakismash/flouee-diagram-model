import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

import { RegularColumnComponent } from '../regular-column/regular-column.component';
import { ActionColumnComponent } from '../action-column/action-column.component';
import { MultiselectColumnComponent } from '../multiselect-column/multiselect-column.component';

export interface TableColumn {
  id: string;
  name: string;
  type: 'regular' | 'relationship' | 'action' | 'multiselect' | 'custom';
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isAutoIncrement?: boolean;
  isVisible?: boolean;
  isEditable?: boolean;
  isDraggable?: boolean;
  data?: any; // Additional data for the column
}

export interface TableConfig {
  enableMultiselect?: boolean;
  enableActions?: boolean;
  enableDragDrop?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  stickyHeaders?: boolean;
}

export interface TableEvents {
  onCellEdit?: (rowIndex: number, columnName: string, newValue: any) => void;
  onColumnReorder?: (columns: TableColumn[]) => void;
  onRowSelect?: (rowIndex: number, selected: boolean) => void;
  onRowDelete?: (rowIndex: number) => void;
  onRowEdit?: (rowIndex: number) => void;
  onRowView?: (rowIndex: number) => void;
  onPageChange?: (pageEvent: PageEvent) => void;
}

@Component({
  selector: 'app-smart-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    DragDropModule,
    RegularColumnComponent,
    ActionColumnComponent,
    MultiselectColumnComponent
  ],
  template: `
    <mat-card class="table-card">
      <!-- Floating Elements Container -->
      <div class="floating-elements-container">
        <!-- Selection Info -->
        <div *ngIf="config.enableMultiselect && getSelectedCount() > 0" 
             class="floating-selection-info">
          <mat-chip class="selection-chip">
            <mat-icon>check_circle</mat-icon>
            <span>{{ getSelectedCount() }} selected</span>
            <button mat-icon-button (click)="clearSelection()" class="clear-btn">
              <mat-icon>close</mat-icon>
            </button>
          </mat-chip>
        </div>

        <!-- Add Row Button -->
        <button mat-fab 
                class="floating-add-btn"
                (click)="onAddRow()"
                matTooltip="Add New Row">
          <mat-icon>add</mat-icon>
        </button>

        <!-- View Manager Button -->
        <button mat-fab 
                class="floating-view-btn"
                (click)="onViewManager()"
                matTooltip="Manage Views">
          <mat-icon>view_list</mat-icon>
        </button>
      </div>

      <!-- Table Container -->
      <div class="table-wrapper">
        <div class="table-container" 
             [class.multiselect-active]="config.enableMultiselect && getSelectedCount() > 0"
             cdkDropList="table-columns"
             cdkDropListOrientation="horizontal"
             (cdkDropListDropped)="onColumnDrop($event)">
          
          <table mat-table [dataSource]="paginatedData" class="data-table">
            
            <!-- Regular Columns -->
            <ng-container *ngFor="let column of regularColumns">
              <app-regular-column
                [column]="column"
                [isEditingName]="isEditingColumnName(column.id)"
                [editingName]="editingColumnNameValue"
                [editingValue]="editingValue"
                [isEditingCell]="isEditingCell"
                (nameEdit)="onColumnNameEdit($event)"
                (nameEditCancel)="onColumnNameEditCancel()"
                (columnClick)="onColumnClick($event)"
                (cellClick)="onCellClick($event)"
                (valueChange)="onValueChange($event)"
                (saveEdit)="onSaveEdit($event)"
                (cancelEdit)="onCancelEdit()">
              </app-regular-column>
            </ng-container>

            <!-- Action Column -->
            <ng-container *ngIf="config.enableActions">
              <app-action-column
                [showDelete]="true"
                [showEdit]="true"
                [showView]="true"
                (delete)="onRowDelete($event)"
                (edit)="onRowEdit($event)"
                (view)="onRowView($event)">
              </app-action-column>
            </ng-container>

            <!-- Multiselect Column -->
            <ng-container *ngIf="config.enableMultiselect">
              <app-multiselect-column
                [isEnabled]="true"
                [isRowSelected]="isRowSelected"
                (selectionChange)="onRowSelect($event)">
              </app-multiselect-column>
            </ng-container>

            <!-- Header Row -->
            <tr mat-header-row *matHeaderRowDef="displayedColumns" 
                [class.sticky-header-row]="config.stickyHeaders">
            </tr>
            
            <!-- Body Rows -->
            <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index" 
                [class.selected]="config.enableMultiselect && isRowSelected(i)"
                (click)="onRowClick(i, $event)">
            </tr>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <mat-paginator *ngIf="config.enablePagination"
        [length]="totalRecords"
        [pageSize]="config.pageSize || 25"
        [pageSizeOptions]="config.pageSizeOptions || [10, 25, 50, 100]"
        (page)="onPageChange($event)"
        class="table-paginator">
      </mat-paginator>
    </mat-card>
  `,
  styles: [`
    .table-card {
      margin: 16px;
      overflow: hidden;
    }

    .floating-elements-container {
      position: sticky;
      top: 10px;
      left: 10px;
      right: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      pointer-events: none;
      z-index: 1001;
      margin-bottom: 10px;
    }

    .floating-selection-info {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 1002;
    }

    .selection-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, var(--theme-primary-container), var(--theme-secondary-container));
      color: var(--theme-on-primary-container);
      border: 1px solid var(--theme-outline);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
    }

    .clear-btn {
      width: 24px;
      height: 24px;
      line-height: 24px;
    }

    .floating-add-btn,
    .floating-view-btn {
      width: 56px;
      height: 56px;
      pointer-events: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .floating-view-btn {
      margin-left: 10px;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .table-container {
      min-width: 100%;
    }

    .table-container.multiselect-active {
      border: 2px solid var(--theme-primary);
      border-radius: 8px;
    }

    .data-table {
      width: 100%;
      background-color: var(--theme-background);
    }

    .sticky-header-row {
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .table-paginator {
      background-color: var(--theme-background-paper);
      border-top: 1px solid var(--theme-divider);
    }

    .selected {
      background-color: var(--theme-primary-container) !important;
    }

    .selected:hover {
      background-color: var(--theme-primary-container) !important;
    }
  `]
})
export class SmartTableComponent implements OnInit, OnChanges {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() config: TableConfig = {};
  @Input() selectedRows: Set<number> = new Set();
  @Input() editingCell: { row: number; column: string } | null = null;
  @Input() editingValue = '';
  @Input() editingColumnName: string | null = null;
  @Input() editingColumnNameValue = '';

  @Output() events = new EventEmitter<TableEvents>();

  displayedColumns: string[] = [];
  regularColumns: TableColumn[] = [];
  paginatedData: any[] = [];
  totalRecords = 0;
  currentPage = 0;
  pageSize = 25;

  ngOnInit() {
    this.setupColumns();
    this.updatePagination();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.updatePagination();
    }
    if (changes['columns']) {
      this.setupColumns();
    }
  }

  private setupColumns() {
    this.regularColumns = this.columns.filter(col => col.type === 'regular' && col.isVisible !== false);
    
    this.displayedColumns = [
      ...this.regularColumns.map(col => col.name)
    ];

    if (this.config.enableActions) {
      this.displayedColumns.push('actions');
    }

    if (this.config.enableMultiselect) {
      this.displayedColumns.push('multiselect');
    }
  }

  private updatePagination() {
    this.totalRecords = this.data.length;
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.data.slice(startIndex, endIndex);
  }

  onColumnDrop(event: CdkDragDrop<any[]>) {
    if (!this.config.enableDragDrop) return;
    
    moveItemInArray(this.regularColumns, event.previousIndex, event.currentIndex);
    this.setupColumns();
    
    this.events.emit({
      onColumnReorder: (columns: TableColumn[]) => {
        // Handle column reorder
        console.log('Columns reordered:', columns);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagination();
    
    this.events.emit({
      onPageChange: (pageEvent: PageEvent) => {
        // Handle page change
        console.log('Page changed:', pageEvent);
      }
    });
  }

  onRowClick(index: number, event: Event) {
    // Handle row click logic
  }

  onRowSelect(index: number) {
    this.events.emit({
      onRowSelect: (rowIndex: number, selected: boolean) => {
        // Handle row select
        console.log('Row selected:', rowIndex, selected);
      }
    });
  }

  onRowDelete(index: number) {
    this.events.emit({
      onRowDelete: (rowIndex: number) => {
        // Handle row delete
        console.log('Row deleted:', rowIndex);
      }
    });
  }

  onRowEdit(index: number) {
    this.events.emit({
      onRowEdit: (rowIndex: number) => {
        // Handle row edit
        console.log('Row edit:', rowIndex);
      }
    });
  }

  onRowView(index: number) {
    this.events.emit({
      onRowView: (rowIndex: number) => {
        // Handle row view
        console.log('Row view:', rowIndex);
      }
    });
  }

  onCellClick(event: { rowIndex: number; columnName: string; value: any }) {
    // Handle cell click logic
  }

  onSaveEdit(event: { rowIndex: number; columnName: string; element: any }) {
    this.events.emit({
      onCellEdit: (rowIndex: number, columnName: string, newValue: any) => {
        // Handle cell edit
        console.log('Cell edited:', rowIndex, columnName, newValue);
      }
    });
  }

  onCancelEdit() {
    // Handle cancel edit
  }

  onValueChange(value: string) {
    this.editingValue = value;
  }

  onColumnNameEdit(event: { columnId: string; newName: string }) {
    // Handle column name edit
  }

  onColumnNameEditCancel() {
    // Handle column name edit cancel
  }

  onColumnClick(columnId: string) {
    // Handle column click
  }

  onAddRow() {
    // Handle add row
  }

  onViewManager() {
    // Handle view manager
  }

  getSelectedCount(): number {
    return this.selectedRows.size;
  }

  clearSelection() {
    this.selectedRows.clear();
  }

  isRowSelected(index: number): boolean {
    return this.selectedRows.has(index);
  }

  isEditingCell(rowIndex: number, columnName: string): boolean {
    return this.editingCell?.row === rowIndex && this.editingCell?.column === columnName;
  }

  isEditingColumnName(columnId: string): boolean {
    return this.editingColumnName === columnId;
  }
}
