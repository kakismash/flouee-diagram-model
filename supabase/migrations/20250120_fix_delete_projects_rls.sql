-- ============================================
-- 🔧 FIX: PROJECT DELETE RLS POLICY
-- ============================================
-- PROBLEM: Users cannot delete their own projects
-- CAUSE: current_user_org_id() might be failing or RLS is too restrictive
-- SOLUTION: Simplify policy and add explicit user check
-- ============================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- Create improved DELETE policy
-- Allow users to delete projects in their organization
-- Allow admins to delete any project
CREATE POLICY "Allow project DELETE for org members and admins" 
ON public.projects 
FOR DELETE 
USING (
  -- User's organization matches project's organization
  organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  OR
  -- OR user is super admin
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  OR
  -- OR user is org_admin of the project's organization
  (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'org_admin'
    AND 
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  )
);

-- ============================================
-- VERIFY POLICIES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '✅ PROJECT DELETE POLICY FIXED';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔓 Users can now delete projects if:';
  RAISE NOTICE '   1. Project belongs to their organization';
  RAISE NOTICE '   2. They are a super admin';
  RAISE NOTICE '   3. They are org_admin of that organization';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Active DELETE policies on projects:';
END $$;

-- Show all policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'No restriction'
    ELSE left(qual, 80) || '...'
  END as condition
FROM pg_policies 
WHERE tablename = 'projects' 
  AND cmd = 'DELETE';






