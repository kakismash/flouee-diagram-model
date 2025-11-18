import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check all environment variables
    const envVars = {
      // Master project variables (should be available by default)
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'SET' : 'NOT SET',
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') ? 'SET' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'SET' : 'NOT SET',
      // Slave project variables (need to be configured)
      SLAVE_URL: Deno.env.get('SLAVE_URL') ? 'SET' : 'NOT SET',
      SLAVE_SERVICE_ROLE_KEY: Deno.env.get('SLAVE_SERVICE_ROLE_KEY') ? 'SET' : 'NOT SET',
    };

    // Show partial values for debugging (first 20 chars)
    const envVarsWithValues = {
      // Master project variables
      SUPABASE_URL: Deno.env.get('SUPABASE_URL')?.substring(0, 20) + '...' || 'NOT SET',
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY')?.substring(0, 20) + '...' || 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 20) + '...' || 'NOT SET',
      // Slave project variables
      SLAVE_URL: Deno.env.get('SLAVE_URL')?.substring(0, 20) + '...' || 'NOT SET',
      SLAVE_SERVICE_ROLE_KEY: Deno.env.get('SLAVE_SERVICE_ROLE_KEY')?.substring(0, 20) + '...' || 'NOT SET',
    };

    return new Response(
      JSON.stringify({
        success: true,
        environment_variables_status: envVars,
        environment_variables_values: envVarsWithValues,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
