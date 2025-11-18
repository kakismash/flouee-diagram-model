import { Injectable, signal } from '@angular/core';

export interface ToolbarData {
  tableCount: number;
  relationshipCount: number;
  totalRecords: number;
  isValid: boolean;
  errors?: number;
  warnings?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToolbarDataService {
  private _data = signal<ToolbarData>({
    tableCount: 0,
    relationshipCount: 0,
    totalRecords: 0,
    isValid: true,
    errors: 0,
    warnings: 0
  });

  data = this._data.asReadonly();

  updateData(newData: Partial<ToolbarData>) {
    this._data.update(current => ({ ...current, ...newData }));
  }

  reset() {
    this._data.set({
      tableCount: 0,
      relationshipCount: 0,
      totalRecords: 0,
      isValid: true,
      errors: 0,
      warnings: 0
    });
  }
}
