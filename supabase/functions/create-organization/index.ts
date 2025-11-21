// Edge Function: Create Organization
// Creates a new organization for an existing authenticated user
// Similar to complete-signup but for users who already have an account

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateOrganizationRequest {
  organizationName: string;
  slug?: string;
  tier?: 'free' | 'basic' | 'premium';
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

    // Check if user already has an organization
    const { data: existingUser, error: userCheckError } = await masterClient
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (userCheckError) {
      return new Response(
        JSON.stringify({ error: 'Failed to check user status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (existingUser?.organization_id) {
      return new Response(
        JSON.stringify({ 
          error: 'User already belongs to an organization',
          organization_id: existingUser.organization_id 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { organizationName, slug, tier = 'free' }: CreateOrganizationRequest = await req.json()

    if (!organizationName) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: organizationName' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate organization slug from name
    const orgSlug = slug || organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'organization'

    // Ensure slug is unique
    let finalSlug = orgSlug
    let slugExists = true
    let attempts = 0
    while (slugExists && attempts < 10) {
      const { data: existing } = await masterClient
        .from('organizations')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle()
      
      if (!existing) {
        slugExists = false
      } else {
        finalSlug = `${orgSlug}-${Date.now()}`
        attempts++
      }
    }

    console.log(`📝 Creating organization: ${organizationName} (slug: ${finalSlug})`)

    // Create organization using RPC function
    let orgId: string
    try {
      const { data: orgIdResult, error: orgError } = await masterClient.rpc('create_organization', {
        p_user_id: userId,
        p_name: organizationName,
        p_slug: finalSlug,
        p_tier: tier
      })

      if (orgError) {
        console.error('❌ Error creating organization via RPC:', orgError)
        throw orgError
      }

      orgId = orgIdResult as string
      console.log(`✅ Organization created via RPC: ${orgId}`)
      
    } catch (rpcError: any) {
      // If RPC fails, try direct insert with service role
      console.log('⚠️ RPC failed, trying direct insert...')
      
      const { data: orgData, error: directError } = await masterClient
        .from('organizations')
        .insert({
          name: organizationName,
          slug: finalSlug,
          subscription_tier: tier,
          subscription_status: 'active',
          deployment_strategy: tier === 'free' ? 'shared_schema' : tier === 'basic' ? 'dedicated_schema' : 'dedicated_project',
          max_users: tier === 'free' ? 5 : tier === 'basic' ? 20 : 999999,
          max_projects: tier === 'free' ? 3 : tier === 'basic' ? 10 : 999999,
          max_tables_per_project: tier === 'free' ? 10 : tier === 'basic' ? 50 : 999999,
          max_relationships_per_project: tier === 'free' ? 20 : tier === 'basic' ? 100 : 999999,
          current_users: 1,
          current_projects: 0,
          created_by: userId
        })
        .select('id')
        .single()

      if (directError || !orgData) {
        console.error('❌ Error creating organization directly:', directError)
        return new Response(
          JSON.stringify({ error: 'Failed to create organization', details: directError?.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      orgId = orgData.id

      // Update user record with organization_id
      const { error: userUpdateError } = await masterClient
        .from('users')
        .update({
          organization_id: orgId,
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (userUpdateError) {
        // Rollback: delete organization
        await masterClient
          .from('organizations')
          .delete()
          .eq('id', orgId)
        
        console.error('❌ Error updating user record:', userUpdateError)
        return new Response(
          JSON.stringify({ error: 'Failed to link user to organization', details: userUpdateError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create deployment config if RPC didn't create it
      const { data: existingConfig } = await masterClient
        .from('deployment_configs')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle()

      if (!existingConfig) {
        const { error: deployError } = await masterClient
          .from('deployment_configs')
          .insert({
            organization_id: orgId,
            supabase_project_ref: 'ffzufnwxvqngglsapqrf', // Default slave project
            supabase_project_url: 'https://ffzufnwxvqngglsapqrf.supabase.co',
            supabase_anon_key: Deno.env.get('SLAVE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmenVmbnd4dnFuZ2dsc2FwcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyOTgzMjUsImV4cCI6MjA3NTg3NDMyNX0.jtWyQfdhh3B5y9fYStOral6uy3xaa1IOw50LkkQ41k4',
            schema_name: tier === 'free' ? 'public' : `org_${finalSlug.replace(/-/g, '_')}`,
            status: 'active'
          })

        if (deployError) {
          // Rollback: delete user link and organization
          await masterClient
            .from('users')
            .update({ organization_id: null, role: null })
            .eq('id', userId)
          await masterClient
            .from('organizations')
            .delete()
            .eq('id', orgId)
          
          console.error('❌ Error creating deployment config:', deployError)
          return new Response(
            JSON.stringify({ error: 'Failed to create deployment config' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
    }

    console.log(`✅ Organization created successfully: ${orgId}`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        organization_id: orgId,
        organization_name: organizationName,
        slug: finalSlug,
        tier: tier
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in create-organization:', error)
    
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

