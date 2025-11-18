import { Injectable, signal } from '@angular/core';
import { Table, TableColumn } from '../models/table.model';

export interface FilterCondition {
  columnId: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'startsWith' | 'endsWith';
  value: any;
}

export interface SortColumn {
  columnId: string;
  direction: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class TableFilterSortService {
  private _activeFilters = signal<FilterCondition[]>([]);
  private _sortColumns = signal<SortColumn[]>([]);

  readonly activeFilters = this._activeFilters.asReadonly();
  readonly sortColumns = this._sortColumns.asReadonly();

  constructor() { }

  /**
   * Sets the active filters
   */
  setFilters(filters: FilterCondition[]): void {
    this._activeFilters.set(filters);
  }

  /**
   * Sets the sort columns
   */
  setSortColumns(sorts: SortColumn[]): void {
    this._sortColumns.set(sorts);
  }

  /**
   * Clears all filters
   */
  clearFilters(): void {
    this._activeFilters.set([]);
  }

  /**
   * Clears all sorts
   */
  clearSorts(): void {
    this._sortColumns.set([]);
  }

  /**
   * Gets available columns for filters
   */
  getAvailableColumnsForFilters(table: Table): Array<{ id: string; name: string }> {
    return table.columns.map(col => ({
      id: col.id,
      name: col.name
    }));
  }

  /**
   * Applies filters to data
   */
  applyFilters(data: any[], table: Table, filters: FilterCondition[]): any[] {
    if (filters.length === 0) {
      return data;
    }

    return data.filter(item => {
      return filters.every(filter => {
        const column = table.columns.find(c => c.id === filter.columnId);
        if (!column) {
          return true;
        }

        const itemValue = item[column.name];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return itemValue === filterValue;
          case 'contains':
            return String(itemValue || '').toLowerCase().includes(String(filterValue || '').toLowerCase());
          case 'greaterThan':
            return Number(itemValue) > Number(filterValue);
          case 'lessThan':
            return Number(itemValue) < Number(filterValue);
          case 'startsWith':
            return String(itemValue || '').toLowerCase().startsWith(String(filterValue || '').toLowerCase());
          case 'endsWith':
            return String(itemValue || '').toLowerCase().endsWith(String(filterValue || '').toLowerCase());
          default:
            return true;
        }
      });
    });
  }

  /**
   * Applies sorting to data
   */
  applySorting(data: any[], table: Table, sortColumns: SortColumn[]): any[] {
    if (sortColumns.length === 0) {
      return data;
    }

    // Create a copy to avoid mutating original
    let sortedData = [...data];

    // Apply sorts in reverse order (last sort has highest priority)
    for (let i = sortColumns.length - 1; i >= 0; i--) {
      const sort = sortColumns[i];
      const column = table.columns.find(c => c.id === sort.columnId);
      
      if (!column) {
        continue;
      }

      sortedData.sort((a, b) => {
        const aVal = a[column.name];
        const bVal = b[column.name];
        
        // Handle null/undefined
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // Compare values
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return sortedData;
  }

  /**
   * Applies both filters and sorting to data
   */
  applyFiltersAndSort(data: any[], table: Table): any[] {
    const filtered = this.applyFilters(data, table, this._activeFilters());
    return this.applySorting(filtered, table, this._sortColumns());
  }
}
