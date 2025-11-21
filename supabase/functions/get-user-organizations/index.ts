// Edge Function: Get User Organizations
// Returns organizations for the authenticated user
// Replaces get_user_organizations RPC

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get user's organization using users table
    const { data: userRecord, error: userCheckError } = await masterClient
      .from('users')
      .select(`
        organization_id,
        role,
        organizations (
          id,
          name,
          slug,
          subscription_tier,
          deployment_strategy,
          max_users,
          max_projects,
          max_tables_per_project,
          max_relationships_per_project,
          current_users,
          current_projects
        )
      `)
      .eq('id', userId)
      .single()

    if (userCheckError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If user has no organization, return empty array
    if (!userRecord.organization_id || !userRecord.organizations) {
      return new Response(
        JSON.stringify({
          success: true,
          organizations: []
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format response to match expected structure
    const org = userRecord.organizations as any
    const organizations = [{
      org_id: org.id,
      org_name: org.name,
      org_slug: org.slug,
      user_role: userRecord.role,
      subscription_tier: org.subscription_tier,
      deployment_strategy: org.deployment_strategy,
      max_users: org.max_users,
      max_projects: org.max_projects,
      max_tables_per_project: org.max_tables_per_project,
      max_relationships_per_project: org.max_relationships_per_project,
      current_users: org.current_users,
      current_projects: org.current_projects
    }]

    return new Response(
      JSON.stringify({
        success: true,
        organizations
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in get-user-organizations:', error)
    
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

