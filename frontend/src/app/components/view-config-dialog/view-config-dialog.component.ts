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
import { Table, TableColumn } from '../../models/table.model';

export interface ViewConfigDialogData {
  table: Table;
  view?: TableView;
  mode: 'create' | 'edit';
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
                      <div class="column-name">{{ setting.columnName }}</div>
                      <div class="column-type">{{ getColumnType(setting.columnId) }}</div>
                    </div>
                    
                    <div class="column-actions">
                      <mat-icon class="drag-handle" cdkDragHandle>drag_indicator</mat-icon>
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
    .columns-config-card {
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
    }

    .column-type {
      font-size: 12px;
      color: var(--theme-text-secondary);
      text-transform: uppercase;
      font-weight: 400;
    }

    .column-actions {
      flex-shrink: 0;
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
    if (this.data.mode === 'edit' && this.data.view) {
      this.viewForm.patchValue({
        name: this.data.view.name,
        description: this.data.view.description || ''
      });
      this.columnSettings = [...this.data.view.columnSettings];
    } else {
      this.initializeDefaultColumnSettings();
    }
  }

  private initializeDefaultColumnSettings() {
    this.columnSettings = this.data.table.columns
      .filter(col => !col.isSystemGenerated && !col.isForeignKey)
      .map((col, index) => ({
        columnId: col.id,
        columnName: col.name,
        isVisible: true,
        order: index
      }));
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
      const viewData: Partial<TableView> = {
        name: this.viewForm.value.name,
        description: this.viewForm.value.description,
        columnSettings: this.columnSettings,
        updatedAt: new Date()
      };

      this.dialogRef.close(viewData);
    }
  }
}
