#!/usr/bin/env node

/**
 * Edge Function to clean up Slave DB when a project is deleted
 * This function should be called from the project deletion process
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CleanupRequest {
  organization_id: string;
  project_id: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      organization_id, 
      project_id,
      user_id 
    }: CleanupRequest = await req.json();

    // Validate required fields
    if (!organization_id || !project_id || !user_id) {
      throw new Error('Missing required fields: organization_id, project_id, user_id');
    }

    console.log(`🧹 Starting Slave DB cleanup for project: ${project_id}`);
    console.log(`   Organization: ${organization_id}`);
    console.log(`   User: ${user_id}`);

    // Get Slave DB credentials
    const slaveUrl = Deno.env.get('SLAVE_URL');
    const slaveKey = Deno.env.get('SLAVE_SERVICE_ROLE_KEY');

    if (!slaveUrl || !slaveKey) {
      throw new Error('Missing Slave DB credentials');
    }

    // Create Slave client
    const { createClient } = await import('@supabase/supabase-js');
    const slaveClient = createClient(slaveUrl, slaveKey);

    const orgSchema = `org_${organization_id.replace(/-/g, '')}`;
    console.log(`   Schema: ${orgSchema}`);

    // 1. Check if schema exists
    const { data: schemaExists, error: schemaError } = await slaveClient
      .rpc('exec_sql', {
        query: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = '${orgSchema}'
          );
        `
      });

    if (schemaError) {
      throw new Error(`Failed to check schema: ${schemaError.message}`);
    }

    if (typeof schemaExists === 'string' && schemaExists.includes('f')) {
      console.log(`   ✅ Schema ${orgSchema} does not exist - already clean`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Schema already clean',
          cleanup_performed: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get all tables in the schema
    const { data: tables, error: tablesError } = await slaveClient
      .rpc('exec_sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = '${orgSchema}'
          AND table_type = 'BASE TABLE';
        `
      });

    if (tablesError) {
      throw new Error(`Failed to get tables: ${tablesError.message}`);
    }

    // Parse table names
    let tableNames = [];
    if (typeof tables === 'string') {
      const rows = tables.split('\n').filter(line => line.trim());
      tableNames = rows.map(row => {
        const match = row.match(/^\s*(\w+)\s*$/);
        return match ? match[1] : null;
      }).filter(Boolean);
    }

    console.log(`   📊 Found ${tableNames.length} tables to drop`);

    // 3. Drop all tables
    for (const tableName of tableNames) {
      console.log(`      - Dropping table: ${tableName}`);
      
      const { error: dropError } = await slaveClient
        .rpc('exec_sql', {
          query: `DROP TABLE IF EXISTS ${orgSchema}.${tableName} CASCADE;`
        });

      if (dropError) {
        console.log(`         ❌ Failed to drop: ${dropError.message}`);
      } else {
        console.log(`         ✅ Dropped successfully`);
      }
    }

    // 4. Drop the entire schema
    console.log(`   🗑️  Dropping schema: ${orgSchema}`);
    const { error: dropSchemaError } = await slaveClient
      .rpc('exec_sql', {
        query: `DROP SCHEMA IF EXISTS ${orgSchema} CASCADE;`
      });

    if (dropSchemaError) {
      throw new Error(`Failed to drop schema: ${dropSchemaError.message}`);
    }

    console.log(`   ✅ Schema ${orgSchema} dropped successfully`);

    // 5. Verify cleanup
    const { data: verifyClean, error: verifyError } = await slaveClient
      .rpc('exec_sql', {
        query: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = '${orgSchema}'
          );
        `
      });

    let verificationSuccess = false;
    if (verifyError) {
      console.log(`   ⚠️  Could not verify cleanup: ${verifyError.message}`);
    } else if (typeof verifyClean === 'string' && verifyClean.includes('f')) {
      console.log(`   ✅ Verification: Schema completely removed`);
      verificationSuccess = true;
    } else {
      console.log(`   ⚠️  Verification: Schema may still exist`);
    }

    console.log(`🎉 Slave DB cleanup completed for project: ${project_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Slave DB cleanup completed',
        cleanup_performed: true,
        tables_dropped: tableNames.length,
        schema_dropped: true,
        verification_success: verificationSuccess
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Slave DB cleanup failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});





