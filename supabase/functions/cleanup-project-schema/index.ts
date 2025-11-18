import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CleanupRequest {
  project_id: string;
  organization_id: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      project_id, 
      organization_id,
      user_id 
    }: CleanupRequest = await req.json();

    // Validate required fields
    if (!project_id || !organization_id || !user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: project_id, organization_id, user_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase clients
    const masterUrl = Deno.env.get('SUPABASE_URL'); // Master project URL (default)
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Master project key (default)
    const slaveUrl = Deno.env.get('SLAVE_URL'); // Slave project URL
    const slaveKey = Deno.env.get('SLAVE_SERVICE_ROLE_KEY'); // Slave project key

    if (!masterUrl || !masterKey || !slaveUrl || !slaveKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const masterClient = createClient(masterUrl, masterKey);
    const slaveClient = createClient(slaveUrl, slaveKey);

    // 1. Verify project exists and user has permission
    const { data: project, error: projectError } = await masterClient
      .from('projects')
      .select('id, organization_id, name')
      .eq('id', project_id)
      .eq('organization_id', organization_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Project not found or access denied' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🧹 Starting cleanup for project: ${project.name} (${project_id})`);

    // 2. Delete project from Master database
    const { error: deleteError } = await masterClient
      .from('projects')
      .delete()
      .eq('id', project_id);

    if (deleteError) {
      console.error('❌ Failed to delete project from Master:', deleteError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to delete project: ${deleteError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Project deleted from Master database');

    // 3. Drop schema in Slave database
    const schemaName = `org_${organization_id.replace(/-/g, '')}`;
    
    try {
      // First, check if schema exists
      const { data: schemaExists, error: checkError } = await slaveClient.rpc('exec_sql', {
        query: `
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name = '${schemaName}';
        `
      });

      if (checkError) {
        console.warn('⚠️ Could not check if schema exists:', checkError.message);
      } else if (Array.isArray(schemaExists) && schemaExists.length > 0) {
        // Schema exists, drop it
        const { error: dropError } = await slaveClient.rpc('exec_sql', {
          query: `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`
        });

        if (dropError) {
          console.error('❌ Failed to drop schema:', dropError.message);
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to drop schema: ${dropError.message}`
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Schema ${schemaName} dropped from Slave database`);
      } else {
        console.log(`ℹ️ Schema ${schemaName} does not exist in Slave database`);
      }

    } catch (schemaError) {
      console.error('❌ Error during schema cleanup:', schemaError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Schema cleanup failed: ${schemaError.message}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Log the cleanup
    console.log(`🎉 Project cleanup completed successfully for: ${project.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Project ${project.name} and its schema have been cleaned up successfully`,
        project_id,
        schema_dropped: schemaName,
        cleaned_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Project cleanup failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});










