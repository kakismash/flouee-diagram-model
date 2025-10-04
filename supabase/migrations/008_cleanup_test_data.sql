-- Cleanup: Remove test users to start fresh
-- Run this BEFORE migration 007 if you have duplicate test data

-- Delete test users (adjust email if needed)
DELETE FROM public.users WHERE email LIKE '%test%' OR email LIKE '%alfian%';

-- Delete test organizations that have no users
DELETE FROM public.organizations 
WHERE id NOT IN (SELECT DISTINCT organization_id FROM public.users WHERE organization_id IS NOT NULL);

-- Note: This won't delete auth.users - you need to do that manually in Supabase dashboard
-- Go to: Authentication > Users > Delete the test users there





