-- Migration: Add RPC function to create organizations
-- This allows users to create organizations from the frontend

-- Create function to create a new organization
CREATE OR REPLACE FUNCTION create_organization(
  p_user_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_tier TEXT DEFAULT 'free'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_config_id UUID;
  v_slug_exists BOOLEAN;
BEGIN
  -- Validate tier
  IF p_tier NOT IN ('free', 'basic', 'premium') THEN
    RAISE EXCEPTION 'Invalid subscription tier: %', p_tier;
  END IF;

  -- Check if slug already exists
  SELECT EXISTS(SELECT 1 FROM organizations WHERE slug = p_slug) INTO v_slug_exists;
  
  IF v_slug_exists THEN
    RAISE EXCEPTION 'Organization slug already exists: %', p_slug;
  END IF;

  -- Create organization
  INSERT INTO organizations (
    id,
    name,
    slug,
    subscription_tier,
    subscription_status,
    deployment_strategy,
    max_users,
    max_projects,
    max_tables_per_project,
    max_relationships_per_project,
    current_users,
    current_projects,
    created_by
  ) VALUES (
    gen_random_uuid(),
    p_name,
    p_slug,
    p_tier,
    'active',
    CASE 
      WHEN p_tier = 'free' THEN 'shared_schema'
      WHEN p_tier = 'basic' THEN 'dedicated_schema'
      WHEN p_tier = 'premium' THEN 'dedicated_project'
    END,
    CASE 
      WHEN p_tier = 'free' THEN 5
      WHEN p_tier = 'basic' THEN 20
      WHEN p_tier = 'premium' THEN 999999
    END,
    CASE 
      WHEN p_tier = 'free' THEN 3
      WHEN p_tier = 'basic' THEN 10
      WHEN p_tier = 'premium' THEN 999999
    END,
    CASE 
      WHEN p_tier = 'free' THEN 10
      WHEN p_tier = 'basic' THEN 50
      WHEN p_tier = 'premium' THEN 999999
    END,
    CASE 
      WHEN p_tier = 'free' THEN 20
      WHEN p_tier = 'basic' THEN 100
      WHEN p_tier = 'premium' THEN 999999
    END,
    1, -- current_users (creator)
    0, -- current_projects
    p_user_id
  )
  RETURNING id INTO v_org_id;

  -- Link user to organization as admin
  INSERT INTO user_organizations (
    user_id,
    organization_id,
    role,
    invited_by,
    accepted_at
  ) VALUES (
    p_user_id,
    v_org_id,
    'admin',
    p_user_id,
    NOW()
  );

  -- For free/basic tier: Create deployment config to existing Slave project
  -- For premium: Would need to provision a new project (not implemented yet)
  IF p_tier IN ('free', 'basic') THEN
    -- Get an available slave project (with capacity)
    -- For now, use the default slave project
    INSERT INTO deployment_configs (
      id,
      organization_id,
      supabase_project_ref,
      supabase_project_url,
      supabase_anon_key,
      schema_name,
      status,
      provisioned_at
    ) VALUES (
      gen_random_uuid(),
      v_org_id,
      'ffzufnwxvqngglsapqrf', -- Default slave project
      'https://ffzufnwxvqngglsapqrf.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmenVmbnd4dnFuZ2dsc2FwcXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyOTgzMjUsImV4cCI6MjA3NTg3NDMyNX0.jtWyQfdhh3B5y9fYStOral6uy3xaa1IOw50LkkQ41k4',
      CASE 
        WHEN p_tier = 'free' THEN 'public'
        WHEN p_tier = 'basic' THEN 'org_' || REPLACE(p_slug, '-', '_')
      END,
      'active',
      NOW()
    )
    RETURNING id INTO v_config_id;
  END IF;

  RETURN v_org_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_organization TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_organization IS 'Creates a new organization for a user with appropriate tier limits and deployment config';












