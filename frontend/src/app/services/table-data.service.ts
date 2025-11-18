import { Injectable } from '@angular/core';
import { Table, TableColumn } from '../models/table.model';

export interface DataChangeEvent {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'SCHEMA_UPDATE';
  table: string;
  data: any;
  id?: string;
  schemaUpdate?: any;
}

@Injectable({
  providedIn: 'root'
})
export class TableDataService {

  constructor() { }

  /**
   * Generates a unique ID for new records
   */
  generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Creates a new record with default values
   */
  createRecord(table: Table, existingData: any[]): any {
    const newRecord: any = { id: this.generateId() };
    
    table.columns.forEach(col => {
      if (col.isAutoIncrement) {
        newRecord[col.name] = this.generateId();
      } else if (col.defaultValue) {
        newRecord[col.name] = col.defaultValue;
      }
    });
    
    return newRecord;
  }

  /**
   * Prepares a data change event for record creation
   */
  prepareCreateEvent(table: Table, newRecord: any): DataChangeEvent {
    return {
      type: 'CREATE',
      table: table.name,
      data: newRecord
    };
  }

  /**
   * Prepares a data change event for record update
   */
  prepareUpdateEvent(table: Table, element: any, columnName: string, newValue: any): DataChangeEvent {
    // Remove 'reg_' prefix if present
    const cleanColumnName = columnName.replace('reg_', '');
    
    return {
      type: 'UPDATE',
      table: table.name,
      data: { ...element, [cleanColumnName]: newValue },
      id: element.id
    };
  }

  /**
   * Prepares a data change event for record deletion
   */
  prepareDeleteEvent(table: Table, element: any): DataChangeEvent {
    return {
      type: 'DELETE',
      table: table.name,
      data: element,
      id: element.id
    };
  }

  /**
   * Prepares a data change event for column rename
   */
  prepareSchemaUpdateEvent(table: Table, columnId: string, newName: string): DataChangeEvent {
    return {
      type: 'SCHEMA_UPDATE',
      table: table.name,
      data: null,
      schemaUpdate: { type: 'rename_column', columnId, newName }
    };
  }

}
