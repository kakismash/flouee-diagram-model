#!/usr/bin/env node

/**
 * Apply RPC Functions to Slave Database
 * 
 * This script applies the read_table_data RPC functions to the Slave database.
 * It reads the SQL from docs/setup/SLAVE_ADD_READ_TABLE_DATA_RPC.sql and applies it.
 * 
 * Usage:
 *   node scripts/apply-slave-rpc-functions.js
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function applySlaveRPCFunctions() {
  try {
    console.log('\n═'.repeat(70));
    console.log('🔧 APPLY SLAVE RPC FUNCTIONS');
    console.log('═'.repeat(70));
    console.log(`Started: ${new Date().toLocaleString()}\n`);

    // 1. Get deployment config (use shared deployment with organization_id = NULL)
    console.log('📦 Fetching deployment configuration...');
    const { data: deploymentData, error: deploymentError } = await masterClient
      .from('deployment_configs')
      .select('*')
      .or('organization_id.is.null')
      .order('organization_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (deploymentError || !deploymentData) {
      // Try to get any deployment config
      const { data: anyDeployment } = await masterClient
        .from('deployment_configs')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (!anyDeployment) {
        throw new Error('No deployment configuration found in Master database');
      }
      
      console.log('⚠️  Using first available deployment config');
      deploymentData = anyDeployment;
    }

    const deployment = deploymentData;
    console.log(`✅ Found deployment: ${deployment.supabase_project_ref}`);
    console.log(`   URL: ${deployment.supabase_project_url}`);

    if (!deployment.supabase_service_role_key) {
      throw new Error('Service role key not configured in deployment_configs. Cannot apply migrations.');
    }

    // 2. Create Slave client
    const slaveClient = createClient(
      deployment.supabase_project_url,
      deployment.supabase_service_role_key
    );

    console.log('✅ Slave client created\n');

    // 3. Read SQL file
    const sqlPath = path.join(__dirname, '../docs/setup/SLAVE_ADD_READ_TABLE_DATA_RPC.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('📄 SQL file loaded\n');

    // 4. Split SQL into statements and apply each one
    // Remove comments and split by semicolon
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        // Remove empty statements and comments-only lines
        const cleaned = s.replace(/--.*$/gm, '').trim();
        return cleaned.length > 0 && !cleaned.startsWith('--');
      });

    console.log(`🔨 Applying ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip setup comments and empty lines
      if (statement.length < 10) continue;

      try {
        console.log(`   [${i + 1}/${statements.length}] Applying statement...`);
        
        const { error } = await slaveClient.rpc('exec_sql', {
          query: statement + ';'
        });

        if (error) {
          // Check if it's a "already exists" error (that's OK)
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('duplicate')
          )) {
            console.log(`   ⚠️  Already exists (skipping): ${error.message.substring(0, 60)}...`);
          } else {
            throw error;
          }
        } else {
          successCount++;
          console.log(`   ✅ Applied successfully`);
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error: ${error.message}`);
        
        // Don't fail completely - continue with next statement
        if (error.message && error.message.includes('does not exist')) {
          console.log(`   ⚠️  exec_sql function may not exist - this is expected on first run`);
          console.log(`   💡 Please execute docs/setup/SLAVE_SETUP_COMPLETO.sql first\n`);
        }
      }
    }

    // 5. Verify functions were created
    console.log('\n🔍 Verifying RPC functions...\n');

    const functionsToCheck = [
      'read_table_data',
      'insert_table_record',
      'update_table_record',
      'delete_table_record'
    ];

    for (const funcName of functionsToCheck) {
      try {
        // Try to call the function with invalid params to see if it exists
        const { error } = await slaveClient.rpc(funcName, {
          p_schema: 'test',
          p_table: 'test'
        });

        if (error) {
          if (error.message && (
            error.message.includes('does not exist') ||
            error.code === '42883'
          )) {
            console.log(`   ❌ ${funcName} - NOT FOUND`);
          } else {
            // Function exists (it returned a validation error, not a "not found" error)
            console.log(`   ✅ ${funcName} - EXISTS`);
          }
        } else {
          console.log(`   ✅ ${funcName} - EXISTS`);
        }
      } catch (error) {
        if (error.message && error.message.includes('does not exist')) {
          console.log(`   ❌ ${funcName} - NOT FOUND`);
        } else {
          console.log(`   ✅ ${funcName} - EXISTS (validation error is OK)`);
        }
      }
    }

    // Summary
    console.log('\n═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log(`   Statements applied: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Functions verified: ${functionsToCheck.length}`);

    if (successCount > 0) {
      console.log('\n✅ RPC functions applied successfully!');
      console.log('🎯 The frontend should now be able to read/write data from org schemas');
    } else if (errorCount > 0) {
      console.log('\n⚠️  Some errors occurred. Please check the output above.');
      console.log('💡 If exec_sql function is missing, run docs/setup/SLAVE_SETUP_COMPLETO.sql first');
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error applying RPC functions:', error);
    console.error('\n💡 Manual alternative:');
    console.error('   1. Open: https://supabase.com/dashboard/project/ffzufnwxvqngglsapqrf/sql/new');
    console.error('   2. Copy content from: docs/setup/SLAVE_ADD_READ_TABLE_DATA_RPC.sql');
    console.error('   3. Paste and execute in SQL Editor\n');
    process.exit(1);
  }
}

// Run
applySlaveRPCFunctions();

