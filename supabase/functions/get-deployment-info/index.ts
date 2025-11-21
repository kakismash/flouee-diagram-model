// Edge Function: Get Deployment Info
// Returns deployment configuration without sensitive keys
// Validates user belongs to the organization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GetDeploymentInfoRequest {
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
    const { organizationId }: GetDeploymentInfoRequest = await req.json()

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

    // Get deployment config
    const { data: deploymentConfig, error: configError } = await masterClient
      .from('deployment_configs')
      .select(`
        supabase_project_ref,
        supabase_project_url,
        schema_name,
        status,
        organizations!inner (
          deployment_strategy
        )
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

    // Return only safe information (NO keys)
    return new Response(
      JSON.stringify({
        success: true,
        deployment: {
          projectRef: deploymentConfig.supabase_project_ref,
          projectUrl: deploymentConfig.supabase_project_url,
          schemaName: deploymentConfig.schema_name,
          status: deploymentConfig.status,
          deploymentStrategy: (deploymentConfig.organizations as any)?.deployment_strategy
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in get-deployment-info:', error)
    
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

