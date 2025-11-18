-- Migration: Add schema_hash to projects for sync verification
-- Description: SHA256 hash of normalized schema_data to detect changes
-- Project: MASTER (cwbywxaafncyplgsrblw)

-- Add schema_hash column
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS schema_hash TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_schema_hash ON projects(schema_hash);

-- Add comment
COMMENT ON COLUMN projects.schema_hash IS 'SHA256 hash of normalized schema_data for sync verification with Slave';

-- Function to calculate hash (placeholder, will be updated from Edge Function)
CREATE OR REPLACE FUNCTION calculate_schema_hash(schema_json JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Simple hash for now, will be replaced with proper implementation
  RETURN md5(schema_json::text);
END;
$$;

-- Trigger to auto-update hash when schema_data changes
CREATE OR REPLACE FUNCTION update_schema_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.schema_data IS DISTINCT FROM OLD.schema_data THEN
    NEW.schema_hash = calculate_schema_hash(NEW.schema_data);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_schema_hash ON projects;
CREATE TRIGGER trigger_update_schema_hash
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_schema_hash();

-- Initialize hash for existing projects
UPDATE projects 
SET schema_hash = calculate_schema_hash(schema_data)
WHERE schema_hash IS NULL;








