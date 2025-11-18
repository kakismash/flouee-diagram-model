-- ============================================
-- UPDATE USER ROLE TO ADMIN
-- ============================================
-- Execute this in Supabase SQL Editor to make a user an admin
-- Replace 'your-email@example.com' with your actual email

-- Step 1: Check current users and their roles
SELECT id, email, role, organization_id, created_at
FROM users
ORDER BY created_at DESC;

-- Step 2: Update your user to admin role
-- ⚠️ IMPORTANT: Change the email to your actual email address
UPDATE users 
SET role = 'admin'
WHERE email = 'alfian1991@gmail.com';

-- Step 3: Verify the update
SELECT id, email, role, organization_id
FROM users
WHERE email = 'alfian1991@gmail.com';

-- ============================================
-- ROLE DEFINITIONS
-- ============================================
-- admin      = Super Admin (full system access)
-- org_admin  = Organization Admin (full access within their org)
-- client     = Client (limited access within their org)

-- ============================================
-- OPTIONAL: Update other users
-- ============================================

-- Make all organization owners into org_admins (uncomment to use)
-- UPDATE users 
-- SET role = 'org_admin'
-- WHERE role = 'owner' AND email != 'alfian1991@gmail.com';

-- Make all regular users into clients (uncomment to use)
-- UPDATE users 
-- SET role = 'client'
-- WHERE role IN ('editor', 'viewer', 'member', 'user');

-- ============================================
-- VERIFICATION
-- ============================================
-- Check all users and their new roles
SELECT 
  email,
  role,
  CASE 
    WHEN role = 'admin' THEN '🔴 Super Admin'
    WHEN role = 'org_admin' THEN '🟡 Organization Admin'
    WHEN role = 'client' THEN '🟢 Client'
    ELSE '⚪ Unknown'
  END as role_display,
  organization_id
FROM users
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'org_admin' THEN 2
    WHEN 'client' THEN 3
    ELSE 4
  END,
  email;

