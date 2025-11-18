import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Table } from '../../models/table.model';

export interface FieldType {
  value: string;
  label: string;
  category: 'text' | 'number' | 'date' | 'boolean' | 'other';
}

export interface AddFieldDialogData {
  table: Table;
}

@Component({
  selector: 'app-add-field-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>Add Field</h2>
    
    <mat-dialog-content>
      <form [formGroup]="fieldForm" class="field-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Field Name</mat-label>
          <input matInput formControlName="fieldName" placeholder="e.g., email, age, created_at">
          <mat-error *ngIf="fieldForm.get('fieldName')?.hasError('required')">
            Field name is required
          </mat-error>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Field Type</mat-label>
          <mat-select formControlName="fieldType">
            <mat-optgroup label="Text">
              <mat-option value="VARCHAR(255)">VARCHAR(255)</mat-option>
              <mat-option value="TEXT">TEXT</mat-option>
            </mat-optgroup>
            <mat-optgroup label="Number">
              <mat-option value="INTEGER">INTEGER</mat-option>
              <mat-option value="BIGINT">BIGINT</mat-option>
              <mat-option value="DECIMAL">DECIMAL</mat-option>
              <mat-option value="FLOAT">FLOAT</mat-option>
              <mat-option value="DOUBLE">DOUBLE</mat-option>
            </mat-optgroup>
            <mat-optgroup label="Date & Time">
              <mat-option value="DATE">DATE</mat-option>
              <mat-option value="TIME">TIME</mat-option>
              <mat-option value="TIMESTAMP">TIMESTAMP</mat-option>
            </mat-optgroup>
            <mat-optgroup label="Other">
              <mat-option value="BOOLEAN">BOOLEAN</mat-option>
              <mat-option value="UUID">UUID</mat-option>
              <mat-option value="JSON">JSON</mat-option>
            </mat-optgroup>
          </mat-select>
        </mat-form-field>
        
        <mat-checkbox formControlName="isNullable">
          Allow null values
        </mat-checkbox>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Default Value (optional)</mat-label>
          <input matInput formControlName="defaultValue" placeholder="e.g., 'John', 0, NOW()">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button 
              color="primary" 
              (click)="onSave()" 
              [disabled]="!fieldForm.valid">
        Add Field
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .field-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 350px;
    }
    
    .full-width {
      width: 100%;
    }
  `]
})
export class AddFieldDialogComponent {
  fieldForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddFieldDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddFieldDialogData
  ) {
    this.fieldForm = this.fb.group({
      fieldName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/)]],
      fieldType: ['VARCHAR(255)', Validators.required],
      isNullable: [true],
      defaultValue: ['']
    });
  }

  onSave() {
    if (this.fieldForm.valid) {
      this.dialogRef.close(this.fieldForm.value);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

