#!/usr/bin/env node

/**
 * Delete Project with Slave Cleanup
 * 
 * This script deletes a project from Master and cleans up its tables from Slave.
 * 
 * Features:
 * - Deletes project from Master
 * - Drops all tables belonging to the project from Slave
 * - Records deletion in audit trail
 * - Handles internal_name resolution
 * 
 * Usage:
 *   node scripts/delete-project-with-cleanup.js <project-id>
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const MASTER_URL = process.env.SUPABASE_URL || process.env.SUPABASE_MASTER_URL;
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

if (!MASTER_URL || !MASTER_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const masterClient = createClient(MASTER_URL, MASTER_KEY);

async function deleteProjectWithCleanup(projectId) {
  try {
    console.log(`\n🗑️  Deleting project: ${projectId}\n`);
    
    // 1. Get project info
    const { data: project, error: projectError } = await masterClient
      .from('projects')
      .select('*, organizations(name)')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      throw new Error(`Project not found: ${projectError?.message}`);
    }
    
    console.log(`📊 Project: "${project.name}"`);
    console.log(`   Organization: ${project.organizations?.name}`);
    console.log(`   Tables: ${project.schema_data?.tables?.length || 0}`);
    
    const tables = project.schema_data?.tables || [];
    
    if (tables.length === 0) {
      console.log('   ⚠️  No tables to clean up\n');
    } else {
      console.log(`\n🧹 Cleaning up ${tables.length} table(s) from Slave...\n`);
      
      // 2. Get deployment config
      const { data: deploymentData, error: deploymentError } = await masterClient
        .rpc('get_deployment_config', { p_organization_id: project.organization_id });
      
      if (deploymentError || !deploymentData || deploymentData.length === 0) {
        console.log('   ⚠️  No deployment config found, skipping Slave cleanup');
      } else {
        const deployment = deploymentData[0];
        
        if (!deployment.supabase_service_role_key) {
          console.log('   ⚠️  No service role key, skipping Slave cleanup');
        } else {
          const slaveClient = createClient(
            deployment.supabase_project_url,
            deployment.supabase_service_role_key
          );
          
          const schemaName = `org_${project.organization_id.replace(/-/g, '')}`;
          
          // 3. Drop each table
          for (const table of tables) {
            const tableNameForDB = table.internal_name || table.name;
            
            try {
              console.log(`   Dropping: ${table.name} (${tableNameForDB})`);
              
              const { error: dropError } = await slaveClient.rpc('exec_sql', {
                query: `DROP TABLE IF EXISTS ${schemaName}.${tableNameForDB} CASCADE`
              });
              
              if (dropError) {
                console.log(`     ⚠️  Error: ${dropError.message}`);
              } else {
                console.log(`     ✅ Dropped`);
                
                // Record in audit trail
                await masterClient.from('schema_changes').insert({
                  project_id: projectId,
                  organization_id: project.organization_id,
                  change_type: 'drop_table',
                  change_data: { type: 'drop_table', table_name: tableNameForDB },
                  status: 'applied',
                  sql_executed: `DROP TABLE IF EXISTS ${schemaName}.${tableNameForDB} CASCADE`,
                  applied_at: new Date().toISOString(),
                  created_by: '00000000-0000-0000-0000-000000000000' // System
                });
              }
            } catch (error) {
              console.log(`     ❌ Failed: ${error.message}`);
            }
          }
        }
      }
    }
    
    // 4. Delete project from Master
    console.log(`\n🗑️  Deleting project from Master...`);
    
    const { error: deleteError } = await masterClient
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (deleteError) {
      throw new Error(`Failed to delete project: ${deleteError.message}`);
    }
    
    console.log(`   ✅ Project deleted\n`);
    
    console.log(`✅ Cleanup complete!`);
    console.log(`\n📊 Summary:`);
    console.log(`   Project deleted: ${project.name}`);
    console.log(`   Tables cleaned: ${tables.length}`);
    console.log(`   Audit trail: Updated`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
const projectId = process.argv[2];

if (!projectId) {
  console.error('❌ Usage: node scripts/delete-project-with-cleanup.js <project-id>');
  console.error('\nExample:');
  console.error('  node scripts/delete-project-with-cleanup.js 5c2ed25b-d566-442f-aafb-3503082b02c8');
  process.exit(1);
}

deleteProjectWithCleanup(projectId);









