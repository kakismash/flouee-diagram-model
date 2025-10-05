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
    <div class="relationship-dialog">
      <h2 mat-dialog-title>
        <mat-icon>link</mat-icon>
        Connect "{{ data.fromTable.name }}" to...
      </h2>
      
      <mat-dialog-content>
        <form class="relationship-form">
          <p class="helper-text">Select which table to connect to. A one-to-one relationship will be created automatically.</p>
          
          <!-- Tables Section -->
          <div class="tables-section">
            <div class="tables-header">
              <h3>Available Tables</h3>
            </div>
            
            <div class="tables-scroll-container">
              <div class="tables-list">
                <div *ngFor="let table of data.availableTables" 
                     (click)="selectTable(table)"
                     class="table-item">
                
                <div class="table-item-header">
                  <h4>{{ table.name }}</h4>
                  <button mat-icon-button type="button" (click)="selectTable(table)" matTooltip="Select Table">
                    <mat-icon>arrow_forward</mat-icon>
                  </button>
                </div>
                
                <div class="table-item-main">
                  <div class="table-info">
                    <mat-icon>table_chart</mat-icon>
                    <span>{{ table.columns.length }} columns</span>
                  </div>
                </div>
                </div>
              </div>
              
              <div *ngIf="data.availableTables.length === 0" class="empty-state">
                <mat-icon>info</mat-icon>
                <p>No other tables available to connect.</p>
                <p class="hint">Create another table first.</p>
              </div>
            </div>
          </div>
        </form>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .relationship-dialog {
      min-width: 300px;
      max-width: 600px;
      background-color: var(--theme-background) !important;
      color: var(--theme-text-primary) !important;
      overflow: hidden; /* prevent accidental horizontal scroll */
      box-sizing: border-box;
    }

    /* Title inside this dialog - ensure themed background and spacing */
    .relationship-dialog h2[mat-dialog-title] {
      background-color: var(--theme-background) !important;
      color: var(--theme-text-primary) !important;
      margin: 0 0 12px 0 !important;
      padding: 12px 16px !important;
      border-bottom: 1px solid var(--theme-border) !important;
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    
    .relationship-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .helper-text {
      margin: 0 0 16px 0;
      color: var(--theme-text-secondary);
      font-size: 14px;
      line-height: 1.5;
    }
    
    .tables-section {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      height: 300px;
    }
    
    .tables-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--theme-background-secondary);
      border-radius: 8px;
      border: 1px solid var(--theme-border);
      position: sticky;
      top: 0;
      z-index: 10;
      flex-shrink: 0;
    }
    
    .tables-header h3 {
      margin: 0;
      color: var(--theme-text-primary);
      font-weight: 500;
    }
    
    .tables-scroll-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden; /* avoid horizontal scroll */
      padding-right: 8px;
      margin-right: 0; /* was -8px, caused horizontal overflow */
      box-sizing: border-box;
    }
    
    .tables-scroll-container::-webkit-scrollbar {
      width: 6px;
    }
    
    .tables-scroll-container::-webkit-scrollbar-track {
      background: var(--theme-background-secondary);
      border-radius: 3px;
    }
    
    .tables-scroll-container::-webkit-scrollbar-thumb {
      background: var(--theme-border);
      border-radius: 3px;
    }
    
    .tables-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--theme-text-secondary);
    }
    
    .tables-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 16px;
    }
    
    .table-item {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border: 1px solid var(--theme-border);
      border-radius: 8px;
      background: var(--theme-background-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .table-item:hover {
      background: var(--theme-hover);
      border-color: var(--theme-primary);
      transform: translateX(4px);
    }
    
    .table-item-main {
      display: flex;
      gap: 12px;
      flex: 1;
    }
    
    .table-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .table-info mat-icon {
      color: var(--theme-primary);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .table-info span {
      color: var(--theme-text-secondary);
      font-size: 14px;
    }
    
    .table-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .table-item-header h4 {
      margin: 0;
      color: var(--theme-text-primary);
      font-weight: 500;
    }
    
    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--theme-text-secondary);
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: var(--theme-text-disabled);
    }

    .empty-state p {
      margin: 8px 0;
      color: var(--theme-text-secondary);
    }

    .empty-state .hint {
      font-size: 12px;
      color: var(--theme-text-disabled);
    }
    
    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--theme-text-primary);
    }
    
    mat-dialog-title mat-icon {
      color: var(--theme-primary);
    }
    
    mat-dialog-content {
      max-height: 80vh;
      overflow: hidden;
      overflow-x: hidden; /* ensure no horizontal scroll */
      display: flex;
      flex-direction: column;
    }

    /* Dialog title and header styling */
    ::ng-deep mat-dialog-title {
      color: var(--theme-text-primary) !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      border-bottom: none !important;
    }

    ::ng-deep mat-dialog-title mat-icon {
      color: var(--theme-primary) !important;
    }

    /* Ensure header uses themed background (not white) */
    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-title,
    ::ng-deep .cdk-overlay-pane .mat-mdc-dialog-container .mat-mdc-dialog-title,
    ::ng-deep h2.mat-mdc-dialog-title {
      background-color: var(--theme-background) !important;
      color: var(--theme-text-primary) !important;
      border-bottom: 1px solid var(--theme-border) !important;
      margin: 0 0 12px 0 !important;
      padding: 12px 0 !important;
    }

    /* Remove any residual white pseudo-elements/dividers */
    ::ng-deep .mat-mdc-dialog-container .mat-mdc-dialog-title::after,
    ::ng-deep .cdk-overlay-pane .mat-mdc-dialog-container .mat-mdc-dialog-title::after,
    ::ng-deep h2.mat-mdc-dialog-title::after {
      display: none !important;
      content: none !important;
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
    ::ng-deep .mat-mdc-dialog-container {
      border: 1px solid var(--theme-border) !important;
    }

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

    /* Button styles */
    ::ng-deep .mat-mdc-button {
      color: var(--theme-text-primary) !important;
    }

    ::ng-deep .mat-mdc-button:hover {
      background-color: var(--theme-hover) !important;
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





