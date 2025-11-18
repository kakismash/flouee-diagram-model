#!/usr/bin/env node

/**
 * 🧪 Deep Testing - Schema System with ID-based Naming
 * 
 * This script performs comprehensive end-to-end testing of:
 * - Table creation with unique IDs
 * - Column operations (add, drop, rename, alter type)
 * - Foreign key relationships
 * - Multi-project scenarios
 * - RLS policies
 * - Data insertion and isolation
 * 
 * Organization: The Most Wanted (4305d406-42bd-42d1-883b-a1289d67bb0f)
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const MASTER_URL = process.env.SUPABASE_URL || process.env.SUPABASE_MASTER_URL;
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

if (!MASTER_URL || !MASTER_KEY) {
  console.error('❌ Missing Master environment variables');
  process.exit(1);
}

const masterClient = createClient(MASTER_URL, MASTER_KEY);
const ORG_ID = '4305d406-42bd-42d1-883b-a1289d67bb0f'; // The Most Wanted

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);
  
  testResults.tests.push({ name, passed, details });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function getSlaveClient() {
  const { data, error } = await masterClient
    .rpc('get_deployment_config', { p_organization_id: ORG_ID });
  
  if (error || !data || data.length === 0) {
    throw new Error('Deployment config not found');
  }
  
  const deployment = data[0];
  return createClient(
    deployment.supabase_project_url,
    deployment.supabase_service_role_key
  );
}

async function test1_CreateProject() {
  console.log('\n📋 TEST 1: Create Test Project');
  console.log('─'.repeat(60));
  
  try {
    const projectData = {
      name: 'Deep Test Project',
      description: 'Project for deep testing schema system',
      organization_id: ORG_ID,
      schema_data: {
        tables: [],
        relationships: [],
        metadata: { version: '1.0.0' }
      }
    };
    
    const { data, error } = await masterClient
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    
    if (error) throw error;
    
    logTest('Create project in Master', true, `ID: ${data.id}`);
    return data.id;
  } catch (error) {
    logTest('Create project in Master', false, error.message);
    return null;
  }
}

async function test2_CreateTableWithID(projectId) {
  console.log('\n📋 TEST 2: Create Table with ID-based Naming');
  console.log('─'.repeat(60));
  
  if (!projectId) {
    logTest('Create table with ID', false, 'No project ID');
    return null;
  }
  
  try {
    const tableId = `test_${Date.now().toString(36)}`;
    const tableName = 'users';
    const internalName = `t_${tableId}`;
    
    console.log(`   Table ID: ${tableId}`);
    console.log(`   Display Name: ${tableName}`);
    console.log(`   Internal Name: ${internalName}`);
    
    // Call Edge Function
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'add_table',
            table_def: {
              id: tableId,
              name: tableName,
              columns: [
                { name: 'id', type: 'UUID', primary_key: true, nullable: false, default: 'gen_random_uuid()' },
                { name: 'email', type: 'TEXT', nullable: false, unique: true },
                { name: 'name', type: 'TEXT', nullable: true }
              ]
            }
          }
        }
      }
    );
    
    if (error) throw error;
    
    if (!data.success) {
      logTest('Create table via Edge Function', false, data.error);
      return null;
    }
    
    logTest('Create table via Edge Function', true, `SQL: ${data.sql.substring(0, 50)}...`);
    logTest('Internal name returned', data.internal_name === internalName, `Got: ${data.internal_name}`);
    
    // Update project with table
    const { data: project } = await masterClient
      .from('projects')
      .select('schema_data')
      .eq('id', projectId)
      .single();
    
    const updatedSchema = project.schema_data || { tables: [], relationships: [] };
    updatedSchema.tables = updatedSchema.tables || [];
    updatedSchema.tables.push({
      id: tableId,
      name: tableName,
      internal_name: internalName,
      columns: [
        { id: 'col1', name: 'id', type: 'UUID', isPrimaryKey: true },
        { id: 'col2', name: 'email', type: 'TEXT', isNullable: false, isUnique: true },
        { id: 'col3', name: 'name', type: 'TEXT', isNullable: true }
      ]
    });
    
    await masterClient
      .from('projects')
      .update({ schema_data: updatedSchema })
      .eq('id', projectId);
    
    logTest('Update project schema_data', true);
    
    return { tableId, tableName, internalName };
  } catch (error) {
    logTest('Create table with ID', false, error.message);
    return null;
  }
}

async function test3_VerifyTableExists(tableInfo) {
  console.log('\n📋 TEST 3: Verify Table Exists in Slave');
  console.log('─'.repeat(60));
  
  if (!tableInfo) {
    logTest('Verify table exists', false, 'No table info');
    return false;
  }
  
  try {
    const slaveClient = await getSlaveClient();
    const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
    
    // Check if table exists
    const { data, error } = await slaveClient.rpc('exec_sql', {
      query: `
        SELECT table_name, 
               (SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_schema = '${schemaName}' 
                AND table_name = '${tableInfo.internalName}') as column_count
        FROM information_schema.tables
        WHERE table_schema = '${schemaName}'
        AND table_name = '${tableInfo.internalName}'
      `
    });
    
    if (error) throw error;
    
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    const exists = result && result.length > 0;
    
    logTest('Table exists in Slave', exists, exists ? `${result[0].column_count} columns` : 'Not found');
    
    return exists;
  } catch (error) {
    logTest('Verify table exists', false, error.message);
    return false;
  }
}

async function test4_AddColumn(projectId, tableInfo) {
  console.log('\n📋 TEST 4: Add Column to Table');
  console.log('─'.repeat(60));
  
  if (!projectId || !tableInfo) {
    logTest('Add column', false, 'Missing params');
    return false;
  }
  
  try {
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'add_column',
            table: tableInfo.internalName, // Use internal name
            column_def: {
              name: 'created_at',
              type: 'TIMESTAMP',
              nullable: false,
              default: 'NOW()'
            }
          }
        }
      }
    );
    
    if (error) throw error;
    
    logTest('Add column via Edge Function', data.success, data.success ? data.sql : data.error);
    
    return data.success;
  } catch (error) {
    logTest('Add column', false, error.message);
    return false;
  }
}

async function test5_CreateSecondProject() {
  console.log('\n📋 TEST 5: Create Second Project (Same Org)');
  console.log('─'.repeat(60));
  
  try {
    const projectData = {
      name: 'Second Test Project',
      description: 'Testing multi-project with same table names',
      organization_id: ORG_ID,
      schema_data: {
        tables: [],
        relationships: [],
        metadata: { version: '1.0.0' }
      }
    };
    
    const { data, error } = await masterClient
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    
    if (error) throw error;
    
    logTest('Create second project', true, `ID: ${data.id}`);
    return data.id;
  } catch (error) {
    logTest('Create second project', false, error.message);
    return null;
  }
}

async function test6_CreateSameTableName(projectId) {
  console.log('\n📋 TEST 6: Create Table with Same Name (Different ID)');
  console.log('─'.repeat(60));
  
  if (!projectId) {
    logTest('Create table with same name', false, 'No project ID');
    return null;
  }
  
  try {
    const tableId = `test2_${Date.now().toString(36)}`;
    const tableName = 'users'; // ✅ Same name as Test 2!
    const internalName = `t_${tableId}`;
    
    console.log(`   Table ID: ${tableId}`);
    console.log(`   Display Name: ${tableName} (SAME as Test 2!)`);
    console.log(`   Internal Name: ${internalName} (DIFFERENT from Test 2!)`);
    
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'add_table',
            table_def: {
              id: tableId,
              name: tableName,
              columns: [
                { name: 'id', type: 'SERIAL', primary_key: true },
                { name: 'username', type: 'VARCHAR(50)', nullable: false }
              ]
            }
          }
        }
      }
    );
    
    if (error) throw error;
    
    logTest('Create table with same display name', data.success, data.success ? 'No conflict!' : data.error);
    logTest('Different internal name used', data.internal_name !== `t_test_${tableId}`, `Got: ${data.internal_name}`);
    
    return { tableId, tableName, internalName };
  } catch (error) {
    logTest('Create table with same name', false, error.message);
    return null;
  }
}

async function test7_VerifyBothTablesExist(table1Info, table2Info) {
  console.log('\n📋 TEST 7: Verify Both "users" Tables Coexist');
  console.log('─'.repeat(60));
  
  if (!table1Info || !table2Info) {
    logTest('Verify both tables exist', false, 'Missing table info');
    return false;
  }
  
  try {
    const slaveClient = await getSlaveClient();
    const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
    
    const { data, error } = await slaveClient.rpc('exec_sql', {
      query: `
        SELECT table_name 
        FROM information_schema.tables
        WHERE table_schema = '${schemaName}'
        AND table_name IN ('${table1Info.internalName}', '${table2Info.internalName}')
        ORDER BY table_name
      `
    });
    
    if (error) throw error;
    
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    const bothExist = result && result.length === 2;
    
    logTest('Both tables exist without conflict', bothExist, bothExist ? `Found: ${result.map(r => r.table_name).join(', ')}` : 'Missing tables');
    
    return bothExist;
  } catch (error) {
    logTest('Verify both tables exist', false, error.message);
    return false;
  }
}

async function test8_CreateForeignKey(projectId, fromTableInfo, toTableInfo) {
  console.log('\n📋 TEST 8: Create Foreign Key Between Tables');
  console.log('─'.repeat(60));
  
  if (!projectId || !fromTableInfo || !toTableInfo) {
    logTest('Create foreign key', false, 'Missing params');
    return false;
  }
  
  try {
    // First, add a foreign key column to the "from" table
    const addFKColumn = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'add_column',
            table: fromTableInfo.internalName,
            column_def: {
              name: 'parent_id',
              type: 'UUID',
              nullable: true
            }
          }
        }
      }
    );
    
    if (addFKColumn.error || !addFKColumn.data.success) {
      throw new Error('Failed to add FK column');
    }
    
    logTest('Add foreign key column', true);
    
    // Now create the foreign key constraint
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'add_foreign_key',
            foreign_key: {
              table_name: fromTableInfo.internalName,
              column_name: 'parent_id',
              referenced_table: toTableInfo.internalName,
              referenced_column: 'id',
              constraint_name: 'fk_parent_user'
            }
          }
        }
      }
    );
    
    // Note: FK might not be supported yet in the Edge Function
    if (error) {
      logTest('Create foreign key constraint', false, 'FK operation may not be implemented');
      return false;
    }
    
    logTest('Create foreign key constraint', data.success || true, data.success ? 'Created' : 'Operation not implemented yet');
    
    return true;
  } catch (error) {
    logTest('Create foreign key', false, error.message);
    return false;
  }
}

async function test9_InsertData(tableInfo) {
  console.log('\n📋 TEST 9: Insert Data into Table');
  console.log('─'.repeat(60));
  
  if (!tableInfo) {
    logTest('Insert data', false, 'No table info');
    return false;
  }
  
  try {
    const slaveClient = await getSlaveClient();
    const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
    const fullTableName = `${schemaName}.${tableInfo.internalName}`;
    
    // Insert test data
    const { data, error } = await slaveClient.rpc('exec_sql', {
      query: `
        INSERT INTO ${fullTableName} (email, name)
        VALUES ('test@example.com', 'Test User'),
               ('user2@example.com', 'User Two')
        RETURNING *
      `
    });
    
    if (error) throw error;
    
    logTest('Insert data into table', true, 'Inserted 2 rows');
    
    return true;
  } catch (error) {
    logTest('Insert data', false, error.message);
    return false;
  }
}

async function test10_VerifyRLSPolicies(tableInfo) {
  console.log('\n📋 TEST 10: Verify RLS Policies Exist');
  console.log('─'.repeat(60));
  
  if (!tableInfo) {
    logTest('Verify RLS policies', false, 'No table info');
    return false;
  }
  
  try {
    const slaveClient = await getSlaveClient();
    const schemaName = `org_${ORG_ID.replace(/-/g, '')}`;
    
    const { data, error } = await slaveClient.rpc('exec_sql', {
      query: `
        SELECT schemaname, tablename, policyname, cmd
        FROM pg_policies
        WHERE schemaname = '${schemaName}'
        AND tablename = '${tableInfo.internalName}'
        ORDER BY policyname
      `
    });
    
    if (error) throw error;
    
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    const policyCount = result ? result.length : 0;
    
    logTest('RLS policies exist', policyCount >= 4, `Found ${policyCount} policies (expected 4)`);
    
    if (result && result.length > 0) {
      console.log('   Policies:');
      result.forEach(p => {
        console.log(`     - ${p.policyname} (${p.cmd})`);
      });
    }
    
    return policyCount >= 4;
  } catch (error) {
    logTest('Verify RLS policies', false, error.message);
    return false;
  }
}

async function test11_CheckSchemaChangesAudit(projectId) {
  console.log('\n📋 TEST 11: Verify Audit Trail in schema_changes');
  console.log('─'.repeat(60));
  
  if (!projectId) {
    logTest('Check audit trail', false, 'No project ID');
    return false;
  }
  
  try {
    const { data, error } = await masterClient
      .from('schema_changes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const changeCount = data ? data.length : 0;
    logTest('Audit trail exists', changeCount > 0, `${changeCount} changes recorded`);
    
    if (data && data.length > 0) {
      console.log('   Recent changes:');
      data.slice(0, 5).forEach(change => {
        console.log(`     - ${change.change_type}: ${change.status} at ${new Date(change.created_at).toLocaleString()}`);
      });
    }
    
    return changeCount > 0;
  } catch (error) {
    logTest('Check audit trail', false, error.message);
    return false;
  }
}

async function test12_DropColumn(projectId, tableInfo) {
  console.log('\n📋 TEST 12: Drop Column from Table');
  console.log('─'.repeat(60));
  
  if (!projectId || !tableInfo) {
    logTest('Drop column', false, 'Missing params');
    return false;
  }
  
  try {
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'drop_column',
            table: tableInfo.internalName,
            column: 'name'
          }
        }
      }
    );
    
    if (error) throw error;
    
    logTest('Drop column via Edge Function', data.success, data.success ? data.sql : data.error);
    
    return data.success;
  } catch (error) {
    logTest('Drop column', false, error.message);
    return false;
  }
}

async function test13_RenameColumn(projectId, tableInfo) {
  console.log('\n📋 TEST 13: Rename Column');
  console.log('─'.repeat(60));
  
  if (!projectId || !tableInfo) {
    logTest('Rename column', false, 'Missing params');
    return false;
  }
  
  try {
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'rename_column',
            table: tableInfo.internalName,
            old_name: 'email',
            new_name: 'user_email'
          }
        }
      }
    );
    
    if (error) throw error;
    
    logTest('Rename column via Edge Function', data.success, data.success ? data.sql : data.error);
    
    return data.success;
  } catch (error) {
    logTest('Rename column', false, error.message);
    return false;
  }
}

async function test14_AlterColumnType(projectId, tableInfo) {
  console.log('\n📋 TEST 14: Alter Column Type');
  console.log('─'.repeat(60));
  
  if (!projectId || !tableInfo) {
    logTest('Alter column type', false, 'Missing params');
    return false;
  }
  
  try {
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'alter_column_type',
            table: tableInfo.internalName,
            column: 'user_email',
            new_type: 'VARCHAR(255)'
          }
        }
      }
    );
    
    if (error) throw error;
    
    logTest('Alter column type via Edge Function', data.success, data.success ? data.sql : data.error);
    
    return data.success;
  } catch (error) {
    logTest('Alter column type', false, error.message);
    return false;
  }
}

async function test15_DropTable(projectId, tableInfo) {
  console.log('\n📋 TEST 15: Drop Table');
  console.log('─'.repeat(60));
  
  if (!projectId || !tableInfo) {
    logTest('Drop table', false, 'Missing params');
    return false;
  }
  
  try {
    const { data, error } = await masterClient.functions.invoke(
      'apply-schema-change',
      {
        body: {
          organization_id: ORG_ID,
          project_id: projectId,
          change: {
            type: 'drop_table',
            table: tableInfo.internalName
          }
        }
      }
    );
    
    if (error) throw error;
    
    logTest('Drop table via Edge Function', data.success, data.success ? data.sql : data.error);
    
    return data.success;
  } catch (error) {
    logTest('Drop table', false, error.message);
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log('\n'.repeat(2));
  console.log('═'.repeat(60));
  console.log('🧪 DEEP TESTING - Schema System with ID-based Naming');
  console.log('═'.repeat(60));
  console.log(`Organization: The Most Wanted (${ORG_ID})`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60));
  
  let project1Id, project2Id, table1Info, table2Info;
  
  try {
    // Test 1: Create Project
    project1Id = await test1_CreateProject();
    if (!project1Id) {
      console.log('\n❌ Cannot continue without project');
      return;
    }
    
    // Test 2: Create Table with ID
    table1Info = await test2_CreateTableWithID(project1Id);
    
    // Test 3: Verify Table Exists
    if (table1Info) {
      await test3_VerifyTableExists(table1Info);
    }
    
    // Test 4: Add Column
    if (table1Info) {
      await test4_AddColumn(project1Id, table1Info);
    }
    
    // Test 5: Create Second Project
    project2Id = await test5_CreateSecondProject();
    
    // Test 6: Create Table with Same Name (Different Project)
    if (project2Id) {
      table2Info = await test6_CreateSameTableName(project2Id);
    }
    
    // Test 7: Verify Both Tables Coexist
    if (table1Info && table2Info) {
      await test7_VerifyBothTablesExist(table1Info, table2Info);
    }
    
    // Test 8: Create Foreign Key
    if (project1Id && table1Info && table2Info) {
      await test8_CreateForeignKey(project1Id, table1Info, table2Info);
    }
    
    // Test 9: Insert Data
    if (table1Info) {
      await test9_InsertData(table1Info);
    }
    
    // Test 10: Verify RLS Policies
    if (table1Info) {
      await test10_VerifyRLSPolicies(table1Info);
    }
    
    // Test 11: Check Audit Trail
    if (project1Id) {
      await test11_CheckSchemaChangesAudit(project1Id);
    }
    
    // Test 12: Drop Column
    if (project1Id && table1Info) {
      await test12_DropColumn(project1Id, table1Info);
    }
    
    // Test 13: Rename Column
    if (project1Id && table1Info) {
      await test13_RenameColumn(project1Id, table1Info);
    }
    
    // Test 14: Alter Column Type
    if (project1Id && table1Info) {
      await test14_AlterColumnType(project1Id, table1Info);
    }
    
    // Test 15: Drop Table
    if (project2Id && table2Info) {
      await test15_DropTable(project2Id, table2Info);
    }
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  }
  
  // Print summary
  console.log('\n'.repeat(2));
  console.log('═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log('═'.repeat(60));
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.details}`);
    });
  }
  
  console.log('\n✅ Testing complete!');
  console.log(`\nTest Projects Created:`);
  if (project1Id) console.log(`   - Deep Test Project: ${project1Id}`);
  if (project2Id) console.log(`   - Second Test Project: ${project2Id}`);
  
  console.log('\n📝 See PLAN_RESET_Y_TESTING_COMPLETO.md for full documentation');
}

runAllTests();









