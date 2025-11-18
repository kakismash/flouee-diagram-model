-- Migration: Add project status field for optimistic locking
-- Description: Add status field to track if a project is currently being modified
-- Note: This migration updates the existing constraint to include 'ready' status

-- Drop existing constraint if it exists
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add updated constraint with all valid statuses
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['ready'::text, 'active'::text, 'editing'::text, 'applying'::text, 'applied'::text, 'error'::text]));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Add comment
COMMENT ON COLUMN projects.status IS 'Status of the project: ready/active (can be modified), applying (currently being modified), applied/error (completed states)';

-- Set default value for existing rows (use 'ready' for projects that can be modified)
UPDATE projects SET status = 'ready' WHERE status IS NULL OR status = 'active';

