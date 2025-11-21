-- Migration: Add INSERT policy for organizations table
-- This allows the complete-signup Edge Function to create organizations
-- The RPC function create_organization uses SECURITY DEFINER, but this policy
-- provides a safety net for direct inserts with service role

-- Add INSERT policy for organizations (allows service role and authenticated users)
DROP POLICY IF EXISTS "Service role and authenticated users can create organizations" ON organizations;
CREATE POLICY "Service role and authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (
        -- Allow service role (used by Edge Functions)
        current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
        OR
        -- Allow authenticated users (for signup via Edge Function)
        auth.uid() IS NOT NULL
    );

COMMENT ON POLICY "Service role and authenticated users can create organizations" ON organizations IS 
'Allows service role (Edge Functions) and authenticated users to create organizations during signup';

