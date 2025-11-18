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

    .info-section {
      margin: 16px 0;
      padding: 12px;
      background: var(--theme-background-secondary);
      border-radius: 4px;
      border: 1px solid var(--theme-border);
    }

    .info-section h4 {
      margin: 0 0 8px 0;
      color: var(--theme-primary);
    }

    .info-text {
      margin: 0;
      color: var(--theme-text-secondary);
      font-size: 14px;
    }

    .pk-indicator {
      color: var(--theme-primary);
      font-weight: 500;
    }

    .preview-section {
      margin-top: 16px;
      padding: 12px;
      background: var(--theme-primary-container);
      border-radius: 4px;
      border-left: 4px solid var(--theme-primary);
    }

    .preview-section h4 {
      margin: 0 0 12px 0;
      color: var(--theme-primary);
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .preview-label {
      font-weight: 500;
      color: var(--theme-primary);
    }

    .preview-value {
      color: var(--theme-text-primary);
      font-family: monospace;
    }

    mat-hint {
      font-size: 12px;
      color: var(--theme-text-secondary);
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
      color: var(--theme-text-primary);
    }

    .fields-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .field-item {
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      padding: 16px;
      background: var(--theme-background-secondary);
    }

    .field-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .field-header h5 {
      margin: 0;
      color: var(--theme-text-primary);
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
      border: 1px solid var(--theme-border);
      border-radius: 4px;
      background: var(--theme-background);
      overflow: hidden;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: var(--theme-background-secondary);
      border-bottom: 1px solid var(--theme-border);
    }

    .preview-source {
      color: var(--theme-primary);
      font-weight: 500;
      font-size: 14px;
    }

    .preview-type {
      background: var(--theme-primary-container);
      color: var(--theme-primary);
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
      background: var(--theme-background);
      border-radius: 3px;
      margin-bottom: 2px;
      border: 1px solid var(--theme-border);
    }

    .preview-field-name {
      color: var(--theme-text-primary);
      font-size: 12px;
      font-weight: 400;
    }

    .preview-field-type {
      background: var(--theme-background-secondary);
      color: var(--theme-text-secondary);
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 2px;
      font-weight: 500;
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

    /* Checkbox styles */
    ::ng-deep .mat-mdc-checkbox .mat-mdc-checkbox-frame {
      border-color: var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-checkbox.mat-mdc-checkbox-checked .mat-mdc-checkbox-background {
      background-color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mdc-checkbox__native-control:enabled:checked ~ .mdc-checkbox__background {
      background-color: var(--theme-primary) !important;
      border-color: var(--theme-primary) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mdc-checkbox__native-control:enabled ~ .mdc-checkbox__background {
      border-color: var(--theme-border) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mdc-checkbox__checkmark {
      color: var(--theme-text-on-primary) !important;
    }

    ::ng-deep .mat-mdc-checkbox .mat-mdc-checkbox-label {
      color: var(--theme-text-primary) !important;
      opacity: 1 !important;
    }

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

    /* Icon button styling */
    ::ng-deep .mat-mdc-icon-button {
      color: var(--theme-text-secondary) !important;
    }

    ::ng-deep .mat-mdc-icon-button:hover {
      background-color: var(--theme-hover) !important;
      color: var(--theme-error) !important;
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
