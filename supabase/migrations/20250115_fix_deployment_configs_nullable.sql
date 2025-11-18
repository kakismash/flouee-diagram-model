-- Migration: Fix deployment_configs to allow NULL organization_id
-- Created: 2025-01-15
-- Description: Allows NULL organization_id for shared/default deployments

-- ============================================
-- FIX: Allow NULL organization_id
-- ============================================

-- Drop the existing NOT NULL constraint
ALTER TABLE deployment_configs 
ALTER COLUMN organization_id DROP NOT NULL;

-- Drop the existing UNIQUE constraint that includes organization_id
ALTER TABLE deployment_configs 
DROP CONSTRAINT IF EXISTS deployment_configs_organization_id_key;

-- Add a new unique constraint that handles NULL properly
-- In PostgreSQL, multiple NULLs are considered distinct, so we need a partial unique index
CREATE UNIQUE INDEX deployment_configs_org_id_unique 
ON deployment_configs (organization_id) 
WHERE organization_id IS NOT NULL;

-- Add a check to ensure only ONE shared deployment exists (where organization_id IS NULL)
-- We'll use a unique constraint on a constant for rows where organization_id IS NULL
CREATE UNIQUE INDEX deployment_configs_shared_unique 
ON deployment_configs ((1)) 
WHERE organization_id IS NULL;

COMMENT ON INDEX deployment_configs_shared_unique IS 'Ensures only one shared deployment config exists (organization_id = NULL)';

-- ============================================
-- EXPLANATION
-- ============================================
-- Now the table allows:
-- 1. One deployment with organization_id = NULL (the shared/default one)
-- 2. Multiple deployments with specific organization_ids (one per org)
-- 3. Each organization can have at most one deployment config












