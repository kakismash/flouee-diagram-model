-- Migration: Create inspection helper functions
-- Description: Functions to inspect schemas and tables, returning actual data

-- Function to get table columns
CREATE OR REPLACE FUNCTION get_table_columns(
  p_schema TEXT,
  p_table TEXT
)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  character_maximum_length INTEGER,
  is_nullable TEXT,
  column_default TEXT,
  ordinal_position INTEGER
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    column_name::TEXT,
    data_type::TEXT,
    character_maximum_length,
    is_nullable::TEXT,
    column_default::TEXT,
    ordinal_position
  FROM information_schema.columns
  WHERE table_schema = p_schema
  AND table_name = p_table
  ORDER BY ordinal_position;
$$;

-- Function to list tables in a schema
CREATE OR REPLACE FUNCTION list_schema_tables(
  p_schema TEXT
)
RETURNS TABLE (
  table_name TEXT,
  column_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.table_name::TEXT,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = p_schema 
     AND table_name = t.table_name) as column_count
  FROM information_schema.tables t
  WHERE table_schema = p_schema
  AND table_type = 'BASE TABLE'
  ORDER BY table_name;
$$;

-- Function to list all org schemas
CREATE OR REPLACE FUNCTION list_org_schemas()
RETURNS TABLE (
  schema_name TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT schema_name::TEXT
  FROM information_schema.schemata
  WHERE schema_name LIKE 'org_%'
  ORDER BY schema_name;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_table_columns(TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION list_schema_tables(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION list_org_schemas() TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION get_table_columns IS 'Returns all columns of a table with their metadata';
COMMENT ON FUNCTION list_schema_tables IS 'Lists all tables in a schema with column count';
COMMENT ON FUNCTION list_org_schemas IS 'Lists all organization schemas';








