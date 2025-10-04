import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { TableView } from '../../models/table-view.model';
import { Table } from '../../models/table.model';
import { ViewConfigDialogComponent, ViewConfigDialogData } from '../view-config-dialog/view-config-dialog.component';

@Component({
  selector: 'app-view-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatDividerModule
  ],
  template: `
    <div class="view-selector">
      <!-- View Tabs -->
      <div class="view-tabs">
        <mat-chip-set>
          <mat-chip 
            *ngFor="let view of views" 
            [class.active]="view.id === activeViewId"
            (click)="selectView(view)"
            [matTooltip]="view.description || ''">
            <mat-icon *ngIf="view.isDefault" class="chip-icon">star</mat-icon>
            {{ view.name }}
            <button mat-icon-button 
                    *ngIf="!view.isDefault"
                    (click)="deleteView(view, $event)"
                    class="chip-delete-btn"
                    matTooltip="Delete view">
              <mat-icon>close</mat-icon>
            </button>
          </mat-chip>
        </mat-chip-set>
      </div>

      <!-- View Actions -->
      <div class="view-actions">
        <button mat-icon-button 
                [matMenuTriggerFor]="viewMenu"
                matTooltip="View options">
          <mat-icon>more_vert</mat-icon>
        </button>

        <button mat-icon-button 
                (click)="createNewView()"
                matTooltip="Create new view">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      <!-- View Menu -->
      <mat-menu #viewMenu="matMenu">
        <button mat-menu-item (click)="createNewView()">
          <mat-icon>add</mat-icon>
          <span>Create New View</span>
        </button>
        
        <button mat-menu-item 
                *ngIf="activeView && !activeView.isDefault"
                (click)="editView(activeView)">
          <mat-icon>edit</mat-icon>
          <span>Edit Current View</span>
        </button>
        
        <button mat-menu-item 
                *ngIf="activeView && !activeView.isDefault"
                (click)="duplicateView(activeView)">
          <mat-icon>content_copy</mat-icon>
          <span>Duplicate View</span>
        </button>
        
        <mat-divider *ngIf="activeView && !activeView.isDefault"></mat-divider>
        
        <button mat-menu-item 
                *ngIf="activeView && !activeView.isDefault"
                (click)="deleteView(activeView, $event)"
                class="danger-action">
          <mat-icon>delete</mat-icon>
          <span>Delete Current View</span>
        </button>
      </mat-menu>
    </div>
  `,
  styles: [`
    .view-selector {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid var(--theme-divider);
      margin-bottom: 16px;
      background: var(--theme-background-paper);
    }

    .view-tabs {
      flex: 1;
      overflow-x: auto;
    }

    .view-tabs mat-chip-set {
      display: flex;
      gap: 8px;
      min-width: max-content;
    }

    .view-tabs mat-chip {
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      background-color: var(--theme-surface-variant);
      color: var(--theme-text-primary);
    }

    .view-tabs mat-chip:hover {
      background-color: var(--theme-surface);
    }

    .view-tabs mat-chip.active {
      background-color: var(--theme-primary);
      color: var(--theme-primary-contrast);
    }

    .view-tabs mat-chip.active .chip-icon {
      color: #ffd54f;
    }

    .chip-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .chip-delete-btn {
      margin-left: 8px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      color: var(--theme-text-primary);
    }

    .chip-delete-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .view-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .view-actions button {
      color: var(--theme-text-primary);
    }

    .danger-action {
      color: var(--theme-error);
    }

    .danger-action mat-icon {
      color: var(--theme-error);
    }
  `]
})
export class ViewSelectorComponent implements OnInit, OnChanges {
  @Input() views: TableView[] = [];
  @Input() activeViewId: string | null = null;
  @Input() table!: Table;

  @Output() viewSelected = new EventEmitter<TableView>();
  @Output() viewCreated = new EventEmitter<TableView>();
  @Output() viewUpdated = new EventEmitter<TableView>();
  @Output() viewDeleted = new EventEmitter<string>();

  activeView: TableView | null = null;

  constructor(private dialog: MatDialog) {}

  ngOnInit() {
    this.updateActiveView();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeViewId'] || changes['views']) {
      this.updateActiveView();
    }
  }

  private updateActiveView() {
    this.activeView = this.views.find(view => view.id === this.activeViewId) || null;
  }

  selectView(view: TableView) {
    this.viewSelected.emit(view);
  }

  createNewView() {
    const dialogData: ViewConfigDialogData = {
      table: this.table,
      mode: 'create'
    };

    const dialogRef = this.dialog.open(ViewConfigDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const newView: TableView = {
          id: this.generateId(),
          name: result.name,
          description: result.description,
          tableId: this.table.id,
          isDefault: false,
          columnSettings: result.columnSettings,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.viewCreated.emit(newView);
      }
    });
  }

  editView(view: TableView) {
    const dialogData: ViewConfigDialogData = {
      table: this.table,
      view: view,
      mode: 'edit'
    };

    const dialogRef = this.dialog.open(ViewConfigDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const updatedView: TableView = {
          ...view,
          name: result.name,
          description: result.description,
          columnSettings: result.columnSettings,
          updatedAt: new Date()
        };

        this.viewUpdated.emit(updatedView);
      }
    });
  }

  duplicateView(view: TableView) {
    const dialogData: ViewConfigDialogData = {
      table: this.table,
      view: { ...view, name: `${view.name} (Copy)` },
      mode: 'create'
    };

    const dialogRef = this.dialog.open(ViewConfigDialogComponent, {
      width: '600px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const duplicatedView: TableView = {
          id: this.generateId(),
          name: result.name,
          description: result.description,
          tableId: this.table.id,
          isDefault: false,
          columnSettings: result.columnSettings,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        this.viewCreated.emit(duplicatedView);
      }
    });
  }

  deleteView(view: TableView, event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    if (view.isDefault) {
      return;
    }

    if (confirm(`Are you sure you want to delete the view "${view.name}"?`)) {
      this.viewDeleted.emit(view.id);
    }
  }

  private generateId(): string {
    return 'view_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}
