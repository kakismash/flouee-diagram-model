import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Relationship, RelationshipDisplayColumn, RelationshipDisplayField } from '../../models/table.model';

@Component({
  selector: 'app-relationship-cell',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <div class="relationship-cell" 
         [class.editing]="isEditing"
         (click)="onCellClick()">
      
      <!-- Display Mode -->
      <div *ngIf="!isEditing" class="relationship-display">
        <!-- Simple Relationship Display -->
        <div *ngIf="isSimpleRelationship" class="simple-relationship">
          <span class="relationship-value">{{ displayValue }}</span>
          <mat-icon *ngIf="!displayValue" class="no-data-icon">help_outline</mat-icon>
        </div>
        
        <!-- Complex Relationship Display -->
        <div *ngIf="!isSimpleRelationship" class="complex-relationship">
          <div *ngFor="let field of relationshipDisplayColumn.fields; let i = index" 
               class="relationship-field">
            <span class="field-label">{{ field.displayName }}:</span>
            <span class="field-value">{{ getFieldValue(field, i) }}</span>
          </div>
          <mat-icon *ngIf="!hasAnyFieldValue" class="no-data-icon">help_outline</mat-icon>
        </div>
      </div>
      
      <!-- Editing Mode -->
      <div *ngIf="isEditing" class="relationship-editing">
        <!-- Simple Relationship Editing -->
        <mat-form-field *ngIf="isSimpleRelationship" appearance="outline" class="relationship-select">
          <mat-select [value]="editingValue" 
                      (selectionChange)="onValueChange($event.value)"
                      (closed)="onSave()">
            <mat-option *ngFor="let option of relationshipOptions" [value]="option.value">
              {{ option.label }}
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <!-- Complex Relationship Editing -->
        <div *ngIf="!isSimpleRelationship" class="complex-relationship-editing">
          <div *ngFor="let field of relationshipDisplayColumn.fields; let i = index" 
               class="relationship-field-edit">
            <mat-form-field appearance="outline" class="field-select">
              <mat-label>{{ field.displayName }}</mat-label>
              <mat-select [value]="getFieldEditingValue(field, i)"
                          (selectionChange)="onFieldValueChange(field, i, $event.value)"
                          (closed)="onSave()">
                <mat-option *ngFor="let option of getFieldOptions(field, i)" [value]="option.value">
                  {{ option.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .relationship-cell {
      padding: 8px 12px;
      min-height: 40px;
      display: flex;
      align-items: center;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .relationship-cell:hover {
      background-color: var(--theme-surface-variant);
    }

    .relationship-cell.editing {
      background-color: var(--theme-primary-container);
      cursor: default;
    }

    .relationship-display {
      width: 100%;
    }

    .simple-relationship {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .relationship-value {
      color: var(--theme-text-primary);
      font-weight: 500;
    }

    .complex-relationship {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .relationship-field {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .field-label {
      font-weight: 600;
      color: var(--theme-text-secondary);
      font-size: 12px;
    }

    .field-value {
      color: var(--theme-text-primary);
      font-size: 14px;
    }

    .no-data-icon {
      color: var(--theme-text-disabled);
      font-size: 16px;
    }

    .relationship-editing {
      width: 100%;
    }

    .relationship-select {
      width: 100%;
    }

    .complex-relationship-editing {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .relationship-field-edit {
      width: 100%;
    }

    .field-select {
      width: 100%;
    }

    .field-select .mat-mdc-form-field {
      width: 100%;
    }

    .field-select .mat-mdc-select {
      width: 100%;
    }
  `]
})
export class RelationshipCellComponent implements OnInit {
  @Input() rowIndex!: number;
  @Input() relationshipDisplayColumn!: RelationshipDisplayColumn;
  @Input() element: any;
  @Input() allTables: any[] = [];
  @Input() allTableData: { [tableName: string]: any[] } = {};
  @Input() isEditing = false;
  @Input() editingValue = '';
  @Input() relationshipOptions: { value: string; label: string }[] = [];

  @Output() startEdit = new EventEmitter<{rowIndex: number, relCol: RelationshipDisplayColumn, field: any, element: any}>();
  @Output() valueChange = new EventEmitter<any>();
  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get isSimpleRelationship(): boolean {
    return this.relationshipDisplayColumn.fields.length === 1;
  }

  get displayValue(): string {
    if (this.isSimpleRelationship) {
      const field = this.relationshipDisplayColumn.fields[0];
      return this.getFieldValue(field, 0);
    }
    return '';
  }

  get hasAnyFieldValue(): boolean {
    return this.relationshipDisplayColumn.fields.some((field, index) => 
      this.getFieldValue(field, index) !== ''
    );
  }

  ngOnInit() {
    // Initialize any required data
  }

  getFieldValue(field: RelationshipDisplayField, fieldIndex: number): string {
    // Get the foreign key column
    const fkColumn = this.element[field.sourceColumnId];
    if (!fkColumn) return '';

    // Get the source table
    const sourceTable = this.allTables.find(t => t.id === this.relationshipDisplayColumn.sourceTableId);
    if (!sourceTable) return '';

    // Get the source column
    const sourceColumn = sourceTable.columns.find((c: any) => c.id === field.sourceColumnId);
    if (!sourceColumn) return '';

    // Get the primary key column
    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) return '';

    // Get the source record
    const sourceTableData = this.allTableData[sourceTable.name] || [];
    const sourceRecord = sourceTableData.find((record: any) => record[pkColumn.name] === fkColumn);
    if (!sourceRecord) return '';

    return String(sourceRecord[sourceColumn.name] || '');
  }

  getFieldEditingValue(field: RelationshipDisplayField, fieldIndex: number): string {
    return this.getFieldValue(field, fieldIndex);
  }

  getFieldOptions(field: RelationshipDisplayField, fieldIndex: number): { value: string; label: string }[] {
    // Get the source table
    const sourceTable = this.allTables.find(t => t.id === this.relationshipDisplayColumn.sourceTableId);
    if (!sourceTable) return [];

    // Get the primary key column
    const pkColumn = sourceTable.columns.find((c: any) => c.isPrimaryKey);
    if (!pkColumn) return [];

    // Get the source column
    const sourceColumn = sourceTable.columns.find((c: any) => c.id === field.sourceColumnId);
    if (!sourceColumn) return [];

    // Get the source table data
    const sourceTableData = this.allTableData[sourceTable.name] || [];

    return sourceTableData.map((record: any) => ({
      value: record[pkColumn.name],
      label: String(record[sourceColumn.name] || '')
    }));
  }

  onCellClick() {
    if (!this.isEditing) {
      const field = this.relationshipDisplayColumn.fields[0];
      this.startEdit.emit({
        rowIndex: this.rowIndex,
        relCol: this.relationshipDisplayColumn,
        field: field,
        element: this.element
      });
    }
  }

  onValueChange(value: any) {
    this.valueChange.emit(value);
  }

  onFieldValueChange(field: RelationshipDisplayField, fieldIndex: number, value: any) {
    // Handle complex relationship field changes
    this.valueChange.emit({ field, fieldIndex, value });
  }

  onSave() {
    this.save.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}



