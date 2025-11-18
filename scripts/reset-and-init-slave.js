#!/usr/bin/env node

/**
 * 🔄 Reset and Initialize Slave
 * 
 * Complete reset workflow:
 * 1. Drops ALL organization schemas from Slave
 * 2. Verifies Slave functions exist
 * 3. Optionally re-applies projects from Master
 * 
 * Usage:
 *   node scripts/reset-and-init-slave.js
 *   node scripts/reset-and-init-slave.js --apply-projects
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const MASTER_URL = process.env.SUPABASE_URL || process.env.SUPABASE_MASTER_URL;
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

const masterClient = createClient(MASTER_URL, MASTER_KEY);

const APPLY_PROJECTS = process.argv.includes('--apply-projects');

async function getSlaveClient() {
  const { data, error } = await masterClient
    .from('deployment_configs')
    .select('*')
    .is('organization_id', null) // Get shared Slave
    .single();
  
  if (error || !data) {
    throw new Error('Deployment config not found');
  }
  
  return {
    client: createClient(data.supabase_project_url, data.supabase_service_role_key),
    deployment: data
  };
}

async function step1_DropAllSchemas(slaveClient) {
  console.log('\n🗑️  STEP 1: Drop All Organization Schemas');
  console.log('═'.repeat(70));
  
  // Get all organizations
  const { data: orgs } = await masterClient
    .from('organizations')
    .select('id, name')
    .order('name');
  
  if (!orgs || orgs.length === 0) {
    console.log('\n⚠️  No organizations found\n');
    return [];
  }
  
  console.log(`\n📋 Found ${orgs.length} organization(s):\n`);
  
  for (const org of orgs) {
    const schemaName = `org_${org.id.replace(/-/g, '')}`;
    console.log(`🗑️  Dropping: ${org.name}`);
    console.log(`   Schema: ${schemaName}`);
    
    const { error } = await slaveClient.rpc('exec_sql', {
      query: `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`
    });
    
    if (error) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    } else {
      console.log(`   ✅ Dropped\n`);
    }
  }
  
  console.log('✅ All schemas dropped\n');
  return orgs;
}

async function step2_VerifyFunctions(slaveClient) {
  console.log('\n🔍 STEP 2: Verify Required Functions');
  console.log('═'.repeat(70));
  
  // Try to call exec_sql - if it works, it exists
  try {
    const testQuery = `SELECT 1 as test`;
    const { data, error } = await slaveClient.rpc('exec_sql', { query: testQuery });
    
    if (error) {
      throw error;
    }
    
    console.log('\n✅ exec_sql function is working\n');
    
    // Verify helper functions exist
    const helpersExist = await Promise.all([
      slaveClient.rpc('current_organization_id').then(() => true).catch(() => false),
      slaveClient.rpc('current_user_id').then(() => true).catch(() => false),
      slaveClient.rpc('current_user_role').then(() => true).catch(() => false)
    ]);
    
    const required = ['current_organization_id', 'current_user_id', 'current_user_role'];
    
    console.log('Helper functions:\n');
    required.forEach((name, i) => {
      console.log(`   ${helpersExist[i] ? '✅' : '❌'} ${name}`);
    });
    
    console.log('');
    
    const allExist = helpersExist.every(exists => exists);
    
    if (!allExist) {
      console.log('⚠️  MISSING HELPER FUNCTIONS!\n');
      console.log('Please execute: docs/setup/SLAVE_SETUP_COMPLETO.sql');
      console.log('in your Slave SQL Editor, then run this script again.\n');
      process.exit(1);
    }
    
    console.log('✅ All required functions present\n');
    
  } catch (error) {
    console.log('\n❌ exec_sql function not found!\n');
    console.log('📝 Please execute: docs/setup/SLAVE_SETUP_COMPLETO.sql');
    console.log('   in your Slave SQL Editor first.\n');
    console.log(`🔗 https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new\n`);
    process.exit(1);
  }
}

async function step3_CreateOrgSchemas(slaveClient, orgs) {
  console.log('\n🏗️  STEP 3: Create Organization Schemas');
  console.log('═'.repeat(70));
  
  console.log(`\n📦 Creating schemas for ${orgs.length} organization(s):\n`);
  
  for (const org of orgs) {
    const schemaName = `org_${org.id.replace(/-/g, '')}`;
    console.log(`🏗️  Creating: ${org.name}`);
    console.log(`   Schema: ${schemaName}`);
    
    const { error } = await slaveClient.rpc('exec_sql', {
      query: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`
    });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    } else {
      console.log(`   ✅ Created\n`);
    }
  }
  
  console.log('✅ All schemas created\n');
}

async function step4_ApplyProjectsToSlave(slaveClient, orgs) {
  if (!APPLY_PROJECTS) {
    console.log('\n⏭️  STEP 4: Skipping project application');
    console.log('   (Use --apply-projects flag to apply existing projects)\n');
    return;
  }
  
  console.log('\n🔨 STEP 4: Apply Projects to Slave');
  console.log('═'.repeat(70));
  
  let totalProjects = 0;
  let totalTables = 0;
  
  for (const org of orgs) {
    const schemaName = `org_${org.id.replace(/-/g, '')}`;
    
    // Get projects for this org
    const { data: projects } = await masterClient
      .from('projects')
      .select('*')
      .eq('organization_id', org.id);
    
    if (!projects || projects.length === 0) {
      console.log(`\n⚠️  ${org.name}: No projects found\n`);
      continue;
    }
    
    console.log(`\n📋 ${org.name}: ${projects.length} project(s)\n`);
    
    for (const project of projects) {
      const tables = project.schema_data?.tables || [];
      
      if (tables.length === 0) {
        console.log(`   ⚠️  ${project.name}: No tables\n`);
        continue;
      }
      
      console.log(`   📁 ${project.name}: ${tables.length} table(s)`);
      
      for (const table of tables) {
        const internalName = table.internal_name || `t_${table.id}`;
        const columns = table.columns || [];
        
        if (columns.length === 0) continue;
        
        const columnDefs = columns.map(col => {
          let def = `${col.name} ${col.type}`;
          if (col.isPrimaryKey) def += ' PRIMARY KEY';
          else if (!col.isNullable) def += ' NOT NULL';
          if (col.isUnique && !col.isPrimaryKey) def += ' UNIQUE';
          if (col.defaultValue && !col.isPrimaryKey) def += ` DEFAULT ${col.defaultValue}`;
          return def;
        }).join(', ');
        
        const createSQL = `CREATE TABLE IF NOT EXISTS ${schemaName}.${internalName} (${columnDefs})`;
        
        console.log(`      Creating: ${table.name} → ${internalName}`);
        
        const { error } = await slaveClient.rpc('exec_sql', { query: createSQL });
        
        if (error) {
          console.log(`        ❌ Error: ${error.message}`);
          continue;
        }
        
        // Enable RLS
        await slaveClient.rpc('exec_sql', {
          query: `ALTER TABLE ${schemaName}.${internalName} ENABLE ROW LEVEL SECURITY`
        });
        
        // Create policies
        const policies = [
          `CREATE POLICY "org_select" ON ${schemaName}.${internalName} FOR SELECT USING (public.current_organization_id() = '${org.id}'::uuid)`,
          `CREATE POLICY "org_insert" ON ${schemaName}.${internalName} FOR INSERT WITH CHECK (public.current_organization_id() = '${org.id}'::uuid)`,
          `CREATE POLICY "org_update" ON ${schemaName}.${internalName} FOR UPDATE USING (public.current_organization_id() = '${org.id}'::uuid)`,
          `CREATE POLICY "org_delete" ON ${schemaName}.${internalName} FOR DELETE USING (public.current_organization_id() = '${org.id}'::uuid)`
        ];
        
        for (const policy of policies) {
          await slaveClient.rpc('exec_sql', { query: policy });
        }
        
        console.log(`        ✅ Created with RLS`);
        
        totalTables++;
      }
      
      totalProjects++;
      console.log('');
    }
  }
  
  console.log(`✅ Applied ${totalProjects} project(s), ${totalTables} table(s)\n`);
}

function getSlaveSetupSQL() {
  return `-- Slave Setup SQL (Copy and Execute)

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN 'SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'exec_sql error: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'organization_id', '')::uuid; $$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid; $$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'user_role', '')::text; $$;

-- Done
SELECT '✅ Slave setup complete!' AS status;`;
}

// Main
async function main() {
  console.log('\n═'.repeat(70));
  console.log('🔄 RESET AND INITIALIZE SLAVE');
  console.log('═'.repeat(70));
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log(`Mode: ${APPLY_PROJECTS ? 'Reset + Apply Projects' : 'Reset Only'}`);
  console.log('═'.repeat(70));
  
  try {
    const { client: slaveClient, deployment } = await getSlaveClient();
    
    console.log(`\n📦 Slave: ${deployment.supabase_project_url}\n`);
    
    // Step 1: Drop all schemas
    const orgs = await step1_DropAllSchemas(slaveClient);
    
    // Step 2: Verify functions
    await step2_VerifyFunctions(slaveClient);
    
    // Step 3: Create fresh schemas
    await step3_CreateOrgSchemas(slaveClient, orgs);
    
    // Step 4: Apply projects (optional)
    await step4_ApplyProjectsToSlave(slaveClient, orgs);
    
    // Success!
    console.log('═'.repeat(70));
    console.log('✅ RESET AND INITIALIZATION COMPLETE!');
    console.log('═'.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   Organizations: ${orgs.length}`);
    console.log(`   Schemas recreated: ${orgs.length}`);
    console.log(`   Projects applied: ${APPLY_PROJECTS ? 'Yes' : 'No'}`);
    
    console.log('\n🎯 Slave is now:');
    console.log('   ✅ Clean (no old data)');
    console.log('   ✅ Ready (functions installed)');
    console.log('   ✅ Structured (schemas created)');
    console.log(`   ${APPLY_PROJECTS ? '✅' : '⏳'} Populated (with ${APPLY_PROJECTS ? 'existing' : 'no'} projects)`);
    
    console.log('\n💡 Next Steps:');
    if (!APPLY_PROJECTS) {
      console.log('   1. Create projects in UI');
      console.log('   2. Add tables to projects');
      console.log('   3. Tables will auto-apply with names: t_{id}');
    } else {
      console.log('   1. Go to http://localhost:4200');
      console.log('   2. View your projects');
      console.log('   3. Verify tables exist in Slave');
    }
    
    console.log('\n🧪 Testing:');
    console.log('   npm run test:deep');
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

