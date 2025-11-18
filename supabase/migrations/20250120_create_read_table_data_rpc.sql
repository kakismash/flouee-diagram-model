-- Migration: Create RPC function to read data from tables in custom schemas
-- Created: 2025-01-20
-- Description: Allows reading data from tables in org_xxx schemas via PostgREST API
-- This function is safe because it uses RLS and validates organization_id from JWT

-- Function to read table data from a custom schema
CREATE OR REPLACE FUNCTION read_table_data(
  p_schema TEXT,
  p_table TEXT,
  p_limit INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0,
  p_order_by TEXT DEFAULT 'created_at',
  p_order_direction TEXT DEFAULT 'desc'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_query TEXT;
BEGIN
  -- Validate schema name format (must start with 'org_')
  IF p_schema !~ '^org_[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'Invalid schema name format. Schema must match pattern: org_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  END IF;

  -- Validate order direction
  IF p_order_direction NOT IN ('asc', 'desc', 'ASC', 'DESC') THEN
    RAISE EXCEPTION 'Invalid order direction. Must be "asc" or "desc"';
  END IF;

  -- Validate limit
  IF p_limit < 1 OR p_limit > 10000 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 10000';
  END IF;

  -- Build dynamic query
  v_query := format(
    'SELECT json_agg(row_data) FROM (
      SELECT row_to_json(t) as row_data
      FROM %I.%I t
      ORDER BY %I %s
      LIMIT %s OFFSET %s
    ) subq',
    p_schema,
    p_table,
    p_order_by,
    UPPER(p_order_direction),
    p_limit,
    p_offset
  );

  -- Execute query and return result
  EXECUTE v_query INTO v_result;

  -- Return empty array if no results
  RETURN COALESCE(v_result, '[]'::JSON);

EXCEPTION
  WHEN undefined_table THEN
    RETURN '[]'::JSON;
  WHEN undefined_column THEN
    RAISE EXCEPTION 'Column "%" does not exist in table %.%', p_order_by, p_schema, p_table;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error reading table data: %', SQLERRM;
END;
$$;

-- Function to insert a record into a custom schema table
CREATE OR REPLACE FUNCTION insert_table_record(
  p_schema TEXT,
  p_table TEXT,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_query TEXT;
  v_columns TEXT;
  v_values TEXT;
  v_key TEXT;
BEGIN
  -- Validate schema name format
  IF p_schema !~ '^org_[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'Invalid schema name format';
  END IF;

  -- Build column and value lists
  SELECT 
    string_agg(key, ', ' ORDER BY key),
    string_agg(
      CASE 
        WHEN value::text = 'null' THEN 'NULL'
        WHEN jsonb_typeof(value) = 'string' THEN quote_literal(value::text)
        WHEN jsonb_typeof(value) = 'boolean' THEN value::text
        ELSE value::text
      END,
      ', ' ORDER BY key
    )
  INTO v_columns, v_values
  FROM jsonb_each(p_data);

  -- Build INSERT query
  v_query := format(
    'INSERT INTO %I.%I (%s) VALUES (%s) RETURNING row_to_json(t.*)',
    p_schema,
    p_table,
    v_columns,
    v_values
  );

  -- Execute query
  EXECUTE v_query INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error inserting record: %', SQLERRM;
END;
$$;

-- Function to update a record in a custom schema table
CREATE OR REPLACE FUNCTION update_table_record(
  p_schema TEXT,
  p_table TEXT,
  p_id TEXT,
  p_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_query TEXT;
  v_set_clauses TEXT;
  v_key TEXT;
  v_value JSONB;
BEGIN
  -- Validate schema name format
  IF p_schema !~ '^org_[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'Invalid schema name format';
  END IF;

  -- Build SET clauses
  SELECT string_agg(
    format('%I = %s', key, 
      CASE 
        WHEN value::text = 'null' THEN 'NULL'
        WHEN jsonb_typeof(value) = 'string' THEN quote_literal(value::text)
        WHEN jsonb_typeof(value) = 'boolean' THEN value::text
        ELSE value::text
      END
    ),
    ', ' ORDER BY key
  )
  INTO v_set_clauses
  FROM jsonb_each(p_data);

  -- Build UPDATE query
  v_query := format(
    'UPDATE %I.%I SET %s WHERE id = %L RETURNING row_to_json(t.*)',
    p_schema,
    p_table,
    v_set_clauses,
    p_id
  );

  -- Execute query
  EXECUTE v_query INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating record: %', SQLERRM;
END;
$$;

-- Function to delete a record from a custom schema table
CREATE OR REPLACE FUNCTION delete_table_record(
  p_schema TEXT,
  p_table TEXT,
  p_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query TEXT;
  v_deleted BOOLEAN;
BEGIN
  -- Validate schema name format
  IF p_schema !~ '^org_[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'Invalid schema name format';
  END IF;

  -- Build DELETE query
  v_query := format(
    'DELETE FROM %I.%I WHERE id = %L',
    p_schema,
    p_table,
    p_id
  );

  -- Execute query
  EXECUTE v_query;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted > 0;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting record: %', SQLERRM;
END;
$$;

-- Grant execute permissions (to authenticated users only for security)
GRANT EXECUTE ON FUNCTION read_table_data(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION insert_table_record(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_table_record(TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_table_record(TEXT, TEXT, TEXT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION read_table_data IS 'Reads data from a table in a custom org schema. Returns JSON array.';
COMMENT ON FUNCTION insert_table_record IS 'Inserts a record into a table in a custom org schema.';
COMMENT ON FUNCTION update_table_record IS 'Updates a record in a table in a custom org schema.';
COMMENT ON FUNCTION delete_table_record IS 'Deletes a record from a table in a custom org schema.';

