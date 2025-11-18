-- ============================================
-- 🎯 EVENT-DRIVEN ARCHITECTURE MIGRATION
-- ============================================
-- Description: Implements event-driven system for Master-Slave synchronization
-- Project: MASTER (cwbywxaafncyplgsrblw)
-- ============================================

-- 1. Create event types table
CREATE TABLE IF NOT EXISTS event_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  requires_slave_sync BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert all event types
INSERT INTO event_types (id, name, description, requires_slave_sync, priority) VALUES
-- Project events
('project_created', 'Project Created', 'New project created', true, 1),
('project_updated', 'Project Updated', 'Project schema or metadata updated', true, 1),
('project_deleted', 'Project Deleted', 'Project and all its data deleted', true, 1),

-- Table events
('table_created', 'Table Created', 'New table created in project', true, 1),
('table_updated', 'Table Updated', 'Table structure or metadata updated', true, 1),
('table_deleted', 'Table Deleted', 'Table and all its data deleted', true, 1),

-- Column events
('column_created', 'Column Created', 'New column added to table', true, 1),
('column_updated', 'Column Updated', 'Column definition updated', true, 1),
('column_deleted', 'Column Deleted', 'Column removed from table', true, 1),

-- Relationship events
('relationship_created', 'Relationship Created', 'New relationship created between tables', true, 1),
('relationship_updated', 'Relationship Updated', 'Relationship definition updated', true, 1),
('relationship_deleted', 'Relationship Deleted', 'Relationship removed', true, 1),

-- User events
('user_created', 'User Created', 'New user added to organization', true, 2),
('user_updated', 'User Updated', 'User profile or permissions updated', true, 2),
('user_deleted', 'User Deleted', 'User removed from organization', true, 2),

-- Organization events
('org_created', 'Organization Created', 'New organization created', true, 2),
('org_updated', 'Organization Updated', 'Organization settings updated', true, 2),

-- System events
('slave_sync_started', 'Slave Sync Started', 'Synchronization with slave started', false, 3),
('slave_sync_completed', 'Slave Sync Completed', 'Synchronization with slave completed', false, 3),
('slave_sync_failed', 'Slave Sync Failed', 'Synchronization with slave failed', false, 3)
ON CONFLICT (id) DO NOTHING;

-- 2. Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL REFERENCES event_types(id),
  organization_id UUID NOT NULL,
  project_id UUID,
  user_id UUID NOT NULL,
  data JSONB NOT NULL,
  old_data JSONB, -- For updates/deletes
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_org_project ON events(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_priority ON events(event_type) INCLUDE (priority) WHERE status = 'pending';

-- 3. Create slave configurations table
CREATE TABLE IF NOT EXISTS slave_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  service_key TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'error')),
  regions TEXT[] DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for slave lookups
CREATE INDEX IF NOT EXISTS idx_slave_configs_org ON slave_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_slave_configs_status ON slave_configs(status);

-- 4. Create event processing logs table
CREATE TABLE IF NOT EXISTS event_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slave_id UUID REFERENCES slave_configs(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'retrying')),
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create trigger function for automatic event creation
CREATE OR REPLACE FUNCTION create_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  event_type_id TEXT;
  user_id_val UUID;
BEGIN
  -- Determine event type based on operation
  event_type_id := TG_TABLE_NAME || '_' || LOWER(TG_OP);
  
  -- Get user ID from context or use a default
  user_id_val := COALESCE(
    current_setting('app.current_user_id', true)::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
  
  -- Insert event
  INSERT INTO events (
    event_type,
    organization_id,
    project_id,
    user_id,
    data,
    old_data
  ) VALUES (
    event_type_id,
    COALESCE(NEW.organization_id, OLD.organization_id),
    CASE 
      WHEN TG_TABLE_NAME = 'projects' THEN COALESCE(NEW.id, OLD.id)
      ELSE COALESCE(NEW.project_id, OLD.project_id)
    END,
    user_id_val,
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    CASE 
      WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
      ELSE NULL
    END
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the original operation
  RAISE WARNING 'Failed to create event: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Create triggers for all relevant tables
-- Projects table
DROP TRIGGER IF EXISTS trigger_projects_events ON projects;
CREATE TRIGGER trigger_projects_events
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION create_event();

-- Users table
DROP TRIGGER IF EXISTS trigger_users_events ON users;
CREATE TRIGGER trigger_users_events
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION create_event();

-- Organizations table
DROP TRIGGER IF EXISTS trigger_organizations_events ON organizations;
CREATE TRIGGER trigger_organizations_events
  AFTER INSERT OR UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_event();

-- 7. Create function to set current user context
CREATE OR REPLACE FUNCTION set_current_user(user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, true);
END;
$$;

-- 8. Create function to get pending events for processing
CREATE OR REPLACE FUNCTION get_pending_events(
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  organization_id UUID,
  project_id UUID,
  user_id UUID,
  data JSONB,
  old_data JSONB,
  priority INTEGER,
  retry_count INTEGER,
  max_retries INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.event_type,
    e.organization_id,
    e.project_id,
    e.user_id,
    e.data,
    e.old_data,
    et.priority,
    e.retry_count,
    e.max_retries
  FROM events e
  JOIN event_types et ON e.event_type = et.id
  WHERE e.organization_id = p_organization_id
    AND e.status = 'pending'
    AND et.requires_slave_sync = true
  ORDER BY et.priority ASC, e.created_at ASC
  LIMIT p_limit;
END;
$$;

-- 9. Create function to update event status
CREATE OR REPLACE FUNCTION update_event_status(
  p_event_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE events
  SET 
    status = p_status,
    error_message = p_error_message,
    updated_at = NOW(),
    processing_started_at = CASE 
      WHEN p_status = 'processing' AND processing_started_at IS NULL 
      THEN NOW() 
      ELSE processing_started_at 
    END,
    completed_at = CASE 
      WHEN p_status IN ('completed', 'failed', 'cancelled') 
      THEN NOW() 
      ELSE completed_at 
    END
  WHERE id = p_event_id;
END;
$$;

-- 10. Create function to increment retry count
CREATE OR REPLACE FUNCTION increment_event_retry(
  p_event_id UUID,
  p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_retry_count INTEGER;
  max_retries_val INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO current_retry_count, max_retries_val
  FROM events WHERE id = p_event_id;
  
  IF current_retry_count >= max_retries_val THEN
    -- Mark as failed after max retries
    PERFORM update_event_status(p_event_id, 'failed', p_error_message);
  ELSE
    -- Increment retry count and reset to pending
    UPDATE events
    SET 
      retry_count = retry_count + 1,
      status = 'pending',
      error_message = p_error_message,
      updated_at = NOW()
    WHERE id = p_event_id;
  END IF;
END;
$$;

-- 11. Grant permissions
GRANT SELECT, INSERT, UPDATE ON events TO authenticated, anon, service_role;
GRANT SELECT ON event_types TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE ON slave_configs TO authenticated, anon, service_role;
GRANT SELECT, INSERT ON event_processing_logs TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_pending_events(UUID, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_event_status(UUID, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION increment_event_retry(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION set_current_user(UUID) TO authenticated, anon, service_role;

-- 12. Add comments
COMMENT ON TABLE events IS 'Event queue for Master-Slave synchronization';
COMMENT ON TABLE event_types IS 'Available event types and their configuration';
COMMENT ON TABLE slave_configs IS 'Configuration for slave databases';
COMMENT ON TABLE event_processing_logs IS 'Logs for event processing attempts';

-- 13. Insert default slave configuration (if not exists)
INSERT INTO slave_configs (organization_id, name, url, service_key, status)
SELECT 
  o.id,
  'Default Slave',
  'https://ffzufnwxvqngglsapqrf.supabase.co',
  'your-slave-service-key-here',
  'active'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM slave_configs sc WHERE sc.organization_id = o.id
)
ON CONFLICT DO NOTHING;



