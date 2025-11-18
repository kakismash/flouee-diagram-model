#!/usr/bin/env node

/**
 * 🔄 Clone Slave Project Template
 * 
 * This script helps you set up a NEW Slave project by:
 * 1. Showing you the SQL to execute in the new Slave
 * 2. Registering it in Master deployment_configs
 * 3. Initializing it with required functions
 * 
 * Usage:
 *   node scripts/clone-slave-project.js
 *   
 * Interactive prompts will guide you through the process
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

config();

const MASTER_URL = process.env.SUPABASE_URL || process.env.SUPABASE_MASTER_URL;
const MASTER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY;

const masterClient = createClient(MASTER_URL, MASTER_KEY);

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function cloneSlave() {
  console.log('\n═'.repeat(70));
  console.log('🔄 CLONE SLAVE PROJECT - Setup Wizard');
  console.log('═'.repeat(70));
  console.log('\nThis wizard will help you set up a NEW Slave project.\n');
  
  try {
    // Step 1: Get new Slave info
    console.log('📋 STEP 1: New Slave Project Information\n');
    console.log('First, create a new Supabase project:');
    console.log('   🔗 https://supabase.com/new\n');
    console.log('Then, get the following information from Project Settings > API:\n');
    
    const projectRef = await prompt('Enter Project Reference ID (e.g., abc123xyz): ');
    const projectUrl = await prompt('Enter Project URL (e.g., https://abc123xyz.supabase.co): ');
    const anonKey = await prompt('Enter Anon/Public Key: ');
    const serviceKey = await prompt('Enter Service Role Key: ');
    
    console.log('\n📋 STEP 2: Deployment Strategy\n');
    console.log('1. Shared (for FREE tier organizations)');
    console.log('2. Dedicated (for specific organization)\n');
    
    const strategy = await prompt('Choose strategy (1 or 2): ');
    
    let organizationId = null;
    if (strategy === '2') {
      // Show available organizations
      const { data: orgs } = await masterClient
        .from('organizations')
        .select('id, name')
        .order('name');
      
      console.log('\n📋 Available Organizations:\n');
      orgs.forEach((org, i) => {
        console.log(`   ${i + 1}. ${org.name} (${org.id})`);
      });
      console.log('');
      
      const orgChoice = await prompt('Choose organization number: ');
      organizationId = orgs[parseInt(orgChoice) - 1]?.id;
    }
    
    // Step 3: Register in Master
    console.log('\n📝 STEP 3: Registering Slave in Master...\n');
    
    const deploymentData = {
      organization_id: organizationId,
      supabase_project_ref: projectRef,
      supabase_project_url: projectUrl,
      supabase_anon_key: anonKey,
      supabase_service_role_key: serviceKey,
      schema_name: organizationId ? null : 'shared',
      status: 'active'
    };
    
    const { data: deployment, error: deployError } = await masterClient
      .from('deployment_configs')
      .insert(deploymentData)
      .select()
      .single();
    
    if (deployError) {
      throw new Error(`Failed to register: ${deployError.message}`);
    }
    
    console.log('   ✅ Registered in deployment_configs\n');
    
    // Step 4: Show SQL to execute
    console.log('═'.repeat(70));
    console.log('📝 STEP 4: Initialize the Slave Database');
    console.log('═'.repeat(70));
    console.log('\n⚠️  MANUAL ACTION REQUIRED:\n');
    console.log(`1. Open Slave SQL Editor:`);
    console.log(`   🔗 https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
    console.log(`2. Copy and execute this SQL:\n`);
    console.log('─'.repeat(70));
    console.log(getSlaveSetupSQL());
    console.log('─'.repeat(70));
    console.log('\n3. After executing, press Enter to continue...\n');
    
    await prompt('Press Enter when done...');
    
    // Step 5: Verify
    console.log('\n🔍 STEP 5: Verifying Slave setup...\n');
    
    const slaveClient = createClient(projectUrl, serviceKey);
    
    const { data, error } = await slaveClient.rpc('exec_sql', {
      query: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('exec_sql', 'current_organization_id', 'current_user_id', 'current_user_role')`
    });
    
    if (error) {
      console.log('   ⚠️  Could not verify:', error.message);
      console.log('   Please ensure you executed the SQL correctly\n');
    } else {
      const functions = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`   ✅ Found ${functions.length} required function(s)\n`);
    }
    
    // Success!
    console.log('═'.repeat(70));
    console.log('✅ SLAVE CLONE COMPLETE!');
    console.log('═'.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   Slave Project: ${projectRef}`);
    console.log(`   URL: ${projectUrl}`);
    console.log(`   Strategy: ${organizationId ? 'Dedicated' : 'Shared'}`);
    console.log(`   Status: Active`);
    
    console.log('\n🎯 This Slave is now ready to:');
    console.log('   - Receive schema changes from Edge Functions');
    console.log('   - Create organization schemas (org_{id})');
    console.log('   - Apply tables with ID-based naming (t_{id})');
    console.log('   - Enforce RLS policies');
    
    console.log('\n🔁 To Use This Slave:');
    console.log('   - It\'s already registered in deployment_configs');
    console.log('   - Edge Functions will auto-detect it');
    console.log('   - Start creating projects and tables in the UI');
    
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function getSlaveSetupSQL() {
  return `
-- ============================================
-- 🔵 SLAVE SETUP SQL
-- Execute this in your new Slave project
-- ============================================

-- 1. Create exec_sql function
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

-- 2. Create auth helper functions
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

-- Comments
COMMENT ON FUNCTION public.exec_sql IS 'Executes dynamic SQL for Edge Functions';
COMMENT ON FUNCTION public.current_organization_id IS 'Extracts organization_id from JWT';
COMMENT ON FUNCTION public.current_user_id IS 'Extracts user_id from JWT';
COMMENT ON FUNCTION public.current_user_role IS 'Extracts user role from JWT';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SLAVE SETUP COMPLETE!';
    RAISE NOTICE '📊 Functions created: exec_sql, current_organization_id, current_user_id, current_user_role';
    RAISE NOTICE '🔐 Ready for multi-tenant operations';
    RAISE NOTICE '';
END $$;
`;
}

cloneSlave();








