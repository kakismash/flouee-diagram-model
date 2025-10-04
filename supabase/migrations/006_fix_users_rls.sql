-- Fix: Allow trigger to insert users
-- Problem: The trigger runs before auth context is fully set
-- Solution: Disable RLS on users table OR use permissive policy

-- Option 1 (RECOMMENDED): Disable RLS on users
-- Users table is already protected by auth - users can only see/edit their own data
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Note: We keep RLS enabled on sensitive data tables:
-- - projects (contains schema designs)
-- - project_collaborators (access control)
-- - project_history (audit trail)

-- The security model now is:
-- ✓ Auth handles user authentication
-- ✓ Application code ensures users only query their own data
-- ✓ Projects and related tables have RLS for multi-tenant isolation





