-- Migration: User Management RPCs for Organization Settings
-- Functions to invite, remove, and manage organization members

-- =====================================================
-- Function: Invite user to organization
-- =====================================================
CREATE OR REPLACE FUNCTION invite_user_to_organization(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'viewer'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invited_by UUID;
  v_invitation_id UUID;
  v_existing_user UUID;
  v_current_users INT;
  v_max_users INT;
BEGIN
  -- Get current user
  v_invited_by := auth.uid();
  
  -- Verify inviter is admin or owner
  IF NOT EXISTS (
    SELECT 1 FROM user_organizations
    WHERE organization_id = p_organization_id
    AND user_id = v_invited_by
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only owners and admins can invite users';
  END IF;
  
  -- Check if user limit would be exceeded
  SELECT current_users, max_users INTO v_current_users, v_max_users
  FROM organizations
  WHERE id = p_organization_id;
  
  IF v_current_users >= v_max_users THEN
    RAISE EXCEPTION 'User limit reached for this organization';
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('owner', 'admin', 'editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;
  
  -- Check if user already exists in auth.users
  SELECT id INTO v_existing_user
  FROM auth.users
  WHERE email = p_email;
  
  IF v_existing_user IS NOT NULL THEN
    -- User exists, check if already in organization
    IF EXISTS (
      SELECT 1 FROM user_organizations
      WHERE organization_id = p_organization_id
      AND user_id = v_existing_user
    ) THEN
      RAISE EXCEPTION 'User already member of this organization';
    END IF;
    
    -- Add user directly
    INSERT INTO user_organizations (
      user_id,
      organization_id,
      role,
      invited_by,
      invited_at,
      accepted_at
    ) VALUES (
      v_existing_user,
      p_organization_id,
      p_role,
      v_invited_by,
      NOW(),
      NOW() -- Immediately accepted since user exists
    )
    RETURNING id INTO v_invitation_id;
    
    -- Update organization user count
    UPDATE organizations
    SET current_users = current_users + 1
    WHERE id = p_organization_id;
    
  ELSE
    -- User doesn't exist yet, create invitation record
    -- (invitation will be completed when user signs up)
    INSERT INTO user_organizations (
      user_id,
      organization_id,
      role,
      invited_by,
      invited_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::UUID, -- Placeholder
      p_organization_id,
      p_role,
      v_invited_by,
      NOW()
    )
    RETURNING id INTO v_invitation_id;
    
    -- TODO: Send invitation email
    -- This would be handled by an Edge Function
  END IF;
  
  RETURN v_invitation_id;
END;
$$;

-- =====================================================
-- Function: Remove user from organization
-- =====================================================
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
  FROM user_organizations
  WHERE organization_id = p_organization_id
  AND user_id = v_removing_user;
  
  SELECT role INTO v_target_role
  FROM user_organizations
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id;
  
  -- Verify permissions
  IF v_remover_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can remove users';
  END IF;
  
  -- Can't remove owner
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove organization owner';
  END IF;
  
  -- Remove user
  DELETE FROM user_organizations
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id;
  
  -- Update organization user count
  UPDATE organizations
  SET current_users = current_users - 1
  WHERE id = p_organization_id;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- Function: Change user role in organization
-- =====================================================
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
  v_target_role TEXT;
BEGIN
  -- Get current user
  v_changing_user := auth.uid();
  
  -- Validate new role
  IF p_new_role NOT IN ('owner', 'admin', 'editor', 'viewer') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;
  
  -- Get roles
  SELECT role INTO v_changer_role
  FROM user_organizations
  WHERE organization_id = p_organization_id
  AND user_id = v_changing_user;
  
  SELECT role INTO v_target_role
  FROM user_organizations
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id;
  
  -- Verify permissions
  IF v_changer_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can change roles';
  END IF;
  
  -- Can't change owner role
  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change role of organization owner';
  END IF;
  
  -- Can't make someone else owner (use transfer ownership function)
  IF p_new_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot promote to owner, use transfer ownership instead';
  END IF;
  
  -- Update role
  UPDATE user_organizations
  SET role = p_new_role
  WHERE organization_id = p_organization_id
  AND user_id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- Function: Get organization members
-- =====================================================
CREATE OR REPLACE FUNCTION get_organization_members(
  p_organization_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  role TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
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
    SELECT 1 FROM user_organizations
    WHERE organization_id = p_organization_id
    AND user_id = v_requesting_user
  ) THEN
    RAISE EXCEPTION 'User not authorized to view organization members';
  END IF;
  
  -- Return members
  RETURN QUERY
  SELECT 
    uo.user_id,
    au.email,
    uo.role,
    uo.invited_by,
    uo.invited_at,
    uo.accepted_at,
    CASE 
      WHEN uo.accepted_at IS NOT NULL THEN 'active'
      WHEN uo.invited_at IS NOT NULL THEN 'invited'
      ELSE 'pending'
    END as status
  FROM user_organizations uo
  JOIN auth.users au ON au.id = uo.user_id
  WHERE uo.organization_id = p_organization_id
  ORDER BY 
    CASE uo.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'editor' THEN 3
      WHEN 'viewer' THEN 4
    END,
    uo.invited_at DESC;
END;
$$;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION invite_user_to_organization TO authenticated;
GRANT EXECUTE ON FUNCTION remove_user_from_organization TO authenticated;
GRANT EXECUTE ON FUNCTION change_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_members TO authenticated;

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON FUNCTION invite_user_to_organization IS 'Invite a user to join an organization with specified role';
COMMENT ON FUNCTION remove_user_from_organization IS 'Remove a user from an organization (except owner)';
COMMENT ON FUNCTION change_user_role IS 'Change a user''s role within an organization';
COMMENT ON FUNCTION get_organization_members IS 'Get all members of an organization with their roles and status';












