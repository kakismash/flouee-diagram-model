// Edge Function: Initialize Slave Client
// Returns slave project URL and anon_key (safe to expose) after validating user belongs to organization
// This replaces direct access to deployment_configs from frontend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InitializeSlaveClientRequest {
  organizationId: string;
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
    const { organizationId }: InitializeSlaveClientRequest = await req.json()

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: organizationId' }),
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

    // Get deployment config (including anon_key which is safe to expose)
    const { data: deploymentConfig, error: configError } = await masterClient
      .from('deployment_configs')
      .select(`
        supabase_project_ref,
        supabase_project_url,
        supabase_anon_key,
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

    // Return slave client configuration
    // NOTE: anon_key is safe to expose (it's public by design)
    // service_role_key is NEVER returned
    return new Response(
      JSON.stringify({
        success: true,
        slaveClient: {
          projectRef: deploymentConfig.supabase_project_ref,
          projectUrl: deploymentConfig.supabase_project_url,
          anonKey: deploymentConfig.supabase_anon_key,  // Safe to expose
          schemaName: deploymentConfig.schema_name,
          status: deploymentConfig.status
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in initialize-slave-client:', error)
    
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

