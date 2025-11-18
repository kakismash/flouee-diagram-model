-- Migration: Insert default slave project configuration
-- Created: 2025-01-14
-- Description: Inserts the initial slave Supabase project configuration for shared schema deployment

-- ============================================
-- INSERT DEFAULT SLAVE PROJECT
-- ============================================

-- This is the first slave project that will be used for shared_schema deployments
-- All FREE tier organizations will share this project with different schemas

-- ⚠️ IMPORTANT: Update these values with your actual slave project credentials
-- You can find these in: Supabase Dashboard > Project Settings > API

INSERT INTO deployment_configs (
    id,
    organization_id,
    supabase_project_ref,
    supabase_project_url,
    supabase_anon_key,
    schema_name,
    status,
    provisioned_at
) VALUES (
    gen_random_uuid(),
    NULL, -- This is the default/shared deployment, not tied to a specific org initially
    'YOUR_SLAVE_PROJECT_REF', -- ⚠️ Replace with actual project ref (e.g., 'abcdefghijklmnop')
    'https://YOUR_SLAVE_PROJECT_REF.supabase.co', -- ⚠️ Replace with actual URL
    'YOUR_SLAVE_ANON_KEY', -- ⚠️ Replace with actual anon key
    'shared', -- Default schema for free tier organizations
    'active',
    NOW()
)
ON CONFLICT (organization_id) DO NOTHING; -- Prevent duplicate insertions

-- ============================================
-- NOTES
-- ============================================
-- 
-- 1. The slave project is a separate Supabase project that stores actual user data
-- 2. The master project (this one) only stores metadata and authentication
-- 3. For FREE tier: All orgs share one project with different schemas
-- 4. For BASIC tier: Each org gets a dedicated schema in a slave project
-- 5. For PREMIUM tier: Each org gets their own dedicated Supabase project
--
-- To get your slave project credentials:
-- 1. Go to https://supabase.com/dashboard
-- 2. Select your slave project
-- 3. Go to Settings > API
-- 4. Copy the Project URL and anon/public key
--
-- Example values:
-- supabase_project_ref: 'xyzabc123456'
-- supabase_project_url: 'https://xyzabc123456.supabase.co'
-- supabase_anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
--

COMMENT ON TABLE deployment_configs IS 'Stores configuration for slave Supabase projects where actual user data is stored. Each organization is mapped to a deployment based on their subscription tier.';












