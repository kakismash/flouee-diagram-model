import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RelationshipDisplayColumn, Table, TableColumn } from '../../models/table.model';

export interface RelationshipColumnDialogData {
  displayColumn: RelationshipDisplayColumn;
  sourceTable: Table;
  targetTable: Table;
}

@Component({
  selector: 'app-relationship-column-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>Edit Relationship Fields</h2>
    
    <mat-dialog-content>
      <form [formGroup]="form">
        <!-- Source Table Info -->
        <div class="info-section">
          <h4>Source Table: {{ data.sourceTable.name }}</h4>
          <p class="info-text">Select which fields from the {{ data.sourceTable.name }} table you want to display</p>
        </div>

        <!-- Fields List -->
        <div class="fields-section">
          <div class="fields-header">
            <h4>Fields to Display</h4>
            <button mat-raised-button color="primary" type="button" (click)="addField()">
              <mat-icon>add</mat-icon>
              Add Field
            </button>
          </div>

          <div formArrayName="fields" class="fields-list">
            <div *ngFor="let field of fieldsArray.controls; let i = index" 
                 [formGroupName]="i" 
                 class="field-item">
              
              <div class="field-header">
                <h5>Field {{ i + 1 }}</h5>
                <button mat-icon-button type="button" (click)="removeField(i)" 
                        [disabled]="fieldsArray.length === 1" 
                        matTooltip="Remove field">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>

              <div class="field-controls">
                <mat-form-field appearance="outline" class="field-name">
                  <mat-label>Display Name</mat-label>
                  <input matInput formControlName="displayName" placeholder="e.g., Role Name">
                </mat-form-field>

                <mat-form-field appearance="outline" class="field-source">
                  <mat-label>Source Field</mat-label>
                  <mat-select formControlName="sourceColumnId">
                    <mat-option *ngFor="let column of data.sourceTable.columns" [value]="column.id">
                      {{ column.name }} ({{ column.type }})
                      <span *ngIf="column.isPrimaryKey" class="pk-indicator"> - Primary Key</span>
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-checkbox formControlName="isVisible" class="field-visibility">
                  Visible
                </mat-checkbox>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div class="preview-section">
          <h4>Preview</h4>
          <div class="preview-container">
            <div class="preview-header">
              <span class="preview-source">{{ data.sourceTable.name }}</span>
              <span class="preview-type">REL</span>
            </div>
            <div class="preview-fields">
              <div *ngFor="let field of fieldsArray.controls" class="preview-field">
                <span class="preview-field-name">{{ field.get('displayName')?.value || 'Unnamed' }}</span>
                <span class="preview-field-type">REL</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">
        Save Changes
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    mat-dialog-content {
      padding: 20px 24px;
      min-width: 500px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .info-section {
      margin: 16px 0;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .info-section h4 {
      margin: 0 0 8px 0;
      color: #1976d2;
    }

    .info-text {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .pk-indicator {
      color: #1976d2;
      font-weight: 500;
    }

    .preview-section {
      margin-top: 16px;
      padding: 12px;
      background: #e8f5e8;
      border-radius: 4px;
      border-left: 4px solid #4caf50;
    }

    .preview-section h4 {
      margin: 0 0 12px 0;
      color: #2e7d32;
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .preview-label {
      font-weight: 500;
      color: #2e7d32;
    }

    .preview-value {
      color: #1b5e20;
      font-family: monospace;
    }

    mat-hint {
      font-size: 12px;
      color: #666;
    }

    .fields-section {
      margin-bottom: 20px;
    }

    .fields-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .fields-header h4 {
      margin: 0;
      color: #333;
    }

    .fields-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .field-header h5 {
      margin: 0;
      color: #555;
      font-size: 14px;
    }

    .field-controls {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .field-name {
      flex: 1;
    }

    .field-source {
      flex: 1;
    }

    .field-visibility {
      margin-top: 8px;
    }

    .preview-container {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: white;
      overflow: hidden;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .preview-source {
      color: #1976d2;
      font-weight: 500;
      font-size: 14px;
    }

    .preview-type {
      background: #e3f2fd;
      color: #1976d2;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }

    .preview-fields {
      padding: 4px;
    }

    .preview-field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 8px;
      background: #ffffff;
      border-radius: 3px;
      margin-bottom: 2px;
      border: 1px solid #e0e0e0;
    }

    .preview-field-name {
      color: #555;
      font-size: 12px;
      font-weight: 400;
    }

    .preview-field-type {
      background: #f5f5f5;
      color: #666;
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 2px;
      font-weight: 500;
    }
  `]
})
export class RelationshipColumnDialogComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RelationshipColumnDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RelationshipColumnDialogData
  ) {
    console.log('RelationshipColumnDialogComponent constructor called with data:', data);
    
    // Ensure we have at least one field
    if (!data.displayColumn.fields || data.displayColumn.fields.length === 0) {
      console.error('No fields found in relationship display column');
      // Create a default field
      data.displayColumn.fields = [{
        sourceColumnId: '',
        displayName: '',
        isVisible: true
      }];
    }
    
    this.form = this.fb.group({
      fields: this.fb.array([])
    });

    // Initialize fields
    this.initializeFields();
  }

  get fieldsArray(): FormArray {
    return this.form.get('fields') as FormArray;
  }

  private initializeFields(): void {
    const fieldsArray = this.fieldsArray;
    fieldsArray.clear();

    this.data.displayColumn.fields.forEach(field => {
      fieldsArray.push(this.createFieldGroup(field));
    });
  }

  private createFieldGroup(field: any): FormGroup {
    return this.fb.group({
      displayName: [field.displayName || '', Validators.required],
      sourceColumnId: [field.sourceColumnId || '', Validators.required],
      isVisible: [field.isVisible !== false]
    });
  }

  addField(): void {
    const fieldsArray = this.fieldsArray;
    fieldsArray.push(this.createFieldGroup({
      displayName: '',
      sourceColumnId: '',
      isVisible: true
    }));
  }

  removeField(index: number): void {
    if (this.fieldsArray.length > 1) {
      this.fieldsArray.removeAt(index);
    }
  }

  ngOnInit() {
    // Update preview when form changes
    this.form.valueChanges.subscribe(() => {
      // Trigger change detection for preview
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.form.valid) {
      const formValue = this.form.value;
      const fields = formValue.fields.map((field: any) => ({
        sourceColumnId: field.sourceColumnId,
        displayName: field.displayName,
        isVisible: field.isVisible
      }));
      
      this.dialogRef.close({
        fields: fields
      });
    }
  }
}
