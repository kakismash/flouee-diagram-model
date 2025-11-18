import { Component, Input, Output, EventEmitter, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuTrigger } from '@angular/material/menu';

export interface ColumnColor {
  name: string;
  value: string;
  borderColor: string;
  backgroundColor: string;
}

export interface ColumnContextMenuData {
  columnId: string;
  columnName: string;
  isReferenced: boolean;
  currentColor?: ColumnColor;
  referenceInfo?: {
    sourceTableName: string;
    sourceColumnName: string;
    relationshipType: string;
  };
}

@Component({
  selector: 'app-column-context-menu',
  standalone: true,
  imports: [CommonModule, MatMenuModule, MatButtonModule, MatIconModule, MatDividerModule, MatTooltipModule],
  template: `
    <div class="context-menu-trigger" 
         [matMenuTriggerFor]="contextMenu"
         (contextmenu)="onRightClick($event)">
      <ng-content></ng-content>
    </div>

    <mat-menu #contextMenu="matMenu" class="column-context-menu">
      <div class="menu-header">
        <mat-icon>palette</mat-icon>
        <div class="header-info">
          <span class="column-name">{{ data.columnName }}</span>
          <span *ngIf="data.referenceInfo" class="reference-info">
            from {{ data.referenceInfo.sourceTableName }}
          </span>
        </div>
      </div>
      
      <mat-divider></mat-divider>
      
      <div class="color-section" *ngIf="data.isReferenced">
        <div class="section-title">
          <mat-icon>color_lens</mat-icon>
          <span>Column Color</span>
        </div>
        
        <div class="color-grid">
          <button *ngFor="let color of availableColors()" 
                  class="color-option"
                  [class.selected]="isColorSelected(color)"
                  [style.background-color]="color.backgroundColor"
                  [style.border-color]="color.borderColor"
                  (click)="selectColor(color)"
                  [matTooltip]="color.name">
            <mat-icon *ngIf="isColorSelected(color)" class="check-icon">check</mat-icon>
          </button>
        </div>
        
        <button mat-menu-item (click)="clearColor()" class="clear-color-btn">
          <mat-icon>clear</mat-icon>
          <span>Clear Color</span>
        </button>
      </div>
      
      <div class="non-referenced-message" *ngIf="!data.isReferenced">
        <mat-icon>info</mat-icon>
        <span>Colors only available for referenced columns</span>
      </div>
      
      <mat-divider></mat-divider>
      
      <div class="column-actions">
        <button mat-menu-item (click)="onHideColumn()" class="hide-column-btn">
          <mat-icon>visibility_off</mat-icon>
          <span>Hide Column</span>
        </button>
      </div>
    </mat-menu>
  `,
  styles: [`
    .context-menu-trigger {
      width: 100%;
      height: 100%;
    }

    .column-context-menu {
      min-width: 280px;
    }

    .menu-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--theme-surface);
      color: var(--theme-text-primary);
      font-weight: 500;
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .column-name {
      font-weight: 500;
      color: var(--theme-text-primary);
    }

    .reference-info {
      font-size: 12px;
      color: var(--theme-text-secondary);
      font-style: italic;
    }

    .color-section {
      padding: 16px;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: var(--theme-text-primary);
      font-size: 14px;
      font-weight: 500;
    }

    .color-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .color-option {
      width: 32px;
      height: 32px;
      border: 2px solid;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      position: relative;
    }

    .color-option:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .color-option.selected {
      transform: scale(1.15);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .check-icon {
      color: white;
      font-size: 18px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .clear-color-btn {
      width: 100%;
      justify-content: flex-start;
    }

    .non-referenced-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      color: var(--theme-text-secondary);
      font-size: 14px;
      font-style: italic;
    }

    .column-actions {
      padding: 8px 0;
    }

    .hide-column-btn {
      color: var(--theme-text-primary);
    }

    .hide-column-btn:hover {
      background-color: var(--theme-hover);
    }

    .hide-column-btn mat-icon {
      color: var(--theme-warning);
    }

    ::ng-deep .mat-mdc-menu-panel {
      background: var(--theme-surface) !important;
      border: 1px solid var(--theme-border);
    }

    ::ng-deep .mat-mdc-menu-item {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-menu-item:hover {
      background: var(--theme-hover) !important;
    }
  `]
})
export class ColumnContextMenuComponent {
  @ViewChild(MatMenuTrigger) menuTrigger!: MatMenuTrigger;

  @Input() data: ColumnContextMenuData = {
    columnId: '',
    columnName: '',
    isReferenced: false
  };

  @Output() colorSelected = new EventEmitter<{ columnId: string; color: ColumnColor | null }>();
  @Output() rightClick = new EventEmitter<MouseEvent>();
  @Output() hideColumn = new EventEmitter<{ columnId: string; columnName: string }>();

  availableColors = signal<ColumnColor[]>([
    { name: 'Blue', value: 'blue', borderColor: '#1976d2', backgroundColor: '#e3f2fd' },
    { name: 'Green', value: 'green', borderColor: '#388e3c', backgroundColor: '#e8f5e8' },
    { name: 'Orange', value: 'orange', borderColor: '#f57c00', backgroundColor: '#fff3e0' },
    { name: 'Purple', value: 'purple', borderColor: '#7b1fa2', backgroundColor: '#f3e5f5' },
    { name: 'Red', value: 'red', borderColor: '#d32f2f', backgroundColor: '#ffebee' },
    { name: 'Teal', value: 'teal', borderColor: '#00796b', backgroundColor: '#e0f2f1' },
    { name: 'Pink', value: 'pink', borderColor: '#c2185b', backgroundColor: '#fce4ec' },
    { name: 'Indigo', value: 'indigo', borderColor: '#303f9f', backgroundColor: '#e8eaf6' },
    { name: 'Cyan', value: 'cyan', borderColor: '#00acc1', backgroundColor: '#e0f7fa' },
    { name: 'Amber', value: 'amber', borderColor: '#ffa000', backgroundColor: '#fff8e1' },
    { name: 'Deep Orange', value: 'deep-orange', borderColor: '#f4511e', backgroundColor: '#fbe9e7' },
    { name: 'Light Green', value: 'light-green', borderColor: '#689f38', backgroundColor: '#f1f8e9' }
  ]);

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    // Only show menu for referenced columns
    if (this.data.isReferenced) {
      // Open the menu at the mouse position
      this.menuTrigger.openMenu();
    }
    
    this.rightClick.emit(event);
  }

  selectColor(color: ColumnColor) {
    this.colorSelected.emit({ columnId: this.data.columnId, color });
  }

  clearColor() {
    this.colorSelected.emit({ columnId: this.data.columnId, color: null });
  }

  onHideColumn() {
    this.hideColumn.emit({ 
      columnId: this.data.columnId, 
      columnName: this.data.columnName 
    });
  }

  isColorSelected(color: ColumnColor): boolean {
    return this.data.currentColor?.value === color.value;
  }
}
