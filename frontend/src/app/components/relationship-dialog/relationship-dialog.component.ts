import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Table, Relationship, TableColumn } from '../../models/table.model';

export interface RelationshipDialogData {
  mode: 'create' | 'edit';
  tables: Table[];
  relationship?: Relationship;
  fromTable?: Table;
  fromColumn?: TableColumn;
}

@Component({
  selector: 'app-relationship-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create Relationship' : 'Edit Relationship' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="form">
        <!-- Relationship Type -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Relationship Type</mat-label>
          <mat-select formControlName="type" (selectionChange)="onTypeChange()">
            <mat-option value="one-to-one">One to One (1:1)</mat-option>
            <mat-option value="one-to-many">One to Many (1:N)</mat-option>
            <mat-option value="many-to-many">Many to Many (N:M)</mat-option>
          </mat-select>
          <mat-hint>
            <span *ngIf="form.get('type')?.value === 'one-to-one'">
              Each record in table A relates to exactly one record in table B
            </span>
            <span *ngIf="form.get('type')?.value === 'one-to-many'">
              Each record in table A can relate to many records in table B
            </span>
            <span *ngIf="form.get('type')?.value === 'many-to-many'">
              Records in table A can relate to many records in table B, and vice versa (creates junction table)
            </span>
          </mat-hint>
        </mat-form-field>

        <!-- From Table -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>From Table</mat-label>
          <mat-select formControlName="fromTableId" (selectionChange)="onFromTableChange()">
            <mat-option *ngFor="let table of data.tables" [value]="table.id">
              {{ table.name }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('fromTableId')?.hasError('noPrimaryKey')">
            This table must have a primary key to create relationships
          </mat-error>
        </mat-form-field>

        <!-- From Column -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>From Column</mat-label>
          <mat-select formControlName="fromColumnId" [disabled]="!fromTableColumns.length">
            <mat-option *ngFor="let column of fromTableColumns" [value]="column.id">
              {{ column.name }} ({{ column.type }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- To Table -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>To Table</mat-label>
          <mat-select formControlName="toTableId" (selectionChange)="onToTableChange()">
            <mat-option *ngFor="let table of getAvailableToTables()" [value]="table.id">
              {{ table.name }}
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('toTableId')?.hasError('noPrimaryKey')">
            This table must have a primary key to create relationships
          </mat-error>
        </mat-form-field>

        <!-- To Column -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>To Column</mat-label>
          <mat-select formControlName="toColumnId" [disabled]="!toTableColumns.length">
            <mat-option *ngFor="let column of toTableColumns" [value]="column.id">
              {{ column.name }} ({{ column.type }})
            </mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Relationship Name (Optional) -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Relationship Name (Optional)</mat-label>
          <input matInput formControlName="name" placeholder="e.g., user_profile">
        </mat-form-field>

        <!-- On Delete Action -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>On Delete</mat-label>
          <mat-select formControlName="onDelete">
            <mat-option value="CASCADE">CASCADE - Delete related records</mat-option>
            <mat-option value="SET NULL">SET NULL - Set foreign key to NULL</mat-option>
            <mat-option value="RESTRICT">RESTRICT - Prevent deletion</mat-option>
            <mat-option value="NO ACTION">NO ACTION - Default</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- On Update Action -->
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>On Update</mat-label>
          <mat-select formControlName="onUpdate">
            <mat-option value="CASCADE">CASCADE - Update related records</mat-option>
            <mat-option value="SET NULL">SET NULL - Set foreign key to NULL</mat-option>
            <mat-option value="RESTRICT">RESTRICT - Prevent update</mat-option>
            <mat-option value="NO ACTION">NO ACTION - Default</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">
        {{ data.mode === 'create' ? 'Create' : 'Save' }}
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
      background: var(--theme-background);
      color: var(--theme-text-primary);
    }

    mat-dialog-title {
      color: var(--theme-text-primary);
      background: var(--theme-background);
      border-bottom: 1px solid var(--theme-border);
      padding: 16px 24px;
      margin: 0;
    }

    mat-dialog-actions {
      background: var(--theme-background);
      border-top: 1px solid var(--theme-border);
      padding: 16px 24px;
    }

    mat-hint {
      font-size: 12px;
      color: var(--theme-text-secondary);
    }

    /* Dialog container styling */
    ::ng-deep .mat-mdc-dialog-container {
      background: var(--theme-background) !important;
      color: var(--theme-text-primary) !important;
      border: 1px solid var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-dialog-container .mdc-dialog__surface {
      background: var(--theme-background) !important;
      color: var(--theme-text-primary) !important;
    }

    /* Theme-aware form field styles */
    ::ng-deep .mat-mdc-form-field {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper {
      background-color: var(--theme-background-secondary) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 8px !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-focus-overlay {
      background-color: transparent !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-input-element {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-label {
      color: var(--theme-text-primary) !important;
      opacity: 0.9 !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-form-field-label {
      color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-form-field.mat-focused .mat-mdc-text-field-wrapper {
      border-color: var(--theme-primary) !important;
      box-shadow: 0 0 0 2px rgba(var(--theme-primary-rgb), 0.2) !important;
    }

    /* Select dropdown styles */
    ::ng-deep .mat-mdc-select {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-select-panel {
      background-color: var(--theme-background-secondary) !important;
      border: 1px solid var(--theme-border) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    }

    ::ng-deep .mat-mdc-option {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-option:hover {
      background-color: var(--theme-hover) !important;
    }

    ::ng-deep .mat-mdc-option.mdc-list-item--selected {
      background-color: var(--theme-primary) !important;
      color: var(--theme-text-on-primary) !important;
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

    /* Input placeholder */
    ::ng-deep .mat-mdc-form-field .mat-mdc-input-element::placeholder {
      color: var(--theme-text-disabled) !important;
    }

    /* Additional form field overrides */
    ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper .mat-mdc-form-field-infix {
      background-color: transparent !important;
    }

    /* Notched outline styling */
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

    /* Dialog title and header styling - Remove unwanted borders */
    ::ng-deep mat-dialog-title {
      color: var(--theme-text-primary) !important;
      border-bottom: none !important;
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
  `]
})
export class RelationshipDialogComponent implements OnInit {
  form: FormGroup;
  fromTableColumns: TableColumn[] = [];
  toTableColumns: TableColumn[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RelationshipDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RelationshipDialogData
  ) {
    this.form = this.fb.group({
      type: [data.relationship?.type || 'one-to-one', Validators.required],
      fromTableId: [data.fromTable?.id || data.relationship?.fromTableId || '', Validators.required],
      fromColumnId: [data.fromColumn?.id || data.relationship?.fromColumnId || '', Validators.required],
      toTableId: [data.relationship?.toTableId || '', Validators.required],
      toColumnId: [data.relationship?.toColumnId || '', Validators.required],
      name: [data.relationship?.name || ''],
      onDelete: [data.relationship?.onDelete || 'NO ACTION', Validators.required],
      onUpdate: [data.relationship?.onUpdate || 'NO ACTION', Validators.required]
    });
  }

  ngOnInit() {
    // Load initial columns if table is pre-selected
    if (this.form.get('fromTableId')?.value) {
      this.onFromTableChange();
    }
    if (this.form.get('toTableId')?.value) {
      this.onToTableChange();
    }
  }

  onTypeChange() {
    // Update hints or validation based on type
    console.log('Relationship type changed:', this.form.get('type')?.value);
  }

  onFromTableChange() {
    const fromTableId = this.form.get('fromTableId')?.value;
    const fromTable = this.data.tables.find(t => t.id === fromTableId);
    
    if (fromTable) {
      // Validate that the table has a primary key
      const pkColumn = fromTable.columns.find(c => c.isPrimaryKey);
      if (!pkColumn) {
        this.form.get('fromTableId')?.setErrors({ noPrimaryKey: true });
        this.fromTableColumns = [];
        this.form.patchValue({ fromColumnId: '' });
        return;
      }
      
      this.fromTableColumns = fromTable.columns;
      
      // Auto-select primary key if available
      if (pkColumn && !this.form.get('fromColumnId')?.value) {
        this.form.patchValue({ fromColumnId: pkColumn.id });
      }
    } else {
      this.fromTableColumns = [];
    }
  }

  onToTableChange() {
    const toTableId = this.form.get('toTableId')?.value;
    const toTable = this.data.tables.find(t => t.id === toTableId);
    
    if (toTable) {
      // Validate that the table has a primary key
      const pkColumn = toTable.columns.find(c => c.isPrimaryKey);
      if (!pkColumn) {
        this.form.get('toTableId')?.setErrors({ noPrimaryKey: true });
        this.toTableColumns = [];
        this.form.patchValue({ toColumnId: '' });
        return;
      }
      
      this.toTableColumns = toTable.columns;
      
      // Auto-select primary key if available
      if (pkColumn && !this.form.get('toColumnId')?.value) {
        this.form.patchValue({ toColumnId: pkColumn.id });
      }
    } else {
      this.toTableColumns = [];
    }
  }

  getAvailableToTables(): Table[] {
    const fromTableId = this.form.get('fromTableId')?.value;
    return this.data.tables.filter(t => 
      t.id !== fromTableId && 
      t.columns.some(c => c.isPrimaryKey) // Only show tables with primary keys
    );
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.form.valid) {
      const relationshipData: Partial<Relationship> = {
        ...this.form.value,
        id: this.data.relationship?.id || this.generateId()
      };
      
      this.dialogRef.close(relationshipData);
    }
  }

  private generateId(): string {
    return `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}


