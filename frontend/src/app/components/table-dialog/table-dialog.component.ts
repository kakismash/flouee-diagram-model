import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Table, TableColumn } from '../../models/table.model';
import { TableHelperService } from '../../services/table-helper.service';

export interface TableDialogData {
  table?: Table; // If provided, we're editing; if not, we're creating
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-table-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="table-dialog">
      <h2 mat-dialog-title>
        <mat-icon>{{ data.mode === 'create' ? 'add' : 'edit' }}</mat-icon>
        {{ data.mode === 'create' ? 'Create New Table' : 'Edit Table' }}
      </h2>
      
      <mat-dialog-content>
        <form [formGroup]="tableForm" class="table-form">
          <!-- Table Name -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Table Name</mat-label>
            <input matInput formControlName="name" placeholder="Enter table name">
            <mat-error *ngIf="tableForm.get('name')?.hasError('required')">
              Table name is required
            </mat-error>
          </mat-form-field>
          
          <!-- Columns Section -->
          <div class="columns-section">
            <div class="columns-header">
              <h3>Columns</h3>
              <button mat-raised-button color="primary" type="button" (click)="addColumn()" matTooltip="Add Column">
                <mat-icon>add</mat-icon>
                Add Column
              </button>
            </div>
            
            <div class="columns-scroll-container">
              <div class="columns-list" formArrayName="columns">
                <div *ngFor="let column of columnsArray.controls; let i = index" 
                     [formGroupName]="i" 
                     class="column-item">
                
                <div class="column-item-header">
                  <h4>Column {{ i + 1 }}</h4>
                  <button mat-icon-button type="button" (click)="removeColumn(i)" matTooltip="Remove Column">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
                
                <div class="column-main">
                  <mat-form-field appearance="outline" class="column-name">
                    <mat-label>Column Name</mat-label>
                    <input matInput formControlName="name" placeholder="e.g., id, name">
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline" class="column-type">
                    <mat-label>Type</mat-label>
                    <mat-select formControlName="type">
                      <mat-option value="SERIAL">SERIAL</mat-option>
                      <mat-option value="VARCHAR(255)">VARCHAR(255)</mat-option>
                      <mat-option value="TEXT">TEXT</mat-option>
                      <mat-option value="INTEGER">INTEGER</mat-option>
                      <mat-option value="BIGINT">BIGINT</mat-option>
                      <mat-option value="BOOLEAN">BOOLEAN</mat-option>
                      <mat-option value="TIMESTAMP">TIMESTAMP</mat-option>
                      <mat-option value="DATE">DATE</mat-option>
                      <mat-option value="TIME">TIME</mat-option>
                      <mat-option value="DECIMAL">DECIMAL</mat-option>
                      <mat-option value="FLOAT">FLOAT</mat-option>
                      <mat-option value="DOUBLE">DOUBLE</mat-option>
                      <mat-option value="JSON">JSON</mat-option>
                      <mat-option value="UUID">UUID</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
                
                <div class="column-options">
                  <mat-checkbox formControlName="isPrimaryKey" (change)="onPrimaryKeyChange(i)">Primary Key</mat-checkbox>
                  <mat-checkbox formControlName="isNullable">Nullable</mat-checkbox>
                  <mat-checkbox formControlName="isUnique">Unique</mat-checkbox>
                </div>
                
                <!-- Primary Key specific options -->
                <div *ngIf="isPrimaryKeyType(i)" class="pk-options">
                  <mat-checkbox *ngIf="isAutoIncrementType(i)" formControlName="isAutoIncrement">Auto Increment</mat-checkbox>
                  <mat-checkbox *ngIf="isAutoGenerateType(i)" formControlName="isAutoGenerate">Auto Generate</mat-checkbox>
                </div>
                
                <mat-form-field appearance="outline" class="default-value">
                  <mat-label>Default Value</mat-label>
                  <input matInput formControlName="defaultValue" placeholder="e.g., 'John', 0, NOW()">
                </mat-form-field>
                </div>
              </div>
            </div>
          </div>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!tableForm.valid">
          {{ data.mode === 'create' ? 'Create' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .table-dialog {
      min-width: 800px;
      max-width: 1000px;
    }
    
    .table-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .columns-section {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      height: 400px; /* Fixed height for the columns section */
    }
    
    .columns-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--theme-background-secondary);
      border-radius: 8px;
      border: 1px solid var(--theme-border);
      position: sticky;
      top: 0;
      z-index: 10;
      flex-shrink: 0;
    }
    
    .columns-header h3 {
      margin: 0;
      color: var(--theme-text-primary);
      font-weight: 500;
    }
    
    .columns-scroll-container {
      flex: 1;
      overflow-y: auto;
      padding-right: 8px;
      margin-right: -8px;
    }
    
    .columns-scroll-container::-webkit-scrollbar {
      width: 6px;
    }
    
    .columns-scroll-container::-webkit-scrollbar-track {
      background: var(--theme-background-secondary);
      border-radius: 3px;
    }
    
    .columns-scroll-container::-webkit-scrollbar-thumb {
      background: var(--theme-border);
      border-radius: 3px;
    }
    
    .columns-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--theme-text-secondary);
    }
    
    .columns-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 16px;
    }
    
    .column-item {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      background: var(--theme-background-secondary);
    }
    
    .column-main {
      display: flex;
      gap: 12px;
      flex: 1;
    }
    
    .column-name {
      flex: 1;
    }
    
    .column-type {
      min-width: 150px;
    }
    
    .column-options {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 8px;
    }
    
    .default-value {
      min-width: 200px;
    }
    
    .column-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .pk-options {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-top: 8px;
      padding: 8px 12px;
      background: var(--theme-primary-container);
      border-radius: 6px;
      border-left: 3px solid var(--theme-primary);
    }
    
    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--theme-text-primary);
    }
    
    mat-dialog-title mat-icon {
      color: var(--theme-primary);
    }
    
    mat-dialog-content {
      max-height: 80vh;
      overflow: hidden; /* Remove global scroll */
      display: flex;
      flex-direction: column;
    }

    /* Theme-aware form field styles */
    ::ng-deep .mat-mdc-form-field {
      color: var(--theme-text-primary);
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      background-color: var(--theme-background-secondary);
      border: 1px solid var(--theme-border);
      border-radius: 8px;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-focus-overlay {
      background-color: transparent;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-input-element {
      color: var(--theme-text-primary);
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-label {
      color: var(--theme-text-primary) !important;
      opacity: 0.9 !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-text-field-wrapper {
      border-color: var(--theme-primary);
      box-shadow: 0 0 0 2px rgba(var(--theme-primary-rgb), 0.2);
    }

    /* Select dropdown styles */
    ::ng-deep .mat-mdc-select {
      color: var(--theme-text-primary);
    }

    ::ng-deep .mat-mdc-select-panel {
      background-color: var(--theme-background-secondary);
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    ::ng-deep .mat-mdc-option {
      color: var(--theme-text-primary);
    }

    ::ng-deep .mat-mdc-option:hover {
      background-color: var(--theme-hover);
    }

    ::ng-deep .mat-mdc-option.mdc-list-item--selected {
      background-color: var(--theme-primary);
      color: var(--theme-text-on-primary);
    }

    /* Checkbox styles */
    ::ng-deep .mat-mdc-checkbox .mat-mdc-checkbox-frame {
      border-color: var(--theme-border);
    }

    ::ng-deep .mat-mdc-checkbox.mat-mdc-checkbox-checked .mat-mdc-checkbox-background {
      background-color: var(--theme-primary);
    }

    /* Button styles */
    ::ng-deep .mat-mdc-raised-button {
      background-color: var(--theme-primary) !important;
      color: var(--theme-text-on-primary) !important;
    }

    ::ng-deep .mat-mdc-raised-button:hover {
      background-color: var(--theme-primary-dark) !important;
    }

    ::ng-deep .mat-mdc-button {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-button:hover {
      background-color: var(--theme-hover) !important;
    }

    /* Additional form field overrides */
    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper .mat-mdc-form-field-infix {
      background-color: transparent !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper .mat-mdc-form-field-infix input {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper .mat-mdc-form-field-infix input::placeholder {
      color: var(--theme-text-disabled) !important;
    }

    /* Select value text */
    ::ng-deep .mat-mdc-select .mat-mdc-select-value {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-select .mat-mdc-select-placeholder {
      color: var(--theme-text-disabled) !important;
    }

    /* Select arrow */
    ::ng-deep .mat-mdc-select .mat-mdc-select-arrow {
      color: var(--theme-text-secondary) !important;
    }

    /* Checkbox label */
    ::ng-deep .mat-mdc-checkbox .mat-mdc-checkbox-label {
      color: var(--theme-text-primary) !important;
      opacity: 1 !important;
    }

    /* Checkbox label more specific selectors */
    ::ng-deep .mat-mdc-checkbox .mdc-label {
      color: var(--theme-text-primary) !important;
      opacity: 1 !important;
    }

    ::ng-deep .mat-mdc-checkbox label {
      color: var(--theme-text-primary) !important;
      opacity: 1 !important;
    }

    /* Error messages */
    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-error {
      color: var(--theme-error) !important;
    }

    /* Hint text */
    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-hint {
      color: var(--theme-text-secondary) !important;
    }

    /* Required asterisk */
    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-required-marker {
      color: var(--theme-error) !important;
    }

    /* Additional label overrides for better visibility */
    ::ng-deep .mdc-floating-label {
      color: var(--theme-text-primary) !important;
      opacity: 0.9 !important;
    }

    ::ng-deep .mdc-floating-label.mdc-floating-label--float-above {
      color: var(--theme-text-primary) !important;
      opacity: 0.9 !important;
    }

    ::ng-deep .mat-mdc-form-field .mdc-floating-label {
      color: var(--theme-text-primary) !important;
      opacity: 0.9 !important;
    }

    /* Add Column Button specific styling */
    .columns-header button.mat-mdc-raised-button {
      background-color: var(--theme-primary) !important;
      color: var(--theme-text-on-primary) !important;
      border: none !important;
    }

    .columns-header button.mat-mdc-raised-button:hover {
      background-color: var(--theme-primary-dark) !important;
    }

    .columns-header button.mat-mdc-raised-button mat-icon {
      color: var(--theme-text-on-primary) !important;
    }

    /* Column item styling */
    .column-item {
      background-color: var(--theme-background-secondary) !important;
      border: 1px solid var(--theme-border) !important;
    }

    .column-item h4 {
      color: var(--theme-text-primary) !important;
    }

    .column-item .mat-mdc-icon-button {
      color: var(--theme-text-secondary) !important;
    }

    .column-item .mat-mdc-icon-button:hover {
      background-color: var(--theme-hover) !important;
      color: var(--theme-error) !important;
    }

    /* Primary key info section */
    .primary-key-info {
      background-color: var(--theme-primary-container) !important;
      border-left: 3px solid var(--theme-primary) !important;
    }

    .primary-key-info .mat-mdc-checkbox-label {
      color: var(--theme-text-primary) !important;
    }

    /* Additional specific overrides for better theme coverage */
    ::ng-deep .mat-mdc-form-field .mdc-notched-outline {
      border-color: var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-form-field .mdc-notched-outline .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field .mdc-notched-outline .mdc-notched-outline__trailing {
      border-color: var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-form-field .mdc-notched-outline .mdc-notched-outline__notch {
      border-color: var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline {
      border-color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline .mdc-notched-outline__leading,
    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline .mdc-notched-outline__trailing {
      border-color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline .mdc-notched-outline__notch {
      border-color: var(--theme-primary) !important;
    }

    /* Checkbox specific overrides */
    ::ng-deep .mat-mdc-checkbox .mdc-checkbox__native-control:enabled:checked ~ .mdc-checkbox__background {
      background-color: var(--theme-primary) !important;
      border-color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mdc-checkbox__native-control:enabled:indeterminate ~ .mdc-checkbox__background {
      background-color: var(--theme-primary) !important;
      border-color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mdc-checkbox__native-control:enabled ~ .mdc-checkbox__background {
      border-color: var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mdc-checkbox__checkmark {
      color: var(--theme-text-on-primary) !important;
    }

    /* Select panel positioning and styling */
    ::ng-deep .mat-mdc-select-panel {
      background-color: var(--theme-background-secondary) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      max-height: 256px !important;
    }

    /* Icon button styling */
    ::ng-deep .mat-mdc-icon-button {
      color: var(--theme-text-secondary) !important;
    }

    ::ng-deep .mat-mdc-icon-button:hover {
      background-color: var(--theme-hover) !important;
      color: var(--theme-error) !important;
    }

    /* Dialog title and header styling */
    ::ng-deep mat-dialog-title {
      color: var(--theme-text-primary) !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      border-bottom: none !important;
    }

    ::ng-deep mat-dialog-title mat-icon {
      color: var(--theme-primary) !important;
    }

    /* Remove default Material dialog header border */
    ::ng-deep .mat-mdc-dialog-title {
      border-bottom: none !important;
    }

    ::ng-deep .mdc-dialog__title {
      border-bottom: none !important;
    }

    /* Remove any default dividers between header and content */
    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-title::after {
      display: none !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__title::after {
      display: none !important;
    }

    /* Dialog content styling */
    ::ng-deep mat-dialog-content {
      color: var(--theme-text-primary) !important;
      border-top: none !important;
    }

    /* Remove any default Material dialog borders and dividers */
    ::ng-deep .mat-mdc-dialog-container {
      border: 1px solid var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-content {
      border-top: none !important;
      border-bottom: none !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__content {
      border-top: none !important;
      border-bottom: none !important;
    }

    /* Ensure no unwanted borders between dialog sections */
    ::ng-deep .mat-mdc-dialog-container > * {
      border: none !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-title,
    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-content,
    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-actions {
      border: none !important;
    }

    /* Dialog actions styling */
    ::ng-deep mat-dialog-actions {
      background-color: var(--theme-background-secondary) !important;
      border-top: 1px solid var(--theme-border) !important;
      padding: 16px 24px !important;
    }

    /* Scrollbar styling for columns container */
    .columns-scroll-container::-webkit-scrollbar {
      width: 8px;
    }

    .columns-scroll-container::-webkit-scrollbar-track {
      background: var(--theme-background-secondary);
    }

    .columns-scroll-container::-webkit-scrollbar-thumb {
      background: var(--theme-border);
      border-radius: 4px;
    }

    .columns-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--theme-text-secondary);
    }

    /* Main dialog container styling */
    .table-dialog {
      background-color: var(--theme-background) !important;
      color: var(--theme-text-primary) !important;
    }

    /* Form styling */
    .table-form {
      background-color: transparent !important;
    }

    /* Column item specific styling */
    .column-item {
      background-color: var(--theme-background-secondary) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 8px !important;
      padding: 16px !important;
      margin-bottom: 12px !important;
    }

    .column-item-header {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      margin-bottom: 12px !important;
    }

    .column-item-header h4 {
      color: var(--theme-text-primary) !important;
      margin: 0 !important;
      font-weight: 500 !important;
    }

    .column-main {
      display: flex !important;
      gap: 12px !important;
      margin-bottom: 12px !important;
    }

    .column-options {
      display: flex !important;
      gap: 16px !important;
      margin-bottom: 12px !important;
      flex-wrap: wrap !important;
    }

    .pk-options {
      background-color: var(--theme-primary-container) !important;
      border: 1px solid var(--theme-primary) !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      margin-bottom: 12px !important;
    }

    /* Column form fields specific styling */
    .column-name {
      flex: 1 !important;
    }

    .column-type {
      flex: 1 !important;
    }

    .default-value {
      width: 100% !important;
    }
  `]
})
export class TableDialogComponent implements OnInit {
  tableForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TableDialogData,
    private tableHelper: TableHelperService,
    private snackBar: MatSnackBar
  ) {
    this.tableForm = this.fb.group({
      name: ['', Validators.required],
      columns: this.fb.array([])
    });
  }

  ngOnInit() {
    if (this.data.mode === 'edit' && this.data.table) {
      this.loadTableData();
    } else {
      // Add default column for new tables
      this.addColumn();
    }
  }

  get columnsArray() {
    return this.tableForm.get('columns') as any;
  }

  addColumn() {
    const columnGroup = this.fb.group({
      id: [this.generateId()],
      name: ['', Validators.required],
      type: ['VARCHAR(255)', Validators.required],
      isPrimaryKey: [false],
      isNullable: [true],
      isUnique: [false],
      defaultValue: [''],
      isAutoIncrement: [false],
      isAutoGenerate: [false]
    });
    
    this.columnsArray.push(columnGroup);
  }

  removeColumn(index: number) {
    if (this.columnsArray.length > 1) {
      this.columnsArray.removeAt(index);
    }
  }

  private loadTableData() {
    if (this.data.table) {
      this.tableForm.patchValue({
        name: this.data.table.name
      });

      // Clear existing columns
      while (this.columnsArray.length !== 0) {
        this.columnsArray.removeAt(0);
      }

      // Add existing columns (only user-editable columns, not system-generated or foreign keys)
      const editableColumns = this.data.table.columns.filter(column => 
        !column.isSystemGenerated && !column.isForeignKey
      );
      
      editableColumns.forEach(column => {
        const columnGroup = this.fb.group({
          id: [column.id],
          name: [column.name, Validators.required],
          type: [column.type, Validators.required],
          isPrimaryKey: [column.isPrimaryKey],
          isNullable: [column.isNullable],
          isUnique: [column.isUnique || false],
          defaultValue: [column.defaultValue || ''],
          isAutoIncrement: [column.isAutoIncrement || false],
          isAutoGenerate: [column.isAutoGenerate || false]
        });
        this.columnsArray.push(columnGroup);
      });
    }
  }

  onSave() {
    if (this.tableForm.valid) {
      const formValue = this.tableForm.value;
      
      // Validate column names
      for (const col of formValue.columns) {
        const validation = this.tableHelper.validateColumnName(col.name);
        if (!validation.valid) {
          this.snackBar.open(validation.error!, 'Close', {
            duration: 6000,
            panelClass: ['error-snackbar']
          });
          return; // Don't save if validation fails
        }
      }
      
      let table: Table = {
        id: this.data.table?.id || this.generateId(),
        name: formValue.name,
        x: this.data.table?.x || 100,
        y: this.data.table?.y || 100,
        width: this.data.table?.width || 280,
        height: this.data.table?.height || 150,
        columns: formValue.columns.map((col: any) => ({
          id: col.id || this.generateId(),
          name: col.name,
          type: col.type,
          isPrimaryKey: col.isPrimaryKey,
          isNullable: col.isNullable,
          isUnique: col.isUnique,
          defaultValue: col.defaultValue || undefined,
          isAutoIncrement: col.isAutoIncrement || false,
          isAutoGenerate: col.isAutoGenerate || false,
          isSystemGenerated: false // User-created columns are not system generated
        }))
      };
      
      // Ensure table has auto-generated 'id' column
      table = this.tableHelper.ensureIdColumn(table);

      this.dialogRef.close(table);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Helper methods for Primary Key options
  isPrimaryKeyType(index: number): boolean {
    const column = this.columnsArray.at(index);
    return column?.get('isPrimaryKey')?.value === true;
  }

  isAutoIncrementType(index: number): boolean {
    const column = this.columnsArray.at(index);
    const type = column?.get('type')?.value;
    return ['SERIAL', 'INTEGER', 'BIGINT'].includes(type);
  }

  isAutoGenerateType(index: number): boolean {
    const column = this.columnsArray.at(index);
    const type = column?.get('type')?.value;
    return type === 'UUID';
  }

  onPrimaryKeyChange(index: number): void {
    const column = this.columnsArray.at(index);
    const isPrimaryKey = column?.get('isPrimaryKey')?.value;
    
    if (isPrimaryKey) {
      // When setting as Primary Key, automatically set as NOT NULL and UNIQUE
      column?.get('isNullable')?.setValue(false);
      column?.get('isUnique')?.setValue(true);
      
      // Set appropriate auto options based on type
      const type = column?.get('type')?.value;
      if (['SERIAL', 'INTEGER', 'BIGINT'].includes(type)) {
        column?.get('isAutoIncrement')?.setValue(true);
      } else if (type === 'UUID') {
        column?.get('isAutoGenerate')?.setValue(true);
      }
    } else {
      // When unsetting as Primary Key, reset auto options
      column?.get('isAutoIncrement')?.setValue(false);
      column?.get('isAutoGenerate')?.setValue(false);
    }
  }
}
