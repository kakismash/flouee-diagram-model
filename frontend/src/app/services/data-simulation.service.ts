import { Injectable } from '@angular/core';
import { Table, Relationship, ProjectSchema } from '../models/table.model';
import { SmartDataGeneratorService, TableContext } from './smart-data-generator.service';

export interface TableData {
  [tableName: string]: any[];
}

export interface DataOperation {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  table: string;
  data?: any;
  id?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DataSimulationService {
  private data: TableData = {};
  private operations: DataOperation[] = [];

  constructor(
    private smartDataGenerator: SmartDataGeneratorService
  ) { }

  /**
   * Inicializa datos simulados para un schema
   */
  initializeData(schema: ProjectSchema): TableData {
    this.data = {};
    this.operations = [];
    
    schema.tables.forEach((table: Table) => {
      this.data[table.name] = this.generateRealisticData(table, 10);
    });
    
    // Resolver relaciones
    this.resolveRelationships(schema);
    
    return this.data;
  }

  /**
   * Genera datos realistas para una tabla
   */
  generateRealisticData(table: Table, count: number): any[] {
    const data: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const record: any = {};
      
      table.columns.forEach(col => {
        if (col.isPrimaryKey && col.isAutoIncrement) {
          record[col.name] = i + 1;
        } else if (col.isForeignKey) {
          // Los foreign keys se resolverán después
          record[col.name] = null;
        } else {
          record[col.name] = this.generateSmartValue(table, col, i);
        }
      });
      
      data.push(record);
    }
    
    return data;
  }

  /**
   * Resuelve las relaciones entre tablas
   */
  resolveRelationships(schema: ProjectSchema): void {
    schema.relationships.forEach((rel: Relationship) => {
      const fromTable = schema.tables.find((t: Table) => t.id === rel.fromTableId);
      const toTable = schema.tables.find((t: Table) => t.id === rel.toTableId);
      
      if (fromTable && toTable) {
        const fromData = this.data[fromTable.name];
        const toData = this.data[toTable.name];
        
        if (fromData && toData) {
          this.resolveRelationshipData(fromData, toData, rel, fromTable, toTable);
        }
      }
    });
  }

  /**
   * Simula operaciones CRUD
   */
  createRecord(tableName: string, data: any): any {
    const tableData = this.data[tableName];
    if (!tableData) return null;
    
    const newRecord = {
      ...data,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    tableData.push(newRecord);
    
    this.operations.push({
      type: 'CREATE',
      table: tableName,
      data: newRecord,
      timestamp: new Date()
    });
    
    return newRecord;
  }

  updateRecord(tableName: string, id: string, data: any): any {
    const tableData = this.data[tableName];
    if (!tableData) return null;
    
    const index = tableData.findIndex(record => record.id === id);
    if (index === -1) return null;
    
    const updatedRecord = {
      ...tableData[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    
    tableData[index] = updatedRecord;
    
    this.operations.push({
      type: 'UPDATE',
      table: tableName,
      data: updatedRecord,
      id,
      timestamp: new Date()
    });
    
    return updatedRecord;
  }

  deleteRecord(tableName: string, id: string): boolean {
    const tableData = this.data[tableName];
    if (!tableData) return false;
    
    const index = tableData.findIndex(record => record.id === id);
    if (index === -1) return false;
    
    tableData.splice(index, 1);
    
    this.operations.push({
      type: 'DELETE',
      table: tableName,
      id,
      timestamp: new Date()
    });
    
    return true;
  }

  getTableData(tableName: string): any[] {
    return this.data[tableName] || [];
  }

  getAllData(): TableData {
    return { ...this.data };
  }

  getOperations(): DataOperation[] {
    return [...this.operations];
  }

  /**
   * Obtiene datos relacionados para una tabla
   */
  getRelatedData(tableName: string, recordId: string, schema: ProjectSchema): { [relationName: string]: any[] } {
    const relatedData: { [relationName: string]: any[] } = {};
    
    schema.relationships.forEach((rel: Relationship) => {
      const fromTable = schema.tables.find((t: Table) => t.id === rel.fromTableId);
      const toTable = schema.tables.find((t: Table) => t.id === rel.toTableId);
      
      if (fromTable && toTable) {
        if (fromTable.name === tableName) {
          // Relación hacia otra tabla
          const toData = this.data[toTable.name];
          if (toData) {
            const related = toData.filter(record => 
              record[rel.toColumnId] === recordId
            );
            relatedData[toTable.name] = related;
          }
        } else if (toTable.name === tableName) {
          // Relación desde otra tabla
          const fromData = this.data[fromTable.name];
          if (fromData) {
            const record = fromData.find(r => r.id === recordId);
            if (record) {
              const related = fromData.filter(r => 
                r[rel.fromColumnId] === record[rel.fromColumnId]
              );
              relatedData[fromTable.name] = related;
            }
          }
        }
      }
    });
    
    return relatedData;
  }

  private resolveRelationshipData(
    fromData: any[], 
    toData: any[], 
    rel: Relationship, 
    fromTable: Table, 
    toTable: Table
  ): void {
    const fromColumn = fromTable.columns.find(c => c.id === rel.fromColumnId);
    const toColumn = toTable.columns.find(c => c.id === rel.toColumnId);
    
    if (!fromColumn || !toColumn) return;
    
    // Para relaciones 1:1 y 1:N, asignar foreign keys
    if (rel.type === 'one-to-one' || rel.type === 'one-to-many') {
      toData.forEach((toRecord, index) => {
        if (toRecord[toColumn.name] === null) {
          const fromRecord = fromData[index % fromData.length];
          toRecord[toColumn.name] = fromRecord[fromColumn.name];
        }
      });
    }
    
    // Para relaciones N:N, crear tabla intermedia (simulada)
    if (rel.type === 'many-to-many') {
      this.createManyToManyData(fromData, toData, rel, fromTable, toTable);
    }
  }

  private createManyToManyData(
    fromData: any[], 
    toData: any[], 
    rel: Relationship, 
    fromTable: Table, 
    toTable: Table
  ): void {
    const junctionTableName = `${fromTable.name}_${toTable.name}`;
    const junctionData: any[] = [];
    
    // Crear relaciones aleatorias
    fromData.forEach(fromRecord => {
      const numRelations = Math.floor(Math.random() * 3) + 1; // 1-3 relaciones
      const selectedToRecords = this.getRandomRecords(toData, numRelations);
      
      selectedToRecords.forEach(toRecord => {
        junctionData.push({
          id: this.generateId(),
          [`${fromTable.name}_id`]: fromRecord.id,
          [`${toTable.name}_id`]: toRecord.id,
          created_at: new Date().toISOString()
        });
      });
    });
    
    this.data[junctionTableName] = junctionData;
  }

  private generateSmartValue(table: Table, column: any, index: number): any {
    const context: TableContext = {
      tableName: table.name,
      columnName: column.name,
      columnType: column.type,
      index: index
    };
    
    return this.smartDataGenerator.generateSmartData(context);
  }

  private getRandomRecords(array: any[], count: number): any[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
