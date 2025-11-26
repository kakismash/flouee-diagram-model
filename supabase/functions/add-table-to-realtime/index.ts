// Edge Function: Add Table to Realtime
// Validates user belongs to organization and uses service_role to add table to realtime publication
// This is more secure than allowing authenticated users to call the RPC directly

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AddTableToRealtimeRequest {
  organizationId: string;
  tableName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client with service role key for master
    const masterClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { organizationId, tableName }: AddTableToRealtimeRequest = await req.json()

    if (!organizationId || !tableName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organizationId, tableName' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract user ID from JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await masterClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userId = user.id

    // Validate user belongs to the organization
    const { data: userRecord, error: userCheckError } = await masterClient
      .from('users')
      .select('organization_id, role')
      .eq('id', userId)
      .single()

    if (userCheckError || !userRecord) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (userRecord.organization_id !== organizationId) {
      return new Response(
        JSON.stringify({ error: 'User does not belong to this organization' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get deployment config for the organization
    const { data: deploymentConfig, error: configError } = await masterClient
      .from('deployment_configs')
      .select(`
        supabase_project_url,
        supabase_service_role_key,
        schema_name,
        status
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (configError || !deploymentConfig) {
      return new Response(
        JSON.stringify({ error: 'Deployment configuration not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!deploymentConfig.supabase_service_role_key) {
      return new Response(
        JSON.stringify({ error: 'Service role key not available for this deployment' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate schema name: org_ + organizationId without dashes
    const schemaName = `org_${organizationId.replace(/-/g, '')}`

    // Create slave client with service_role_key
    const slaveClient = createClient(
      deploymentConfig.supabase_project_url,
      deploymentConfig.supabase_service_role_key
    )

    // Call add_table_to_realtime RPC in slave using service_role
    const { data, error } = await slaveClient.rpc('add_table_to_realtime', {
      p_schema_name: schemaName,
      p_table_name: tableName
    })

    if (error) {
      console.error('Error adding table to realtime:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to add table to realtime',
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        schemaName,
        tableName,
        message: `Table ${schemaName}.${tableName} added to realtime publication`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in add-table-to-realtime:', error)
    
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

