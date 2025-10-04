// Edge Function: List Schemas
// This function lists all schemas for a client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ListSchemasRequest {
  client_id: string;
  include_details?: boolean; // Whether to include tables, columns, and relationships
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { client_id, include_details = false }: ListSchemasRequest = await req.json()

    // Validate required fields
    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if client exists
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('id, name, slug')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get schemas for the client
    let query = supabaseClient
      .from('schemas')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false });

    if (include_details) {
      query = supabaseClient
        .from('schemas')
        .select(`
          *,
          tables (
            *,
            columns (*)
          ),
          relationships (*)
        `)
        .eq('client_id', client_id)
        .order('created_at', { ascending: false });
    }

    const { data: schemas, error: schemasError } = await query;

    if (schemasError) {
      throw schemasError
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        client: client,
        schemas: schemas || [],
        count: schemas?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error listing schemas:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})








