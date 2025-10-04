-- Enable RLS and create authentication system
-- Simple approach: no recursion, minimal policies

-- ============================================
-- STEP 1: Enable RLS on all tables
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Helper function to get user's org
-- SECURITY DEFINER bypasses RLS to avoid recursion
-- ============================================

CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================
-- STEP 3: USERS table policies
-- Keep it super simple - only auth.uid()
-- ============================================

CREATE POLICY "users_select" ON users
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "users_insert" ON users
  FOR INSERT 
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update" ON users
  FOR UPDATE 
  USING (id = auth.uid());

-- ============================================
-- STEP 4: ORGANIZATIONS table policies
-- ============================================

CREATE POLICY "orgs_select" ON organizations
  FOR SELECT 
  USING (id = public.current_user_org_id());

CREATE POLICY "orgs_update" ON organizations
  FOR UPDATE 
  USING (id = public.current_user_org_id());

-- ============================================
-- STEP 5: PROJECTS table policies
-- ============================================

CREATE POLICY "projects_select" ON projects
  FOR SELECT 
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "projects_insert" ON projects
  FOR INSERT 
  WITH CHECK (organization_id = public.current_user_org_id());

CREATE POLICY "projects_update" ON projects
  FOR UPDATE 
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "projects_delete" ON projects
  FOR DELETE 
  USING (organization_id = public.current_user_org_id());

-- ============================================
-- STEP 6: PROJECT_COLLABORATORS policies
-- ============================================

CREATE POLICY "collaborators_select" ON project_collaborators
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.organization_id = public.current_user_org_id()
    )
  );

CREATE POLICY "collaborators_insert" ON project_collaborators
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.organization_id = public.current_user_org_id()
    )
  );

CREATE POLICY "collaborators_update" ON project_collaborators
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.organization_id = public.current_user_org_id()
    )
  );

CREATE POLICY "collaborators_delete" ON project_collaborators
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_collaborators.project_id 
      AND projects.organization_id = public.current_user_org_id()
    )
  );

-- ============================================
-- STEP 7: PROJECT_HISTORY policies
-- ============================================

CREATE POLICY "history_select" ON project_history
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_history.project_id 
      AND projects.organization_id = public.current_user_org_id()
    )
  );

CREATE POLICY "history_insert" ON project_history
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_history.project_id 
      AND projects.organization_id = public.current_user_org_id()
    )
  );

-- ============================================
-- STEP 8: Trigger for auto-creating user profile
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO public.organizations (name, plan)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
    'free'
  )
  RETURNING id INTO new_org_id;
  
  -- Create user profile
  INSERT INTO public.users (id, email, organization_id, role)
  VALUES (NEW.id, NEW.email, new_org_id, 'admin');
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 9: Grant permissions
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon;





