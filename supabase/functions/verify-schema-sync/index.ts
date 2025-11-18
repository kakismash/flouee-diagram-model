import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerifyRequest {
  organization_id: string;
  project_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { organization_id, project_id }: VerifyRequest = await req.json();

    if (!organization_id || !project_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing organization_id or project_id' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const masterUrl = Deno.env.get('SUPABASE_URL');
    const masterKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const slaveUrl = Deno.env.get('SLAVE_URL');
    const slaveKey = Deno.env.get('SLAVE_SERVICE_ROLE_KEY');

    if (!masterUrl || !masterKey || !slaveUrl || !slaveKey) {
      throw new Error('Missing Supabase configuration');
    }

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const masterClient = createClient(masterUrl, masterKey);
    const slaveClient = createClient(slaveUrl, slaveKey);

    // 1. Get Master state
    const { data: project, error: masterError } = await masterClient
      .from('projects')
      .select('version, schema_hash, schema_data')
      .eq('id', project_id)
      .single();

    if (masterError || !project) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Project not found in Master' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get Slave metadata
    const schema = `org_${organization_id.replace(/-/g, '')}`;
    
    let slaveMetadata = {
      schema_version: 0,
      schema_hash: '',
      sync_status: 'not_initialized',
      last_synced_at: null
    };

    try {
      const { data: metadata, error: slaveError } = await slaveClient.rpc('get_schema_metadata', {
        p_schema: schema,
        p_project_id: project_id
      });

      if (!slaveError && metadata && metadata.length > 0) {
        slaveMetadata = metadata[0];
      } else {
        console.log('Metadata not found, using defaults');
      }
    } catch (error) {
      console.log('Error getting metadata (table might not exist):', error.message);
    }

    // 3. Compare
    const synced = project.version === slaveMetadata.schema_version && 
                   project.schema_hash === slaveMetadata.schema_hash;

    const versionDiff = project.version - slaveMetadata.schema_version;

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        master: {
          version: project.version,
          hash: project.schema_hash?.substring(0, 8) + '...' || 'none'
        },
        slave: {
          version: slaveMetadata.schema_version,
          hash: slaveMetadata.schema_hash?.substring(0, 8) + '...' || 'none',
          status: slaveMetadata.sync_status,
          last_synced: slaveMetadata.last_synced_at
        },
        needs_reconciliation: !synced,
        version_diff: versionDiff,
        schema: schema
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});








