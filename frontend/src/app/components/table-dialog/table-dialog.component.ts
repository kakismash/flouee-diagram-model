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
import { MatTooltipModule } from '@angular/material/tooltip';
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
    MatTooltipModule,
    ReactiveFormsModule
  ],
  templateUrl: './table-dialog.component.html',
  styleUrl: './table-dialog.component.scss'
})
export class TableDialogComponent implements OnInit {
  tableForm: FormGroup;
  private initialFormValue: any; // ✅ Store initial state for comparison

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
      // ✅ Capture initial state after loading data
      setTimeout(() => {
        this.initialFormValue = JSON.stringify(this.tableForm.getRawValue());
      });
    } else {
      // Add default "id" column for new tables
      this.addDefaultIdColumn();
    }
  }

  get columnsArray() {
    return this.tableForm.get('columns') as any;
  }

  // ✅ Add default ID column that cannot be deleted or renamed
  addDefaultIdColumn() {
    const columnGroup = this.fb.group({
      id: [this.generateId()],
      name: ['id'], // Fixed name
      type: ['UUID', Validators.required], // Default to UUID
      isPrimaryKey: [true], // Always primary key
      isNullable: [false], // Never nullable
      isUnique: [true], // Always unique
      defaultValue: ['gen_random_uuid()'],
      isAutoIncrement: [false],
      isAutoGenerate: [true], // Auto-generate by default
      isSystemColumn: [true] // ✅ Mark as system column (cannot be deleted)
    });
    
    // Disable name field for id column
    columnGroup.get('name')?.disable();
    
    this.columnsArray.push(columnGroup);
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
      isAutoGenerate: [false],
      isSystemColumn: [false] // Regular column
    });
    
    this.columnsArray.push(columnGroup);
  }

  removeColumn(index: number) {
    // ✅ Prevent deleting the id column (index 0 and isSystemColumn)
    const column = this.columnsArray.at(index);
    const isSystemColumn = column?.get('isSystemColumn')?.value;
    const columnName = column?.get('name')?.value;
    
    if (isSystemColumn || columnName === 'id' || index === 0) {
      this.snackBar.open('Cannot delete the "id" column. It is required for every table.', 'Close', {
        duration: 3000
      });
      return;
    }
    
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
      // ✅ Also exclude the id column (system column)
      const editableColumns = this.data.table.columns.filter(column => 
        !column.isSystemGenerated && 
        !column.isForeignKey &&
        !(column.name === 'id' && column.isPrimaryKey) // ✅ Exclude id column
      );
      
      // ✅ Always add the system id column first
      this.addDefaultIdColumn();
      
      // Then add user-editable columns
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
          isAutoGenerate: [column.isAutoGenerate || false],
          isSystemColumn: [false] // ✅ Regular user column
        });
        
        this.columnsArray.push(columnGroup);
      });
    }
  }

  onSave() {
    if (this.tableForm.valid) {
      // ✅ Use getRawValue() to include disabled fields (like the id column name)
      const formValue = this.tableForm.getRawValue();
      
      // ✅ Filter out system columns (id column) before saving
      const userColumns = formValue.columns.filter((col: any) => !col.isSystemColumn);
      
      // Validate column names (only user columns)
      for (const col of userColumns) {
        const validation = this.tableHelper.validateColumnName(col.name);
        if (!validation.valid) {
          this.snackBar.open(validation.error!, 'Close', {
            duration: 6000,
            panelClass: ['error-snackbar']
          });
          return; // Don't save if validation fails
        }
      }
      
      // ✅ Generate ID once and use it consistently
      const tableId = this.data.table?.id || this.generateId();
      
      let table: Table = {
        id: tableId,
        name: formValue.name,
        internal_name: this.data.table?.internal_name || `t_${tableId}`, // ✅ Use same ID for internal_name
        x: this.data.table?.x || 100,
        y: this.data.table?.y || 100,
        width: this.data.table?.width || 280,
        height: this.data.table?.height || 150,
        columns: userColumns.map((col: any) => ({
          id: col.id || this.generateId(),
          name: col.name,
          internal_name: col.internal_name || `c_${col.id || this.generateId()}`, // ✅ Generate internal_name for columns
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
    const isSystemColumn = column?.get('isSystemColumn')?.value;
    
    // ✅ Prevent changes to system columns (like id)
    if (isSystemColumn) {
      // Reset to original values for system columns
      column?.get('isPrimaryKey')?.setValue(true);
      column?.get('isNullable')?.setValue(false);
      column?.get('isUnique')?.setValue(true);
      return;
    }
    
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

  // ✅ Handle ID type changes and update default values automatically
  onTypeChange(index: number) {
    const column = this.columnsArray.at(index);
    const isSystemColumn = column?.get('isSystemColumn')?.value;
    
    if (!isSystemColumn) {
      return; // Only apply automatic updates for the id column
    }
    
    const type = column?.get('type')?.value;
    
    // Update default value and auto-generate based on type
    switch (type) {
      case 'UUID':
        column?.get('defaultValue')?.setValue('gen_random_uuid()');
        column?.get('isAutoGenerate')?.setValue(true);
        column?.get('isAutoIncrement')?.setValue(false);
        break;
        
      case 'SERIAL':
      case 'BIGSERIAL':
        column?.get('defaultValue')?.setValue('');
        column?.get('isAutoGenerate')?.setValue(false);
        column?.get('isAutoIncrement')?.setValue(true);
        break;
        
      case 'INTEGER':
      case 'BIGINT':
        column?.get('defaultValue')?.setValue('');
        column?.get('isAutoGenerate')?.setValue(false);
        column?.get('isAutoIncrement')?.setValue(false);
        break;
    }
  }

  // ✅ Check if Save button should be enabled
  canSave(): boolean {
    // Must be valid
    if (!this.tableForm.valid) {
      return false;
    }
    
    // Create mode: Always allow save if valid
    if (this.data.mode === 'create') {
      return true;
    }
    
    // Edit mode: Only allow save if there are changes
    // ✅ Exclude system columns from change detection
    const currentValue = this.getFormValueExcludingSystemColumns();
    const initialValue = this.getInitialValueExcludingSystemColumns();
    const hasChanges = currentValue !== initialValue;
    
    return hasChanges;
  }

  // ✅ Get form value excluding system columns for change detection
  private getFormValueExcludingSystemColumns(): string {
    const formValue = this.tableForm.getRawValue();
    
    // Filter out system columns (id column)
    const filteredColumns = formValue.columns.filter((col: any) => !col.isSystemColumn);
    
    const filteredValue = {
      ...formValue,
      columns: filteredColumns
    };
    
    return JSON.stringify(filteredValue);
  }

  // ✅ Get initial value excluding system columns for change detection
  private getInitialValueExcludingSystemColumns(): string {
    if (!this.initialFormValue) {
      return '';
    }
    
    const initialValue = JSON.parse(this.initialFormValue);
    
    // Filter out system columns (id column)
    const filteredColumns = initialValue.columns.filter((col: any) => !col.isSystemColumn);
    
    const filteredValue = {
      ...initialValue,
      columns: filteredColumns
    };
    
    return JSON.stringify(filteredValue);
  }
}
