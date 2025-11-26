-- Migration: Enable Realtime for schema_changes table in Master
-- This allows the frontend to listen for schema changes in real-time
-- and automatically reload/remap tables when structure changes occur

-- ============================================
-- 1. Add schema_changes to realtime publication
-- ============================================
-- Check if table is already in publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'schema_changes'
  ) THEN
    -- Add table to publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.schema_changes;
    RAISE NOTICE 'Added table public.schema_changes to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'Table public.schema_changes is already in supabase_realtime publication';
  END IF;
END $$;

-- ============================================
-- 2. Ensure REPLICA IDENTITY is set for DELETE events
-- ============================================
-- This is required for DELETE events to be sent via logical replication
ALTER TABLE public.schema_changes REPLICA IDENTITY FULL;

-- ============================================
-- 3. Verification
-- ============================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'schema_changes';
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '✅ REALTIME ENABLED FOR SCHEMA_CHANGES';
  RAISE NOTICE '✅ ===================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 schema_changes in realtime: %', CASE WHEN v_count > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '';
END $$;

