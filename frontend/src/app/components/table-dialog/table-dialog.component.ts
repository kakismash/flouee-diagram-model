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
      background: #f5f5f5;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      position: sticky;
      top: 0;
      z-index: 10;
      flex-shrink: 0;
    }
    
    .columns-header h3 {
      margin: 0;
      color: #333;
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
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    .columns-scroll-container::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
    
    .columns-scroll-container::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8;
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
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
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
      background: #e3f2fd;
      border-radius: 6px;
      border-left: 3px solid #1976d2;
    }
    
    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    mat-dialog-content {
      max-height: 80vh;
      overflow: hidden; /* Remove global scroll */
      display: flex;
      flex-direction: column;
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
