// Edge Function: Create Tenant
// This function creates a new tenant and sets up the initial structure

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateTenantRequest {
  name: string;
  slug: string;
  admin_email: string;
  admin_name: string;
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
    const { name, slug, admin_email, admin_name }: CreateTenantRequest = await req.json()

    // Validate required fields
    if (!name || !slug || !admin_email || !admin_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if slug is already taken
    const { data: existingTenant } = await supabaseClient
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingTenant) {
      return new Response(
        JSON.stringify({ error: 'Slug already exists' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .insert({
        name,
        slug
      })
      .select()
      .single()

    if (tenantError) {
      throw tenantError
    }

    // Create admin user
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .insert({
        email: admin_email,
        tenant_id: tenant.id,
        role: 'admin'
      })
      .select()
      .single()

    if (userError) {
      // Rollback tenant creation
      await supabaseClient
        .from('tenants')
        .delete()
        .eq('id', tenant.id)
      
      throw userError
    }

    // Create tenant_user association
    const { error: tenantUserError } = await supabaseClient
      .from('tenant_users')
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        role: 'owner'
      })

    if (tenantUserError) {
      // Rollback previous operations
      await supabaseClient
        .from('users')
        .delete()
        .eq('id', user.id)
      
      await supabaseClient
        .from('tenants')
        .delete()
        .eq('id', tenant.id)
      
      throw tenantUserError
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        admin_user: {
          id: user.id,
          email: user.email
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error creating tenant:', error)
    
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

