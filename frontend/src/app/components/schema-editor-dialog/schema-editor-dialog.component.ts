import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Table, TableColumn } from '../../models/table.model';
import { TableHelperService } from '../../services/table-helper.service';
import { SchemaChangeHandlerService } from '../../services/schema-change-handler.service';
import { ProjectService } from '../../services/project.service';
import { NotificationService } from '../../services/notification.service';

export interface SchemaEditorDialogData {
  table: Table;
  allTables: Table[];
}

@Component({
  selector: 'app-schema-editor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>schema</mat-icon>
      Edit Schema: {{ data.table.name }}
    </h2>
    
    <mat-dialog-content>
      <mat-tab-group>
        <!-- Edit Current Table -->
        <mat-tab label="Edit Table">
          <form [formGroup]="tableForm" class="schema-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Table Name</mat-label>
              <input matInput formControlName="name" placeholder="Enter table name">
            </mat-form-field>
            
            <div class="columns-section">
              <div class="columns-header">
                <h3>Columns</h3>
                <button mat-raised-button color="primary" type="button" (click)="addColumn()">
                  <mat-icon>add</mat-icon>
                  Add Column
                </button>
              </div>
              
              <div formArrayName="columns" class="columns-list">
                <div *ngFor="let columnGroup of columnsArray.controls; let i = index" 
                     [formGroupName]="i" 
                     class="column-item">
                  <mat-form-field appearance="outline">
                    <mat-label>Column Name</mat-label>
                    <input matInput formControlName="name" placeholder="Column name">
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Type</mat-label>
                    <mat-select formControlName="type">
                      <mat-option value="VARCHAR(255)">VARCHAR(255)</mat-option>
                      <mat-option value="INTEGER">INTEGER</mat-option>
                      <mat-option value="BIGINT">BIGINT</mat-option>
                      <mat-option value="DECIMAL">DECIMAL</mat-option>
                      <mat-option value="BOOLEAN">BOOLEAN</mat-option>
                      <mat-option value="DATE">DATE</mat-option>
                      <mat-option value="TIMESTAMP">TIMESTAMP</mat-option>
                      <mat-option value="TEXT">TEXT</mat-option>
                      <mat-option value="UUID">UUID</mat-option>
                    </mat-select>
                  </mat-form-field>
                  
                  <mat-checkbox formControlName="isNullable">Nullable</mat-checkbox>
                  <mat-checkbox formControlName="isPrimaryKey">Primary Key</mat-checkbox>
                  <mat-checkbox formControlName="isUnique">Unique</mat-checkbox>
                  
                  <button mat-icon-button type="button" (click)="removeColumn(i)" color="warn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </mat-tab>
        
        <!-- Create New Table -->
        <mat-tab label="Create New Table">
          <form [formGroup]="newTableForm" class="schema-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Table Name</mat-label>
              <input matInput formControlName="name" placeholder="Enter new table name">
            </mat-form-field>
            
            <div class="columns-section">
              <div class="columns-header">
                <h3>Columns</h3>
                <button mat-raised-button color="primary" type="button" (click)="addNewTableColumn()">
                  <mat-icon>add</mat-icon>
                  Add Column
                </button>
              </div>
              
              <div formArrayName="columns" class="columns-list">
                <div *ngFor="let columnGroup of newTableColumnsArray.controls; let i = index" 
                     [formGroupName]="i" 
                     class="column-item">
                  <mat-form-field appearance="outline">
                    <mat-label>Column Name</mat-label>
                    <input matInput formControlName="name" placeholder="Column name">
                  </mat-form-field>
                  
                  <mat-form-field appearance="outline">
                    <mat-label>Type</mat-label>
                    <mat-select formControlName="type">
                      <mat-option value="VARCHAR(255)">VARCHAR(255)</mat-option>
                      <mat-option value="INTEGER">INTEGER</mat-option>
                      <mat-option value="BIGINT">BIGINT</mat-option>
                      <mat-option value="DECIMAL">DECIMAL</mat-option>
                      <mat-option value="BOOLEAN">BOOLEAN</mat-option>
                      <mat-option value="DATE">DATE</mat-option>
                      <mat-option value="TIMESTAMP">TIMESTAMP</mat-option>
                      <mat-option value="TEXT">TEXT</mat-option>
                      <mat-option value="UUID">UUID</mat-option>
                    </mat-select>
                  </mat-form-field>
                  
                  <mat-checkbox formControlName="isNullable">Nullable</mat-checkbox>
                  <mat-checkbox formControlName="isPrimaryKey">Primary Key</mat-checkbox>
                  <mat-checkbox formControlName="isUnique">Unique</mat-checkbox>
                  
                  <button mat-icon-button type="button" (click)="removeNewTableColumn(i)" color="warn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </mat-tab>
      </mat-tab-group>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()">Save Changes</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .schema-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      min-width: 600px;
    }

    .full-width {
      width: 100%;
    }

    .columns-section {
      margin-top: 16px;
    }

    .columns-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .columns-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .column-item {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background-color: var(--theme-surface-variant);
      border-radius: 8px;
    }

    .column-item mat-form-field {
      flex: 1;
    }
  `]
})
export class SchemaEditorDialogComponent implements OnInit {
  tableForm: FormGroup;
  newTableForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private tableHelper: TableHelperService,
    private schemaHandler: SchemaChangeHandlerService,
    private projectService: ProjectService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<SchemaEditorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SchemaEditorDialogData
  ) {
    this.tableForm = this.fb.group({
      name: [data.table.name, Validators.required],
      columns: this.fb.array([])
    });

    this.newTableForm = this.fb.group({
      name: ['', Validators.required],
      columns: this.fb.array([])
    });
  }

  ngOnInit() {
    this.loadTableData();
  }

  get columnsArray(): FormArray {
    return this.tableForm.get('columns') as FormArray;
  }

  get newTableColumnsArray(): FormArray {
    return this.newTableForm.get('columns') as FormArray;
  }

  private loadTableData() {
    // Load existing columns
    if (this.data.table.columns) {
      this.data.table.columns.forEach(column => {
        if (!column.isSystemGenerated) {
          const columnGroup = this.fb.group({
            id: [column.id],
            name: [column.name, Validators.required],
            type: [column.type, Validators.required],
            isNullable: [column.isNullable],
            isPrimaryKey: [column.isPrimaryKey],
            isUnique: [column.isUnique],
            defaultValue: [column.defaultValue || '']
          });
          this.columnsArray.push(columnGroup);
        }
      });
    }
  }

  addColumn() {
    const columnGroup = this.fb.group({
      id: [this.generateId()],
      name: ['', Validators.required],
      type: ['VARCHAR(255)', Validators.required],
      isNullable: [true],
      isPrimaryKey: [false],
      isUnique: [false],
      defaultValue: ['']
    });
    this.columnsArray.push(columnGroup);
  }

  removeColumn(index: number) {
    this.columnsArray.removeAt(index);
  }

  addNewTableColumn() {
    const columnGroup = this.fb.group({
      name: ['', Validators.required],
      type: ['VARCHAR(255)', Validators.required],
      isNullable: [true],
      isPrimaryKey: [false],
      isUnique: [false],
      defaultValue: ['']
    });
    this.newTableColumnsArray.push(columnGroup);
  }

  removeNewTableColumn(index: number) {
    this.newTableColumnsArray.removeAt(index);
  }

  onSave() {
    const currentProject = this.projectService.getCurrentProjectSync();
    if (!currentProject) {
      this.notificationService.showError('No project found');
      return;
    }

    // Save edited table
    if (this.tableForm.valid) {
      const formValue = this.tableForm.getRawValue();
      const updatedTable: Table = {
        ...this.data.table,
        name: formValue.name,
        columns: formValue.columns.map((col: any) => ({
          id: col.id || this.generateId(),
          name: col.name,
          internal_name: col.internal_name || `c_${col.id || this.generateId()}`,
          type: col.type,
          isPrimaryKey: col.isPrimaryKey,
          isNullable: col.isNullable,
          isUnique: col.isUnique,
          defaultValue: col.defaultValue || undefined,
          isAutoIncrement: false,
          isAutoGenerate: false,
          isSystemGenerated: false
        }))
      };

      // Ensure table has id column
      const tableWithId = this.tableHelper.ensureIdColumn(updatedTable);

      this.schemaHandler.applyTableEdits(
        currentProject.id,
        this.data.table,
        tableWithId,
        currentProject.schemaData.tables,
        currentProject.schemaData.relationships || [],
        currentProject.schemaData.relationshipDisplayColumns || []
      ).then(() => {
        this.notificationService.showSuccess('Table updated successfully');
      }).catch(error => {
        this.notificationService.showError(`Failed to update table: ${error}`);
      });
    }

    // Create new table if form is valid
    if (this.newTableForm.valid && this.newTableForm.get('name')?.value) {
      const newTableValue = this.newTableForm.getRawValue();
      const newTable: Table = {
        id: this.generateId(),
        name: newTableValue.name,
        internal_name: `t_${this.generateId()}`,
        x: 100,
        y: 100,
        width: 280,
        height: 150,
        columns: newTableValue.columns.map((col: any) => ({
          id: this.generateId(),
          name: col.name,
          internal_name: `c_${this.generateId()}`,
          type: col.type,
          isPrimaryKey: col.isPrimaryKey,
          isNullable: col.isNullable,
          isUnique: col.isUnique,
          defaultValue: col.defaultValue || undefined,
          isAutoIncrement: false,
          isAutoGenerate: false,
          isSystemGenerated: false
        }))
      };

      const tableWithId = this.tableHelper.ensureIdColumn(newTable);

      this.schemaHandler.createTable(
        currentProject.id,
        tableWithId,
        currentProject.schemaData.tables,
        currentProject.schemaData.relationships || [],
        currentProject.schemaData.relationshipDisplayColumns || [],
        currentProject.version
      ).then(() => {
        this.notificationService.showSuccess('New table created successfully');
      }).catch(error => {
        this.notificationService.showError(`Failed to create table: ${error}`);
      });
    }

    this.dialogRef.close(true);
  }

  onCancel() {
    this.dialogRef.close();
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

