import { Injectable, signal } from '@angular/core';

export interface ToolbarData {
  tableCount: number;
  relationshipCount: number;
  isValid: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToolbarDataService {
  private _data = signal<ToolbarData>({
    tableCount: 0,
    relationshipCount: 0,
    isValid: true
  });

  data = this._data.asReadonly();

  updateData(newData: Partial<ToolbarData>) {
    this._data.update(current => ({ ...current, ...newData }));
  }

  reset() {
    this._data.set({
      tableCount: 0,
      relationshipCount: 0,
      isValid: true
    });
  }
}
