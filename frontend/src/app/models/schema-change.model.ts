export interface SchemaChange {
  type: 'add_table' | 'drop_table' | 'add_column' | 'drop_column' | 'add_foreign_key' | 'drop_foreign_key' |
        'add_unique_constraint' | 'drop_unique_constraint' | 'alter_column_default' | 'alter_column_nullable' |
        'rename_column' | 'alter_column_type';
  table?: any;
  table_name?: string;
  column?: any;
  column_name?: string;
  old_name?: string;
  new_name?: string;
  new_type?: string;
  foreign_key?: {
    table_name: string;
    table_internal_name?: string;
    column_name: string;
    column_internal_name?: string;
    column_id?: string;
    referenced_table: string;
    referenced_table_internal_name?: string;
    referenced_column: string;
    referenced_column_internal_name?: string;
    referenced_column_id?: string;
    constraint_name: string;
    on_delete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    on_update?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
  relationship?: any;
  new_default?: any;
  old_default?: any;
  nullable?: boolean;
  constraint_type?: string;
}
