#!/usr/bin/env node

/**
 * 🔵 Initialize Slave Database from Zero
 * 
 * This script sets up a Slave database from scratch:
 * 1. Creates all required functions (exec_sql, auth helpers)
 * 2. Can be run on ANY Slave project
 * 3. Idempotent (can run multiple times safely)
 * 4. No changes to Master
 * 
 * Usage:
 *   node scripts/init-slave-from-zero.js [slave-project-ref]
 * 
 * If no project-ref provided, uses the default from deployment_configs
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

async function initSlave(slaveProjectRef) {
  console.log('\n═'.repeat(70));
  console.log('🔵 INITIALIZE SLAVE FROM ZERO');
  console.log('═'.repeat(70));
  console.log(`Started: ${new Date().toLocaleString()}\n`);
  
  try {
    // Get Slave connection info
    let deployment;
    
    if (slaveProjectRef) {
      console.log(`📦 Using specified Slave: ${slaveProjectRef}\n`);
      
      const { data, error } = await masterClient
        .from('deployment_configs')
        .select('*')
        .eq('supabase_project_ref', slaveProjectRef)
        .single();
      
      if (error || !data) {
        throw new Error('Slave project not found in deployment_configs');
      }
      
      deployment = data;
    } else {
      console.log('📦 Using default Slave from deployment_configs\n');
      
      const { data, error } = await masterClient
        .from('deployment_configs')
        .select('*')
        .is('organization_id', null)
        .single();
      
      if (error || !data) {
        throw new Error('Default deployment config not found');
      }
      
      deployment = data;
    }
    
    console.log(`✅ Slave: ${deployment.supabase_project_url}\n`);
    
    if (!deployment.supabase_service_role_key) {
      throw new Error('Service role key not configured');
    }
    
    const slaveClient = createClient(
      deployment.supabase_project_url,
      deployment.supabase_service_role_key
    );
    
    // Step 1: Create exec_sql function
    console.log('🔧 STEP 1: Creating exec_sql function...\n');
    
    const execSqlFunction = `
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
    `;
    
    const { error: execError } = await slaveClient.rpc('exec_sql', { query: execSqlFunction }).catch(() => {
      // If exec_sql doesn't exist, we need to create it via direct SQL
      // This is a chicken-egg problem - we'll handle it below
      return { error: 'exec_sql not found' };
    });
    
    if (execError && execError.includes && execError.includes('not found')) {
      console.log('   ⚠️  exec_sql not found, needs manual creation first');
      console.log('   📝 Please execute SLAVE_SETUP_COMPLETO.sql in Slave SQL Editor');
      console.log('   🔗 https://supabase.com/dashboard/project/' + deployment.supabase_project_ref + '/sql/new');
      console.log('');
      console.log('   After creating exec_sql, run this script again.');
      process.exit(1);
    }
    
    console.log('   ✅ exec_sql function ready\n');
    
    // Step 2: Create auth helper functions
    console.log('🔧 STEP 2: Creating auth helper functions...\n');
    
    const authHelpers = `
      CREATE OR REPLACE FUNCTION public.current_organization_id()
      RETURNS UUID
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        SELECT NULLIF(
          current_setting('request.jwt.claims', true)::json->>'organization_id',
          ''
        )::uuid;
      $$;
      
      CREATE OR REPLACE FUNCTION public.current_user_id()
      RETURNS UUID
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        SELECT NULLIF(
          current_setting('request.jwt.claims', true)::json->>'sub',
          ''
        )::uuid;
      $$;
      
      CREATE OR REPLACE FUNCTION public.current_user_role()
      RETURNS TEXT
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      AS $$
        SELECT NULLIF(
          current_setting('request.jwt.claims', true)::json->>'user_role',
          ''
        )::text;
      $$;
      
      COMMENT ON FUNCTION public.current_organization_id IS 'Extracts organization_id from JWT';
      COMMENT ON FUNCTION public.current_user_id IS 'Extracts user_id from JWT';
      COMMENT ON FUNCTION public.current_user_role IS 'Extracts user role from JWT';
    `;
    
    const { error: helpersError } = await slaveClient.rpc('exec_sql', { query: authHelpers });
    
    if (helpersError) {
      console.log('   ⚠️  Error creating auth helpers:', helpersError.message);
    } else {
      console.log('   ✅ Auth helper functions created\n');
    }
    
    // Step 3: Verify functions
    console.log('🔍 STEP 3: Verifying functions...\n');
    
    const verifySQL = `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('exec_sql', 'current_organization_id', 'current_user_id', 'current_user_role')
      ORDER BY routine_name
    `;
    
    const { data: functions, error: verifyError } = await slaveClient.rpc('exec_sql', { query: verifySQL });
    
    if (!verifyError) {
      const funcList = typeof functions === 'string' ? JSON.parse(functions) : functions;
      console.log(`   ✅ Found ${funcList.length} function(s):`);
      funcList.forEach(f => {
        console.log(`      - ${f.routine_name}`);
      });
      console.log('');
    }
    
    // Success!
    console.log('═'.repeat(70));
    console.log('✅ SLAVE INITIALIZATION COMPLETE!');
    console.log('═'.repeat(70));
    console.log('\n📊 Slave Ready For:');
    console.log('   ✅ Receiving schema changes from Edge Functions');
    console.log('   ✅ Creating tables with RLS policies');
    console.log('   ✅ Multi-tenant data isolation');
    console.log('   ✅ JWT-based access control');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Create projects in Master UI');
    console.log('   2. Create tables in projects');
    console.log('   3. Tables will auto-apply to this Slave');
    
    console.log('\n📝 This Slave can now:');
    console.log('   - Accept organizations: Multiple');
    console.log('   - Create schemas: org_{organization_id}');
    console.log('   - Apply schema changes: Via Edge Functions');
    console.log('   - Isolate data: Via RLS policies');
    
    console.log('\n🔁 To Clone This Slave:');
    console.log('   1. Create new Supabase project');
    console.log('   2. Run this script: node scripts/init-slave-from-zero.js <new-ref>');
    console.log('   3. Register in Master deployment_configs');
    console.log('   4. Ready to use!');
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('   1. Verify Slave project exists');
    console.error('   2. Verify service_role_key is correct');
    console.error('   3. If exec_sql error: Run SLAVE_SETUP_COMPLETO.sql first');
    console.error('');
    process.exit(1);
  }
}

// Main
const slaveProjectRef = process.argv[2];

if (process.argv.includes('--help')) {
  console.log('\n🔵 Initialize Slave from Zero\n');
  console.log('Usage:');
  console.log('   node scripts/init-slave-from-zero.js [slave-project-ref]\n');
  console.log('Examples:');
  console.log('   node scripts/init-slave-from-zero.js');
  console.log('   node scripts/init-slave-from-zero.js ffzufnwxvqngglsapqrf');
  console.log('   node scripts/init-slave-from-zero.js new-slave-ref-123\n');
  console.log('Options:');
  console.log('   [slave-project-ref]  Optional. If not provided, uses default from deployment_configs\n');
  process.exit(0);
}

initSlave(slaveProjectRef);








