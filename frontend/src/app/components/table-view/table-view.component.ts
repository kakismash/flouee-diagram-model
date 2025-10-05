import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, signal, effect, HostListener, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { Table, Relationship, RelationshipDisplayColumn, RelationshipDisplayField } from '../../models/table.model';
import { TableView, ColumnViewSetting } from '../../models/table-view.model';
import { TableViewService } from '../../services/table-view.service';
import { DataSimulationService } from '../../services/data-simulation.service';
import { ViewConfigDialogComponent } from '../view-config-dialog/view-config-dialog.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ModernInputComponent } from '../modern-input/modern-input.component';
import { ColumnContextMenuComponent, ColumnContextMenuData, ColumnColor } from '../column-context-menu/column-context-menu.component';

export interface DataChangeEvent {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SCHEMA_UPDATE';
  table: string;
  data: any;
  id?: string;
  schemaUpdate?: any;
}

@Component({
  selector: 'app-table-view',
  standalone: true,
  styleUrls: ['./relationship-dropdown.theme.scss'],
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatPaginatorModule,
    DragDropModule,
    ModernInputComponent,
    ColumnContextMenuComponent
  ],
  template: `
    <div class="table-view-container" #tableContainer>
      <!-- Table Content -->
      <mat-card class="table-content" id="table-{{table.id}}">
        <!-- Floating Elements positioned relative to the table -->
        <div class="floating-elements-container">
          <!-- Floating selection info -->
          <div class="floating-selection-info" *ngIf="getSelectedCount() > 0">
            <div class="selection-chip">
              <mat-icon>checklist</mat-icon>
              <span class="selection-text">{{ getSelectedCount() }} selected</span>
              <button mat-icon-button 
                      (click)="deleteSelectedRows()" 
                      matTooltip="Delete Selected"
                      class="delete-selected-btn">
                <mat-icon>delete</mat-icon>
              </button>
              <button mat-icon-button 
                      (click)="clearSelection()" 
                      matTooltip="Clear Selection"
                      class="clear-selected-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Floating Add Row Button -->
          <button mat-button 
                  (click)="addRecord()" 
                  matTooltip="Add New Row"
                  class="floating-add-btn">
            <mat-icon>add</mat-icon>
            Add Record
          </button>

          <!-- Floating View Manager Button -->
          <button mat-button 
                  (click)="openViewManager()" 
                  matTooltip="Manage Views"
                  class="floating-view-btn">
            <mat-icon>view_module</mat-icon>
            Views
          </button>
        </div>
        <!-- Single Table with Sticky Headers -->
        <div class="table-wrapper">
          <div class="table-container" 
               [class.multiselect-active]="isMultiSelectMode()"
               cdkDropList="table-columns" 
               cdkDropListOrientation="horizontal"
               (cdkDropListDropped)="onColumnDrop($event)">
            <table mat-table [dataSource]="paginatedData" class="data-table">
            <!-- Regular Columns -->

            <ng-container *ngFor="let column of regularColumns; trackBy: trackByColumnId" [matColumnDef]="'reg_' + column.name">
              <th mat-header-cell *matHeaderCellDef class="sticky-header">
                <div class="column-header" 
                     cdkDrag 
                     [cdkDragDisabled]="!activeView"
                     [matTooltip]="activeView ? 'Drag to reorder column' : 'No view selected'"
                     matTooltipPosition="below">
                    <div class="column-header-content">
                      <div class="column-info">
                        <span *ngIf="!isEditingColumnName(column.id)" 
                              class="column-name-editable"
                              (click)="startEditColumnName(column.id, column.name)">
                          {{ column.name }}
                        </span>
                        <app-modern-input *ngIf="isEditingColumnName(column.id)"
                                          [config]="{
                                            size: 'small',
                                            variant: 'outline',
                                            placeholder: 'Column name',
                                            maxLength: 50,
                                            required: true
                                          }"
                                          [value]="editingColumnNameValue()"
                                          (valueChange)="updateEditingColumnNameValue($event)"
                                          (enter)="saveColumnName(column.id)"
                                          (escape)="cancelEditColumnName()"
                                          class="column-name-input">
                        </app-modern-input>
                        <div class="column-badges">
                          <mat-chip *ngIf="column.isPrimaryKey" class="badge pk">PK</mat-chip>
                          <mat-chip *ngIf="column.isForeignKey" class="badge fk">FK</mat-chip>
                          <mat-chip *ngIf="column.isUnique" class="badge unique">UQ</mat-chip>
                          <mat-chip *ngIf="column.isAutoIncrement" class="badge ai">AI</mat-chip>
                        </div>
                      </div>
                    </div>
                </div>
              </th>
              <td mat-cell *matCellDef="let element; let i = index">
                <div class="cell-content" 
                     [class.editing]="isEditing(i, 'reg_' + column.name)"
                     (click)="startEdit(i, 'reg_' + column.name, element[column.name])">
                  
                  <!-- Display Mode -->
                  <span *ngIf="!isEditing(i, 'reg_' + column.name)" 
                        [class.primary-key]="column.isPrimaryKey"
                        [class.editable]="!column.isAutoIncrement">
                    {{ formatCellValue(element[column.name], column) }}
                  </span>
                  
                  <!-- Edit Mode -->
                  <div *ngIf="isEditing(i, 'reg_' + column.name)" class="edit-cell">
                    <app-modern-input
                      [config]="{
                        size: 'small',
                        variant: 'outline',
                        placeholder: 'Enter value',
                        maxLength: 255
                      }"
                      [value]="editingValue()"
                      (valueChange)="updateEditingValue($event)"
                      (enter)="saveEdit(i, 'reg_' + column.name, element)"
                      (escape)="cancelEdit()"
                      class="cell-edit-input">
                    </app-modern-input>
                  </div>
                </div>
              </td>
            </ng-container>

            <!-- Relationship Display Columns - Each field as separate column -->
            <ng-container *ngFor="let relCol of relationshipDisplayColumns; trackBy: trackByRelationshipColumnId; let relIndex = index">
              <ng-container *ngFor="let field of relCol.fields; trackBy: trackByFieldIndex; let fieldIndex = index" 
                           [matColumnDef]="'rel_' + relCol.id + '_' + fieldIndex">
                <th mat-header-cell *matHeaderCellDef class="sticky-header">
                  <div class="column-header relationship-header" 
                       cdkDrag 
                       [cdkDragDisabled]="!activeView"
                       [matTooltip]="activeView ? 'Drag to reorder relationship column' : 'No view selected'"
                       matTooltipPosition="below">
                    <div class="column-header-content">
                      <div class="column-info">
                        <div class="relationship-info">
                          <mat-icon>link</mat-icon>
                          <span class="source-table">{{ getSourceTableName(relCol.sourceTableId) }}</span>
                          <span class="field-name">{{ field.displayName }}</span>
                          <mat-chip class="badge rel">REL</mat-chip>
                        </div>
                      </div>
                    </div>
                  </div>
                </th>
                <td mat-cell *matCellDef="let element; let i = index">
                  <div class="cell-content relationship-cell" 
                       [class.editing]="isEditingRelationship(i, relCol.id, fieldIndex)"
                       (click)="startEditRelationship(i, relCol, field, element)">
                    
                    <!-- Display Mode -->
                    <span *ngIf="!isEditingRelationship(i, relCol.id, fieldIndex)" 
                          class="relationship-value editable">
                      {{ getRelationshipValue(element, relCol, field) }}
                    </span>
                    
                    <!-- Edit Mode -->
                    <div *ngIf="isEditingRelationship(i, relCol.id, fieldIndex)" class="edit-cell">
                      <mat-form-field appearance="outline" class="inline-field">
                        <mat-select [value]="editingValue()"
                                    (blur)="saveEditRelationship(i, relCol, field, element)"
                                    (selectionChange)="updateEditingValue($event)">
                          <mat-option *ngFor="let option of getRelationshipOptions(relCol); trackBy: trackByOptionValue" [value]="option.value">
                            {{ option.label }}
                          </mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>
                </td>
              </ng-container>
            </ng-container>

            <!-- Simple Relationship Columns -->
            <ng-container *ngFor="let rel of relationships; trackBy: trackByRelationshipId" [matColumnDef]="rel.name || 'rel_' + rel.id">
              <th mat-header-cell *matHeaderCellDef class="sticky-header">
                <div class="column-header">
                  <span class="column-name">{{ rel.name || 'rel_' + rel.id }}</span>
                </div>
              </th>
              <td mat-cell *matCellDef="let row; let i = index" 
                  [class.editing]="editingCell()?.row === i && editingCell()?.column === (rel.name || 'rel_' + rel.id)"
                  (click)="startEditSimpleRelationship(i, rel.name || 'rel_' + rel.id, row[rel.name || 'rel_' + rel.id], rel)">
                <div class="cell-content">
                  <div *ngIf="editingCell()?.row !== i || editingCell()?.column !== (rel.name || 'rel_' + rel.id)" 
                       class="relationship-value">
                    <span *ngIf="rel.displayColumnId; else singleValue">
                      {{ getRelationshipDisplayValue(row[rel.name || 'rel_' + rel.id], rel) }}
                    </span>
                    <ng-template #singleValue>
                      {{ row[rel.name || 'rel_' + rel.id] || '-' }}
                    </ng-template>
                  </div>
                  <mat-form-field *ngIf="editingCell()?.row === i && editingCell()?.column === (rel.name || 'rel_' + rel.id)" 
                                  appearance="outline" class="relationship-field">
                    <mat-select [value]="editingValue()" 
                                (selectionChange)="editingValue.set($event.value)"
                                (blur)="saveEdit(i, rel.name || 'rel_' + rel.id)"
                                (keydown.escape)="cancelEdit()">
                      <mat-option *ngFor="let option of getSimpleRelationshipOptions(rel); trackBy: trackByOptionValue" 
                                  [value]="option.value">
                        {{ option.label }}
                      </mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="sticky-header">
                <div class="column-header">
                  <span class="column-name">Actions</span>
                </div>
              </th>
              <td mat-cell *matCellDef="let row; let i = index">
                <div class="actions-cell">
                  <button mat-icon-button 
                          (click)="deleteRow(i)" 
                          matTooltip="Delete Row"
                          class="delete-btn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <!-- Multi-select Column -->
            <ng-container matColumnDef="multiselect" *ngIf="isMultiSelectMode()">
              <th mat-header-cell *matHeaderCellDef class="sticky-header">
                <div class="column-header">
                  <span class="column-name">Select</span>
                </div>
              </th>
              <td mat-cell *matCellDef="let row; let i = index">
                <div class="multiselect-cell">
                  <mat-checkbox 
                    [checked]="isRowSelected(i)"
                    (change)="toggleRowSelection(i)">
                  </mat-checkbox>
                </div>
              </td>
            </ng-container>

            <!-- Custom View Columns -->
            <ng-container *ngFor="let viewColumn of activeView?.columnSettings; trackBy: trackByViewColumnName" [matColumnDef]="'view_' + viewColumn.columnName">
              <th mat-header-cell *matHeaderCellDef class="sticky-header" 
                  [style.border]="getColumnBorderStyle(viewColumn, true)"
                  [style.background-color]="getColumnBackgroundColor(viewColumn)"
                  [style.box-shadow]="getColumnNeonGlow(viewColumn)">
                <app-column-context-menu 
                    [data]="getColumnContextMenuData(viewColumn)"
                    (colorSelected)="onColumnColorSelected($event)"
                    (rightClick)="onColumnRightClick($event)">
                  <div class="column-header" 
                       cdkDrag 
                       [cdkDragDisabled]="!activeView"
                       [matTooltip]="activeView ? 'Drag to reorder column' : 'No view selected'"
                       matTooltipPosition="below">
                  <div class="column-header-content">
                    <div class="column-info">
                      <span *ngIf="!isEditingViewColumnName(viewColumn.columnId)" 
                            class="column-name-editable"
                            (click)="startEditViewColumnName(viewColumn.columnId, viewColumn.displayName || viewColumn.columnName)">
                        {{ viewColumn.displayName || viewColumn.columnName }}
                      </span>
                      <app-modern-input *ngIf="isEditingViewColumnName(viewColumn.columnId)"
                                        [config]="{
                                          size: 'small',
                                          variant: 'outline',
                                          placeholder: 'Column display name',
                                          maxLength: 50,
                                          required: true
                                        }"
                                        [value]="editingColumnNameValue()"
                                        (valueChange)="updateEditingColumnNameValue($event)"
                                        (enter)="saveViewColumnName(viewColumn.columnId)"
                                        (escape)="cancelEditColumnName()"
                                        class="column-name-input">
                      </app-modern-input>
                      <div class="column-badges">
                        <mat-chip *ngIf="isRegularColumn(viewColumn)" class="badge reg">REG</mat-chip>
                        <mat-chip *ngIf="isRelationshipColumn(viewColumn)" class="badge rel">REL</mat-chip>
                      </div>
                    </div>
                    <!-- Context menu trigger only for referenced columns -->
                    <div *ngIf="isRelationshipColumn(viewColumn)" 
                         class="context-menu-area"
                         (contextmenu)="onColumnRightClick($event, viewColumn)"
                         matTooltip="Right-click for color options"
                         matTooltipPosition="below">
                      <mat-icon class="context-menu-icon">more_vert</mat-icon>
                    </div>
                  </div>
                </div>
                </app-column-context-menu>
              </th>
              <td mat-cell *matCellDef="let row; let i = index" 
                  [class.editing]="editingCell()?.row === i && editingCell()?.column === ('view_' + viewColumn.columnId)"
                  [style.border-left]="getColumnLeftBorder(viewColumn)"
                  [style.border-right]="getColumnRightBorder(viewColumn)"
                  [style.border-bottom]="getRowBottomBorder(i, viewColumn)"
                  [style.background-color]="getColumnBackgroundColor(viewColumn)"
                  [style.box-shadow]="getColumnNeonGlow(viewColumn) + (getRowBottomNeonGlow(i, viewColumn) !== 'none' ? ', ' + getRowBottomNeonGlow(i, viewColumn) : '')"
                  (click)="startEditViewColumn(i, viewColumn, row)">
                <div class="cell-content">
                  <span *ngIf="editingCell()?.row !== i || editingCell()?.column !== ('view_' + viewColumn.columnId)">
                    {{ getViewColumnValue(row, viewColumn) || '-' }}
                  </span>
                  
                  <!-- Regular Column Edit Input -->
                  <app-modern-input 
                    *ngIf="editingCell()?.row === i && editingCell()?.column === ('view_' + viewColumn.columnId) && isRegularColumn(viewColumn)"
                    [value]="editingValue()"
                    (valueChange)="editingValue.set($event)"
                    (blur)="saveEdit(i, 'view_' + viewColumn.columnId)"
                    (keydown.enter)="saveEdit(i, 'view_' + viewColumn.columnId)"
                    (keydown.escape)="cancelEdit()"
                    [config]="{
                      size: 'small',
                      variant: 'outline',
                      placeholder: 'Enter value',
                    }"
                    class="cell-input">
                  </app-modern-input>

                  <!-- Relationship Column Edit Dropdown -->
                  <div *ngIf="editingCell()?.row === i && editingCell()?.column === ('view_' + viewColumn.columnId) && isRelationshipColumn(viewColumn)"
                       class="relationship-edit-dropdown">
                    <mat-form-field appearance="outline" class="inline-field">
                      <mat-select [value]="editingValue()"
                                  (selectionChange)="editingValue.set($event.value)"
                                  (blur)="saveEditViewRelationship(i, viewColumn)"
                                  (keydown.escape)="cancelEdit()">
                        <mat-option *ngFor="let option of getViewColumnOptions(viewColumn); trackBy: trackByOptionValue" 
                                    [value]="option.value">
                          {{ option.label }}
                        </mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>

                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns" class="sticky-header-row"></tr>
            
            <!-- Table Body Rows -->
            <tr mat-row *matRowDef="let row; columns: displayedColumns; let i = index" 
                [class.selected]="isMultiSelectMode() && isRowSelected(i)"
                (click)="onRowClick(i, $event)"></tr>
          </table>
          </div>
        </div>

        <!-- Scrollable Table Content -->
        <div class="scrollable-table-content">
          <div class="table-content-container" 
               [class.multiselect-active]="isMultiSelectMode()">
            <!-- Table body content is now in the main table above -->
          </div>
        </div>
        
        <!-- Pagination -->
        <mat-paginator 
          [length]="totalRecords"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 25, 50, 100]"
          [showFirstLastButtons]="true"
          (page)="onPageChange($event)"
          class="table-paginator">
        </mat-paginator>
      </mat-card>

      <!-- Relationships Info -->
      <mat-card class="relationships-info" *ngIf="relationships.length > 0">
        <mat-card-header>
          <mat-card-title>Relationships</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="relationships-list">
            <div *ngFor="let rel of relationships; trackBy: trackByRelationshipItem" class="relationship-item">
              <div class="relationship-info">
                <mat-icon>link</mat-icon>
                <span>{{ getRelationshipDescription(rel) }}</span>
                <mat-chip [class]="'relationship-type-' + rel.type">{{ rel.type }}</mat-chip>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .table-view-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      background: var(--theme-background);
      color: var(--theme-text-primary);
    }


    .table-content {
      overflow: hidden;
      background: var(--theme-background-paper);
      border: 1px solid var(--theme-border);
      position: relative;
    }

    /* Sticky Table Headers */
    .sticky-header {
      position: sticky !important;
      top: 0 !important;
      z-index: 1000 !important;
      background: var(--theme-surface) !important;
      border-bottom: 1px solid var(--theme-outline) !important;
    }

    .sticky-header-row {
      position: sticky !important;
      top: 0 !important;
      z-index: 1000 !important;
      background: var(--theme-surface) !important;
    }

    /* Floating Elements Container */
    .floating-elements-container {
      position: sticky;
      top: 0px;
      left: -57px;
      padding: 6px;
      right: 20px;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      pointer-events: none;
      z-index: 1001;
      gap: 12px;
    }

    .floating-elements-container > * {
      pointer-events: auto;
    }

    /* Floating Selection Info */
    .floating-selection-info {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 1002;
    }

    /* Floating Action Buttons */
    .floating-add-btn {
      background: rgba(255, 255, 255, 0.15) !important;
      backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      color: var(--theme-text-primary) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
      transition: all 0.3s ease !important;
      position: relative !important;
      overflow: hidden !important;
      border-radius: 12px !important;
      padding: 12px 16px !important;
      min-width: auto !important;
      height: auto !important;
    }

    .floating-add-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
      border-radius: 12px;
      pointer-events: none;
      transition: all 0.3s ease;
    }

    .floating-add-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
      background: rgba(255, 255, 255, 0.2) !important;
    }

    .floating-add-btn:hover::before {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
      transform: scale(1.02);
    }

    .floating-add-btn mat-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--theme-text-primary);
      position: relative;
      z-index: 1;
    }

    .floating-view-btn {
      background: rgba(255, 255, 255, 0.15) !important;
      backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.3) !important;
      color: var(--theme-text-primary) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
      transition: all 0.3s ease !important;
      position: relative !important;
      overflow: hidden !important;
      border-radius: 12px !important;
      padding: 12px 16px !important;
      min-width: auto !important;
      height: auto !important;
      margin-left: 12px !important;
    }

    .floating-view-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
      border-radius: 12px;
      pointer-events: none;
      transition: all 0.3s ease;
    }

    .floating-view-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15) !important;
      background: rgba(255, 255, 255, 0.2) !important;
    }

    .floating-view-btn:hover::before {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
      transform: scale(1.02);
    }

    .floating-view-btn mat-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: var(--theme-text-primary);
      position: relative;
      z-index: 1;
    }

    /* Scrollable Table Content */
    .scrollable-table-content {
      max-height: 60vh;
      overflow-y: auto;
      overflow-x: auto;
    }

    .table-content-container {
      width: 100%;
      position: relative;
    }

    .table-content-container.cdk-drop-list-dragging {
      cursor: grabbing;
    }

    .table-wrapper {
      overflow-x: auto;
      position: relative;
    }


    .selection-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: var(--theme-text-primary);
      padding: 12px 20px;
      border-radius: 25px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      pointer-events: auto;
      animation: slideDown 0.3s ease-out;
      position: relative;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .selection-chip::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
      border-radius: 25px;
      pointer-events: none;
      transition: all 0.3s ease;
    }

    .selection-chip:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      background: rgba(255, 255, 255, 0.2);
    }

    .selection-chip:hover::before {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.15) 100%);
      transform: scale(1.02);
    }

    .selection-chip mat-icon:first-child {
      color: var(--theme-text-primary);
      font-size: 20px;
      width: 20px;
      height: 20px;
      position: relative;
      z-index: 1;
    }

    .selection-text {
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
      position: relative;
      z-index: 1;
      color: var(--theme-text-primary);
    }

    .delete-selected-btn {
      color: var(--theme-error);
      margin-left: 6px;
      position: relative;
      z-index: 1;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .delete-selected-btn:hover {
      background-color: var(--theme-error-container);
      color: var(--theme-on-error-container);
      transform: scale(1.1);
    }

    .delete-selected-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .clear-selected-btn {
      color: var(--theme-on-primary-container);
      margin-left: 6px;
      position: relative;
      z-index: 1;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .clear-selected-btn:hover {
      background-color: rgba(255, 255, 255, 0.2);
      color: var(--theme-on-primary-container);
      transform: scale(1.1);
    }

    .clear-selected-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-15px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .table-container {
      width: 100%;
      position: relative;
    }

    .table-container.cdk-drop-list-dragging {
      cursor: grabbing;
    }

    .data-table {
      width: 100%;
      min-width: 600px;
      background: var(--theme-table-row);
      table-layout: auto;
    }

    /* Responsive column widths */
    .data-table th,
    .data-table td {
      padding: 0px 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Specific column width constraints */
    .data-table th[mat-header-cell]:nth-child(1),
    .data-table td[mat-cell]:nth-child(1) {
      width: 60px;
      min-width: 60px;
      max-width: 80px;
    }

    .data-table th[mat-header-cell]:nth-child(2),
    .data-table td[mat-cell]:nth-child(2) {
      width: 120px;
      min-width: 120px;
      max-width: 150px;
    }

    .data-table th[mat-header-cell]:nth-child(3),
    .data-table td[mat-cell]:nth-child(3) {
      width: 100px;
      min-width: 100px;
      max-width: 120px;
    }

    .column-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: var(--theme-text-primary);
      position: relative;
      cursor: grab;
      border: 2px solid transparent;
      transition: all 0.2s ease;
      min-height: 40px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .column-header:hover {
      background-color: var(--theme-table-row-hover);
      border-color: var(--theme-primary);
    }

    .column-header:active {
      cursor: grabbing;
    }

    .column-header.cdk-drag-preview {
      box-shadow: 0 4px 12px var(--theme-card-shadow);
      transform: rotate(2deg);
      background: var(--theme-surface);
      border: 2px solid var(--theme-primary);
      opacity: 0.9;
    }

    .column-header.cdk-drag-placeholder {
      opacity: 0.3;
      background: var(--theme-surface-variant);
      border: 2px dashed var(--theme-primary);
    }

    .column-header.cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    .column-header.cdk-drag-disabled {
      cursor: default;
    }

    .column-header.cdk-drag-disabled:hover {
      border-color: transparent;
    }

    .relationship-header {
      background-color: var(--theme-surface-variant);
      border-left: 3px solid var(--theme-primary);
    }

    .relationship-header:hover {
      background-color: var(--theme-table-row-hover);
      border-left-color: var(--theme-primary);
    }

    .relationship-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .relationship-info .source-table {
      font-weight: 500;
      color: var(--theme-primary);
      font-size: 0.8em;
    }

    .relationship-info .field-name {
      font-weight: 600;
      color: var(--theme-text-primary);
    }

    .column-name-editable {
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
      transition: all 0.2s ease;
    }

    .column-name-editable:hover {
      background-color: var(--theme-surface-variant);
      color: var(--theme-primary);
    }

    .column-name-field {
      min-width: 120px;
      max-width: 200px;
    }

    .column-name-field .mat-mdc-form-field-wrapper {
      padding-bottom: 0;
    }

    .column-name-field .mat-mdc-form-field-infix {
      padding: 8px 0;
      border-top: none;
    }

    .column-name-field .mat-mdc-text-field-wrapper {
      padding: 0;
    }

    /* Modern input styles */
    .column-name-input {
      min-width: 80px;
      max-width: 300px;
    }

    .cell-edit-input {
      min-width: 80px;
      max-width: 200px;
    }

    .edit-cell {
      width: 100%;
      display: flex;
      align-items: center;
    }

    /* Multi-select styles */
    .multi-select-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-right: 16px;
    }

    .selected-count {
      background-color: var(--theme-primary);
      color: var(--theme-on-primary);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .normal-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .delete-button {
      color: var(--theme-error) !important;
    }

    .delete-button:hover {
      background-color: var(--theme-error-container) !important;
    }

    .exit-multiselect {
      color: var(--theme-error);
    }

    .exit-multiselect:hover {
      background-color: var(--theme-error-container);
    }

    .multiselect-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: var(--theme-primary-container);
      color: var(--theme-on-primary-container);
      border-radius: 16px;
      font-size: 14px;
      font-weight: 500;
      margin-left: 8px;
    }

    .multiselect-info mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }



    /* Row selection styles */
    .data-table tr {
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    .data-table tr.selected {
      background-color: var(--theme-primary-container) !important;
      color: var(--theme-on-primary-container) !important;
      box-shadow: inset 0 0 0 2px var(--theme-primary);
    }

    .data-table tr.selected:hover {
      background-color: var(--theme-primary) !important;
      color: var(--theme-on-primary) !important;
      box-shadow: inset 0 0 0 2px var(--theme-primary);
    }

    /* Ensure selected rows maintain their color even after hover */
    .data-table tr.selected:not(:hover) {
      background-color: var(--theme-primary-container) !important;
      color: var(--theme-on-primary-container) !important;
      box-shadow: inset 0 0 0 2px var(--theme-primary);
    }

    .data-table tr.selected td {
      background-color: transparent !important;
      color: inherit !important;
    }

    .data-table tr.selected .cell-content {
      color: inherit !important;
    }

    .data-table tr.selected .column-name-editable {
      color: inherit !important;
    }

    .data-table tr.selected .relationship-value {
      color: inherit !important;
    }

    .data-table tr.selected .badge {
      background-color: var(--theme-on-primary-container) !important;
      color: var(--theme-primary-container) !important;
    }

    /* Override Material Design table row styles */
    .data-table tr.selected.mat-row {
      background-color: var(--theme-primary-container) !important;
      color: var(--theme-on-primary-container) !important;
    }

    .data-table tr.selected.mat-row:hover {
      background-color: var(--theme-primary) !important;
      color: var(--theme-on-primary) !important;
    }

    /* Ensure Material Design doesn't override our styles */
    .data-table tr.selected.mat-row:not(:hover) {
      background-color: var(--theme-primary-container) !important;
      color: var(--theme-on-primary-container) !important;
    }

    /* Checkbox styles for selected rows */
    .data-table tr.selected ::ng-deep .mat-mdc-checkbox {
      --mdc-checkbox-selected-checkmark-color: var(--theme-on-primary-container);
      --mdc-checkbox-selected-focus-icon-color: var(--theme-on-primary-container);
      --mdc-checkbox-selected-hover-icon-color: var(--theme-on-primary-container);
      --mdc-checkbox-selected-icon-color: var(--theme-on-primary-container);
      --mdc-checkbox-selected-pressed-icon-color: var(--theme-on-primary-container);
    }

    .data-table tr.selected ::ng-deep .mat-mdc-checkbox .mdc-checkbox__native-control:enabled:checked ~ .mdc-checkbox__background {
      background-color: var(--theme-on-primary-container);
      border-color: var(--theme-on-primary-container);
    }

    .data-table tr.selected ::ng-deep .mat-mdc-checkbox .mdc-checkbox__native-control:enabled:indeterminate ~ .mdc-checkbox__background {
      background-color: var(--theme-on-primary-container);
      border-color: var(--theme-on-primary-container);
    }

    /* Multi-select mode table styling */
    .table-container.multiselect-active {
      border: 2px solid var(--theme-primary);
      border-radius: 8px;
      background-color: var(--theme-surface-variant);
    }

    .table-container.multiselect-active .data-table {
      background-color: var(--theme-background-paper);
    }

    .column-header-content {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 4px;
      flex: 1;
    }

    .column-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }


    .column-badges {
      display: flex;
      gap: 2px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 10px;
      height: 16px;
      line-height: 16px;
    }

    .context-menu-area {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s ease;
      margin-left: 8px;
    }

    .context-menu-area:hover {
      background-color: var(--theme-hover);
    }

    .context-menu-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: var(--theme-text-secondary);
    }

    .relationship-edit-dropdown {
      width: 100%;
    }

    .relationship-edit-dropdown .inline-field {
      width: 100%;
    }

    .relationship-edit-dropdown .mat-mdc-form-field {
      width: 100%;
    }

    .relationship-edit-dropdown .mat-mdc-select {
      width: 100%;
    }


    /* Error Snackbar Styles */
    ::ng-deep .error-snackbar {
      background-color: #f44336 !important;
      color: white !important;
    }

    ::ng-deep .error-snackbar .mat-mdc-snack-bar-action {
      color: white !important;
    }


    .badge.pk {
      background: var(--theme-success);
      color: white;
    }

    .badge.fk {
      background: var(--theme-warning);
      color: white;
    }

    .badge.unique {
      background: var(--theme-info);
      color: white;
    }

    .badge.ai {
      background: var(--theme-secondary);
      color: white;
    }

    .badge.rel {
      background: var(--theme-primary);
      color: white;
    }

    .badge.reg {
      background: var(--theme-secondary);
      color: white;
    }

    .cell-content {
      padding: 4px 8px;
      color: var(--theme-text-primary);
      border-radius: 4px;
      transition: background-color 0.2s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .primary-key {
      font-weight: bold;
      color: var(--theme-success);
    }

    .relationship-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .relationship-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .relationship-field {
      display: flex;
      gap: 4px;
      font-size: 12px;
    }

    .field-name {
      font-weight: 500;
      color: var(--theme-text-secondary);
    }

    .field-value {
      color: var(--theme-primary);
    }

    .action-buttons {
      display: flex;
      gap: 4px;
    }

    .relationships-info {
      margin-top: 16px;
      background: var(--theme-card-background);
      border: 1px solid var(--theme-card-border);
    }

    .relationships-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .relationship-item {
      padding: 8px;
      background: var(--theme-surface-variant);
      border-radius: 4px;
    }


    .relationship-type-one-to-one {
      background: var(--theme-success);
      color: white;
    }

    .relationship-type-one-to-many {
      background: var(--theme-warning);
      color: white;
    }

    .relationship-type-many-to-many {
      background: var(--theme-info);
      color: white;
    }

    /* Inline editing styles */
    .cell-content {
      position: relative;
      min-height: 32px;
      display: flex;
      align-items: center;
    }

    .cell-content.editable {
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .cell-content.editable:hover {
      background-color: var(--theme-table-row-hover);
      border-radius: 4px;
    }

    .cell-content.editing {
      background-color: var(--theme-table-row-selected);
    }

    .edit-cell {
      width: 100%;
    }

    .inline-field {
      width: 100%;
    }



    /* Relationship column styles */
    .relationship-header {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .source-table {
      font-size: 10px;
      color: var(--theme-text-secondary);
      font-weight: 500;
    }

    .relationship-header .field-name {
      font-weight: 500;
      color: var(--theme-text-primary);
    }

    .relationship-cell {
      background-color: var(--theme-surface-variant);
      border-left: 3px solid var(--theme-primary);
      padding: 4px 8px;
    }

    .relationship-value {
      color: var(--theme-primary);
      font-weight: 500;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .relationship-value.editable {
      cursor: pointer;
    }

    .relationship-value.editable:hover {
      background-color: var(--theme-table-row-selected);
      border-radius: 4px;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      margin-right: 16px;
      font-size: 14px;
      color: var(--theme-text-primary);
      font-weight: 500;
    }

    .table-paginator {
      border-top: 1px solid var(--theme-divider);
      background-color: var(--theme-surface-variant);
      color: var(--theme-text-primary);
    }

    .table-paginator .mat-mdc-paginator-range-label {
      color: var(--theme-text-primary);
    }

    .table-paginator .mat-mdc-paginator-page-size-label {
      color: var(--theme-text-primary);
    }

    .table-paginator .mat-mdc-paginator-icon {
      color: var(--theme-text-primary);
    }

    .table-paginator .mat-mdc-button {
      color: var(--theme-text-primary);
    }

    .table-paginator .mat-mdc-button:disabled {
      color: var(--theme-text-disabled);
    }

    .table-paginator .mat-mdc-select {
      color: var(--theme-text-primary);
    }

    .table-paginator .mat-mdc-select-value {
      color: var(--theme-text-primary);
    }

    .table-paginator .mat-mdc-select-arrow {
      color: var(--theme-text-primary);
    }

    /* Override Material Design paginator styles */
    ::ng-deep .table-paginator .mat-mdc-paginator-container {
      background-color: var(--theme-surface-variant);
      color: var(--theme-text-primary);
    }

    ::ng-deep .table-paginator .mat-mdc-paginator-range-label {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .table-paginator .mat-mdc-paginator-page-size-label {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .table-paginator .mat-mdc-paginator-icon {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .table-paginator .mat-mdc-button {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .table-paginator .mat-mdc-button:disabled {
      color: var(--theme-text-disabled) !important;
    }

    ::ng-deep .table-paginator .mat-mdc-select {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .table-paginator .mat-mdc-select-value {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .table-paginator .mat-mdc-select-arrow {
      color: var(--theme-text-primary) !important;
    }


  `]
})
export class TableViewComponent implements OnInit, OnChanges, OnDestroy {
  @Input() table!: Table;
  @Input() data: any[] = [];
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

  @ViewChild('tableContainer', { static: false }) tableContainer!: ElementRef;

  displayedColumns: string[] = [];
  regularColumns: any[] = [];

  // Editing state
  editingCell = signal<{row: number, column: string} | null>(null);
  editingValue = signal<string>('');

  // Column name editing state
  editingColumnName = signal<string | null>(null);
  editingColumnNameValue = signal<string>('');

  // Multi-select state
  selectedRows = signal<Set<number>>(new Set());

  isMultiSelectMode = signal<boolean>(false);
  isCtrlPressed = signal<boolean>(false);
  
  // Pagination properties
  pageSize = 25;
  currentPage = 0;
  totalRecords = 0;
  paginatedData: any[] = [];

  // Cache for relationship values to prevent infinite loops
  private relationshipValueCache = new Map<string, string>();
  private relationshipOptionsCache = new Map<string, { value: string; label: string }[]>();

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private tableViewService: TableViewService,
    private dataSimulationService: DataSimulationService,
    private cdr: ChangeDetectorRef
  ) {
  }

  ngOnInit() {
    this.setupColumns();
    this.updatePagination();
  }

  ngOnDestroy() {
    // Clean up any resources if needed
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.updatePagination();
    }
    if (changes['activeView']) {
      this.setupColumns();
    }
    
    // Clear cache when data changes to prevent stale data
    if (changes['data'] || changes['allTableData']) {
      this.clearRelationshipCache();
    }
  }

  private setupColumns() {
    // Always use active view (guaranteed to exist)
    let visibleColumns = this.table.columns;
    if (this.activeView) {
      visibleColumns = this.tableViewService.applyView(this.table, this.activeView);
    }

    // Regular columns (non-relationship) - apply view filter
    this.regularColumns = visibleColumns.filter(col => 
      !col.isSystemGenerated && !col.isForeignKey
    );
    
    // Only show relationship columns if they are explicitly defined in the view
    const relationshipDisplayColumns: string[] = [];
    const simpleRelationshipColumns: string[] = [];
    
    // Check if the view has custom column settings that include relationship columns
    if (this.activeView && this.activeView.columnSettings) {
      // Only add relationship columns if they are explicitly in the view settings
      this.relationshipDisplayColumns.forEach(relCol => {
        relCol.fields.forEach((field, fieldIndex) => {
          const viewSetting = this.activeView!.columnSettings!.find(s => 
            s.columnName === `rel_${relCol.id}_${fieldIndex}` || 
            s.columnName === field.displayName
          );
          if (viewSetting && viewSetting.isVisible) {
            relationshipDisplayColumns.push(`rel_${relCol.id}_${fieldIndex}`);
          }
        });
      });
      
      this.relationships.forEach(rel => {
        const columnName = rel.name || `rel_${rel.id}`;
        const viewSetting = this.activeView!.columnSettings!.find(s => 
          s.columnName === columnName
        );
        if (viewSetting && viewSetting.isVisible) {
          simpleRelationshipColumns.push(columnName);
        }
      });
    }
    
    // Combine all columns with unique names and prefixes
    const allColumns = [
      ...this.regularColumns.map(col => 'reg_' + col.name),
      ...relationshipDisplayColumns,
      ...simpleRelationshipColumns
    ];
    
    // If we have an active view with custom column settings, use those instead of regular columns
    if (this.activeView?.columnSettings && this.activeView.columnSettings.length > 0) {
      // Replace regular columns with custom view columns, sorted by order
      const visibleColumns = this.activeView.columnSettings.filter(viewColumn => viewColumn.isVisible);
      
      const customViewColumns = visibleColumns
        .sort((a, b) => a.order - b.order) // Sort by order field
        .map(viewColumn => 'view_' + viewColumn.columnName);
      
      // Replace all columns with custom view columns only
      allColumns.length = 0;
      allColumns.push(...customViewColumns);
    }
    
    // Remove duplicates
    this.displayedColumns = [
      ...new Set(allColumns) // Remove duplicates
    ];
    
    // Add multiselect column if in multiselect mode
    if (this.isMultiSelectMode()) {
      this.displayedColumns.push('multiselect');
    }
    
    
  }

  private clearRelationshipCache() {
    this.relationshipValueCache.clear();
    this.relationshipOptionsCache.clear();
  }

  onColumnDrop(event: CdkDragDrop<any[]>) {
    // Only allow reordering if we have an active view
    if (!this.activeView) {
      return;
    }

    // Check if the item was actually moved
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    // Get the previous and current items
    const previousItem = this.displayedColumns[event.previousIndex];
    const currentItem = this.displayedColumns[event.currentIndex];

    // Check if we're moving regular columns or relationship columns
    const isPreviousRegular = this.regularColumns.some(col => col.name === previousItem);
    const isCurrentRegular = this.regularColumns.some(col => col.name === currentItem);

    if (isPreviousRegular && isCurrentRegular) {
      // Moving regular columns
      const previousColumn = this.regularColumns.find(col => col.name === previousItem);
      const currentColumn = this.regularColumns.find(col => col.name === currentItem);
      
      if (previousColumn && currentColumn) {
        const previousIndex = this.regularColumns.indexOf(previousColumn);
        const currentIndex = this.regularColumns.indexOf(currentColumn);
        
        moveItemInArray(this.regularColumns, previousIndex, currentIndex);
        this.updateDisplayedColumnsOrder();
        this.saveColumnOrderToCurrentView();
      }
    } else {
      // Moving relationship columns or mixing regular and relationship columns
      // Move in the displayedColumns array
      moveItemInArray(this.displayedColumns, event.previousIndex, event.currentIndex);
      
      // If we're moving regular columns, also update regularColumns array
      if (isPreviousRegular) {
        const regularColumnNames = this.displayedColumns.filter(col => 
          this.regularColumns.some(regCol => regCol.name === col)
        );
        
        // Reorder regularColumns to match the new order
        this.regularColumns = regularColumnNames.map(name => 
          this.regularColumns.find(col => col.name === name)!
        );
      }
      
      this.saveColumnOrderToCurrentView();
    }
    
    // Recalcular efectos de agrupación después del drag and drop
    // Usar setTimeout para asegurar que se ejecute después del guardado
    setTimeout(() => {
      this.recalculateGroupingEffects();
    }, 100);
  }

  private updateDisplayedColumnsOrder() {
    // Rebuild displayedColumns array with the new order
    const regularColumnNames = this.regularColumns.map(col => col.name);
    const relationshipColumnNames = this.displayedColumns.filter(col => col.startsWith('rel_'));
    
    this.displayedColumns = [
      ...regularColumnNames,
      ...relationshipColumnNames,
      'actions'
    ];
  }

  private recalculateGroupingEffects() {
    // Forzar la detección de cambios en Angular para recalcular los efectos
    // Esto asegura que los métodos de border y neon se ejecuten con el nuevo orden
    this.cdr.detectChanges();
  }

  private saveColumnOrderToCurrentView() {
    if (!this.activeView) {
      // If no active view, don't auto-save
      return;
    }

    console.log('🔧 DEBUG: saveColumnOrderToCurrentView called');
    console.log('📊 Current displayedColumns:', this.displayedColumns);
    console.log('📋 Current regularColumns:', this.regularColumns.map(c => c.name));

    // If it's a default view, we need to create column settings first
    if (this.activeView.isDefault) {
      // Initialize column settings if they don't exist
      if (!this.activeView.columnSettings) {
        this.activeView.columnSettings = [];
      }
      
      // Add missing column settings
      this.regularColumns.forEach((column, index) => {
        const existingSetting = this.activeView!.columnSettings!.find(s => s.columnId === column.id);
        if (!existingSetting) {
          this.activeView!.columnSettings!.push({
            columnId: column.id,
            columnName: column.name,
            isVisible: true,
            order: index
          });
        }
      });
    }

    // Create a map of column settings by columnId for quick lookup
    const settingsMap = new Map<string, ColumnViewSetting>();
    this.activeView.columnSettings!.forEach(setting => {
      settingsMap.set(setting.columnId, setting);
    });

    console.log('🗺️ Settings map before update:', Array.from(settingsMap.entries()));

    // Update the order for ALL columns based on their current position in displayedColumns
    this.displayedColumns.forEach((columnName, index) => {
      // Skip 'actions' column
      if (columnName === 'actions') return;
      
      // Find the setting for this column
      let setting: ColumnViewSetting | undefined;
      
      if (columnName.startsWith('view_')) {
        // This is a view column (either regular or relationship)
        // Extract the actual column name from view_columnName
        const actualColumnName = columnName.replace('view_', '');
        
        // Check if it's a relationship column by looking for the pattern
        if (actualColumnName.includes(' ')) {
          // This is a relationship column, find by columnName
          setting = this.activeView!.columnSettings!.find(s => s.columnName === actualColumnName);
        } else {
          // This is a regular column, find by columnId
          const column = this.regularColumns.find(c => c.name === actualColumnName);
          if (column) {
            setting = settingsMap.get(column.id);
          }
        }
      } else if (columnName.startsWith('rel_')) {
        // This is a relationship column (old format)
        setting = this.activeView!.columnSettings!.find(s => s.columnId === columnName);
      } else {
        // This is a regular column (old format)
        const column = this.regularColumns.find(c => c.name === columnName);
        if (column) {
          setting = settingsMap.get(column.id);
        }
      }
      
      if (setting) {
        console.log(`📝 Updating order for ${columnName}: ${setting.order} → ${index}`);
        setting.order = index;
      } else {
        console.warn(`⚠️ No setting found for column: ${columnName}`);
      }
    });

    // Sort column settings by new order to maintain consistency
    this.activeView.columnSettings!.sort((a, b) => a.order - b.order);

    console.log('✅ Final column settings order:', this.activeView.columnSettings!.map(s => `${s.columnName} (${s.order})`));

    // Update the timestamp
    this.activeView.updatedAt = new Date();

    // Emit the view update event
    this.viewUpdated.emit(this.activeView);
    
    // Show a brief notification
    const viewType = this.activeView.isDefault ? 'default view' : 'view';
    this.snackBar.open(`Column order saved to ${viewType} "${this.activeView.name}"`, 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  formatCellValue(value: any, column: any): string {
    if (value === null || value === undefined) {
      return '-';
    }
    
    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (column.type === 'date' || column.type === 'datetime') {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  }

  getSourceTableName(sourceTableId: string): string {
    const sourceTable = this.allTables.find(t => t.id === sourceTableId);
    return sourceTable ? sourceTable.name : 'Unknown';
  }

  getRelationshipValue(element: any, relCol: RelationshipDisplayColumn, field: any): string {
    // Create cache key
    const cacheKey = `${element.id || 'unknown'}_${relCol.id}_${field.sourceColumnId}`;
    
    // Check cache first
    if (this.relationshipValueCache.has(cacheKey)) {
      return this.relationshipValueCache.get(cacheKey)!;
    }

    // Early return if no data available
    if (!this.allTableData || Object.keys(this.allTableData).length === 0) {
      const result = 'Loading...';
      this.relationshipValueCache.set(cacheKey, result);
      return result;
    }

    try {
      // Find the foreign key column in the current table
      const fkColumn = this.table.columns.find(col => 
        col.isForeignKey && col.referencedTableId === relCol.sourceTableId
      );
      
      if (!fkColumn) {
        const result = 'No FK';
        this.relationshipValueCache.set(cacheKey, result);
        return result;
      }
      
      // Get the foreign key value from the current record
      const fkValue = element[fkColumn.name];
      
      if (!fkValue) {
        const result = '-';
        this.relationshipValueCache.set(cacheKey, result);
        return result;
      }
      
      // Find the source table
      const sourceTable = this.allTables.find(t => t.id === relCol.sourceTableId);
      if (!sourceTable) {
        const result = 'Unknown Table';
        this.relationshipValueCache.set(cacheKey, result);
        return result;
      }
      
      // Find the source column to display
      const sourceColumn = sourceTable.columns.find(col => col.id === field.sourceColumnId);
      if (!sourceColumn) {
        const result = 'Unknown Field';
        this.relationshipValueCache.set(cacheKey, result);
        return result;
      }
      
      // Get the actual data from the source table
      const sourceTableData = this.allTableData[sourceTable.name];
      if (!sourceTableData || !Array.isArray(sourceTableData)) {
        const result = 'No Data';
        this.relationshipValueCache.set(cacheKey, result);
        return result;
      }
      
      // Find the record in the source table that matches the foreign key
      const pkColumn = sourceTable.columns.find(col => col.isPrimaryKey);
      if (!pkColumn) {
        const result = 'No PK';
        this.relationshipValueCache.set(cacheKey, result);
        return result;
      }
      
      const sourceRecord = sourceTableData.find(record => 
        String(record[pkColumn.name]) === String(fkValue)
      );
      
      if (!sourceRecord) {
        const result = 'Not Found';
        this.relationshipValueCache.set(cacheKey, result);
        return result;
      }
      
      // Return the actual value from the source record
      const actualValue = sourceRecord[sourceColumn.name];
      const result = this.formatCellValue(actualValue, sourceColumn);
      this.relationshipValueCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error in getRelationshipValue:', error);
      const result = 'Error';
      this.relationshipValueCache.set(cacheKey, result);
      return result;
    }
  }


  getRelationshipDescription(rel: Relationship): string {
    const fromTable = this.allTables.find(t => t.id === rel.fromTableId);
    const toTable = this.allTables.find(t => t.id === rel.toTableId);
    
    if (fromTable && toTable) {
      return `${fromTable.name} → ${toTable.name}`;
    }
    
    return 'Unknown relationship';
  }

  // Helper methods for template
  isEditing(rowIndex: number, columnName: string): boolean {
    const cell = this.editingCell();
    return cell?.row === rowIndex && cell?.column === columnName;
  }

  isEditingRelationship(rowIndex: number, relColId: string, fieldIndex: number): boolean {
    const cell = this.editingCell();
    return cell?.row === rowIndex && cell?.column === `rel_${relColId}_${fieldIndex}`;
  }

  // Column name editing methods
  isEditingColumnName(columnId: string): boolean {
    return this.editingColumnName() === columnId;
  }

  startEditColumnName(columnId: string, currentName: string) {
    // Prevent editing in multi-select mode only if Ctrl is pressed
    if (this.isMultiSelectMode() && this.isCtrlPressed()) {
      return;
    }
    this.editingColumnName.set(columnId);
    this.editingColumnNameValue.set(currentName);
  }

  updateEditingColumnNameValue(value: string) {
    this.editingColumnNameValue.set(value);
  }

  saveColumnName(columnId: string) {
    const newName = this.editingColumnNameValue().trim();
    if (newName && newName !== '') {
      // Find the column and update its name
      const column = this.table.columns.find(col => col.id === columnId);
      if (column && column.name !== newName) {
        const oldName = column.name;
        column.name = newName;
        
        // Emit schema update event
        this.dataChanged.emit({
          type: 'SCHEMA_UPDATE',
          table: this.table.name,
          data: { columnId, oldName, newName },
          id: columnId
        });

        // Show notification
        this.snackBar.open(`Column renamed from "${oldName}" to "${newName}"`, 'Close', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    }
    this.cancelEditColumnName();
  }

  cancelEditColumnName() {
    this.editingColumnName.set(null);
    this.editingColumnNameValue.set('');
  }

  // View Column Name Editing Methods
  isEditingViewColumnName(columnId: string): boolean {
    return this.editingColumnName() === `view_${columnId}`;
  }

  startEditViewColumnName(columnId: string, currentDisplayName: string) {
    // Prevent editing in multi-select mode only if Ctrl is pressed
    if (this.isMultiSelectMode() && this.isCtrlPressed()) {
      return;
    }
    this.editingColumnName.set(`view_${columnId}`);
    this.editingColumnNameValue.set(currentDisplayName);
  }

  saveViewColumnName(columnId: string) {
    const newDisplayName = this.editingColumnNameValue().trim();
    if (newDisplayName && newDisplayName !== '' && this.activeView) {
      // Find the view column setting and update its displayName
      const viewColumn = this.activeView.columnSettings.find(col => col.columnId === columnId);
      if (viewColumn) {
        const oldDisplayName = viewColumn.displayName || viewColumn.columnName;
        viewColumn.displayName = newDisplayName;
        
        // Emit view update event
        this.viewUpdated.emit(this.activeView);

        // Show notification
        this.snackBar.open(`Column display name changed from "${oldDisplayName}" to "${newDisplayName}"`, 'Close', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    }
    this.cancelEditColumnName();
  }

  // Helper methods for column type detection
  isRegularColumn(viewColumn: ColumnViewSetting): boolean {
    // Regular columns don't start with 'rel_'
    return !viewColumn.columnId.startsWith('rel_');
  }

  isRelationshipColumn(viewColumn: ColumnViewSetting): boolean {
    // Relationship columns start with 'rel_'
    return viewColumn.columnId.startsWith('rel_');
  }

  // Get options for relationship columns in view
  getViewColumnOptions(viewColumn: ColumnViewSetting): { value: string; label: string }[] {
    if (!viewColumn.columnId.startsWith('rel_')) {
      return [];
    }

    // Handle relationship display columns
    if (viewColumn.columnId.includes('_') && !viewColumn.columnId.endsWith(viewColumn.columnId.split('_')[1])) {
      const relColId = viewColumn.columnId.split('_')[1];
      const fieldIndex = parseInt(viewColumn.columnId.split('_')[2]);
      const relCol = this.relationshipDisplayColumns.find(col => col.id === relColId);
      if (relCol && relCol.fields[fieldIndex]) {
        return this.getRelationshipOptionsForField(relCol, relCol.fields[fieldIndex]);
      }
    } else {
      // Handle simple relationship columns
      const relId = viewColumn.columnId.replace('rel_', '');
      const rel = this.relationships.find(r => r.id === relId);
      if (rel) {
        return this.getSimpleRelationshipOptions(rel);
      }
    }

    return [];
  }

  // Save relationship column edits in view
  saveEditViewRelationship(rowIndex: number, viewColumn: ColumnViewSetting) {
    const newValue = this.editingValue();
    const element = this.paginatedData[rowIndex];
    
    if (viewColumn.columnId.includes('_') && !viewColumn.columnId.endsWith(viewColumn.columnId.split('_')[1])) {
      // This is a relationship display column
      const relColId = viewColumn.columnId.split('_')[1];
      const fieldIndex = parseInt(viewColumn.columnId.split('_')[2]);
      
      const relCol = this.relationshipDisplayColumns.find(col => col.id === relColId);
      if (relCol && relCol.fields[fieldIndex]) {
        // Check if this is the primary key field (ID field)
        const field = relCol.fields[fieldIndex];
        const sourceTable = this.allTables.find(t => t.id === relCol.sourceTableId);
        const fieldColumn = sourceTable?.columns.find(col => col.id === field.sourceColumnId);
        
        if (fieldColumn?.isPrimaryKey) {
          // Find the relationship for validation
          const relationship = this.relationships.find(r => r.id === relCol.relationshipId);
          
          // Validate cardinality before updating
          if (relationship) {
            const validationResult = this.validateRelationshipCardinality(relationship, newValue, element);
            
            if (!validationResult.isValid) {
              this.snackBar.open(validationResult.message, 'Close', {
                duration: 4000,
                horizontalPosition: 'right',
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
              });
              return; // Don't update if validation fails
            }
          }
          
          // This is an ID field change - update all related fields for this relationship
          this.updateAllRelationshipFields(rowIndex, relCol, newValue, element);
        } else {
          // Regular field change - just update this field
          this.saveEditRelationship(rowIndex, relCol, field, element);
        }
      }
    } else {
      // This is a simple relationship column
      const relId = viewColumn.columnId.replace('rel_', '');
      const rel = this.relationships.find(r => r.id === relId);
      if (rel) {
        // Validate cardinality for simple relationships
        const validationResult = this.validateRelationshipCardinality(rel, newValue, element);
        
        if (!validationResult.isValid) {
          this.snackBar.open(validationResult.message, 'Close', {
            duration: 4000,
            horizontalPosition: 'right',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
          return; // Don't update if validation fails
        }
        
        this.saveEdit(rowIndex, 'view_' + viewColumn.columnId);
      }
    }
    
    this.cancelEdit();
  }

  // Update all relationship fields when primary key changes
  private updateAllRelationshipFields(rowIndex: number, relCol: RelationshipDisplayColumn, newId: string, element: any) {
    // Find the source table data for the new ID
    const sourceTable = this.allTables.find(t => t.id === relCol.sourceTableId);
    const sourceTableData = this.allTableData[sourceTable?.name || ''];
    const pkColumn = sourceTable?.columns.find(col => col.isPrimaryKey);
    
    if (!sourceTable || !sourceTableData || !pkColumn) {
      return;
    }
    
    // Find the record with the new ID
    const newRecord = sourceTableData.find((record: any) => String(record[pkColumn.name]) === String(newId));
    
    if (!newRecord) {
      console.warn(`Record with ID ${newId} not found in ${sourceTable.name}`);
      return;
    }
    
    // Update the foreign key in the current record
    const fkColumn = this.table.columns.find(col => col.isForeignKey && col.referencedTableId === relCol.sourceTableId);
    if (fkColumn) {
      element[fkColumn.name] = newId;
    }
    
    // Clear cache for all relationship values
    this.relationshipValueCache.clear();
    
    // Emit the data change event
    this.dataChanged.emit({
      type: 'UPDATE',
      table: this.table.name,
      data: element,
      id: element.id
    });
    
    // Show notification
    this.snackBar.open(`Updated all ${relCol.fields.length} relationship fields for ${sourceTable.name}`, 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Control' || event.ctrlKey) {
      this.isCtrlPressed.set(true);
      this.isMultiSelectMode.set(true);
      
      // Cancel any active editing when entering multi-select mode
      if (this.editingColumnName()) {
        this.cancelEditColumnName();
      }
      if (this.editingCell()) {
        this.cancelEdit();
      }
    }
  }

  @HostListener('document:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Control') {
      this.isCtrlPressed.set(false);
      // Don't exit multi-select mode, just prevent adding new elements
      // Keep the current selection but disable further selection
    }
    
    if (event.key === 'Escape' && this.isMultiSelectMode()) {
      this.exitMultiSelectMode();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Check if click is on an input element or its children (don't cancel if clicking on input itself)
    if (target && (target.tagName === 'INPUT' || 
                   target.closest('app-modern-input') ||
                   target.closest('.column-name-input') ||
                   target.closest('.cell-edit-input'))) {
      return; // Don't cancel if clicking on the input or its children
    }
    
    // Check if click is outside the table container OR inside table but not on editable elements
    if (this.tableContainer) {
      const isOutsideTable = !this.tableContainer.nativeElement.contains(target);
      const isInsideTable = this.tableContainer.nativeElement.contains(target);
      
      // Cancel if outside table OR inside table but clicked on non-editable elements
      if (isOutsideTable || (isInsideTable && !this.isClickOnEditableElement(target))) {
        // Cancel any active editing
        if (this.editingColumnName()) {
          this.cancelEditColumnName();
        }
        if (this.editingCell()) {
          this.cancelEdit();
        }
        
        // Clear selection if Ctrl is not pressed and we're in multi-select mode
        if (this.isMultiSelectMode() && !this.isCtrlPressed() && this.getSelectedCount() > 0) {
          this.clearSelection();
        }
      }
    }
  }

  private isClickOnEditableElement(target: HTMLElement): boolean {
    // Check if click is on editable elements that should start editing
    return !!(target.closest('.column-name-editable') || 
              target.closest('.editable') ||
              target.closest('.cell-content'));
  }

  // Multi-select methods
  toggleMultiSelectMode() {
    this.isMultiSelectMode.set(!this.isMultiSelectMode());
    if (!this.isMultiSelectMode()) {
      this.selectedRows.set(new Set());
    }
  }

  exitMultiSelectMode() {
    this.isMultiSelectMode.set(false);
    this.selectedRows.set(new Set());
    this.isCtrlPressed.set(false);
    
    // Cancel any active editing when exiting multi-select mode
    if (this.editingColumnName()) {
      this.cancelEditColumnName();
    }
    if (this.editingCell()) {
      this.cancelEdit();
    }
  }

  onRowClick(rowIndex: number, event: MouseEvent) {
    // Only handle row selection if Ctrl is pressed
    if (this.isCtrlPressed()) {
      event.preventDefault();
      event.stopPropagation();
      
      // Cancel any active editing when starting row selection
      if (this.editingColumnName()) {
        this.cancelEditColumnName();
      }
      if (this.editingCell()) {
        this.cancelEdit();
      }
      
      this.toggleRowSelection(rowIndex);
    } else if (this.isMultiSelectMode() && !this.isCtrlPressed()) {
      // If in multi-select mode but Ctrl is not pressed, clear selection
      event.preventDefault();
      event.stopPropagation();
      
      // Cancel any active editing when clearing selection
      if (this.editingColumnName()) {
        this.cancelEditColumnName();
      }
      if (this.editingCell()) {
        this.cancelEdit();
      }
      
      this.clearSelection();
    }
  }

  toggleRowSelection(rowIndex: number) {
    const currentSelected = this.selectedRows();
    const newSelected = new Set(currentSelected);
    
    console.log('🔍 DEBUG SELECTION - Toggle row selection:');
    console.log('Row index:', rowIndex);
    console.log('Current selected:', Array.from(currentSelected));
    console.log('Is currently selected:', newSelected.has(rowIndex));
    
    if (newSelected.has(rowIndex)) {
      newSelected.delete(rowIndex);
      console.log('Removed from selection');
    } else {
      newSelected.add(rowIndex);
      console.log('Added to selection');
    }
    
    console.log('New selected:', Array.from(newSelected));
    this.selectedRows.set(newSelected);
  }

  isRowSelected(rowIndex: number): boolean {
    return this.selectedRows().has(rowIndex);
  }

  selectAllVisibleRows() {
    const allIndices = new Set<number>();
    for (let i = 0; i < this.paginatedData.length; i++) {
      allIndices.add(i);
    }
    this.selectedRows.set(allIndices);
  }

  clearSelection() {
    this.selectedRows.set(new Set());
  }

  getSelectedCount(): number {
    const count = this.selectedRows().size;
    return count;
  }

  deleteRow(index: number) {
    const actualIndex = this.currentPage * this.pageSize + index;
    this.data.splice(actualIndex, 1);
    this.updatePagination();
    this.dataChanged.emit({
      type: 'DELETE',
      table: this.table.name,
      data: { index: actualIndex }
    });
  }

  getCurrentProject(): any {
    // Return a basic project structure for now
    return {
      tables: [this.table],
      relationships: this.relationships
    };
  }

  getSimpleRelationshipOptions(rel: any): { value: string; label: string }[] {
    try {
      const currentProject = this.getCurrentProject();
      const relatedData = this.dataSimulationService.getRelatedData(rel.referencedTable, '', currentProject);
      if (Array.isArray(relatedData)) {
        return relatedData.map((item: any) => ({
          value: item.id || item[Object.keys(item)[0]],
          label: item.name || item[Object.keys(item)[1]] || item.id || item[Object.keys(item)[0]]
        }));
      }
    } catch (error) {
      console.error('Error getting simple relationship options:', error);
    }
    
    return [];
  }

  getRelationshipDisplayValue(value: any, rel: any): string {
    if (!value) return '-';
    
    // If it's a simple relationship, just return the value
    if (!rel.displayColumnId) {
      return value.toString();
    }
    
    // For complex relationships, try to get the display value
    try {
      // Get the current project schema
      const currentProject = this.getCurrentProject();
      if (!currentProject) {
        return value.toString();
      }
      
      const relatedDataArray = this.dataSimulationService.getRelatedData(rel.referencedTable, value, currentProject);
      if (Array.isArray(relatedDataArray) && relatedDataArray.length > 0 && rel.displayColumnId) {
        const relatedData = relatedDataArray[0];
        return relatedData[rel.displayColumnId] || value.toString();
      }
    } catch (error) {
      console.error('Error getting relationship display value:', error);
    }
    
    return value.toString();
  }



  deleteSelectedRows() {
    console.log('🚀 DEBUG DELETE - Method called at:', new Date().toISOString());
    console.log('🚀 DEBUG DELETE - Call stack:', new Error().stack);
    
    const selectedIndices = Array.from(this.selectedRows()).sort((a, b) => b - a); // Sort descending to delete from end
    
    console.log('🔍 DEBUG DELETE - Initial state:');
    console.log('Selected indices (page-relative):', selectedIndices);
    console.log('Current page:', this.currentPage);
    console.log('Page size:', this.pageSize);
    console.log('Total data length:', this.data.length);
    console.log('Data before deletion:', this.data.map((item, idx) => ({ index: idx, id: item.id, data: item })));
    
    // Collect all elements to delete first
    const elementsToDelete = selectedIndices.map(index => {
      const globalIndex = this.currentPage * this.pageSize + index;
      return {
        element: this.data[globalIndex],
        globalIndex: globalIndex,
        pageIndex: index
      };
    });
    
    console.log('🔍 DEBUG DELETE - Elements to delete:');
    elementsToDelete.forEach(({ element, globalIndex, pageIndex }) => {
      console.log(`Page index ${pageIndex} -> Global index ${globalIndex}:`, element);
    });
    
    // Delete elements from end to beginning to maintain correct indices
    elementsToDelete.forEach(({ element, globalIndex }) => {
      console.log(`🗑️ Emitting delete event for global index ${globalIndex}:`, element);
      // Emit delete event
      this.dataChanged.emit({
        type: 'DELETE',
        table: this.table.name,
        data: element,
        id: element.id || globalIndex
      });
    });
    
    // Remove from local data (from end to beginning to maintain indices)
    console.log('🔍 DEBUG DELETE - Removing from local data:');
    elementsToDelete.forEach(({ globalIndex, element }) => {
      console.log(`Removing at global index ${globalIndex}:`, element);
      this.data.splice(globalIndex, 1);
      console.log(`Data after removal:`, this.data.map((item, idx) => ({ index: idx, id: item.id })));
    });
    
    console.log('🔍 DEBUG DELETE - Final state:');
    console.log('Data after all deletions:', this.data.map((item, idx) => ({ index: idx, id: item.id, data: item })));
    
    // Clear selection and refresh
    this.clearSelection();
    this.updatePagination();
    
    // Show notification
    this.snackBar.open(`${selectedIndices.length} row(s) deleted`, 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  // Inline editing methods
  startEdit(rowIndex: number, columnName: string, currentValue: any) {
    // Prevent editing in multi-select mode only if Ctrl is pressed
    if (this.isMultiSelectMode() && this.isCtrlPressed()) {
      return;
    }
    const column = this.regularColumns.find(col => col.name === columnName);
    if (column && column.isAutoIncrement) {
      this.snackBar.open('Cannot edit auto-increment columns', 'Close', { duration: 2000 });
      return;
    }
    
    this.editingCell.set({ row: rowIndex, column: columnName });
    this.editingValue.set(String(currentValue || ''));
  }

  startEditRelationship(rowIndex: number, relCol: RelationshipDisplayColumn, field: any, element: any) {
    // Prevent editing in multi-select mode only if Ctrl is pressed
    if (this.isMultiSelectMode() && this.isCtrlPressed()) {
      return;
    }
    this.editingCell.set({ row: rowIndex, column: `rel_${relCol.id}_${relCol.fields.indexOf(field)}` });
    this.editingValue.set(String(this.getRelationshipValue(element, relCol, field) || ''));
  }

  startEditSimpleRelationship(rowIndex: number, columnName: string, currentValue: any, rel: any) {
    // Prevent editing in multi-select mode only if Ctrl is pressed
    if (this.isMultiSelectMode() && this.isCtrlPressed()) {
      return;
    }
    this.editingCell.set({ row: rowIndex, column: columnName });
    this.editingValue.set(String(currentValue || ''));
  }

  updateEditingValue(value: any) {
    this.editingValue.set(value);
  }

  saveEdit(rowIndex: number, columnName: string, element?: any) {
    const newValue = this.editingValue();
    
    // If element is not provided, get it from the current data
    if (!element) {
      const actualIndex = this.currentPage * this.pageSize + rowIndex;
      element = this.data[actualIndex];
    }
    
    if (!element) return;
    
    const oldValue = element[columnName];
    
    if (newValue !== String(oldValue)) {
      element[columnName] = this.parseValue(newValue, columnName);
      
      this.dataChanged.emit({
        type: 'UPDATE',
        table: this.table.name,
        data: element,
        id: element.id
      });
    }
    
    this.cancelEdit();
  }

  saveEditRelationship(rowIndex: number, relCol: RelationshipDisplayColumn, field: any, element: any) {
    const newValue = this.editingValue();
    const oldValue = this.getRelationshipValue(element, relCol, field);
    
    if (newValue !== String(oldValue)) {
      // Update the foreign key value
      const fkColumn = this.table.columns.find(col => col.isForeignKey && col.referencedTableId === relCol.sourceTableId);
      if (fkColumn) {
        element[fkColumn.name] = newValue;
        
        // Clear cache for this specific relationship value
        const cacheKey = `${element.id || 'unknown'}_${relCol.id}_${field.sourceColumnId}`;
        this.relationshipValueCache.delete(cacheKey);
        
        this.dataChanged.emit({
          type: 'UPDATE',
          table: this.table.name,
          data: element,
          id: element.id
        });
      }
    }
    
    this.cancelEdit();
  }

  cancelEdit() {
    this.editingCell.set(null);
    this.editingValue.set('');
  }

  parseValue(value: string, columnName: string): any {
    const column = this.regularColumns.find(col => col.name === columnName);
    if (!column) return value;
    
    switch (column.type.toLowerCase()) {
      case 'number':
      case 'int':
      case 'integer':
        return parseInt(value) || 0;
      case 'boolean':
      case 'bool':
        return value === 'true' || value === '1';
      case 'decimal':
      case 'float':
        return parseFloat(value) || 0;
      default:
        return value;
    }
  }

  getRelationshipOptions(relCol: RelationshipDisplayColumn): { value: string; label: string }[] {
    // Use the first field for backward compatibility
    return this.getRelationshipOptionsForField(relCol, relCol.fields[0]);
  }

  getRelationshipOptionsForField(relCol: RelationshipDisplayColumn, field: RelationshipDisplayField): { value: string; label: string }[] {
    // Create cache key including the specific field
    const cacheKey = `options_${relCol.id}_${field.sourceColumnId}`;
    
    // Check cache first
    if (this.relationshipOptionsCache.has(cacheKey)) {
      return this.relationshipOptionsCache.get(cacheKey)!;
    }

    try {
      const sourceTable = this.allTables.find(t => t.id === relCol.sourceTableId);
      if (!sourceTable) {
        const result: { value: string; label: string }[] = [];
        this.relationshipOptionsCache.set(cacheKey, result);
        return result;
      }
      
      const sourceTableData = this.allTableData[sourceTable.name];
      if (!sourceTableData || !Array.isArray(sourceTableData)) {
        const result: { value: string; label: string }[] = [];
        this.relationshipOptionsCache.set(cacheKey, result);
        return result;
      }
      
      // Get the primary key column and the specific field column
      const pkColumn = sourceTable.columns.find(col => col.isPrimaryKey);
      const fieldColumn = sourceTable.columns.find(col => col.id === field.sourceColumnId);
      
      if (!pkColumn || !fieldColumn) {
        const result: { value: string; label: string }[] = [];
        this.relationshipOptionsCache.set(cacheKey, result);
        return result;
      }
      
      // Return options based on actual data - use the specific field value
      const result = sourceTableData.map(record => ({
        value: String(record[fieldColumn.name]), // Use the field's value as the option value
        label: String(record[fieldColumn.name] || record[pkColumn.name])
      }));
      
      this.relationshipOptionsCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error in getRelationshipOptionsForField:', error);
      const result: { value: string; label: string }[] = [];
      this.relationshipOptionsCache.set(cacheKey, result);
      return result;
    }
  }

  addRecord() {
    // Create new record with default values
    const newRecord: any = { id: this.generateId() };
    
    this.regularColumns.forEach(col => {
      if (col.isAutoIncrement) {
        newRecord[col.name] = this.data.length + 1;
      } else if (col.defaultValue) {
        newRecord[col.name] = col.defaultValue;
      } else {
        newRecord[col.name] = this.getDefaultValue(col.type);
      }
    });
    
    this.dataChanged.emit({
      type: 'CREATE',
      table: this.table.name,
      data: newRecord
    });
  }

  addColumn() {
    // Emit schema update to add new column
    this.dataChanged.emit({
      type: 'SCHEMA_UPDATE',
      table: this.table.name,
      data: null,
      schemaUpdate: {
        action: 'ADD_COLUMN',
        tableId: this.table.id
      }
    });
  }

  editRecord(element: any, index: number) {
    // TODO: Open dialog to edit record
  }

  // Pagination methods
  updatePagination() {
    this.totalRecords = this.data.length;
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.data.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePagination();
  }


  // View management methods
  onViewSelected(view: TableView) {
    this.viewSelected.emit(view);
  }

  onViewCreated(view: TableView) {
    this.viewCreated.emit(view);
  }

  openViewManager() {
    // Open the view creation dialog
    const dialogRef = this.dialog.open(ViewConfigDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: {
        table: this.table,
        columns: this.displayedColumns,
        currentView: this.activeView
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.onViewCreated(result);
      }
    });
  }

  onViewUpdated(view: TableView) {
    this.viewUpdated.emit(view);
  }

  onViewDeleted(viewId: string) {
    this.viewDeleted.emit(viewId);
  }

  deleteRecord(element: any, index: number) {
    console.log('🗑️ DEBUG DELETE RECORD - Individual delete called:');
    console.log('Element:', element);
    console.log('Index:', index);
    console.log('Call stack:', new Error().stack);
    
    // Confirm and delete record
    if (confirm('Are you sure you want to delete this record?')) {
      console.log('🗑️ DEBUG DELETE RECORD - Confirmed, emitting delete event');
      this.dataChanged.emit({
        type: 'DELETE',
        table: this.table.name,
        data: element,
        id: element.id
      });
    } else {
      console.log('🗑️ DEBUG DELETE RECORD - Cancelled by user');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Column color methods
  getColumnContextMenuData(viewColumn: ColumnViewSetting): ColumnContextMenuData {
    const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
    const referenceInfo = this.getReferenceInfo(viewColumn);
    
    return {
      columnId: viewColumn.columnId,
      columnName: viewColumn.displayName || viewColumn.columnName,
      isReferenced: this.isRelationshipColumn(viewColumn),
      currentColor: relationshipDisplayColumn?.color,
      referenceInfo: referenceInfo
    };
  }

  getReferenceInfo(viewColumn: ColumnViewSetting): { sourceTableName: string; sourceColumnName: string; relationshipType: string } | undefined {
    if (!this.isRelationshipColumn(viewColumn)) {
      return undefined;
    }

    const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
    if (!relationshipDisplayColumn) {
      return undefined;
    }

    // Find the relationship
    const relationship = this.relationships.find(r => r.id === relationshipDisplayColumn.relationshipId);
    if (!relationship) {
      return undefined;
    }

    // Find the source table
    const sourceTable = this.allTables.find(t => t.id === relationshipDisplayColumn.sourceTableId);
    if (!sourceTable) {
      return undefined;
    }

    // Extract field index from columnId to find the specific field
    // Format: "rel_${relDisplayColId}_${fieldIndex}"
    const parts = viewColumn.columnId.split('_');
    if (parts.length >= 3) {
      const fieldIndex = parseInt(parts[2]);
      const field = relationshipDisplayColumn.fields[fieldIndex];
      
      if (field) {
        // Find the source column
        const sourceColumn = sourceTable.columns.find(c => c.id === field.sourceColumnId);
        if (sourceColumn) {
          return {
            sourceTableName: sourceTable.name,
            sourceColumnName: sourceColumn.name,
            relationshipType: relationship.type
          };
        }
      }
    }

    return undefined;
  }

  getColumnBorderStyle(viewColumn: ColumnViewSetting, isHeader: boolean = false): string {
    if (this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn?.color) {
        if (isHeader) {
          // Headers can have full borders
          return `2px solid ${relationshipDisplayColumn.color.borderColor}`;
        } else {
          // Cells only have left and right borders
          return `none`;
        }
      }
    }
    return 'none';
  }

  getColumnLeftBorder(viewColumn: ColumnViewSetting): string {
    if (this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn?.color) {
        // No mostrar border izquierdo si la columna de la izquierda es del mismo grupo
        if (this.isAdjacentToSameGroup(viewColumn, 'left')) {
          return 'none';
        }
        return `2px solid ${relationshipDisplayColumn.color.borderColor}`;
      }
    }
    return 'none';
  }

  getColumnRightBorder(viewColumn: ColumnViewSetting): string {
    if (this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn?.color) {
        // No mostrar border derecho si la columna de la derecha es del mismo grupo
        if (this.isAdjacentToSameGroup(viewColumn, 'right')) {
          return 'none';
        }
        return `2px solid ${relationshipDisplayColumn.color.borderColor}`;
      }
    }
    return 'none';
  }

  getColumnNeonGlow(viewColumn: ColumnViewSetting): string {
    if (this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn?.color) {
        const color = relationshipDisplayColumn.color.borderColor;
        const rgbaColor = this.hexToRgba(color, 0.3);
        const lightRgbaColor = this.hexToRgba(color, 0.1);
        
        const shadows: string[] = [];
        
        // Solo agregar glow izquierdo si no hay columna del mismo grupo a la izquierda
        if (!this.isAdjacentToSameGroup(viewColumn, 'left')) {
          shadows.push(`inset 20px 0 20px -10px ${rgbaColor}`);
          shadows.push(`inset 40px 0 40px -20px ${lightRgbaColor}`);
        }
        
        // Solo agregar glow derecho si no hay columna del mismo grupo a la derecha
        if (!this.isAdjacentToSameGroup(viewColumn, 'right')) {
          shadows.push(`inset -20px 0 20px -10px ${rgbaColor}`);
          shadows.push(`inset -40px 0 40px -20px ${lightRgbaColor}`);
        }
        
        return shadows.length > 0 ? shadows.join(', ') : 'none';
      }
    }
    return 'none';
  }

  private hexToRgba(hex: string, alpha: number): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex color
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getColumnGroupId(viewColumn: ColumnViewSetting): string | null {
    if (this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn) {
        return relationshipDisplayColumn.relationshipId;
      }
    }
    return null;
  }

  isAdjacentToSameGroup(viewColumn: ColumnViewSetting, direction: 'left' | 'right'): boolean {
    const currentGroupId = this.getColumnGroupId(viewColumn);
    if (!currentGroupId) return false;

    const currentView = this.activeView;
    if (!currentView) return false;

    const currentIndex = currentView.columnSettings.findIndex(col => col.columnId === viewColumn.columnId);
    if (currentIndex === -1) return false;

    const adjacentIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (adjacentIndex < 0 || adjacentIndex >= currentView.columnSettings.length) return false;

    const adjacentColumn = currentView.columnSettings[adjacentIndex];
    const adjacentGroupId = this.getColumnGroupId(adjacentColumn);

    return currentGroupId === adjacentGroupId;
  }

  isLastRow(rowIndex: number): boolean {
    const currentView = this.activeView;
    if (!currentView) return false;
    
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const totalRows = this.paginatedData.length;
    
    return rowIndex === Math.min(endIndex - 1, totalRows - 1);
  }

  getRowBottomBorder(rowIndex: number, viewColumn: ColumnViewSetting): string {
    if (this.isLastRow(rowIndex) && this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn?.color) {
        return `2px solid ${relationshipDisplayColumn.color.borderColor}`;
      }
    }
    return 'none';
  }

  getRowBottomNeonGlow(rowIndex: number, viewColumn: ColumnViewSetting): string {
    if (this.isLastRow(rowIndex) && this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn?.color) {
        const color = relationshipDisplayColumn.color.borderColor;
        const rgbaColor = this.hexToRgba(color, 0.3);
        const lightRgbaColor = this.hexToRgba(color, 0.1);
        
        return `inset 0 -20px 20px -10px ${rgbaColor}, inset 0 -40px 40px -20px ${lightRgbaColor}`;
      }
    }
    return 'none';
  }

  getRelatedColumns(referenceTableName: string): ColumnViewSetting[] {
    const currentView = this.activeView;
    if (!currentView) return [];
    
    return currentView.columnSettings.filter(setting => 
      this.isRelationshipColumn(setting) && 
      this.getReferenceTableName(setting) === referenceTableName
    );
  }

  getColumnBackgroundColor(viewColumn: ColumnViewSetting): string {
    if (this.isRelationshipColumn(viewColumn)) {
      const relationshipDisplayColumn = this.getRelationshipDisplayColumn(viewColumn);
      if (relationshipDisplayColumn?.color) {
        return relationshipDisplayColumn.color.backgroundColor;
      }
    }
    return 'transparent';
  }

  getRelationshipDisplayColumn(viewColumn: ColumnViewSetting): RelationshipDisplayColumn | null {
    if (!viewColumn.columnId.startsWith('rel_')) {
      return null;
    }
    
    // Extract relationship display column ID from columnId
    // Format: "rel_${relDisplayColId}_${fieldIndex}"
    const parts = viewColumn.columnId.split('_');
    if (parts.length >= 3) {
      const relDisplayColId = parts[1];
      return this.relationshipDisplayColumns.find(rdc => rdc.id === relDisplayColId) || null;
    }
    
    return null;
  }

  getReferenceTableName(viewColumn: ColumnViewSetting): string {
    // For relationship columns, extract the relationship ID from columnId
    if (viewColumn.columnId.startsWith('rel_')) {
      // Format: "rel_${relCol.id}_${fieldIndex}"
      const parts = viewColumn.columnId.split('_');
      if (parts.length >= 3) {
        const relId = parts[1]; // Get the relationship ID
        // Find the relationship to get the referenced table name
        const relationship = this.relationships.find(r => r.id === relId);
        if (relationship) {
          // Determine which table is being referenced
          if (relationship.fromTableId === this.table.id) {
            return relationship.toTableId;
          } else {
            return relationship.fromTableId;
          }
        }
      }
    }
    
    // Fallback: try to extract from column name for regular columns
    const parts = viewColumn.columnName.split('_');
    if (parts.length >= 2) {
      return parts.slice(0, -1).join('_');
    }
    return viewColumn.columnName;
  }

  onColumnColorSelected(event: { columnId: string; color: ColumnColor | null }) {
    const currentView = this.activeView;
    if (!currentView) return;

    // Find the target column
    const targetColumn = currentView.columnSettings.find(s => s.columnId === event.columnId);
    if (!targetColumn) return;

    // Get the relationship display column
    const relationshipDisplayColumn = this.getRelationshipDisplayColumn(targetColumn);
    if (!relationshipDisplayColumn) return;

    console.log('🎨 DEBUG COLOR SELECTION:');
    console.log('Target column:', targetColumn.columnName);
    console.log('Relationship Display Column ID:', relationshipDisplayColumn.id);
    console.log('Color to apply:', event.color);

    // Update the relationship display column with the new color
    const updatedRelationshipDisplayColumns = this.relationshipDisplayColumns.map(rdc => {
      if (rdc.id === relationshipDisplayColumn.id) {
        return { ...rdc, color: event.color || undefined };
      }
      return rdc;
    });

    // Emit the updated relationship display columns
    this.relationshipDisplayColumnsUpdated.emit(updatedRelationshipDisplayColumns);
    
    // Show notification
    const colorName = event.color ? event.color.name : 'default';
    this.snackBar.open(`Column color updated to ${colorName}`, 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  onColumnRightClick(event: MouseEvent, viewColumn?: any) {
    event.preventDefault();
    event.stopPropagation();
    
    if (viewColumn && this.isRelationshipColumn(viewColumn)) {
      // Open context menu for relationship columns
      const contextMenuData = this.getColumnContextMenuData(viewColumn);
      if (contextMenuData.isReferenced) {
        // Trigger the context menu programmatically
        // We'll need to find the context menu component and trigger it
        console.log('Opening context menu for column:', viewColumn.columnName);
        // For now, we'll emit the event to show the menu
        this.showContextMenu(event, contextMenuData);
      }
    }
  }

  private showContextMenu(event: MouseEvent, data: any) {
    // This will be handled by the context menu component
    // We need to trigger the menu programmatically
    console.log('Context menu data:', data);
  }

  /**
   * Validates relationship cardinality rules
   */
  validateRelationshipCardinality(relationship: any, newValue: string, currentRow: any): { isValid: boolean; message: string } {
    if (!newValue || newValue.trim() === '') {
      return { isValid: true, message: '' }; // Allow null/empty values
    }

    const sourceTable = this.allTables.find(t => t.id === relationship.fromTableId);
    const targetTable = this.allTables.find(t => t.id === relationship.toTableId);
    
    if (!sourceTable || !targetTable) {
      return { isValid: false, message: 'Invalid relationship configuration' };
    }

    // Get all data for both tables
    const sourceData = this.allTableData[sourceTable.name] || [];
    const targetData = this.allTableData[targetTable.name] || [];

    // Find the foreign key column in the current table
    const foreignKeyColumn = this.regularColumns.find(col => col.id === relationship.toColumnId);
    if (!foreignKeyColumn) {
      return { isValid: false, message: 'Foreign key column not found' };
    }

    switch (relationship.type) {
      case 'one-to-one':
        return this.validateOneToOne(relationship, newValue, currentRow, sourceData, targetData, foreignKeyColumn);
      
      case 'one-to-many':
        return this.validateOneToMany(relationship, newValue, currentRow, sourceData, targetData, foreignKeyColumn);
      
      case 'many-to-many':
        return this.validateManyToMany(relationship, newValue, currentRow, sourceData, targetData, foreignKeyColumn);
      
      default:
        return { isValid: true, message: '' };
    }
  }

  /**
   * Validates 1:1 relationship - ensures uniqueness on both sides
   */
  private validateOneToOne(relationship: any, newValue: string, currentRow: any, sourceData: any[], targetData: any[], foreignKeyColumn: any): { isValid: boolean; message: string } {
    // Check if the target value exists in the source table
    const sourceColumn = this.allTables.find(t => t.id === relationship.fromTableId)?.columns.find(c => c.id === relationship.fromColumnId);
    if (!sourceColumn) {
      return { isValid: false, message: 'Source column not found' };
    }

    const targetExists = sourceData.some(row => String(row[sourceColumn.name]) === String(newValue));
    if (!targetExists) {
      return { isValid: false, message: `Value '${newValue}' does not exist in ${relationship.fromTableId}` };
    }

    // Check if another row in the current table already uses this value
    const currentTableData = this.allTableData[this.table.name] || [];
    const conflictingRow = currentTableData.find(row => 
      row !== currentRow && 
      String(row[foreignKeyColumn.name]) === String(newValue)
    );

    if (conflictingRow) {
      return { isValid: false, message: `This value is already used by another record. 1:1 relationships must be unique.` };
    }

    // Check if the source value is already referenced by another table (reverse uniqueness)
    const reverseConflictingRow = currentTableData.find(row => 
      row !== currentRow && 
      String(row[foreignKeyColumn.name]) === String(newValue)
    );

    if (reverseConflictingRow) {
      return { isValid: false, message: `This value is already referenced by another record. 1:1 relationships must be unique on both sides.` };
    }

    return { isValid: true, message: '' };
  }

  /**
   * Validates 1:N relationship - allows multiple references to the same source
   */
  private validateOneToMany(relationship: any, newValue: string, currentRow: any, sourceData: any[], targetData: any[], foreignKeyColumn: any): { isValid: boolean; message: string } {
    // Check if the target value exists in the source table
    const sourceColumn = this.allTables.find(t => t.id === relationship.fromTableId)?.columns.find(c => c.id === relationship.fromColumnId);
    if (!sourceColumn) {
      return { isValid: false, message: 'Source column not found' };
    }

    const targetExists = sourceData.some(row => String(row[sourceColumn.name]) === String(newValue));
    if (!targetExists) {
      return { isValid: false, message: `Value '${newValue}' does not exist in ${relationship.fromTableId}` };
    }

    // For 1:N, we allow multiple references to the same source value
    return { isValid: true, message: '' };
  }

  /**
   * Validates M:N relationship - requires junction table
   */
  private validateManyToMany(relationship: any, newValue: string, currentRow: any, sourceData: any[], targetData: any[], foreignKeyColumn: any): { isValid: boolean; message: string } {
    // For M:N relationships, we typically use a junction table
    // This is a simplified validation - in a real implementation, you'd check the junction table
    return { isValid: true, message: 'M:N relationships require junction table implementation' };
  }

  /**
   * Gets relationship cardinality information for display
   */
  getRelationshipCardinalityInfo(relationship: any): string {
    switch (relationship.type) {
      case 'one-to-one':
        return '1:1 - Each record can only reference one unique record from the source table, and each source record can only be referenced once.';
      case 'one-to-many':
        return '1:N - One source record can be referenced by multiple records in this table, but each record here can only reference one source record.';
      case 'many-to-many':
        return 'M:N - Multiple records can reference multiple source records. Requires a junction table for proper implementation.';
      default:
        return 'Unknown relationship type';
    }
  }

  /**
   * Gets current relationship usage statistics
   */
  getRelationshipUsageStats(relationship: any): { used: number; available: number; conflicts: number } {
    const sourceTable = this.allTables.find(t => t.id === relationship.fromTableId);
    const currentTableData = this.allTableData[this.table.name] || [];
    const sourceData = this.allTableData[sourceTable?.name || ''] || [];
    
    const foreignKeyColumn = this.regularColumns.find(col => col.id === relationship.toColumnId);
    if (!foreignKeyColumn) {
      return { used: 0, available: 0, conflicts: 0 };
    }

    // Count used values
    const usedValues = new Set();
    const conflicts = new Set();
    
    currentTableData.forEach(row => {
      const value = row[foreignKeyColumn.name];
      if (value && value !== '') {
        if (usedValues.has(value)) {
          conflicts.add(value);
        } else {
          usedValues.add(value);
        }
      }
    });

    return {
      used: usedValues.size,
      available: sourceData.length,
      conflicts: conflicts.size
    };
  }


  private getDefaultValue(type: string): any {
    switch (type.toLowerCase()) {
      case 'string':
      case 'varchar':
      case 'text':
        return '';
      case 'number':
      case 'int':
      case 'integer':
        return 0;
      case 'boolean':
      case 'bool':
        return false;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'datetime':
        return new Date().toISOString();
      default:
        return '';
    }
  }

  // TrackBy functions to ensure proper rendering order
  trackByColumnId(index: number, column: any): string {
    return column.id || column.name;
  }

  trackByRelationshipColumnId(index: number, relCol: any): string {
    return relCol.id;
  }

  trackByFieldIndex(index: number, field: any): number {
    return index;
  }

  trackByRelationshipId(index: number, rel: any): string {
    return rel.id;
  }

  trackByViewColumnName(index: number, viewColumn: any): string {
    return viewColumn.columnName;
  }

  trackByOptionValue(index: number, option: any): any {
    return option.value;
  }

  trackByRelationshipItem(index: number, rel: any): string {
    return rel.id;
  }

  getViewColumnValue(row: any, viewColumn: any): string {
    // Check if this is a regular column
    if (!viewColumn.columnId.startsWith('rel_')) {
      return row[viewColumn.columnName] || '-';
    }
    
    // Handle relationship display columns
    if (viewColumn.columnId.includes('_') && !viewColumn.columnId.endsWith(viewColumn.columnId.split('_')[1])) {
      // This is a relationship display column (rel_xxx_0, rel_xxx_1, etc.)
      const relColId = viewColumn.columnId.split('_')[1];
      const fieldIndex = parseInt(viewColumn.columnId.split('_')[2]);
      
      const relCol = this.relationshipDisplayColumns.find(col => col.id === relColId);
      if (relCol && relCol.fields[fieldIndex]) {
        return this.getRelationshipValue(row, relCol, relCol.fields[fieldIndex]);
      }
    } else {
      // This is a simple relationship column
      const relId = viewColumn.columnId.replace('rel_', '');
      const rel = this.relationships.find(r => r.id === relId);
      if (rel) {
        return this.getRelationshipDisplayValue(row[viewColumn.columnName], rel);
      }
    }
    
    return '-';
  }

  startEditViewColumn(rowIndex: number, viewColumn: any, row: any) {
    // Prevent editing in multi-select mode only if Ctrl is pressed
    if (this.isMultiSelectMode() && this.isCtrlPressed()) {
      return;
    }
    
    // Use columnId for unique identification
    const columnIdentifier = 'view_' + viewColumn.columnId;
    
    // Check if this is a regular column
    if (!viewColumn.columnId.startsWith('rel_')) {
      // For regular columns, get the actual column value
      const actualColumn = this.regularColumns.find(col => col.id === viewColumn.columnId);
      if (actualColumn) {
        this.startEdit(rowIndex, columnIdentifier, row[actualColumn.name]);
      }
      return;
    }
    
    // Handle relationship columns - initialize editing state
    this.editingCell.set({ row: rowIndex, column: columnIdentifier });
    
    // Get the current value for relationship columns
    const currentValue = this.getViewColumnValue(row, viewColumn);
    this.editingValue.set(String(currentValue || ''));
    
    if (viewColumn.columnId.includes('_') && !viewColumn.columnId.endsWith(viewColumn.columnId.split('_')[1])) {
      // This is a relationship display column
      const relColId = viewColumn.columnId.split('_')[1];
      const fieldIndex = parseInt(viewColumn.columnId.split('_')[2]);
      
      const relCol = this.relationshipDisplayColumns.find(col => col.id === relColId);
      if (relCol && relCol.fields[fieldIndex]) {
        // Get current value for this relationship field
        const currentValue = this.getRelationshipValue(row, relCol, relCol.fields[fieldIndex]);
        this.editingValue.set(currentValue);
      }
    } else {
      // This is a simple relationship column
      const relId = viewColumn.columnId.replace('rel_', '');
      const rel = this.relationships.find(r => r.id === relId);
      if (rel) {
        // Get current value for this relationship
        const currentValue = this.getRelationshipDisplayValue(row[viewColumn.columnName], rel);
        this.editingValue.set(currentValue);
      }
    }
  }
}
