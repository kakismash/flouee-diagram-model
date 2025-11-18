-- Migration: Create function to manage schema metadata in Slave
-- Description: Creates __schema_metadata__ table in org schemas for sync tracking
-- Project: SLAVE (ffzufnwxvqngglsapqrf)

-- Function to create metadata table in a specific schema
CREATE OR REPLACE FUNCTION create_schema_metadata_table(
  p_schema TEXT,
  p_project_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create metadata table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.__schema_metadata__ (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL,
      schema_version INTEGER NOT NULL DEFAULT 0,
      schema_hash TEXT NOT NULL DEFAULT '''',
      last_synced_at TIMESTAMPTZ DEFAULT NOW(),
      sync_status TEXT DEFAULT ''pending'' CHECK (sync_status IN (''synced'', ''pending'', ''error'', ''reconciling'')),
      last_error TEXT,
      reconciliation_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(project_id)
    );
  ', p_schema);
  
  -- Insert initial record
  EXECUTE format('
    INSERT INTO %I.__schema_metadata__ (project_id, schema_version, schema_hash, sync_status)
    VALUES ($1, 0, '''', ''pending'')
    ON CONFLICT (project_id) DO NOTHING;
  ', p_schema)
  USING p_project_id;
  
  RAISE NOTICE 'Created __schema_metadata__ table in schema %', p_schema;
END;
$$;

-- Function to update metadata after sync
CREATE OR REPLACE FUNCTION update_schema_metadata(
  p_schema TEXT,
  p_project_id UUID,
  p_version INTEGER,
  p_hash TEXT,
  p_status TEXT DEFAULT 'synced',
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    UPDATE %I.__schema_metadata__
    SET schema_version = $1,
        schema_hash = $2,
        sync_status = $3,
        last_error = $4,
        last_synced_at = NOW(),
        updated_at = NOW(),
        reconciliation_count = CASE WHEN $3 = ''synced'' THEN reconciliation_count + 1 ELSE reconciliation_count END
    WHERE project_id = $5;
  ', p_schema)
  USING p_version, p_hash, p_status, p_error, p_project_id;
  
  RAISE NOTICE 'Updated metadata for project % in schema %', p_project_id, p_schema;
END;
$$;

-- Function to get metadata
CREATE OR REPLACE FUNCTION get_schema_metadata(
  p_schema TEXT,
  p_project_id UUID
)
RETURNS TABLE (
  schema_version INTEGER,
  schema_hash TEXT,
  sync_status TEXT,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  reconciliation_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('
    SELECT 
      schema_version,
      schema_hash,
      sync_status,
      last_synced_at,
      last_error,
      reconciliation_count
    FROM %I.__schema_metadata__
    WHERE project_id = $1
  ', p_schema)
  USING p_project_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_schema_metadata_table(TEXT, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION update_schema_metadata(TEXT, UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_schema_metadata(TEXT, UUID) TO authenticated, anon, service_role;

-- Add comments
COMMENT ON FUNCTION create_schema_metadata_table IS 'Creates __schema_metadata__ table in an org schema for sync tracking';
COMMENT ON FUNCTION update_schema_metadata IS 'Updates schema metadata after successful sync';
COMMENT ON FUNCTION get_schema_metadata IS 'Retrieves schema metadata for a project';








