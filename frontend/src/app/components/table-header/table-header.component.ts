import { Component, Input, Output, EventEmitter, ElementRef, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { ModernInputComponent } from '../modern-input/modern-input.component';
import { TableEditService } from '../../services/table-edit.service';

@Component({
  selector: 'app-table-header',
  standalone: true,
  imports: [
    CommonModule,
    MatChipsModule,
    MatTooltipModule,
    MatIconModule,
    DragDropModule,
    ModernInputComponent
  ],
  template: `
    <div class="column-header" 
         cdkDrag 
         [cdkDragDisabled]="!canDrag || isResizing"
         cdkDragBoundary=".table-container"
         cdkDragLockAxis="x"
         [matTooltip]="canDrag && !isResizing ? 'Drag to reorder column' : 'No view selected'"
         matTooltipPosition="below">
      <!-- Custom preview for drag -->
      <div *cdkDragPreview class="column-header-drag-preview">
        <div class="column-header-content">
          <div class="column-info">
            <span class="column-name-editable">
              {{ column.name }}
            </span>
            <div class="column-badges">
              <mat-chip *ngIf="column.isPrimaryKey" class="badge pk">PK</mat-chip>
              <mat-chip *ngIf="column.isForeignKey" class="badge fk">FK</mat-chip>
              <mat-chip *ngIf="column.isUnique" class="badge unique">UQ</mat-chip>
              <mat-chip *ngIf="column.isAutoIncrement" class="badge ai">AI</mat-chip>
            </div>
          </div>
        </div>
      </div>
      
      <div class="column-header-content">
        <div class="column-info">
          <!-- Column Name -->
          <span *ngIf="!isEditingColumnName" 
                class="column-name-editable"
                (click)="onStartEditColumnName()"
                [style.width]="getTextWidth()">
            {{ column.name }}
          </span>
          <app-modern-input *ngIf="isEditingColumnName"
                            [config]="{
                              size: 'small',
                              variant: 'outline',
                              placeholder: 'Column name',
                              maxLength: 50,
                              required: false,
                              minLength: 0
                            }"
                            [value]="editingColumnNameValue"
                            (valueChange)="onUpdateEditingColumnNameValue($event)"
                            (enter)="onSaveColumnName()"
                            (escape)="onCancelEditColumnName()"
                            (blur)="onBlurEditColumnName()"
                            class="column-name-input"
                            [style.width]="getInputWidth()">
          </app-modern-input>
          
          <!-- Column Badges -->
          <div class="column-badges">
            <mat-chip *ngIf="column.isPrimaryKey" class="badge pk">PK</mat-chip>
            <mat-chip *ngIf="column.isForeignKey" class="badge fk">FK</mat-chip>
            <mat-chip *ngIf="column.isUnique" class="badge unique">UQ</mat-chip>
            <mat-chip *ngIf="column.isAutoIncrement" class="badge ai">AI</mat-chip>
          </div>
        </div>
        
        <!-- Delete Button (only for non-id, non-primary-key columns) - positioned outside column-info -->
        <button *ngIf="canDelete" 
                mat-icon-button 
                class="delete-column-btn"
                (click)="onDeleteColumn($event)"
                (mousedown)="$event.stopPropagation()"
                matTooltip="Delete column"
                matTooltipPosition="below"
                type="button"
                aria-label="Delete column">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <!-- Resize Handle -->
      <div class="resize-handle"
           (mousedown)="onResizeStart($event)"
           (click)="$event.stopPropagation()"
           [class.resizing]="isResizing"
           matTooltip="Drag to resize column"
           matTooltipPosition="below">
      </div>
    </div>
  `,
  styles: [`
    .column-header {
      padding: 8px 12px;
      background-color: var(--theme-surface);
      border-bottom: 1px solid var(--theme-outline-variant);
      cursor: grab;
      transition: all 0.2s ease;
      min-height: 40px;
      display: flex;
      align-items: center;
    }

    .column-header:hover {
      background-color: var(--theme-surface-variant);
    }

    .column-header:active {
      cursor: grabbing;
    }

    .column-header[cdkDragDisabled="true"] {
      cursor: default;
    }

    .column-header-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0; /* Allow flexbox shrinking */
      overflow: hidden; /* Prevent content overflow */
      position: relative;
    }

    .column-info {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0; /* Allow flexbox shrinking */
      overflow: hidden; /* Prevent content overflow */
    }

    .column-name-editable {
      font-weight: 600;
      color: var(--theme-text-primary);
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .column-name-editable:hover {
      background-color: var(--theme-surface-variant);
    }

    .column-name-input {
      display: inline-block;
      width: auto !important;
      min-width: 100px;
      max-width: 250px;
    }

    .column-name-input ::ng-deep .modern-input-container {
      width: auto !important;
      min-width: 100px;
      max-width: 250px;
      display: inline-block;
    }

    .column-name-input ::ng-deep .mat-mdc-text-field-wrapper {
      width: auto !important;
      min-width: 100px;
      max-width: 250px;
      padding: 0 !important;
    }

    .column-name-input ::ng-deep .mat-mdc-form-field {
      width: auto !important;
      min-width: 100px;
      max-width: 250px;
      display: inline-block;
    }

    .column-name-input ::ng-deep .mdc-text-field {
      width: auto !important;
      min-width: 100px;
      max-width: 250px;
    }

    .column-name-input ::ng-deep .mdc-text-field__input {
      width: auto !important;
      min-width: 100px;
      max-width: 250px;
      padding: 4px 8px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      line-height: 1.2 !important;
      height: auto !important;
    }

    .column-name-input ::ng-deep .mat-mdc-form-field-infix {
      padding: 4px 8px !important;
      min-height: 24px !important;
      border-top: none !important;
      width: auto !important;
    }

    .column-name-input ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none !important;
      height: 0 !important;
      margin: 0 !important;
    }

    .column-name-input ::ng-deep .mat-mdc-form-field-wrapper {
      padding-bottom: 0 !important;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .column-name-input {
        max-width: 200px;
      }
      
      .column-name-input ::ng-deep .modern-input-container,
      .column-name-input ::ng-deep .mat-mdc-form-field,
      .column-name-input ::ng-deep .mdc-text-field,
      .column-name-input ::ng-deep .mdc-text-field__input {
        max-width: 200px;
      }
    }

    .column-badges {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      align-items: center;
    }

    .badge {
      font-size: 9px;
      font-weight: 600;
      height: 18px;
      line-height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      min-width: 20px;
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

    /* Drag and drop styles */
    .column-header.cdk-drag-dragging {
      opacity: 0.3;
      transition: opacity 0.2s;
    }

    .column-header-drag-preview {
      padding: 8px 12px;
      background-color: var(--theme-surface) !important;
      border: 2px solid var(--theme-primary) !important;
      border-radius: 4px;
      box-shadow: 0 5px 5px -3px rgba(0, 0, 0, 0.2),
                  0 8px 10px 1px rgba(0, 0, 0, 0.14),
                  0 3px 14px 2px rgba(0, 0, 0, 0.12) !important;
      min-width: 150px;
      display: flex;
      align-items: center;
      z-index: 10000 !important;
      opacity: 1 !important;
      pointer-events: none;
    }

    .column-header-drag-preview .column-header-content {
      width: 100%;
    }

    .cdk-drag-placeholder {
      opacity: 0.2 !important;
      background-color: var(--theme-surface-variant) !important;
      border: 2px dashed var(--theme-outline) !important;
      transition: opacity 0.2s;
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }

    /* Ensure other headers remain fully visible during drag */
    .column-header:not(.cdk-drag-dragging):not(.cdk-drag-placeholder) {
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Ensure table headers container doesn't hide elements */
    .sticky-header {
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Resize Handle */
    .resize-handle {
      position: absolute;
      top: 0;
      right: 0;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      background-color: transparent;
      z-index: 30;
      transition: background-color 0.2s ease;
      pointer-events: auto;
      margin-right: -4px; /* Extend clickable area without visual change */
    }
    
    .column-header[cdkDrag] .resize-handle {
      pointer-events: auto !important;
    }

    .resize-handle:hover {
      background-color: var(--theme-primary);
    }

    .resize-handle.resizing {
      background-color: var(--theme-primary);
      width: 2px;
    }

    .column-header {
      position: relative;
    }

    .delete-column-btn {
      width: 18px;
      height: 18px;
      min-width: 18px;
      max-width: 18px;
      padding: 0;
      margin: 0;
      margin-left: 6px;
      opacity: 0;
      transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                  background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                  transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--theme-text-secondary, rgba(0, 0, 0, 0.6));
      background-color: transparent;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      z-index: 10;
      overflow: hidden;
    }

    .column-header:hover .delete-column-btn {
      opacity: 0.5;
    }

    .delete-column-btn:hover {
      opacity: 1 !important;
      background-color: var(--theme-error-container, rgba(211, 47, 47, 0.1));
      color: var(--theme-error, #d32f2f);
    }

    .delete-column-btn:active {
      transform: scale(0.85);
      background-color: var(--theme-error-container, rgba(211, 47, 47, 0.18));
    }

    .delete-column-btn mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      line-height: 14px;
      font-weight: 400;
    }

    /* Ensure button doesn't interfere with drag */
    .column-header.cdk-drag-dragging .delete-column-btn,
    .column-header.cdk-drag-placeholder .delete-column-btn {
      display: none;
    }

    /* Hide button when resizing */
    .column-header:has(.resize-handle.resizing) .delete-column-btn {
      opacity: 0 !important;
      pointer-events: none;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .delete-column-btn {
        width: 20px;
        height: 20px;
        min-width: 20px;
        max-width: 20px;
      }

      .delete-column-btn mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
    }
  `]
})
export class TableHeaderComponent implements AfterViewInit {
  @Input() column: any;
  @Input() canDrag = false;
  @Input() isEditingColumnName = false;
  @Input() canDelete = false; // Allow deleting column (not id, not primary key)
  @Input() set editingColumnNameValue(value: string) {
    // Only update if we're not currently editing (to avoid overwriting user input)
    if (!this.isEditingColumnName) {
      this._editingColumnNameValue.set(value || '');
    }
  }
  get editingColumnNameValue(): string {
    return this._editingColumnNameValue();
  }
  private _editingColumnNameValue = signal<string>('');
  private originalColumnName: string = ''; // Store original name when editing starts
  @Input() columnWidth?: number;
  @Input() minWidth = 80;
  @Input() maxWidth = 500;

  @Output() startEditColumnName = new EventEmitter<{columnId: string, currentName: string}>();
  @Output() updateEditingColumnNameValue = new EventEmitter<string>();
  @Output() saveColumnName = new EventEmitter<{columnId: string, newName: string}>();
  @Output() cancelEditColumnName = new EventEmitter<void>();
  @Output() columnResized = new EventEmitter<{columnId: string, width: number}>();
  @Output() deleteColumn = new EventEmitter<{columnId: string, columnName: string}>();

  isResizing = false;
  private startX = 0;
  private startWidth = 0;
  private headerElement: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  ngAfterViewInit() {
    // Get the header element for width calculation
    this.headerElement = this.elementRef.nativeElement.querySelector('.column-header');
    if (this.columnWidth && this.headerElement) {
      this.headerElement.style.width = `${this.columnWidth}px`;
      this.headerElement.style.minWidth = `${this.columnWidth}px`;
    }
  }

  constructor(private elementRef: ElementRef) {}

  onResizeStart(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    this.isResizing = true;
    this.startX = event.clientX;
    this.startWidth = this.headerElement?.offsetWidth || this.minWidth;

    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  private onResizeMove = (event: MouseEvent) => {
    if (!this.isResizing || !this.headerElement) return;

    const diff = event.clientX - this.startX;
    const newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.startWidth + diff));

    // Update header width
    this.headerElement.style.width = `${newWidth}px`;
    this.headerElement.style.minWidth = `${newWidth}px`;
    
    // Find the table header (th) that contains this header component
    const thElement = this.headerElement.closest('th');
    if (thElement) {
      thElement.style.width = `${newWidth}px`;
      thElement.style.minWidth = `${newWidth}px`;
      
      // Find all corresponding table cells in the same column
      const table = thElement.closest('table');
      if (table) {
        const columnIndex = Array.from(thElement.parentElement?.children || []).indexOf(thElement);
        const cells = table.querySelectorAll(`td[mat-cell]:nth-child(${columnIndex + 1})`);
        cells.forEach(cell => {
          (cell as HTMLElement).style.width = `${newWidth}px`;
          (cell as HTMLElement).style.minWidth = `${newWidth}px`;
        });
      }
    }
  };

  private onResizeEnd = () => {
    if (!this.isResizing || !this.headerElement) return;

    this.isResizing = false;
    const finalWidth = this.headerElement.offsetWidth;

    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Emit the resize event
    this.columnResized.emit({
      columnId: this.column.id,
      width: finalWidth
    });
  };

  onStartEditColumnName() {
    // Reset cached width when starting to edit
    this.cachedInputWidth = null;
    // Store the original name to compare later - ensure it's set before emitting
    const originalName = this.column.name || '';
    this.originalColumnName = originalName;
    // Initialize the editing value with the current column name
    this._editingColumnNameValue.set(originalName);
    this.startEditColumnName.emit({
      columnId: this.column.id,
      currentName: originalName
    });
  }

  onUpdateEditingColumnNameValue(value: string) {
    // Update the local signal immediately
    this._editingColumnNameValue.set(value);
    // Emit to parent
    this.updateEditingColumnNameValue.emit(value);
  }

  onSaveColumnName() {
    // Get current value from signal directly
    const currentValue = this._editingColumnNameValue() || '';
    const newName = currentValue.trim();
    const originalName = (this.originalColumnName || this.column.name || '').trim();
    
    // Prevent saving empty names - restore original and cancel
    if (newName.length === 0) {
      this._editingColumnNameValue.set(originalName);
      this.updateEditingColumnNameValue.emit(originalName);
      this.cancelEditColumnName.emit();
      this.originalColumnName = '';
      return;
    }
    
    // Only save if name actually changed
    if (newName !== originalName) {
      this.saveColumnName.emit({
        columnId: this.column.id,
        newName: newName
      });
    } else {
      // If same, just cancel
      this.cancelEditColumnName.emit();
    }
    // Reset original name
    this.originalColumnName = '';
  }

  onCancelEditColumnName() {
    // Use setTimeout to avoid conflicts with click events
    setTimeout(() => {
      this.cancelEditColumnName.emit();
      // Reset original name
      this.originalColumnName = '';
    }, 150);
  }

  onBlurEditColumnName() {
    console.log('=== onBlurEditColumnName START ===');
    // Use requestAnimationFrame to ensure we get the latest value after all updates
    requestAnimationFrame(() => {
      // Capture values immediately before any async operations
      // Get the current value from the signal, not from the input binding
      const currentValue = this._editingColumnNameValue() || '';
      const trimmedCurrent = currentValue.trim();
      const originalName = this.originalColumnName || this.column.name || '';
      const trimmedOriginal = originalName.trim();
      const columnId = this.column.id;

      console.log('onBlurEditColumnName - currentValue:', currentValue);
      console.log('onBlurEditColumnName - trimmedCurrent:', trimmedCurrent);
      console.log('onBlurEditColumnName - originalName:', originalName);
      console.log('onBlurEditColumnName - trimmedOriginal:', trimmedOriginal);
      console.log('onBlurEditColumnName - columnId:', columnId);
      console.log('onBlurEditColumnName - isEditingColumnName:', this.isEditingColumnName);

      // Use setTimeout to avoid conflicts with click events
      setTimeout(() => {
        // Double check we're still in editing mode (might have been cancelled)
        if (!this.isEditingColumnName) {
          console.log('onBlurEditColumnName - Not in editing mode, cancelling');
          this.originalColumnName = '';
          return;
        }

        // If empty, restore original name and cancel (don't save empty names)
        if (trimmedCurrent.length === 0) {
          console.log('onBlurEditColumnName - Empty value, restoring original and cancelling');
          // Restore the original value in the signal
          this._editingColumnNameValue.set(originalName);
          // Emit to update parent component
          this.updateEditingColumnNameValue.emit(originalName);
          // Cancel edit mode - this will restore the display
          this.cancelEditColumnName.emit();
          this.originalColumnName = '';
          return;
        }

        // If value changed and is not empty, save it
        if (trimmedCurrent !== trimmedOriginal) {
          console.log('onBlurEditColumnName - Value changed, emitting saveColumnName event');
          console.log('onBlurEditColumnName - Emitting:', { columnId, newName: trimmedCurrent });
          // Emit save event with the new name
          this.saveColumnName.emit({
            columnId: columnId,
            newName: trimmedCurrent
          });
          console.log('onBlurEditColumnName - saveColumnName event emitted');
          // Note: Don't cancel edit mode here - let saveColumnName handle it after successful save
        } else {
          console.log('onBlurEditColumnName - Value unchanged, cancelling edit');
          // Value didn't change - cancel edit (restore original)
          this.cancelEditColumnName.emit();
        }
        // Reset original name
        this.originalColumnName = '';
        console.log('=== onBlurEditColumnName END ===');
      }, 50);
    });
  }

  private cachedInputWidth: string | null = null;

  readonly inputWidth = computed(() => {
    if (!this.isEditingColumnName) {
      // Reset cache when not editing
      this.cachedInputWidth = null;
      return 'auto';
    }

    // Use cached width if available to prevent resizing while typing
    if (this.cachedInputWidth) {
      return this.cachedInputWidth;
    }

    // Use the original column name to measure, not the editing value
    // This keeps the input size fixed and similar to the header text
    const textToMeasure = this.column?.name || '';
    if (!textToMeasure) {
      this.cachedInputWidth = '100px';
      return this.cachedInputWidth;
    }

    // Use the same calculation as getTextWidth for consistency
    const calculatedWidth = this.calculateTextWidth(textToMeasure);
    
    // Cache the width so it doesn't change while typing
    this.cachedInputWidth = calculatedWidth;
    return this.cachedInputWidth;
  });

  getInputWidth(): string {
    return this.inputWidth();
  }

  private calculateTextWidth(text: string): string {
    if (!text) {
      return '100px';
    }

    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }

    const context = this.canvas.getContext('2d');
    if (!context) {
      // Fallback: ~7px per character + padding
      return `${Math.max(text.length * 7 + 24, 100)}px`;
    }

    // Use the same font as the header text (matching column-name-editable style)
    // font-weight: 600, font-size: 14px
    context.font = '600 14px Roboto, "Helvetica Neue", sans-serif';
    const textWidth = context.measureText(text).width;
    
    // Match the padding of column-name-editable (4px 8px = 8px each side = 16px total)
    const horizontalPadding = 16;
    const minWidth = 100;
    const maxWidth = 250;
    
    // Calculate width: text width + padding
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + horizontalPadding));
    
    return `${calculatedWidth}px`;
  }

  getTextWidth(): string {
    // Return the same width calculation for the text span
    // This ensures the input appears in the same space
    if (!this.column?.name) {
      return 'auto';
    }

    return this.calculateTextWidth(this.column.name);
  }

  onDeleteColumn(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.column) {
      return;
    }

    this.deleteColumn.emit({
      columnId: this.column.id,
      columnName: this.column.name || 'this column'
    });
  }
}



