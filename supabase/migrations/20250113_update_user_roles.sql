-- Migration: Update user roles to use new enum values
-- Created: 2025-01-13
-- Description: Updates existing users to use the new role system (admin, org_admin, client)

-- First, let's see what roles currently exist
-- SELECT DISTINCT role FROM users;

-- Update users table to use new role values
-- Note: Adjust the email to match your actual admin user email

-- Update your admin user (change the email to yours)
UPDATE users 
SET role = 'admin'
WHERE email = 'alfian1991@gmail.com';

-- Update other organization admins (if any)
-- UPDATE users 
-- SET role = 'org_admin'
-- WHERE role IN ('owner', 'admin') AND email != 'alfian1991@gmail.com';

-- Update regular users to client role
-- UPDATE users 
-- SET role = 'client'
-- WHERE role IN ('editor', 'viewer', 'member', 'user');

-- Verify the changes
-- SELECT id, email, role, organization_id FROM users;

COMMENT ON COLUMN users.role IS 'User role: admin (super admin), org_admin (organization admin), or client (regular user)';












