import { TableView } from './table-view.model';

export interface TableColumn {
  id: string;
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  constraints?: string[];
  // Primary Key specific options
  isAutoIncrement?: boolean; // For SERIAL, INTEGER, BIGINT
  isAutoGenerate?: boolean;  // For UUID
  // System generated flags
  isSystemGenerated?: boolean; // Auto-generated columns (id, foreign keys)
  isForeignKey?: boolean;      // Marks this as a FK
  referencedTableId?: string;  // Points to which table
  referencedColumnId?: string; // Points to which column
}

export interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columns: TableColumn[];
  tenantId?: string;
}

export interface Relationship {
  id: string;
  fromTableId: string;
  toTableId: string;
  fromColumnId: string;
  toColumnId: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  name?: string; // Optional name for the relationship
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  tenantId?: string;
  // Display configuration for relationship columns
  displayColumnId?: string; // Which column from the source table to display
  displayColumnName?: string; // Custom display name for the relationship column
}

export interface RelationshipDisplayField {
  sourceColumnId: string; // The column being displayed from the source table
  displayName: string; // The name shown in the table card
  isVisible: boolean;
}

export interface ColumnColor {
  name: string;
  value: string;
  borderColor: string;
  backgroundColor: string;
}

export interface RelationshipDisplayColumn {
  id: string;
  relationshipId: string;
  tableId: string; // The table that will display this relationship column
  sourceTableId: string; // The table being referenced
  fields: RelationshipDisplayField[]; // Multiple fields to display
  isVisible: boolean;
  color?: ColumnColor; // Color for all columns in this relationship
}

export interface Diagram {
  id: string;
  name: string;
  tables: Table[];
  relationships: Relationship[];
  relationshipDisplayColumns: RelationshipDisplayColumn[];
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectSchema {
  tables: Table[];
  relationships: Relationship[];
  relationshipDisplayColumns: RelationshipDisplayColumn[];
  tableViews?: { [tableId: string]: TableView[] };
}
