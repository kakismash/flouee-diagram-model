import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { Table } from '../../models/table.model';

export interface SimpleRelationshipDialogData {
  fromTable: Table;
  availableTables: Table[];
}

@Component({
  selector: 'app-simple-relationship-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>link</mat-icon>
      Connect "{{ data.fromTable.name }}" to...
    </h2>
    
    <mat-dialog-content>
      <p class="helper-text">Select which table to connect to. A one-to-one relationship will be created automatically.</p>
      
      <mat-list class="tables-list">
        <mat-list-item *ngFor="let table of data.availableTables" 
                       (click)="selectTable(table)"
                       class="table-item">
          <mat-icon matListItemIcon>table_chart</mat-icon>
          <div matListItemTitle>{{ table.name }}</div>
          <div matListItemLine>{{ table.columns.length }} columns</div>
          <button mat-icon-button matListItemMeta>
            <mat-icon>arrow_forward</mat-icon>
          </button>
        </mat-list-item>
      </mat-list>
      
      <div *ngIf="data.availableTables.length === 0" class="empty-state">
        <mat-icon>info</mat-icon>
        <p>No other tables available to connect.</p>
        <p class="hint">Create another table first.</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    h2 mat-icon {
      color: #2196F3;
    }

    mat-dialog-content {
      padding: 20px 24px;
      min-width: 400px;
      max-height: 60vh;
    }

    .helper-text {
      margin: 0 0 16px 0;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }

    .tables-list {
      padding: 0;
    }

    .table-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .table-item:hover {
      background: #f5f5f5;
      border-color: #2196F3;
      transform: translateX(4px);
    }

    .table-item mat-icon[matListItemIcon] {
      color: #2196F3;
    }

    .empty-state {
      text-align: center;
      padding: 32px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .empty-state p {
      margin: 8px 0;
    }

    .empty-state .hint {
      font-size: 12px;
      color: #bbb;
    }
  `]
})
export class SimpleRelationshipDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SimpleRelationshipDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SimpleRelationshipDialogData
  ) {}

  selectTable(toTable: Table) {
    // Return the selected table, parent will create the relationship
    this.dialogRef.close(toTable);
  }

  onCancel() {
    this.dialogRef.close();
  }
}





