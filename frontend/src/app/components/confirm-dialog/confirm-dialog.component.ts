import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon [class.danger-icon]="data.isDangerous">
        {{ data.isDangerous ? 'warning' : 'help_outline' }}
      </mat-icon>
      {{ data.title }}
    </h2>
    
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ data.cancelText || 'Cancel' }}
      </button>
      <button 
        mat-raised-button 
        [color]="data.isDangerous ? 'warn' : 'primary'" 
        (click)="onConfirm()">
        {{ data.confirmText || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--theme-text-primary);
      background: var(--theme-background);
      border-bottom: 1px solid var(--theme-border);
      padding: 16px 24px;
      margin: 0;
    }

    mat-icon {
      color: var(--theme-primary);
    }

    mat-icon.danger-icon {
      color: var(--theme-error);
    }

    mat-dialog-content {
      padding: 20px 24px;
      min-width: 300px;
      background: var(--theme-background);
      color: var(--theme-text-primary);
    }

    p {
      margin: 0;
      color: var(--theme-text-secondary);
      font-size: 14px;
      line-height: 1.6;
    }

    mat-dialog-actions {
      background: var(--theme-background);
      border-top: 1px solid var(--theme-border);
      padding: 16px 24px;
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

    /* Button styling */
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

    /* Warn button styling */
    ::ng-deep .mat-mdc-raised-button[color="warn"] {
      background-color: var(--theme-error) !important;
      color: white !important;
    }

    ::ng-deep .mat-mdc-raised-button[color="warn"]:hover {
      background-color: var(--theme-error-dark, #d32f2f) !important;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    this.dialogRef.close(true);
  }
}





