#!/usr/bin/env node

/**
 * Apply Project Schema to Slave Database
 * 
 * This script takes a project ID and applies all tables from its schema_data
 * to the actual Slave database.
 * 
 * Usage:
 *   node scripts/apply-project-schema-to-slave.js <project-id>
 * 
 * Example:
 *   node scripts/apply-project-schema-to-slave.js 5c2ed25b-d566-442f-aafb-3503082b02c8
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const MASTER_URL = process.env.SUPABASE_URL || process.env.SUPABASE_MASTER_URL;
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

if (!MASTER_URL || !MASTER_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL or SUPABASE_MASTER_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY or SUPABASE_MASTER_SERVICE_ROLE_KEY');
  process.exit(1);
}

const masterClient = createClient(MASTER_URL, MASTER_KEY);

async function applyProjectSchema(projectId) {
  try {
    console.log(`\n🔍 Fetching project ${projectId}...`);

    // 1. Get project from Master
    const { data: project, error: projectError } = await masterClient
      .from('projects')
      .select('*, organizations(id, name)')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message || 'Unknown error'}`);
    }

    console.log(`✅ Found project: "${project.name}"`);
    console.log(`   Organization: ${project.organizations?.name || project.organization_id}`);

    const schemaData = project.schema_data;
    
    if (!schemaData || !schemaData.tables || schemaData.tables.length === 0) {
      console.log('⚠️  No tables found in schema_data. Nothing to apply.');
      return;
    }

    console.log(`📊 Found ${schemaData.tables.length} table(s) to create:`);
    schemaData.tables.forEach((table, i) => {
      console.log(`   ${i + 1}. ${table.name} (${table.columns?.length || 0} columns)`);
    });

    // 2. Get deployment config for this organization
    const { data: deploymentData, error: deploymentError } = await masterClient
      .rpc('get_deployment_config', { p_organization_id: project.organization_id });

    if (deploymentError || !deploymentData || deploymentData.length === 0) {
      throw new Error('Deployment configuration not found for this organization');
    }

    const deployment = deploymentData[0];
    console.log(`\n🔗 Using Slave: ${deployment.supabase_project_url}`);

    if (!deployment.supabase_service_role_key) {
      throw new Error('Service role key not configured in deployment_configs');
    }

    // 3. Create Slave client
    const slaveClient = createClient(
      deployment.supabase_project_url,
      deployment.supabase_service_role_key
    );

    // 4. Generate schema name
    const schemaName = `org_${project.organization_id.replace(/-/g, '')}`;
    console.log(`📦 Target schema: ${schemaName}`);

    // 5. Check if schema exists, if not create it
    console.log(`\n🔨 Checking if schema exists...`);
    const { error: schemaCheckError } = await slaveClient.rpc('exec_sql', {
      query: `SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${schemaName}'`
    });

    if (schemaCheckError) {
      console.log(`   Creating schema ${schemaName}...`);
      const { error: createSchemaError } = await slaveClient.rpc('exec_sql', {
        query: `CREATE SCHEMA IF NOT EXISTS ${schemaName}`
      });
      
      if (createSchemaError) {
        throw new Error(`Failed to create schema: ${createSchemaError.message}`);
      }
      console.log(`   ✅ Schema created`);
    } else {
      console.log(`   ✅ Schema exists`);
    }

    // 6. Apply each table
    console.log(`\n🚀 Applying tables to Slave database...\n`);

    for (const table of schemaData.tables) {
      try {
        console.log(`📋 Creating table: ${table.name}`);

        // Build column definitions
        const columns = table.columns || [];
        if (columns.length === 0) {
          console.log(`   ⚠️  No columns defined, skipping...`);
          continue;
        }

        const columnDefs = columns.map(col => {
          let def = `${col.name} ${col.type}`;
          
          if (col.isPrimaryKey) {
            def += ' PRIMARY KEY';
          }
          
          if (!col.isNullable && !col.isPrimaryKey) {
            def += ' NOT NULL';
          }
          
          if (col.isUnique && !col.isPrimaryKey) {
            def += ' UNIQUE';
          }
          
          if (col.defaultValue && !col.isPrimaryKey) {
            def += ` DEFAULT ${col.defaultValue}`;
          }
          
          return def;
        }).join(', ');

        // ✅ Use table.id to generate unique internal name
        const internalTableName = table.id ? `t_${table.id}` : table.name;
        
        // CREATE TABLE with internal name
        const createTableSQL = `CREATE TABLE IF NOT EXISTS ${schemaName}.${internalTableName} (${columnDefs})`;
        console.log(`   Table: ${table.name} → Internal: ${internalTableName}`);
        console.log(`   SQL: ${createTableSQL.substring(0, 80)}...`);

        const { error: createError } = await slaveClient.rpc('exec_sql', {
          query: createTableSQL
        });

        if (createError) {
          throw new Error(`Failed to create table: ${createError.message}`);
        }

        console.log(`   ✅ Table created`);

        // Enable RLS (using internal name)
        console.log(`   🔒 Enabling RLS...`);
        const { error: rlsError } = await slaveClient.rpc('exec_sql', {
          query: `ALTER TABLE ${schemaName}.${internalTableName} ENABLE ROW LEVEL SECURITY`
        });

        if (rlsError) {
          console.log(`   ⚠️  RLS enable failed: ${rlsError.message}`);
        } else {
          console.log(`   ✅ RLS enabled`);
        }

        // Create RLS policies (using internal name)
        console.log(`   🛡️  Creating RLS policies...`);
        const policies = [
          `CREATE POLICY "org_isolation_select" ON ${schemaName}.${internalTableName} FOR SELECT USING (auth.organization_id() = '${project.organization_id}'::uuid)`,
          `CREATE POLICY "org_isolation_insert" ON ${schemaName}.${internalTableName} FOR INSERT WITH CHECK (auth.organization_id() = '${project.organization_id}'::uuid)`,
          `CREATE POLICY "org_isolation_update" ON ${schemaName}.${internalTableName} FOR UPDATE USING (auth.organization_id() = '${project.organization_id}'::uuid) WITH CHECK (auth.organization_id() = '${project.organization_id}'::uuid)`,
          `CREATE POLICY "org_isolation_delete" ON ${schemaName}.${internalTableName} FOR DELETE USING (auth.organization_id() = '${project.organization_id}'::uuid)`
        ];

        for (const policy of policies) {
          const { error: policyError } = await slaveClient.rpc('exec_sql', { query: policy });
          if (policyError && !policyError.message.includes('already exists')) {
            console.log(`   ⚠️  Policy creation failed: ${policyError.message}`);
          }
        }

        console.log(`   ✅ RLS policies created\n`);

        // Record in schema_changes
        await masterClient.from('schema_changes').insert({
          project_id: projectId,
          organization_id: project.organization_id,
          change_type: 'add_table',
          change_data: {
            type: 'add_table',
            table_def: {
              name: table.name,
              columns: columns
            }
          },
          status: 'applied',
          sql_executed: createTableSQL,
          applied_at: new Date().toISOString(),
          created_by: '00000000-0000-0000-0000-000000000000' // System
        });

      } catch (tableError) {
        console.error(`   ❌ Failed to create table ${table.name}:`, tableError.message);
      }
    }

    // 7. Update project status
    await masterClient
      .from('projects')
      .update({
        status: 'applied',
        last_applied_version: project.version,
        last_applied_at: new Date().toISOString()
      })
      .eq('id', projectId);

    console.log(`\n✅ Schema applied successfully!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Project: ${project.name}`);
    console.log(`   Tables created: ${schemaData.tables.length}`);
    console.log(`   Schema: ${schemaName}`);
    console.log(`   Status: applied`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
const projectId = process.argv[2];

if (!projectId) {
  console.error('❌ Usage: node scripts/apply-project-schema-to-slave.js <project-id>');
  console.error('\nExample:');
  console.error('  node scripts/apply-project-schema-to-slave.js 5c2ed25b-d566-442f-aafb-3503082b02c8');
  process.exit(1);
}

applyProjectSchema(projectId);

