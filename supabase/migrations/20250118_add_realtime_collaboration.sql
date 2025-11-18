-- Migration: Add Realtime Collaboration Support
-- Description: Add fields to support real-time collaboration and user presence

-- Add collaboration fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS active_users JSONB DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS collaboration_enabled BOOLEAN DEFAULT true;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_last_modified_by ON projects(last_modified_by);
CREATE INDEX IF NOT EXISTS idx_projects_last_modified_at ON projects(last_modified_at);
CREATE INDEX IF NOT EXISTS idx_projects_collaboration_enabled ON projects(collaboration_enabled);

-- Add comments
COMMENT ON COLUMN projects.last_modified_by IS 'User who last modified the project';
COMMENT ON COLUMN projects.last_modified_at IS 'Timestamp of last modification';
COMMENT ON COLUMN projects.active_users IS 'Array of currently active user IDs';
COMMENT ON COLUMN projects.collaboration_enabled IS 'Whether real-time collaboration is enabled for this project';

-- Create function to update last_modified fields
CREATE OR REPLACE FUNCTION update_project_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  -- Note: last_modified_by will be set by the application
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_modified_at
DROP TRIGGER IF EXISTS trigger_update_project_last_modified ON projects;
CREATE TRIGGER trigger_update_project_last_modified
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_last_modified();

-- Enable Row Level Security for realtime
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for realtime subscriptions (users can read projects they have access to)
CREATE POLICY "Users can read projects for realtime" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.organization_id = projects.organization_id
    )
  );

-- Create policy for updating projects (users can update projects they have access to)
CREATE POLICY "Users can update projects for collaboration" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.organization_id = projects.organization_id
    )
  );

-- Create function to get active users for a project
CREATE OR REPLACE FUNCTION get_project_active_users(project_uuid UUID)
RETURNS TABLE(user_id UUID, user_name TEXT, last_seen TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    (value->>'user_id')::UUID as user_id,
    value->>'user_name' as user_name,
    (value->>'last_seen')::TIMESTAMPTZ as last_seen
  FROM projects, jsonb_array_elements(active_users)
  WHERE id = project_uuid
  ORDER BY (value->>'last_seen')::TIMESTAMPTZ DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_project_active_users(UUID) TO authenticated;

-- Create function to update active users
CREATE OR REPLACE FUNCTION update_project_active_users(
  project_uuid UUID,
  user_uuid UUID,
  user_name TEXT,
  cursor_data JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_users JSONB;
  user_data JSONB;
  updated_users JSONB;
BEGIN
  -- Get current active users
  SELECT active_users INTO current_users
  FROM projects
  WHERE id = project_uuid;
  
  -- Create user data
  user_data := jsonb_build_object(
    'user_id', user_uuid,
    'user_name', user_name,
    'cursor', cursor_data,
    'last_seen', NOW()
  );
  
  -- Remove existing user if present
  updated_users := (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements(current_users)
    WHERE (value->>'user_id')::UUID != user_uuid
  );
  
  -- Add or update user
  IF updated_users IS NULL THEN
    updated_users := jsonb_build_array(user_data);
  ELSE
    updated_users := updated_users || user_data;
  END IF;
  
  -- Update project
  UPDATE projects
  SET active_users = updated_users
  WHERE id = project_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_project_active_users(UUID, UUID, TEXT, JSONB) TO authenticated;

-- Create function to remove user from active users
CREATE OR REPLACE FUNCTION remove_project_active_user(
  project_uuid UUID,
  user_uuid UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_users JSONB;
  updated_users JSONB;
BEGIN
  -- Get current active users
  SELECT active_users INTO current_users
  FROM projects
  WHERE id = project_uuid;
  
  -- Remove user
  updated_users := (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements(current_users)
    WHERE (value->>'user_id')::UUID != user_uuid
  );
  
  -- Update project
  UPDATE projects
  SET active_users = COALESCE(updated_users, '[]'::jsonb)
  WHERE id = project_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_project_active_user(UUID, UUID) TO authenticated;










