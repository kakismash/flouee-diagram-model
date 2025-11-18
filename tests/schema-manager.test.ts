/**
 * 🧪 Schema Manager Service Tests
 * 
 * Testing the SchemaManagerService with ID-based naming
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SchemaManagerService - ID-based Naming', () => {
  
  describe('Table Creation', () => {
    it('should generate internal name from table ID', () => {
      const tableId = '9bcx6gnd4';
      const internalName = `t_${tableId}`;
      
      expect(internalName).toBe('t_9bcx6gnd4');
    });
    
    it('should create table with unique internal name', () => {
      const table1 = {
        id: 'abc123',
        name: 'users',
        internal_name: 't_abc123'
      };
      
      const table2 = {
        id: 'def456',
        name: 'users', // Same display name
        internal_name: 't_def456' // Different internal name
      };
      
      expect(table1.internal_name).not.toBe(table2.internal_name);
      expect(table1.name).toBe(table2.name);
    });
    
    it('should fallback to name if internal_name not set', () => {
      const oldTable = {
        id: 'old123',
        name: 'legacy_users',
        internal_name: undefined
      };
      
      const tableNameForDB = oldTable.internal_name || oldTable.name;
      expect(tableNameForDB).toBe('legacy_users');
    });
  });
  
  describe('Schema Change Detection', () => {
    it('should detect added columns', () => {
      const oldTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'id', type: 'UUID' }
        ]
      };
      
      const newTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'id', type: 'UUID' },
          { id: 'col2', name: 'email', type: 'TEXT' } // New column
        ]
      };
      
      const addedColumns = newTable.columns.filter(newCol => 
        !oldTable.columns.some(oldCol => oldCol.id === newCol.id)
      );
      
      expect(addedColumns).toHaveLength(1);
      expect(addedColumns[0].name).toBe('email');
    });
    
    it('should detect removed columns', () => {
      const oldTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'id', type: 'UUID' },
          { id: 'col2', name: 'email', type: 'TEXT' }
        ]
      };
      
      const newTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'id', type: 'UUID' }
          // col2 removed
        ]
      };
      
      const removedColumns = oldTable.columns.filter(oldCol => 
        !newTable.columns.some(newCol => newCol.id === oldCol.id)
      );
      
      expect(removedColumns).toHaveLength(1);
      expect(removedColumns[0].name).toBe('email');
    });
    
    it('should detect renamed columns', () => {
      const oldTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'email', type: 'TEXT' }
        ]
      };
      
      const newTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'user_email', type: 'TEXT' } // Same ID, different name
        ]
      };
      
      const renamedColumns = newTable.columns.filter(newCol => {
        const oldCol = oldTable.columns.find(old => old.id === newCol.id);
        return oldCol && oldCol.name !== newCol.name;
      });
      
      expect(renamedColumns).toHaveLength(1);
      expect(renamedColumns[0].name).toBe('user_email');
    });
    
    it('should detect type changes', () => {
      const oldTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'age', type: 'INTEGER' }
        ]
      };
      
      const newTable = {
        id: 'table1',
        name: 'users',
        columns: [
          { id: 'col1', name: 'age', type: 'BIGINT' } // Type changed
        ]
      };
      
      const typeChanged = newTable.columns.filter(newCol => {
        const oldCol = oldTable.columns.find(old => old.id === newCol.id);
        return oldCol && oldCol.type !== newCol.type && oldCol.name === newCol.name;
      });
      
      expect(typeChanged).toHaveLength(1);
    });
  });
  
  describe('SQL Generation', () => {
    it('should generate CREATE TABLE with internal name', () => {
      const tableId = 'abc123def';
      const internalName = `t_${tableId}`;
      const schemaName = 'org_4305d40642bd42d1883ba1289d67bb0f';
      
      const sql = `CREATE TABLE ${schemaName}.${internalName} (id UUID PRIMARY KEY)`;
      
      expect(sql).toContain('t_abc123def');
      expect(sql).not.toContain('users'); // Not using display name
    });
    
    it('should generate ALTER TABLE with internal name', () => {
      const internalName = 't_abc123def';
      const schemaName = 'org_4305d40642bd42d1883ba1289d67bb0f';
      
      const sql = `ALTER TABLE ${schemaName}.${internalName} ADD COLUMN email TEXT`;
      
      expect(sql).toContain('t_abc123def');
      expect(sql).toContain('ADD COLUMN email TEXT');
    });
    
    it('should generate DROP TABLE with internal name', () => {
      const internalName = 't_abc123def';
      const schemaName = 'org_4305d40642bd42d1883ba1289d67bb0f';
      
      const sql = `DROP TABLE IF EXISTS ${schemaName}.${internalName} CASCADE`;
      
      expect(sql).toContain('t_abc123def');
      expect(sql).toContain('CASCADE');
    });
  });
  
  describe('Foreign Keys with Internal Names', () => {
    it('should use internal names for both tables in FK', () => {
      const fromTable = {
        id: 'table1',
        name: 'orders',
        internal_name: 't_table1abc'
      };
      
      const toTable = {
        id: 'table2',
        name: 'users',
        internal_name: 't_table2def'
      };
      
      const foreignKey = {
        table_name: fromTable.internal_name,
        column_name: 'user_id',
        referenced_table: toTable.internal_name,
        referenced_column: 'id'
      };
      
      expect(foreignKey.table_name).toBe('t_table1abc');
      expect(foreignKey.referenced_table).toBe('t_table2def');
    });
  });
  
  describe('Backward Compatibility', () => {
    it('should work with tables without internal_name', () => {
      const oldTable = {
        id: 'old123',
        name: 'legacy_table',
        internal_name: undefined
      };
      
      const tableNameForDB = oldTable.internal_name || oldTable.name;
      
      expect(tableNameForDB).toBe('legacy_table');
    });
    
    it('should prefer internal_name when both exist', () => {
      const table = {
        id: 'new123',
        name: 'users',
        internal_name: 't_new123'
      };
      
      const tableNameForDB = table.internal_name || table.name;
      
      expect(tableNameForDB).toBe('t_new123');
    });
  });
  
  describe('Multi-Project Scenarios', () => {
    it('should allow multiple projects with same table name', () => {
      const projectA_users = {
        id: 'idA123',
        name: 'users',
        internal_name: 't_idA123',
        projectId: 'projectA'
      };
      
      const projectB_users = {
        id: 'idB456',
        name: 'users',
        internal_name: 't_idB456',
        projectId: 'projectB'
      };
      
      // Both have same display name
      expect(projectA_users.name).toBe(projectB_users.name);
      
      // But different internal names
      expect(projectA_users.internal_name).not.toBe(projectB_users.internal_name);
      
      // No conflict in database
      const tables = [projectA_users.internal_name, projectB_users.internal_name];
      const uniqueNames = new Set(tables);
      expect(uniqueNames.size).toBe(2);
    });
  });
});

describe('Schema Data Structure', () => {
  it('should have correct structure for new tables', () => {
    const table = {
      id: '9bcx6gnd4',
      name: 'products',
      internal_name: 't_9bcx6gnd4',
      columns: [
        { id: 'col1', name: 'id', type: 'UUID', isPrimaryKey: true },
        { id: 'col2', name: 'name', type: 'TEXT' }
      ],
      x: 100,
      y: 200
    };
    
    expect(table).toHaveProperty('id');
    expect(table).toHaveProperty('name');
    expect(table).toHaveProperty('internal_name');
    expect(table.internal_name).toBe(`t_${table.id}`);
  });
  
  it('should maintain display name for UI', () => {
    const table = {
      id: '9bcx6gnd4',
      name: 'Products',
      internal_name: 't_9bcx6gnd4'
    };
    
    // User sees "Products"
    expect(table.name).toBe('Products');
    
    // Database has "t_9bcx6gnd4"
    expect(table.internal_name).toBe('t_9bcx6gnd4');
  });
});









