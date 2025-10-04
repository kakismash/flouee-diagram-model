import { Component, Input, Output, EventEmitter, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';

export interface ColumnConfig {
  name: string;
  id: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isAutoIncrement?: boolean;
  isEditable?: boolean;
  isDraggable?: boolean;
  tooltip?: string;
}

export interface ColumnEvents {
  onEdit?: (columnId: string, newName: string) => void;
  onDrag?: (event: any) => void;
  onClick?: (columnId: string) => void;
}

@Component({
  selector: 'app-table-column',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    DragDropModule
  ],
  template: `
    <ng-container [matColumnDef]="config.name">
      <!-- Header -->
      <th mat-header-cell *matHeaderCellDef class="sticky-header">
        <div class="column-header" 
             cdkDrag
             [cdkDragDisabled]="!config.isDraggable"
             [matTooltip]="config.tooltip || ''"
             matTooltipPosition="below">
          <div class="column-header-content">
            <div class="column-info">
              <span *ngIf="!isEditingName" 
                    class="column-name-editable"
                    (click)="onColumnNameClick()">
                {{ config.name }}
              </span>
              <ng-container *ngIf="isEditingName">
                <ng-container [ngTemplateOutlet]="editTemplate || defaultEditTemplate"></ng-container>
              </ng-container>
              <div class="column-badges">
                <mat-chip *ngIf="config.isPrimaryKey" class="badge pk">PK</mat-chip>
                <mat-chip *ngIf="config.isForeignKey" class="badge fk">FK</mat-chip>
                <mat-chip *ngIf="config.isUnique" class="badge unique">UQ</mat-chip>
                <mat-chip *ngIf="config.isAutoIncrement" class="badge ai">AI</mat-chip>
              </div>
            </div>
          </div>
        </div>
      </th>
      
      <!-- Body Cell -->
      <td mat-cell *matCellDef="let element; let i = index">
        <ng-container [ngTemplateOutlet]="cellTemplate" 
                      [ngTemplateOutletContext]="{ 
                        $implicit: element, 
                        index: i, 
                        column: config,
                        value: getCellValue(element, config.name)
                      }">
        </ng-container>
      </td>
    </ng-container>

    <!-- Default Edit Template -->
    <ng-template #defaultEditTemplate>
      <input type="text" 
             [value]="editingName"
             (input)="onNameInput($event)"
             (blur)="onNameBlur()"
             (keydown.enter)="onNameEnter()"
             (keydown.escape)="onNameEscape()"
             class="column-name-input">
    </ng-template>
  `,
  styles: [`
    .column-header {
      display: flex;
      align-items: center;
      min-height: 48px;
      padding: 8px 16px;
      background-color: var(--theme-background-paper);
      border-bottom: 1px solid var(--theme-divider);
    }

    .column-header-content {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .column-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      width: 100%;
    }

    .column-name-editable {
      font-weight: 500;
      color: var(--theme-on-surface);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .column-name-editable:hover {
      background-color: var(--theme-surface-variant);
    }

    .column-name-input {
      border: 1px solid var(--theme-outline);
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 14px;
      background-color: var(--theme-background);
      color: var(--theme-on-background);
      min-width: 100px;
    }

    .column-badges {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .badge {
      font-size: 10px;
      height: 16px;
      min-height: 16px;
      line-height: 16px;
    }

    .badge.pk {
      background-color: var(--theme-primary);
      color: var(--theme-on-primary);
    }

    .badge.fk {
      background-color: var(--theme-secondary);
      color: var(--theme-on-secondary);
    }

    .badge.unique {
      background-color: var(--theme-tertiary);
      color: var(--theme-on-tertiary);
    }

    .badge.ai {
      background-color: var(--theme-error);
      color: var(--theme-on-error);
    }

    .sticky-header {
      position: sticky;
      top: 0;
      z-index: 10;
      background-color: var(--theme-background-paper);
    }
  `]
})
export class TableColumnComponent {
  @Input() config!: ColumnConfig;
  @Input() cellTemplate!: TemplateRef<any>;
  @Input() editTemplate?: TemplateRef<any>;
  @Input() isEditingName = false;
  @Input() editingName = '';

  @Output() nameEdit = new EventEmitter<{ columnId: string; newName: string }>();
  @Output() nameEditCancel = new EventEmitter<void>();
  @Output() columnClick = new EventEmitter<string>();
  @Output() dragStart = new EventEmitter<any>();

  onColumnNameClick() {
    if (this.config.isEditable) {
      this.columnClick.emit(this.config.id);
    }
  }

  onNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.editingName = target.value;
  }

  onNameBlur() {
    this.finishEditing();
  }

  onNameEnter() {
    this.finishEditing();
  }

  onNameEscape() {
    this.nameEditCancel.emit();
  }

  private finishEditing() {
    if (this.editingName.trim() && this.editingName !== this.config.name) {
      this.nameEdit.emit({
        columnId: this.config.id,
        newName: this.editingName.trim()
      });
    } else {
      this.nameEditCancel.emit();
    }
  }

  getCellValue(element: any, columnName: string): any {
    return element[columnName];
  }
}
