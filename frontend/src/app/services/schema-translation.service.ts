import { Injectable } from '@angular/core';
import { Table, Relationship, RelationshipDisplayColumn, ProjectSchema } from '../models/table.model';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SQLTable {
  name: string;
  columns: SQLColumn[];
  constraints: SQLConstraint[];
}

export interface SQLColumn {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  isAutoIncrement: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

export interface SQLConstraint {
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK';
  name: string;
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SchemaTranslationService {

  constructor() { }

  /**
   * Convierte el schema JSON a SQL DDL
   */
  translateToSQL(schema: ProjectSchema): string {
    const tables = this.convertTablesToSQL(schema.tables);
    const relationships = this.convertRelationshipsToSQL(schema.relationships);
    
    let sql = '-- Generated SQL Schema\n\n';
    
    // Create tables
    tables.forEach(table => {
      sql += this.generateCreateTableSQL(table);
      sql += '\n\n';
    });
    
    // Add foreign key constraints
    relationships.forEach(rel => {
      sql += this.generateForeignKeySQL(rel);
      sql += '\n';
    });
    
    return sql;
  }

  /**
   * Convierte el schema JSON a TypeScript interfaces
   */
  translateToTypeScript(schema: ProjectSchema): string {
    let ts = '// Generated TypeScript Interfaces\n\n';
    
    schema.tables.forEach(table => {
      ts += this.generateTypeScriptInterface(table);
      ts += '\n\n';
    });
    
    return ts;
  }

  /**
   * Valida la integridad del schema
   */
  validateSchema(schema: ProjectSchema): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate tables
    schema.tables.forEach((table: Table) => {
      if (!table.name || table.name.trim() === '') {
        errors.push(`Table "${table.id}" has no name`);
      }
      
      if (!table.columns || table.columns.length === 0) {
        errors.push(`Table "${table.name}" has no columns`);
      }
      
      const primaryKeys = table.columns.filter((col: any) => col.isPrimaryKey);
      if (primaryKeys.length === 0) {
        errors.push(`Table "${table.name}" has no primary key`);
      } else if (primaryKeys.length > 1) {
        warnings.push(`Table "${table.name}" has multiple primary keys`);
      }
    });

    // Validate relationships
    schema.relationships.forEach((rel: Relationship) => {
      const fromTable = schema.tables.find((t: Table) => t.id === rel.fromTableId);
      const toTable = schema.tables.find((t: Table) => t.id === rel.toTableId);
      
      if (!fromTable) {
        errors.push(`Relationship "${rel.id}" references non-existent from table`);
      }
      
      if (!toTable) {
        errors.push(`Relationship "${rel.id}" references non-existent to table`);
      }
      
      if (fromTable && toTable) {
        const fromColumn = fromTable.columns.find((c: any) => c.id === rel.fromColumnId);
        const toColumn = toTable.columns.find((c: any) => c.id === rel.toColumnId);
        
        if (!fromColumn) {
          errors.push(`Relationship "${rel.id}" references non-existent from column`);
        }
        
        if (!toColumn) {
          errors.push(`Relationship "${rel.id}" references non-existent to column`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Genera datos de ejemplo basados en el schema
   */
  generateSampleData(schema: ProjectSchema): { [tableName: string]: any[] } {
    const sampleData: { [tableName: string]: any[] } = {};
    
    schema.tables.forEach(table => {
      sampleData[table.name] = this.generateTableSampleData(table, 5);
    });
    
    return sampleData;
  }

  private convertTablesToSQL(tables: Table[]): SQLTable[] {
    return tables.map((table: Table) => ({
      name: table.name,
      columns: table.columns.map((col: any) => ({
        name: col.name,
        type: this.mapColumnType(col.type),
        isPrimaryKey: col.isPrimaryKey,
        isNullable: col.isNullable,
        isUnique: col.isUnique,
        defaultValue: col.defaultValue,
        isAutoIncrement: col.isAutoIncrement || false,
        isForeignKey: col.isForeignKey || false,
        referencedTable: col.referencedTableId,
        referencedColumn: col.referencedColumnId
      })),
      constraints: this.generateTableConstraints(table)
    }));
  }

  private convertRelationshipsToSQL(relationships: Relationship[]): Relationship[] {
    return relationships.filter(rel => rel.type !== 'many-to-many');
  }

  private generateCreateTableSQL(table: SQLTable): string {
    let sql = `CREATE TABLE ${table.name} (\n`;
    
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      
      if (col.isPrimaryKey) {
        def += ' PRIMARY KEY';
      }
      
      if (col.isAutoIncrement) {
        def += ' AUTO_INCREMENT';
      }
      
      if (!col.isNullable) {
        def += ' NOT NULL';
      }
      
      if (col.isUnique) {
        def += ' UNIQUE';
      }
      
      if (col.defaultValue) {
        def += ` DEFAULT '${col.defaultValue}'`;
      }
      
      return def;
    });
    
    sql += columnDefs.join(',\n');
    sql += '\n);';
    
    return sql;
  }

  private generateForeignKeySQL(relationship: Relationship): string {
    return `ALTER TABLE ${relationship.toTableId} ADD CONSTRAINT fk_${relationship.id} 
            FOREIGN KEY (${relationship.toColumnId}) 
            REFERENCES ${relationship.fromTableId}(${relationship.fromColumnId});`;
  }

  private generateTypeScriptInterface(table: Table): string {
    let ts = `export interface ${this.toPascalCase(table.name)} {\n`;
    
    table.columns.forEach(col => {
      const tsType = this.mapToTypeScriptType(col.type);
      const optional = col.isNullable ? '?' : '';
      ts += `  ${col.name}${optional}: ${tsType};\n`;
    });
    
    ts += '}';
    return ts;
  }

  private generateTableConstraints(table: Table): SQLConstraint[] {
    const constraints: SQLConstraint[] = [];
    
    // Primary key constraint
    const primaryKeys = table.columns.filter(col => col.isPrimaryKey);
    if (primaryKeys.length > 0) {
      constraints.push({
        type: 'PRIMARY_KEY',
        name: `pk_${table.name}`,
        columns: primaryKeys.map(col => col.name)
      });
    }
    
    // Unique constraints
    const uniqueColumns = table.columns.filter(col => col.isUnique && !col.isPrimaryKey);
    uniqueColumns.forEach(col => {
      constraints.push({
        type: 'UNIQUE',
        name: `uk_${table.name}_${col.name}`,
        columns: [col.name]
      });
    });
    
    return constraints;
  }

  private generateTableSampleData(table: Table, count: number): any[] {
    const data: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const record: any = {};
      
      table.columns.forEach(col => {
        if (col.isPrimaryKey && col.isAutoIncrement) {
          record[col.name] = i + 1;
        } else if (col.isForeignKey) {
          // Generate foreign key values
          record[col.name] = Math.floor(Math.random() * 5) + 1;
        } else {
          record[col.name] = this.generateSampleValue(col);
        }
      });
      
      data.push(record);
    }
    
    return data;
  }

  private generateSampleValue(column: any): any {
    const type = column.type.toLowerCase();
    
    switch (type) {
      case 'varchar':
      case 'text':
      case 'string':
        return this.generateSampleString(column.name);
      case 'int':
      case 'integer':
      case 'number':
        return Math.floor(Math.random() * 1000);
      case 'boolean':
      case 'bool':
        return Math.random() > 0.5;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'datetime':
      case 'timestamp':
        return new Date().toISOString();
      case 'decimal':
      case 'float':
        return parseFloat((Math.random() * 100).toFixed(2));
      default:
        return `sample_${type}`;
    }
  }

  private generateSampleString(columnName: string): string {
    const name = columnName.toLowerCase();
    
    if (name.includes('email')) {
      return `user${Math.floor(Math.random() * 100)}@example.com`;
    } else if (name.includes('name')) {
      return `Sample ${columnName}`;
    } else if (name.includes('description')) {
      return `This is a sample description for ${columnName}`;
    } else {
      return `sample_${columnName}_${Math.floor(Math.random() * 100)}`;
    }
  }

  private mapColumnType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'number': 'INT',
      'integer': 'INT',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'decimal': 'DECIMAL(10,2)',
      'float': 'FLOAT'
    };
    
    return typeMap[type.toLowerCase()] || 'VARCHAR(255)';
  }

  private mapToTypeScriptType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'string',
      'text': 'string',
      'number': 'number',
      'integer': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'datetime': 'string',
      'decimal': 'number',
      'float': 'number'
    };
    
    return typeMap[type.toLowerCase()] || 'string';
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toUpperCase() : word.toUpperCase();
    }).replace(/\s+/g, '');
  }
}
