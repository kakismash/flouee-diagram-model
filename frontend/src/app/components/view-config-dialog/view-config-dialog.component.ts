import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { TableView, ColumnViewSetting } from '../../models/table-view.model';
import { Table, TableColumn, Relationship } from '../../models/table.model';

export interface ViewConfigDialogData {
  table: Table;
  view?: TableView;
  mode: 'create' | 'edit';
  relationships?: Relationship[];
  allTables?: Table[];
  relationshipDisplayColumns?: any[];
}

@Component({
  selector: 'app-view-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatCardModule,
    MatDividerModule,
    ReactiveFormsModule,
    FormsModule,
    DragDropModule
  ],
  template: `
    <div class="view-config-dialog">
      <h2 mat-dialog-title>
        {{ data.mode === 'create' ? 'Create New View' : 'Edit View' }}
      </h2>

      <div mat-dialog-content>
        <form [formGroup]="viewForm" class="view-form">
          <!-- View Information -->
          <mat-card class="view-info-card">
            <mat-card-header>
              <mat-card-title>View Information</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>View Name</mat-label>
                <input matInput formControlName="name" placeholder="Enter view name">
                <mat-error *ngIf="viewForm.get('name')?.hasError('required')">
                  View name is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description (Optional)</mat-label>
                <textarea matInput formControlName="description" 
                         placeholder="Enter view description" 
                         rows="3"></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <!-- Column Configuration -->
          <mat-card class="columns-config-card">
            <mat-card-header>
              <mat-card-title>Column Configuration</mat-card-title>
              <mat-card-subtitle>Drag to reorder, check to show columns</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="columns-list" cdkDropList (cdkDropListDropped)="dropColumn($event)">
                <div *ngFor="let setting of columnSettings; let i = index" 
                     class="column-item" 
                     cdkDrag
                     [class.dragging]="false">
                  
                  <div class="column-content">
                    <mat-checkbox 
                      [(ngModel)]="setting.isVisible"
                      [ngModelOptions]="{standalone: true}"
                      class="column-checkbox">
                    </mat-checkbox>
                    
                    <div class="column-info">
                      <div class="column-name" [class.active-column]="setting.isVisible">
                        {{ setting.columnName }}
                        <span *ngIf="setting.isVisible" class="active-badge">ACTIVE</span>
                      </div>
                      <div class="column-type">{{ getColumnType(setting.columnId) }}</div>
                    </div>
                    
                    <div class="column-actions">
                      <div class="column-status" *ngIf="setting.isVisible">
                        <mat-icon class="status-icon">check_circle</mat-icon>
                        <span>In View</span>
                      </div>
                      <mat-icon class="drag-handle" cdkDragHandle>drag_indicator</mat-icon>
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Related Tables Section -->
          <mat-card class="related-tables-card" *ngIf="availableRelatedTables.length > 0">
            <mat-card-header>
              <mat-card-title>Related Tables</mat-card-title>
              <mat-card-subtitle>Add columns from related tables</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="related-tables-list">
                <div *ngFor="let relatedTable of availableRelatedTables" 
                     class="related-table-item"
                     [class.expanded]="relatedTable.isExpanded">
                  
                  <div class="related-table-content" (click)="toggleRelatedTable(relatedTable)">
                    <mat-icon class="expand-icon" 
                              [class.rotated]="relatedTable.isExpanded">
                      chevron_right
                    </mat-icon>
                    
                    <div class="related-table-info">
                      <div class="related-table-name">{{ relatedTable.tableName }}</div>
                      <div class="related-table-relationship">{{ relatedTable.relationshipType }}</div>
                      <div class="related-table-description">{{ relatedTable.description }}</div>
                    </div>
                    
                    <div class="related-table-actions">
                      <mat-icon>link</mat-icon>
                    </div>
                  </div>

                  <!-- Expanded Fields Section -->
                  <div class="related-table-fields" *ngIf="relatedTable.isExpanded">
                    <div class="fields-header">
                      <span>Available Fields from {{ relatedTable.tableName }}</span>
                      <div class="field-controls">
                        <button mat-button (click)="selectAllFields(relatedTable)" class="select-all-btn">
                          Select All
                        </button>
                        <button mat-button (click)="deselectAllFields(relatedTable)" class="deselect-all-btn">
                          Deselect All
                        </button>
                      </div>
                    </div>
                    
                    <div class="fields-list">
                      <div *ngFor="let field of relatedTable.fields" 
                           class="field-item">
                        <mat-checkbox 
                          [(ngModel)]="field.isSelected"
                          [ngModelOptions]="{standalone: true}"
                          (change)="onFieldSelectionChange(field, relatedTable)"
                          class="field-checkbox">
                        </mat-checkbox>
                        
                        <div class="field-info">
                          <div class="field-name" [class.active-field]="field.isActive">
                            {{ field.name }}
                            <span *ngIf="field.isActive" class="active-badge">ACTIVE</span>
                          </div>
                          <div class="field-type">{{ field.type }}</div>
                        </div>
                        
                        <div class="field-status" *ngIf="field.isActive">
                          <mat-icon class="status-icon">check_circle</mat-icon>
                          <span>In View</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </form>
      </div>

      <div mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" 
                (click)="onSave()" 
                [disabled]="!viewForm.valid">
          {{ data.mode === 'create' ? 'Create View' : 'Save Changes' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .view-config-dialog {
      width: 100%;
      max-width: 800px;
      min-width: 320px;
      background: var(--theme-background-paper);
      color: var(--theme-text-primary);
    }

    .view-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .view-info-card,
    .columns-config-card,
    .related-tables-card {
      margin-bottom: 16px;
      background: var(--theme-card-background);
      border: 1px solid var(--theme-card-border);
    }

    .columns-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 50vh;
      overflow-y: auto;
      padding: 8px;
      background: var(--theme-background);
      border-radius: 8px;
    }

    .column-item {
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      background: var(--theme-surface);
      transition: all 0.2s ease;
    }

    .column-item:hover {
      box-shadow: 0 2px 8px var(--theme-card-shadow);
      border-color: var(--theme-primary);
    }

    .column-item.dragging {
      opacity: 0.5;
      transform: rotate(2deg);
      box-shadow: 0 4px 12px var(--theme-card-shadow);
    }

    .column-content {
      display: flex;
      align-items: center;
      padding: 12px;
      gap: 12px;
    }

    .column-checkbox {
      flex-shrink: 0;
    }

    .column-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .column-name {
      font-weight: 500;
      color: var(--theme-text-primary);
      word-break: break-word;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .column-name.active-column {
      color: var(--theme-success);
      font-weight: 600;
    }

    .column-type {
      font-size: 12px;
      color: var(--theme-text-secondary);
      text-transform: uppercase;
      font-weight: 400;
    }

    .column-actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .column-status {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--theme-success);
      font-size: 12px;
      font-weight: 500;
    }

    .drag-handle {
      color: var(--theme-text-disabled);
      cursor: grab;
      transition: color 0.2s ease;
    }

    .drag-handle:hover {
      color: var(--theme-primary);
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    /* Related Tables Styles */
    .related-tables-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 40vh;
      overflow-y: auto;
      padding: 8px;
      background: var(--theme-background);
      border-radius: 8px;
    }

    .related-table-item {
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      background: var(--theme-surface);
      transition: all 0.2s ease;
    }

    .related-table-item:hover {
      box-shadow: 0 2px 8px var(--theme-card-shadow);
      border-color: var(--theme-primary);
    }

    .related-table-content {
      display: flex;
      align-items: center;
      padding: 12px;
      gap: 12px;
    }

    .related-table-checkbox {
      flex-shrink: 0;
    }

    .related-table-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .related-table-name {
      font-weight: 500;
      color: var(--theme-text-primary);
      word-break: break-word;
    }

    .related-table-relationship {
      font-size: 12px;
      color: var(--theme-primary);
      text-transform: uppercase;
      font-weight: 500;
    }

    .related-table-description {
      font-size: 12px;
      color: var(--theme-text-secondary);
      font-style: italic;
    }

    .related-table-actions {
      flex-shrink: 0;
    }

    .related-table-actions mat-icon {
      color: var(--theme-primary);
    }

    .expand-icon {
      color: var(--theme-text-secondary);
      transition: transform 0.2s ease;
      cursor: pointer;
    }

    .expand-icon.rotated {
      transform: rotate(90deg);
    }

    .related-table-item.expanded {
      border-color: var(--theme-primary);
    }

    /* Fields Section Styles */
    .related-table-fields {
      border-top: 1px solid var(--theme-border);
      background: var(--theme-background);
      padding: 16px;
    }

    .fields-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--theme-border);
    }

    .fields-header span {
      font-weight: 500;
      color: var(--theme-text-primary);
    }

    .field-controls {
      display: flex;
      gap: 8px;
    }

    .select-all-btn,
    .deselect-all-btn {
      min-width: auto !important;
      padding: 4px 8px !important;
      font-size: 12px !important;
    }

    .select-all-btn {
      color: var(--theme-primary) !important;
    }

    .deselect-all-btn {
      color: var(--theme-text-secondary) !important;
    }

    .fields-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: var(--theme-surface);
      border: 1px solid var(--theme-border);
      border-radius: 6px;
      gap: 12px;
      transition: all 0.2s ease;
    }

    .field-item:hover {
      border-color: var(--theme-primary);
      background: var(--theme-hover);
    }

    .field-checkbox {
      flex-shrink: 0;
    }

    .field-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .field-name {
      font-weight: 500;
      color: var(--theme-text-primary);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .field-name.active-field {
      color: var(--theme-success);
      font-weight: 600;
    }

    .active-badge {
      background: var(--theme-success);
      color: white;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      text-transform: uppercase;
    }

    .field-type {
      font-size: 12px;
      color: var(--theme-text-secondary);
      text-transform: uppercase;
    }

    .field-status {
      display: flex;
      align-items: center;
      gap: 4px;
      color: var(--theme-success);
      font-size: 12px;
      font-weight: 500;
    }

    .status-icon {
      font-size: 16px;
      color: var(--theme-success);
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
      background: var(--theme-background);
    }

    mat-dialog-title {
      color: var(--theme-text-primary);
      background: var(--theme-background-paper);
      border-bottom: 1px solid var(--theme-divider);
    }

    mat-dialog-actions {
      background: var(--theme-background-paper);
      border-top: 1px solid var(--theme-divider);
      padding: 16px 24px;
    }

    /* Responsive design */
    @media (max-width: 768px) {
      .view-config-dialog {
        width: 95vw;
        max-width: 95vw;
        margin: 16px;
      }

      .columns-list {
        max-height: 40vh;
      }

      .column-content {
        padding: 8px;
        gap: 8px;
      }

      .column-name {
        font-size: 14px;
      }

      .column-type {
        font-size: 11px;
      }

      mat-dialog-content {
        max-height: 60vh;
      }
    }

    @media (max-width: 480px) {
      .view-config-dialog {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        margin: 0;
        border-radius: 0;
      }

      .columns-list {
        max-height: 50vh;
      }

      mat-dialog-content {
        max-height: 70vh;
      }

      mat-dialog-actions {
        flex-direction: column;
        gap: 8px;
      }

      mat-dialog-actions button {
        width: 100%;
      }
    }

    /* Override Material Design dialog styles */
    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      background: var(--theme-background-paper) !important;
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-title {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-content {
      background: var(--theme-background) !important;
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-actions {
      background: var(--theme-background-paper) !important;
      border-top: 1px solid var(--theme-divider) !important;
    }

    /* Override form field styles */
    ::ng-deep .mat-mdc-form-field {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      background-color: var(--theme-input-background) !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-outline {
      color: var(--theme-input-border) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-outline-thick {
      color: var(--theme-input-border-focused) !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-input-element {
      color: var(--theme-input-text) !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-label {
      color: var(--theme-input-placeholder) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: var(--theme-primary) !important;
    }

    /* Override checkbox styles */
    ::ng-deep .mat-mdc-checkbox {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mat-mdc-checkbox-ripple {
      color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mat-mdc-checkbox-frame {
      border-color: var(--theme-input-border) !important;
    }

    ::ng-deep .mat-mdc-checkbox.mat-mdc-checkbox-checked .mat-mdc-checkbox-background {
      background-color: var(--theme-primary) !important;
    }

    /* Override button styles */
    ::ng-deep .mat-mdc-raised-button {
      background-color: var(--theme-button-background) !important;
      color: var(--theme-button-text) !important;
    }

    ::ng-deep .mat-mdc-raised-button:hover {
      background-color: var(--theme-button-hover) !important;
    }

    ::ng-deep .mat-mdc-button {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-button:hover {
      background-color: var(--theme-button-hover) !important;
    }

    /* Override card styles */
    ::ng-deep .mat-mdc-card {
      background-color: var(--theme-card-background) !important;
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-card-header .mat-mdc-card-title {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-card-header .mat-mdc-card-subtitle {
      color: var(--theme-text-secondary) !important;
    }
  `]
})
export class ViewConfigDialogComponent implements OnInit {
  viewForm: FormGroup;
  columnSettings: ColumnViewSetting[] = [];
  availableRelatedTables: any[] = [];
  existingRelationshipColumns: ColumnViewSetting[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ViewConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewConfigDialogData
  ) {
    this.viewForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit() {
    console.log('🚀 ViewConfigDialogComponent ngOnInit');
    console.log('📊 Data received:', this.data);
    console.log('🎯 Mode:', this.data.mode);
    console.log('📋 View:', this.data.view);
    console.log('🏠 Table:', this.data.table);
    
    if (this.data.mode === 'edit' && this.data.view) {
      this.viewForm.patchValue({
        name: this.data.view.name,
        description: this.data.view.description || ''
      });
      
      console.log('📝 View form patched with:', this.viewForm.value);
      
      // Separate native columns from relationship columns
      this.separateNativeAndRelatedColumns();
    } else {
      this.initializeDefaultColumnSettings();
    }
    
    // Initialize related tables
    this.initializeRelatedTables();
  }

  private initializeDefaultColumnSettings() {
    // Only include native columns from the table, not relationship columns
    this.columnSettings = this.data.table.columns
      .filter(col => !col.isSystemGenerated && !col.isForeignKey)
      .map((col, index) => ({
        columnId: col.id,
        columnName: col.name,
        displayName: col.name,
        isVisible: true,
        order: index,
        width: 150
      }));
  }

  private separateNativeAndRelatedColumns() {
    // Separate native columns from relationship columns
    const nativeColumns: ColumnViewSetting[] = [];
    const relationshipColumns: ColumnViewSetting[] = [];

    console.log('🔍 Separating columns from view:', this.data.view!.columnSettings);
    console.log('🏠 Current table name:', this.data.table.name);
    console.log('📊 All tables available:', this.data.allTables?.map(t => ({ id: t.id, name: t.name })));

    this.data.view!.columnSettings!.forEach(setting => {
      console.log(`🔍 Analyzing column setting:`, setting);
      
      // Check if this is a relationship column
      // Relationship columns have IDs like "rel_4kyl0w1ti_0" or column names that reference other tables
      const isRelationshipColumn = setting.columnId.startsWith('rel_') || 
                                  (setting.columnName.includes(' ') && // Contains spaces like "role name"
                                   this.data.allTables?.some(table => 
                                     setting.columnName.toLowerCase().includes(table.name.toLowerCase())
                                   ));
      
      console.log(`🎯 Column "${setting.columnName}" (${setting.columnId}) is relationship: ${isRelationshipColumn}`);
      console.log(`   - Starts with 'rel_': ${setting.columnId.startsWith('rel_')}`);
      console.log(`   - Contains spaces: ${setting.columnName.includes(' ')}`);
      console.log(`   - References other table: ${this.data.allTables?.some(table => 
        setting.columnName.toLowerCase().includes(table.name.toLowerCase())
      )}`);
      
      if (isRelationshipColumn) {
        relationshipColumns.push(setting);
        console.log('📌 Added to relationship columns:', setting);
      } else {
        // This is a native column
        nativeColumns.push(setting);
        console.log('🏠 Added to native columns:', setting);
      }
    });

    console.log('📋 Final native columns:', nativeColumns);
    console.log('🔗 Final relationship columns:', relationshipColumns);

    // Set native columns as the main columnSettings
    this.columnSettings = nativeColumns;
    
    // Store relationship columns for later use
    this.existingRelationshipColumns = relationshipColumns;
  }

  private initializeRelatedTables() {
    if (!this.data.relationships || !this.data.allTables) {
      this.availableRelatedTables = [];
      return;
    }

    console.log('🔍 Initializing related tables for table:', this.data.table.name);
    console.log('📋 Current view column settings:', this.data.view?.columnSettings);

    this.availableRelatedTables = this.data.relationships
      .filter(rel => rel.fromTableId === this.data.table.id || rel.toTableId === this.data.table.id)
      .map(rel => {
        const isFromTable = rel.fromTableId === this.data.table.id;
        const relatedTableId = isFromTable ? rel.toTableId : rel.fromTableId;
        const relatedTable = this.data.allTables!.find(t => t.id === relatedTableId);
        
        if (!relatedTable) return null;

        const relationshipType = this.getRelationshipType(rel, isFromTable);
        const description = this.getRelationshipDescription(rel, relatedTable.name, isFromTable);
        
        console.log(`🔗 Processing relationship: ${rel.name} (${rel.id})`);
        console.log(`📊 Related table: ${relatedTable.name} (${relatedTable.id})`);
        
        // Get available fields from the related table
        const availableFields = relatedTable.columns
          .filter(col => !col.isSystemGenerated)
          .map(field => {
            // SIMPLE: Check if this field exists in the current view's columnSettings
            const isActive = this.data.view?.columnSettings?.some(col => {
              // Match by column name patterns that exist in the view
              return col.columnName === `${relatedTable.name}_${field.name}` ||
                     col.columnName === `${rel.name} ${field.name}` ||
                     (col.columnName.includes(' ') && col.columnName.includes(field.name));
            }) || false;
            
            console.log(`🎯 Field "${field.name}" is active: ${isActive}`);

            return {
              id: field.id,
              name: field.name,
              type: field.type,
              isSelected: isActive,
              isActive: isActive
            };
          });

        return {
          relationshipId: rel.id,
          tableId: relatedTable.id,
          tableName: relatedTable.name,
          relationshipType: relationshipType,
          description: description,
          isExpanded: false,
          isFromTable: isFromTable,
          fields: availableFields
        };
      })
      .filter(item => item !== null);
  }

  private getRelationshipType(rel: Relationship, isFromTable: boolean): string {
    if (rel.type === 'one-to-one') {
      return '1:1';
    } else if (rel.type === 'one-to-many') {
      return isFromTable ? '1:N' : 'N:1';
    } else if (rel.type === 'many-to-many') {
      return 'N:N';
    }
    return rel.type;
  }

  private getRelationshipDescription(rel: Relationship, relatedTableName: string, isFromTable: boolean): string {
    if (rel.type === 'one-to-one') {
      return `One-to-one with ${relatedTableName}`;
    } else if (rel.type === 'one-to-many') {
      if (isFromTable) {
        return `One-to-many: this table has many ${relatedTableName}`;
      } else {
        return `Many-to-one: this table belongs to one ${relatedTableName}`;
      }
    } else if (rel.type === 'many-to-many') {
      return `Many-to-many with ${relatedTableName}`;
    }
    return `Related to ${relatedTableName}`;
  }

  toggleRelatedTable(relatedTable: any) {
    relatedTable.isExpanded = !relatedTable.isExpanded;
  }

  selectAllFields(relatedTable: any) {
    relatedTable.fields.forEach((field: any) => {
      field.isSelected = true;
      field.isActive = true;
    });
  }

  deselectAllFields(relatedTable: any) {
    relatedTable.fields.forEach((field: any) => {
      field.isSelected = false;
      field.isActive = false;
    });
  }

  onFieldSelectionChange(field: any, relatedTable: any) {
    // Update the active status based on current selection
    field.isActive = field.isSelected;
    
    // If we're deselecting a field that was previously active,
    // we need to remove it from the columnSettings
    if (!field.isSelected && field.isActive) {
      this.removeActiveFieldFromSettings(field, relatedTable);
    }
  }

  private removeActiveFieldFromSettings(field: any, relatedTable: any) {
    // Find and remove the column setting that matches this field
    const possibleColumnIds = [
      `rel_${relatedTable.relationshipId}_${field.id}`,
      `rel_${relatedTable.relationshipId}_${field.name}`,
      `${relatedTable.tableName}_${field.name}`,
      `${relatedTable.tableName}_${field.id}`
    ];

    // Remove from columnSettings
    this.columnSettings = this.columnSettings.filter(col => 
      !possibleColumnIds.includes(col.columnId) &&
      col.columnName !== `${relatedTable.tableName}_${field.name}` &&
      col.columnName !== `${relatedTable.tableName}.${field.name}` &&
      col.displayName !== `${relatedTable.tableName}.${field.name}`
    );
  }

  getColumnType(columnId: string): string {
    const column = this.data.table.columns.find(col => col.id === columnId);
    return column ? column.type : 'unknown';
  }

  dropColumn(event: CdkDragDrop<ColumnViewSetting[]>) {
    moveItemInArray(this.columnSettings, event.previousIndex, event.currentIndex);
    
    // Update order values
    this.columnSettings.forEach((setting, index) => {
      setting.order = index;
    });
  }

  onSave() {
    if (this.viewForm.valid) {
      console.log('💾 Saving view...');
      
      // Start with native columns
      const allColumnSettings = [...this.columnSettings];
      let orderIndex = this.columnSettings.length;

      // Add relationship columns that are selected
      this.availableRelatedTables.forEach(relatedTable => {
        const selectedFields = relatedTable.fields.filter((field: any) => field.isSelected);
        
        selectedFields.forEach((field: any) => {
          // Find the relationshipDisplayColumns entry for this relationship
          const relationshipDisplayColumn = this.data.relationshipDisplayColumns?.find(rdc => 
            rdc.relationshipId === relatedTable.relationshipId
          );
          
          if (relationshipDisplayColumn) {
            // Create column ID using the relationshipDisplayColumns ID
            const columnId = `rel_${relationshipDisplayColumn.id}_${field.id}`;
            const columnName = `${relatedTable.tableName}_${field.name}`;
            
            // Check if this column already exists in the current view
            const alreadyExists = this.data.view?.columnSettings?.some(existing => 
              existing.columnName === columnName ||
              existing.columnName === `${relatedTable.tableName} ${field.name}` ||
              (existing.columnName.includes(' ') && existing.columnName.includes(field.name))
            );
            
            if (!alreadyExists) {
              allColumnSettings.push({
                columnId: columnId,
                columnName: columnName,
                displayName: `${relatedTable.tableName}.${field.name}`,
                isVisible: true,
                order: orderIndex++,
                width: 150
              });
              console.log('➕ Adding new relationship column:', columnName);
            } else {
              console.log('♻️ Column already exists:', columnName);
            }
          }
        });
      });
      
      console.log('📊 Final column settings:', allColumnSettings);

      const viewData: Partial<TableView> = {
        name: this.viewForm.value.name,
        description: this.viewForm.value.description,
        columnSettings: allColumnSettings,
        updatedAt: new Date()
      };

      // If editing an existing view, preserve the original tableId and id
      if (this.data.mode === 'edit' && this.data.view) {
        viewData.tableId = this.data.view.tableId;
        viewData.id = this.data.view.id;
        viewData.createdAt = this.data.view.createdAt;
        viewData.isDefault = this.data.view.isDefault;
      } else {
        // For new views, set the tableId from the current table
        viewData.tableId = this.data.table.id;
        viewData.isDefault = false;
        viewData.createdAt = new Date();
      }

      this.dialogRef.close(viewData);
    }
  }
}
