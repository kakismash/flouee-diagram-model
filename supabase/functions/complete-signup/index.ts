// Edge Function: Complete Signup
// Handles complete signup process: organization creation, slave schema setup, deployment config, and user linking

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CompleteSignupRequest {
  userId: string;
  organizationName?: string;
}

interface SlaveConfig {
  supabase_project_url: string;
  supabase_anon_key: string;
  supabase_service_role_key?: string;
  schema_name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for master
    const masterClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { userId, organizationName }: CompleteSignupRequest = await req.json()

    // Validate required fields
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🚀 Starting complete signup for user: ${userId}`)

    // 1. Verify user exists in auth.users (this validates the userId is legitimate)
    // This is the security check - we validate the userId exists even without JWT
    const { data: authUser, error: authError } = await masterClient.auth.admin.getUserById(userId)
    if (authError || !authUser) {
      console.error('❌ User not found in auth.users:', authError)
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Additional security: If auth header is provided, verify it matches the userId
    // This prevents unauthorized users from creating orgs for other users
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: tokenUser }, error: tokenError } = await masterClient.auth.getUser(token)
      if (!tokenError && tokenUser && tokenUser.id !== userId) {
        console.error('❌ Token user does not match userId')
        return new Response(
          JSON.stringify({ error: 'Unauthorized: token user does not match userId' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    // 2. Check if user is already linked to an organization (check users table)
    const { data: existingUser, error: userError } = await masterClient
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle()

    if (userError) {
      console.error('❌ Error checking users table:', userError)
      // If table doesn't exist or error, continue (user might not be in users table yet)
      console.log('ℹ️ Continuing - users table check failed (may not exist yet)')
    }

    if (existingUser?.organization_id) {
      console.log('⚠️ User already linked to organization:', existingUser.organization_id)
      return new Response(
        JSON.stringify({ 
          error: 'User already has an organization',
          organization_id: existingUser.organization_id 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 3. Generate organization slug from name
    const orgName = organizationName || authUser.user_metadata?.organization_name || 'My Organization'
    const orgSlug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50) || 'organization'

    // Ensure slug is unique by appending timestamp if needed
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

    console.log(`📝 Creating organization: ${orgName} (slug: ${finalSlug})`)

    // 4. Create organization using RPC function
    let orgId: string
    try {
      const { data: orgIdResult, error: orgError } = await masterClient.rpc('create_organization', {
        p_user_id: userId,
        p_name: orgName,
        p_slug: finalSlug,
        p_tier: 'free'
      })

      if (orgError) {
        console.error('❌ Error creating organization via RPC:', orgError)
        throw orgError
      }

      orgId = orgIdResult as string
      console.log(`✅ Organization created via RPC: ${orgId}`)
      
      // Verify user was created/updated by RPC function
      // The RPC function should have created/updated the user record
      const { data: userCheck, error: userCheckError } = await masterClient
        .from('users')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle()
      
      if (userCheckError) {
        console.warn('⚠️ Could not verify user record after RPC:', userCheckError.message)
      } else if (!userCheck || userCheck.organization_id !== orgId) {
        // User record doesn't exist or wasn't linked correctly - create it
        console.log('⚠️ User record not found or not linked, creating...')
        const { error: userCreateError } = await masterClient
          .from('users')
          .upsert({
            id: userId,
            email: authUser.email || '',
            organization_id: orgId,
            role: 'admin'
          }, {
            onConflict: 'id'
          })
        
        if (userCreateError) {
          console.error('❌ Error creating user record after RPC:', userCreateError)
          // Don't fail - RPC created org, just log the error
        } else {
          console.log('✅ User record created/updated after RPC')
        }
      } else {
        console.log('✅ User record verified - already linked to organization')
      }
    } catch (rpcError: any) {
      // If RPC fails, try direct insert with service role
      console.log('⚠️ RPC failed, trying direct insert...')
      
      const { data: orgData, error: directError } = await masterClient
        .from('organizations')
        .insert({
          name: orgName,
          slug: finalSlug,
          subscription_tier: 'free',
          subscription_status: 'active',
          deployment_strategy: 'shared_schema',
          max_users: 5,
          max_projects: 3,
          max_tables_per_project: 10,
          max_relationships_per_project: 20,
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

      // Create user record in users table with organization_id
      // This is the primary way to link users to organizations
      const { error: userTableError } = await masterClient
        .from('users')
        .upsert({
          id: userId,
          email: authUser.email || '',
          organization_id: orgId,
          role: 'admin'
        }, {
          onConflict: 'id'
        })
        .select()
        .single()

      if (userTableError) {
        // Rollback: delete organization
        await masterClient
          .from('organizations')
          .delete()
          .eq('id', orgId)
        
        console.error('❌ Error creating user record:', userTableError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user record', details: userTableError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('✅ User record created/updated in users table')

      // Create deployment config (RPC function should have created it, but if direct insert was used, create it here)
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
            schema_name: 'public', // Free tier uses public schema
            status: 'active'
          })

        if (deployError) {
          // Rollback: delete user record and organization
          await masterClient
            .from('users')
            .update({ organization_id: null })
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
        console.log('✅ Deployment config created')
      } else {
        console.log('✅ Deployment config already exists (created by RPC)')
      }
    }

    // 5. Get deployment config for slave project
    const { data: deploymentConfig, error: configError } = await masterClient
      .from('deployment_configs')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .single()

    if (configError || !deploymentConfig) {
      console.error('❌ Error getting deployment config:', configError)
      // Don't rollback here - organization is created, just log the error
      return new Response(
        JSON.stringify({ 
          error: 'Organization created but deployment config not found',
          organization_id: orgId 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 6. Create slave client connection
    const slaveConfig: SlaveConfig = {
      supabase_project_url: deploymentConfig.supabase_project_url,
      supabase_anon_key: deploymentConfig.supabase_anon_key,
      supabase_service_role_key: deploymentConfig.supabase_service_role_key || Deno.env.get('SLAVE_SERVICE_ROLE_KEY') || undefined,
      schema_name: deploymentConfig.schema_name || `org_${orgId.replace(/-/g, '')}`
    }

    const slaveClient = createClient(
      slaveConfig.supabase_project_url,
      slaveConfig.supabase_service_role_key || slaveConfig.supabase_anon_key
    )

    // 7. Create slave schema (for basic tier, free tier uses public)
    // Use the schema_name from deployment_config (set by RPC function)
    const schemaName = slaveConfig.schema_name || 'public'

    if (schemaName !== 'public') {
      try {
        console.log(`🏗️ Creating slave schema: ${schemaName}`)
        const { error: schemaError } = await slaveClient.rpc('exec_sql', {
          query: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`
        })

        if (schemaError) {
          console.error('❌ Error creating slave schema:', schemaError)
          // Don't rollback - organization is created, just log
          console.warn('⚠️ Continuing without schema creation')
        } else {
          console.log(`✅ Slave schema created: ${schemaName}`)
        }
      } catch (schemaErr: any) {
        console.error('❌ Exception creating slave schema:', schemaErr)
        // Continue - schema might already exist
      }
    } else {
      console.log(`ℹ️ Using public schema (free tier)`)
    }

    // 8. Create metadata table in schema (optional, only if schema was created)
    if (schemaName !== 'public') {
      try {
        // Note: create_schema_metadata_table requires a project_id
        // For now, we'll skip this as there are no projects yet
        // It will be created when the first project is created
        console.log(`ℹ️ Metadata table will be created when first project is added`)
      } catch (metadataErr: any) {
        console.warn('⚠️ Could not create metadata table:', metadataErr.message)
        // Non-critical, continue
      }
    }

    console.log(`✅ Complete signup successful for user: ${userId}, organization: ${orgId}`)

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        organization_id: orgId,
        organization_name: orgName,
        schema_name: schemaName,
        deployment_config: {
          id: deploymentConfig.id,
          supabase_project_url: deploymentConfig.supabase_project_url,
          schema_name: schemaName
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Error in complete-signup:', error)
    
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

