import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { Phase } from '../../models/table.model';

@Component({
  selector: 'app-phase-cell',
  standalone: true,
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule
  ],
  template: `
    <div class="phase-cell" [class.editing]="isEditing">
      <!-- Display Mode -->
      <mat-chip *ngIf="!isEditing && selectedPhase" 
                [style.background-color]="selectedPhase.color"
                [style.color]="getContrastColor(selectedPhase.color)"
                class="phase-chip">
        {{ selectedPhase.name }}
      </mat-chip>
      <span *ngIf="!isEditing && !selectedPhase" class="no-phase">-</span>
      
      <!-- Editing Mode -->
      <mat-form-field *ngIf="isEditing" appearance="outline" class="phase-select">
        <mat-select [value]="currentPhaseId" 
                    (selectionChange)="onPhaseChange($event.value)">
          <mat-option [value]="null">None</mat-option>
          <mat-option *ngFor="let phase of phases" [value]="phase.id">
            <div class="phase-option">
              <span class="phase-color-indicator" [style.background-color]="phase.color"></span>
              <span>{{ phase.name }}</span>
            </div>
          </mat-option>
        </mat-select>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .phase-cell {
      display: flex;
      align-items: center;
      min-height: 40px;
      padding: 4px 8px;
    }

    .phase-chip {
      font-size: 12px;
      font-weight: 500;
      height: 24px;
      border-radius: 12px;
      padding: 0 12px;
    }

    .no-phase {
      color: var(--theme-text-disabled);
      font-style: italic;
    }

    .phase-select {
      width: 100%;
      min-width: 150px;
    }

    .phase-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .phase-color-indicator {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-block;
    }
  `]
})
export class PhaseCellComponent {
  @Input() phases: Phase[] = [];
  @Input() currentPhaseId: string | null = null;
  @Input() isEditing = false;

  @Output() phaseChanged = new EventEmitter<string | null>();

  get selectedPhase(): Phase | undefined {
    if (!this.currentPhaseId) {
      return undefined;
    }
    return this.phases.find(p => p.id === this.currentPhaseId);
  }

  onPhaseChange(phaseId: string | null): void {
    this.phaseChanged.emit(phaseId);
  }

  getContrastColor(hexColor: string): string {
    // Simple contrast calculation - return white or black based on brightness
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#FFFFFF';
  }
}

