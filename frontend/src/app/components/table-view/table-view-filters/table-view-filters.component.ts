import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { BaseButtonComponent } from '../../design-system/base-button/base-button.component';

export interface FilterCondition {
  columnId: string;
  columnName: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string;
}

@Component({
  selector: 'app-table-view-filters',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    BaseButtonComponent
  ],
  template: `
    <div class="filters-panel" [class.expanded]="expanded">
      <div class="filters-content" *ngIf="expanded">
        <div class="filters-list">
          <div *ngFor="let filter of filters; let i = index; trackBy: trackByFilterIndex" class="filter-item">
            <div class="filter-row">
              <mat-form-field appearance="outline" class="filter-column">
                <mat-label>Column</mat-label>
                <mat-select [value]="filter.columnId" (selectionChange)="onColumnChange(i, $event.value)">
                  <mat-option *ngFor="let col of availableColumns" [value]="col.id">
                    {{ col.name }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="filter-operator">
                <mat-label>Operator</mat-label>
                <mat-select [value]="filter.operator" (selectionChange)="onOperatorChange(i, $event.value)">
                  <mat-option value="equals">Equals</mat-option>
                  <mat-option value="contains">Contains</mat-option>
                  <mat-option value="starts_with">Starts with</mat-option>
                  <mat-option value="ends_with">Ends with</mat-option>
                  <mat-option value="greater_than">Greater than</mat-option>
                  <mat-option value="less_than">Less than</mat-option>
                  <mat-option value="is_empty">Is empty</mat-option>
                  <mat-option value="is_not_empty">Is not empty</mat-option>
                </mat-select>
              </mat-form-field>
              
              <mat-form-field *ngIf="!isNoValueOperator(filter.operator)" appearance="outline" class="filter-value">
                <mat-label>Value</mat-label>
                <input matInput [value]="filter.value" (input)="onValueChange(i, $event)" placeholder="Filter value">
              </mat-form-field>
              
              <ds-base-button
                icon="close"
                variant="ghost"
                size="small"
                (clicked)="removeFilter(i, $event)">
              </ds-base-button>
            </div>
          </div>
        </div>
        
        <div class="filters-actions">
          <button
            type="button"
            class="add-filter-btn"
            (click)="addFilter($event)">
            <mat-icon>add</mat-icon>
            <span>Add Filter</span>
          </button>
          <button
            *ngIf="filters.length > 0"
            type="button"
            class="clear-all-btn"
            (click)="clearAll($event)">
            <span>Clear All</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filters-panel {
      background-color: var(--theme-surface);
      border-bottom: 1px solid var(--theme-divider);
      transition: all var(--ds-transition-normal, 200ms ease);
    }

    .filters-content {
      padding: var(--ds-spacing-md, 16px);
    }

    .filters-list {
      display: flex;
      flex-direction: column;
      gap: var(--ds-spacing-md, 16px);
      margin-bottom: var(--ds-spacing-md, 16px);
    }

    .filter-item {
      background-color: var(--theme-surface-variant);
      padding: var(--ds-spacing-sm, 8px);
      border-radius: var(--ds-radius-small, 4px);
    }

    .filter-row {
      display: flex;
      gap: var(--ds-spacing-sm, 8px);
      align-items: flex-start;
    }

    .filter-column {
      flex: 2;
    }

    .filter-operator {
      flex: 1.5;
    }

    .filter-value {
      flex: 2;
    }

    .filters-actions {
      display: flex;
      gap: var(--ds-spacing-sm, 8px);
      justify-content: flex-start;
    }

    .add-filter-btn,
    .clear-all-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--ds-spacing-xs, 4px);
      padding: 6px 12px;
      border: 1px solid var(--theme-outline);
      background-color: transparent;
      color: var(--theme-primary);
      border-radius: var(--ds-radius-small, 4px);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--ds-transition-normal, 200ms ease);
      font-family: inherit;
      outline: none;
    }

    .add-filter-btn:hover:not(:disabled),
    .clear-all-btn:hover:not(:disabled) {
      background-color: var(--theme-surface-variant);
      border-color: var(--theme-primary);
    }

    .add-filter-btn:active:not(:disabled),
    .clear-all-btn:active:not(:disabled) {
      background-color: var(--theme-primary-container);
    }

    .add-filter-btn:disabled,
    .clear-all-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .add-filter-btn mat-icon,
    .clear-all-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }

    .clear-all-btn {
      border: none;
      background-color: transparent;
      color: var(--theme-text-primary);
    }

    .clear-all-btn:hover:not(:disabled) {
      background-color: var(--theme-surface-variant);
    }

    mat-form-field {
      width: 100%;
    }
  `]
})
export class TableViewFiltersComponent implements OnInit, OnChanges, OnDestroy {
  @Input() availableColumns: Array<{ id: string; name: string }> = [];
  @Input() activeFilters: FilterCondition[] = [];
  @Input() expanded: boolean = false;

  @Output() filtersChanged = new EventEmitter<FilterCondition[]>();

  // Local copy of filters to avoid mutating @Input
  private localFilters: FilterCondition[] = [];
  private destroyed = false;
  private isEmitting = false; // Flag to prevent infinite loops

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Initialize local filters from input
    this.localFilters = this.activeFilters 
      ? this.activeFilters.map(f => ({ ...f }))
      : [];
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    // Clear local filters to prevent memory leaks
    this.localFilters = [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activeFilters'] && !this.isEmitting) {
      // Only update if the change came from outside (not from our own emit)
      const newFilters = changes['activeFilters'].currentValue 
        ? changes['activeFilters'].currentValue.map((f: FilterCondition) => ({ ...f }))
        : [];
      
      // Check if filters actually changed to avoid unnecessary updates
      const filtersChanged = JSON.stringify(this.localFilters) !== JSON.stringify(newFilters);
      
      if (filtersChanged) {
        this.localFilters = newFilters;
      }
    }
  }

  get filters(): FilterCondition[] {
    return this.localFilters;
  }

  addFilter(event?: MouseEvent): void {
    try {
      // Prevent event propagation to avoid memory leaks
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (this.destroyed || this.availableColumns.length === 0) {
        return;
      }

      const newFilter: FilterCondition = {
        columnId: this.availableColumns[0]?.id || '',
        columnName: this.availableColumns[0]?.name || '',
        operator: 'equals',
        value: ''
      };
      
      const updatedFilters = [...this.localFilters, newFilter];
      this.localFilters = updatedFilters;

      if (this.destroyed) {
        return;
      }

      this.isEmitting = true;
      this.filtersChanged.emit([...updatedFilters]);
      
      setTimeout(() => {
        this.isEmitting = false;
      }, 0);
    } catch (error: any) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  removeFilter(index: number, event?: MouseEvent): void {
    // Prevent event propagation to avoid memory leaks
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (index < 0 || index >= this.localFilters.length) {
      return;
    }
    
    try {
      // Create new array without the removed item
      const updatedFilters = this.localFilters.filter((_, i) => i !== index);
      this.localFilters = updatedFilters;
      
      // Emit the change immediately
      this.filtersChanged.emit([...updatedFilters]);
    } catch (error) {
    }
  }

  clearAll(event?: MouseEvent): void {
    // Prevent event propagation to avoid memory leaks
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      this.localFilters = [];
      
      // Emit the change immediately
      this.filtersChanged.emit([]);
    } catch (error) {
    }
  }

  onColumnChange(index: number, columnId: string): void {
    if (index < 0 || index >= this.localFilters.length) {
      return;
    }

    const column = this.availableColumns.find(c => c.id === columnId);
    if (column) {
      // Create new array with updated filter
      const updatedFilters = this.localFilters.map((filter, i) => 
        i === index 
          ? { ...filter, columnId: columnId, columnName: column.name }
          : filter
      );
      this.localFilters = updatedFilters;
      this.filtersChanged.emit(updatedFilters);
    }
  }

  onOperatorChange(index: number, operator: FilterCondition['operator']): void {
    if (index < 0 || index >= this.localFilters.length) {
      return;
    }

    // Create new array with updated filter
    const updatedFilters = this.localFilters.map((filter, i) => 
      i === index 
        ? { 
            ...filter, 
            operator: operator,
            value: this.isNoValueOperator(operator) ? '' : filter.value
          }
        : filter
    );
    this.localFilters = updatedFilters;
    this.filtersChanged.emit(updatedFilters);
  }

  onValueChange(index: number, event: Event): void {
    if (index < 0 || index >= this.localFilters.length) {
      return;
    }

    const value = (event.target as HTMLInputElement).value;
    
    // Create new array with updated filter
    const updatedFilters = this.localFilters.map((filter, i) => 
      i === index 
        ? { ...filter, value: value }
        : filter
    );
    this.localFilters = updatedFilters;
    this.filtersChanged.emit(updatedFilters);
  }

  isNoValueOperator(operator: string): boolean {
    return operator === 'is_empty' || operator === 'is_not_empty';
  }

  trackByFilterIndex(index: number, filter: FilterCondition): string {
    // Use a combination of index and columnId for stable tracking
    return `${index}-${filter.columnId}-${filter.operator}`;
  }
}

