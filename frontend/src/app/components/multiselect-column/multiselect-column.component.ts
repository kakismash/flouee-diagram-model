import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TableColumnComponent, ColumnConfig } from '../table-column/table-column.component';

export interface MultiselectColumnData {
  element: any;
  index: number;
  column: ColumnConfig;
  value: any;
}

@Component({
  selector: 'app-multiselect-column',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    TableColumnComponent
  ],
  template: `
    <app-table-column 
      [config]="columnConfig"
      [cellTemplate]="cellTemplate"
      [isEditingName]="false"
      [editingName]="''">
    </app-table-column>

    <ng-template #cellTemplate let-data="element" let-i="index" let-column="column" let-value="value">
      <div class="multiselect-cell">
        <mat-checkbox 
          [checked]="isRowSelected(i)"
          (change)="onSelectionChange(i)"
          [disabled]="!isEnabled">
        </mat-checkbox>
      </div>
    </ng-template>
  `,
  styles: [`
    .multiselect-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      min-height: 48px;
    }
  `]
})
export class MultiselectColumnComponent {
  @Input() isEnabled = true;
  @Input() isRowSelected!: (index: number) => boolean;

  @Output() selectionChange = new EventEmitter<number>();

  get columnConfig(): ColumnConfig {
    return {
      name: 'Select',
      id: 'multiselect',
      isEditable: false,
      isDraggable: false,
      tooltip: 'Select row for bulk operations'
    };
  }

  onSelectionChange(index: number) {
    this.selectionChange.emit(index);
  }
}
