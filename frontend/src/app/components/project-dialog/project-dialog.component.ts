import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Project } from '../../services/project.service';

export interface ProjectDialogData {
  mode: 'create' | 'edit';
  project?: Project;
}

@Component({
  selector: 'app-project-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.mode === 'create' ? 'Create New Project' : 'Edit Project' }}</h2>
    
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Project Name</mat-label>
          <input matInput formControlName="name" placeholder="My Database Schema" required>
          <mat-error *ngIf="form.get('name')?.hasError('required')">
            Project name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description (Optional)</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Describe your project..."></textarea>
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
      min-width: 400px;
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

    /* Form field styling */
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

    /* Textarea styling */
    ::ng-deep .mat-mdc-form-field textarea.mat-mdc-input-element {
      color: var(--theme-text-primary) !important;
      resize: vertical;
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

  `]
})
export class ProjectDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ProjectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProjectDialogData
  ) {
    this.form = this.fb.group({
      name: [data.project?.name || '', Validators.required],
      description: [data.project?.description || '']
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    console.log('📝 ProjectDialog onSave called, form valid:', this.form.valid);
    console.log('📝 Form value:', this.form.value);
    console.log('📝 Form errors:', this.form.errors);
    console.log('📝 Name control errors:', this.form.get('name')?.errors);
    
    if (this.form.valid) {
      console.log('✅ Form is valid, closing dialog with:', this.form.value);
      this.dialogRef.close(this.form.value);
    } else {
      console.warn('⚠️ Form is invalid, not closing dialog');
      // Mark all fields as touched to show errors
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }
}





