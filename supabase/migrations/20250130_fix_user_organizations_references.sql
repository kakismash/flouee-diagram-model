-- Migration: Fix all references to user_organizations table
-- This migration updates all functions and policies to use the users table
-- instead of the non-existent user_organizations table

-- =====================================================
-- 1. Update get_user_organizations function
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_organizations(p_user_id UUID)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    org_slug TEXT,
    user_role TEXT,
    subscription_tier TEXT,
    deployment_strategy TEXT,
    max_users INTEGER,
    max_projects INTEGER,
    max_tables_per_project INTEGER,
    max_relationships_per_project INTEGER,
    current_users INTEGER,
    current_projects INTEGER
) AS $$
BEGIN
    -- Return the user's organization (if they have one)
    -- If organization_id is NULL, returns no rows (user has no organization)
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        o.slug,
        u.role::TEXT,  -- User's role in the system (admin, member)
        o.subscription_tier,
        o.deployment_strategy,
        o.max_users,
        o.max_projects,
        o.max_tables_per_project,
        o.max_relationships_per_project,
        o.current_users,
        o.current_projects
    FROM users u
    JOIN organizations o ON o.id = u.organization_id
    WHERE u.id = p_user_id
      AND u.organization_id IS NOT NULL;  -- Only return if user has an organization
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. Update user_can_manage_org function
-- =====================================================
CREATE OR REPLACE FUNCTION user_can_manage_org(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id
          AND organization_id = p_org_id
          AND role IN ('admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. Update get_deployment_config to NOT expose service_role_key
-- =====================================================
-- Drop and recreate to change return type
DROP FUNCTION IF EXISTS get_deployment_config(UUID);
CREATE FUNCTION get_deployment_config(p_organization_id UUID)
RETURNS TABLE (
    supabase_project_ref TEXT,
    supabase_project_url TEXT,
    supabase_anon_key TEXT,
    schema_name TEXT,
    status TEXT,
    deployment_strategy TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dc.supabase_project_ref,
        dc.supabase_project_url,
        dc.supabase_anon_key,  -- anon_key is safe to expose
        dc.schema_name,
        dc.status,
        o.deployment_strategy
    FROM deployment_configs dc
    JOIN organizations o ON o.id = dc.organization_id
    WHERE dc.organization_id = p_organization_id
      AND dc.status = 'active'
    LIMIT 1;
    -- NOTE: supabase_service_role_key is intentionally NOT returned
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Update RLS policies that reference user_organizations
-- =====================================================

-- Update provisioning_alerts policies
DROP POLICY IF EXISTS "Admins can view provisioning alerts" ON provisioning_alerts;
CREATE POLICY "Admins can view provisioning alerts"
    ON provisioning_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
              AND role IN ('admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update provisioning alerts" ON provisioning_alerts;
CREATE POLICY "Admins can update provisioning alerts"
    ON provisioning_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
              AND role IN ('admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
              AND role IN ('admin')
        )
    );

-- =====================================================
-- 5. Update user management functions
-- NOTE: These functions currently use user_organizations for multi-org support
-- For now, we'll comment them out or update them to work with single-org model
-- =====================================================

-- invite_user_to_organization: This function assumes multi-org support
-- Since we're using single-org model (users.organization_id), we need to rethink this
-- For now, we'll create a simplified version that updates users table

CREATE OR REPLACE FUNCTION invite_user_to_organization(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invited_by UUID;
  v_existing_user_id UUID;
  v_current_users INT;
  v_max_users INT;
BEGIN
  -- Get current user
  v_invited_by := auth.uid();
  
  -- Verify inviter is admin of the organization
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_invited_by
      AND organization_id = p_organization_id
      AND role IN ('admin')
  ) THEN
    RAISE EXCEPTION 'Only admins can invite users';
  END IF;
  
  -- Check if user limit would be exceeded
  SELECT current_users, max_users INTO v_current_users, v_max_users
  FROM organizations
  WHERE id = p_organization_id;
  
  IF v_current_users >= v_max_users THEN
    RAISE EXCEPTION 'User limit reached for this organization';
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be admin or member', p_role;
  END IF;
  
  -- Check if user already exists in auth.users
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_existing_user_id IS NOT NULL THEN
    -- User exists, check if already in an organization
    IF EXISTS (
      SELECT 1 FROM users
      WHERE id = v_existing_user_id
        AND organization_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'User already belongs to an organization';
    END IF;
    
    -- Add user to organization
    INSERT INTO users (
      id,
      email,
      organization_id,
      role
    ) VALUES (
      v_existing_user_id,
      p_email,
      p_organization_id,
      p_role
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      organization_id = p_organization_id,
      role = p_role,
      updated_at = NOW();
    
    -- Update organization user count
    UPDATE organizations
    SET current_users = current_users + 1
    WHERE id = p_organization_id;
    
    RETURN v_existing_user_id;
  ELSE
    -- User doesn't exist yet - would need invitation system
    -- For now, raise exception
    RAISE EXCEPTION 'User with email % does not exist. They must sign up first.', p_email;
  END IF;
END;
$$;

-- remove_user_from_organization: Simplified for single-org model
CREATE OR REPLACE FUNCTION remove_user_from_organization(
  p_organization_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removing_user UUID;
  v_target_role TEXT;
  v_remover_role TEXT;
BEGIN
  -- Get current user
  v_removing_user := auth.uid();
  
  -- Get roles
  SELECT role INTO v_remover_role
  FROM users
  WHERE id = v_removing_user
    AND organization_id = p_organization_id;
  
  SELECT role INTO v_target_role
  FROM users
  WHERE id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Verify permissions
  IF v_remover_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can remove users';
  END IF;
  
  -- Can't remove yourself
  IF p_user_id = v_removing_user THEN
    RAISE EXCEPTION 'Cannot remove yourself from organization';
  END IF;
  
  -- Remove user from organization
  UPDATE users
  SET organization_id = NULL,
      role = NULL,
      updated_at = NOW()
  WHERE id = p_user_id
    AND organization_id = p_organization_id;
  
  -- Update organization user count
  UPDATE organizations
  SET current_users = GREATEST(0, current_users - 1)
  WHERE id = p_organization_id;
  
  RETURN TRUE;
END;
$$;

-- change_user_role: Simplified for single-org model
CREATE OR REPLACE FUNCTION change_user_role(
  p_organization_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changing_user UUID;
  v_changer_role TEXT;
BEGIN
  -- Get current user
  v_changing_user := auth.uid();
  
  -- Validate new role
  IF p_new_role NOT IN ('admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be admin or member', p_new_role;
  END IF;
  
  -- Get changer role
  SELECT role INTO v_changer_role
  FROM users
  WHERE id = v_changing_user
    AND organization_id = p_organization_id;
  
  -- Verify permissions
  IF v_changer_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can change roles';
  END IF;
  
  -- Can't change your own role
  IF p_user_id = v_changing_user THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;
  
  -- Update role
  UPDATE users
  SET role = p_new_role,
      updated_at = NOW()
  WHERE id = p_user_id
    AND organization_id = p_organization_id;
  
  RETURN TRUE;
END;
$$;

-- get_organization_members: Simplified for single-org model
CREATE OR REPLACE FUNCTION get_organization_members(
  p_organization_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requesting_user UUID;
BEGIN
  -- Get current user
  v_requesting_user := auth.uid();
  
  -- Verify user is member of organization
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = v_requesting_user
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'User not authorized to view organization members';
  END IF;
  
  -- Return members
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    u.role,
    u.created_at,
    u.updated_at,
    'active' as status  -- All users in users table are active
  FROM users u
  WHERE u.organization_id = p_organization_id
  ORDER BY 
    CASE u.role
      WHEN 'admin' THEN 1
      WHEN 'member' THEN 2
      ELSE 3
    END,
    u.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION invite_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_organization TO authenticated;
GRANT EXECUTE ON FUNCTION change_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_members TO authenticated;

-- Comments
COMMENT ON FUNCTION get_user_organizations IS 'Returns the organization for a user (single-org model using users table)';
COMMENT ON FUNCTION user_can_manage_org IS 'Checks if user can manage an organization (uses users table)';
COMMENT ON FUNCTION get_deployment_config IS 'Returns deployment config WITHOUT service_role_key for security';
COMMENT ON FUNCTION invite_user_to_organization IS 'Invite an existing user to join an organization (single-org model)';
COMMENT ON FUNCTION remove_user_from_organization IS 'Remove a user from an organization (single-org model)';
COMMENT ON FUNCTION change_user_role IS 'Change a user role within an organization (single-org model)';
COMMENT ON FUNCTION get_organization_members IS 'Get all members of an organization (single-org model)';

