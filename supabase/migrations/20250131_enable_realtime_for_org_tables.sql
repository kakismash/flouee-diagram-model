-- Migration: Enable Realtime for Tables in org_xxx Schemas
-- This migration ensures that all tables in org_xxx schemas are automatically
-- added to the supabase_realtime publication when created.

-- ============================================
-- 1. FUNCTION: Add table to realtime publication
-- ============================================
-- This function adds a table to the supabase_realtime publication
CREATE OR REPLACE FUNCTION public.add_table_to_realtime(
  p_schema_name TEXT,
  p_table_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only add tables from org_xxx schemas
  IF p_schema_name !~ '^org_[a-f0-9]{32}$' THEN
    RAISE NOTICE 'Schema % does not match org_xxx pattern, skipping realtime', p_schema_name;
    RETURN;
  END IF;

  -- Check if table is already in publication
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = p_schema_name
      AND tablename = p_table_name
  ) THEN
    RAISE NOTICE 'Table %.% is already in supabase_realtime publication', p_schema_name, p_table_name;
    RETURN;
  END IF;

  -- Add table to publication
  EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', p_schema_name, p_table_name);
  
  RAISE NOTICE 'Added table %.% to supabase_realtime publication', p_schema_name, p_table_name;
END;
$$;

COMMENT ON FUNCTION public.add_table_to_realtime IS 'Adds a table from an org_xxx schema to the supabase_realtime publication. Only works for schemas matching org_[32 hex chars] pattern.';

GRANT EXECUTE ON FUNCTION public.add_table_to_realtime TO service_role, authenticated;

-- ============================================
-- 2. FUNCTION: Enable realtime for all existing tables in org_xxx schemas
-- ============================================
-- This function adds all existing tables in org_xxx schemas to realtime
CREATE OR REPLACE FUNCTION public.enable_realtime_for_all_org_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_schema_name TEXT;
  v_table_name TEXT;
BEGIN
  -- Loop through all tables in org_xxx schemas
  FOR v_schema_name, v_table_name IN
    SELECT 
      n.nspname,
      c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname ~ '^org_[a-f0-9]{32}$'
      AND c.relkind = 'r'  -- Only regular tables
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = n.nspname
          AND tablename = c.relname
      )
  LOOP
    BEGIN
      PERFORM public.add_table_to_realtime(v_schema_name, v_table_name);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add table %.% to realtime: %', v_schema_name, v_table_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.enable_realtime_for_all_org_tables IS 'Adds all existing tables in org_xxx schemas to the supabase_realtime publication. Safe to run multiple times.';

GRANT EXECUTE ON FUNCTION public.enable_realtime_for_all_org_tables TO service_role;

-- ============================================
-- 3. TRIGGER FUNCTION: Auto-add new tables to realtime
-- ============================================
-- This trigger function automatically adds new tables to realtime when created
-- Note: This requires a DDL trigger, which PostgreSQL doesn't support natively.
-- Instead, we'll rely on the apply-schema-change-atomic Edge Function to call
-- add_table_to_realtime after creating tables.

-- ============================================
-- 4. ENABLE REALTIME FOR EXISTING TABLES
-- ============================================
-- Run the function to add all existing tables to realtime
SELECT public.enable_realtime_for_all_org_tables();

-- ============================================
-- 5. VERIFICATION
-- ============================================
-- Show which tables are now in realtime
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname ~ '^org_[a-f0-9]{32}$';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '✅ REALTIME ENABLED FOR ORG TABLES';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Total org_xxx tables in realtime: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Functions created:';
  RAISE NOTICE '   1. public.add_table_to_realtime(schema, table)';
  RAISE NOTICE '   2. public.enable_realtime_for_all_org_tables()';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Next steps:';
  RAISE NOTICE '   - Update apply-schema-change-atomic Edge Function';
  RAISE NOTICE '   - Call add_table_to_realtime() after creating tables';
  RAISE NOTICE '';
END $$;

