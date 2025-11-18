-- ============================================
-- 🎯 RBAC & PROJECT ACCESS CONTROL
-- ============================================
-- Creates project_members table for fine-grained access control
-- Implements RLS policies for organization-based access
-- ============================================

-- ============================================
-- 1. PROJECT_MEMBERS TABLE
-- ============================================
-- Controls who can access which projects and with what permissions

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure a user can only be added once per project
  UNIQUE(project_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

-- Comments
COMMENT ON TABLE public.project_members IS 'Manages user access to projects with role-based permissions';
COMMENT ON COLUMN public.project_members.role IS 'viewer: read-only, editor: read+write, admin: full control';

-- ============================================
-- 2. RLS POLICIES FOR PROJECTS
-- ============================================

-- Enable RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;

-- SELECT: Users can see projects from their organization OR projects they're explicitly added to
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT
  USING (
    -- Super admin can see everything
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Users in same organization
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    OR
    -- Users explicitly added to project
    id IN (
      SELECT project_id 
      FROM public.project_members 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Only org admins and super admins can create projects in their organization
CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT
  WITH CHECK (
    -- Super admin can insert anywhere
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Org admin can insert in their organization
    (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'org_admin'
      AND
      organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- UPDATE: Project admins, org admins, and super admins can update
CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE
  USING (
    -- Super admin can update everything
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Org admin can update projects in their organization
    (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'org_admin'
      AND
      organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR
    -- Project admin can update their project
    id IN (
      SELECT project_id 
      FROM public.project_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Only org admins, project admins, and super admins can delete
CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE
  USING (
    -- Super admin can delete everything
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Org admin can delete projects in their organization
    (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'org_admin'
      AND
      organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR
    -- Project admin can delete their project
    id IN (
      SELECT project_id 
      FROM public.project_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 3. RLS POLICIES FOR PROJECT_MEMBERS
-- ============================================

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see members of projects they have access to
CREATE POLICY "project_members_select_policy" ON public.project_members
  FOR SELECT
  USING (
    -- Super admin can see everything
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Users can see members of projects they have access to
    project_id IN (
      SELECT id FROM public.projects
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
      OR id IN (
        SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: Only project admins and org admins can add members
CREATE POLICY "project_members_insert_policy" ON public.project_members
  FOR INSERT
  WITH CHECK (
    -- Super admin can insert anywhere
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Org admin can add members to projects in their organization
    (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'org_admin'
      AND
      project_id IN (
        SELECT id FROM public.projects
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
    OR
    -- Project admin can add members to their project
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Only project admins and org admins can update member roles
CREATE POLICY "project_members_update_policy" ON public.project_members
  FOR UPDATE
  USING (
    -- Super admin can update everything
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Org admin can update members in projects in their organization
    (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'org_admin'
      AND
      project_id IN (
        SELECT id FROM public.projects
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
    OR
    -- Project admin can update members in their project
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Only project admins and org admins can remove members
CREATE POLICY "project_members_delete_policy" ON public.project_members
  FOR DELETE
  USING (
    -- Super admin can delete everything
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    OR
    -- Org admin can remove members from projects in their organization
    (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'org_admin'
      AND
      project_id IN (
        SELECT id FROM public.projects
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
    OR
    -- Project admin can remove members from their project
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Check if user has specific permission on a project
CREATE OR REPLACE FUNCTION public.user_has_project_permission(
  p_project_id UUID,
  p_user_id UUID,
  p_required_role TEXT DEFAULT 'viewer' -- viewer, editor, or admin
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_project_org_id UUID;
  v_user_org_id UUID;
  v_user_global_role TEXT;
BEGIN
  -- Get user's global role
  SELECT role, organization_id INTO v_user_global_role, v_user_org_id
  FROM public.users
  WHERE id = p_user_id;
  
  -- Super admin has all permissions
  IF v_user_global_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Get project's organization
  SELECT organization_id INTO v_project_org_id
  FROM public.projects
  WHERE id = p_project_id;
  
  -- Org admin has all permissions in their organization
  IF v_user_global_role = 'org_admin' AND v_user_org_id = v_project_org_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check project_members table
  SELECT role INTO v_user_role
  FROM public.project_members
  WHERE project_id = p_project_id AND user_id = p_user_id;
  
  -- If not found, check if user is in same organization
  IF v_user_role IS NULL AND v_user_org_id = v_project_org_id THEN
    v_user_role := 'viewer'; -- Default role for org members
  END IF;
  
  -- Check permission level
  RETURN CASE p_required_role
    WHEN 'viewer' THEN v_user_role IN ('viewer', 'editor', 'admin')
    WHEN 'editor' THEN v_user_role IN ('editor', 'admin')
    WHEN 'admin' THEN v_user_role = 'admin'
    ELSE FALSE
  END;
END;
$$;

COMMENT ON FUNCTION public.user_has_project_permission IS 'Checks if a user has a specific permission level on a project';

-- ============================================
-- 5. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =====================================';
    RAISE NOTICE '✅ RBAC & PROJECT ACCESS CONFIGURED';
    RAISE NOTICE '✅ =====================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Created:';
    RAISE NOTICE '   - project_members table';
    RAISE NOTICE '   - RLS policies for projects';
    RAISE NOTICE '   - RLS policies for project_members';
    RAISE NOTICE '   - user_has_project_permission() function';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Permission Levels:';
    RAISE NOTICE '   - viewer: Read-only access';
    RAISE NOTICE '   - editor: Read + Write access';
    RAISE NOTICE '   - admin: Full control (including member management)';
    RAISE NOTICE '';
    RAISE NOTICE '👥 Access Rules:';
    RAISE NOTICE '   - Super admins: Full access to everything';
    RAISE NOTICE '   - Org admins: Full access to organization projects';
    RAISE NOTICE '   - Project members: Access based on assigned role';
    RAISE NOTICE '   - Org members: Default viewer access to org projects';
    RAISE NOTICE '';
END $$;

