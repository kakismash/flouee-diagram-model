import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface InspectRequest {
  organization_id?: string;
  schema_name?: string;
  table_name?: string;
  mode: 'schemas' | 'tables' | 'table_details' | 'all';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { organization_id, schema_name, table_name, mode }: InspectRequest = await req.json();

    // Get Slave credentials
    const slaveUrl = Deno.env.get('SLAVE_URL') || Deno.env.get('SUPABASE_URL');
    const slaveKey = Deno.env.get('SLAVE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!slaveUrl || !slaveKey) {
      throw new Error('Slave configuration not found');
    }

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const slaveClient = createClient(slaveUrl, slaveKey);

    const result: any = {
      mode,
      timestamp: new Date().toISOString(),
      data: {}
    };

    // Determine target schema
    let targetSchema = schema_name;
    if (!targetSchema && organization_id) {
      targetSchema = `org_${organization_id.replace(/-/g, '')}`;
    }

    // Mode: List all org schemas
    if (mode === 'schemas' || mode === 'all') {
      const { data: schemas, error } = await slaveClient.rpc('list_org_schemas');
      
      if (error) {
        console.error('Error listing schemas:', error);
        result.data.schemas = [];
        result.data.schemas_error = error.message;
      } else {
        result.data.schemas = schemas || [];
      }
    }

    // Mode: List tables in schema
    if ((mode === 'tables' || mode === 'all') && targetSchema) {
      const { data: tables, error } = await slaveClient.rpc('list_schema_tables', {
        p_schema: targetSchema
      });
      
      if (error) {
        console.error('Error listing tables:', error);
        result.data.tables = {
          schema: targetSchema,
          tables: [],
          error: error.message
        };
      } else {
        result.data.tables = {
          schema: targetSchema,
          tables: tables || []
        };
      }
    }

    // Mode: Get table details
    if ((mode === 'table_details' || mode === 'all') && targetSchema && table_name) {
      const { data: columns, error: colError } = await slaveClient.rpc('get_table_columns', {
        p_schema: targetSchema,
        p_table: table_name
      });

      if (colError) {
        console.error('Error getting columns:', colError);
        result.data.table_details = {
          schema: targetSchema,
          table: table_name,
          columns: [],
          column_count: 0,
          error: colError.message
        };
      } else {
        result.data.table_details = {
          schema: targetSchema,
          table: table_name,
          columns: columns || [],
          column_count: columns?.length || 0
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Inspect error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
