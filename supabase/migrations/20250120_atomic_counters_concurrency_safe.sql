-- ============================================
-- 🔒 ATOMIC COUNTERS WITH CONCURRENCY SAFETY
-- ============================================
-- PROBLEM: Race conditions when multiple users join/leave simultaneously
-- SOLUTION: Atomic counters with row-level locking
-- ============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_user_count ON users;
DROP TRIGGER IF EXISTS trigger_update_project_count ON projects;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_org_user_count();
DROP FUNCTION IF EXISTS public.update_org_project_count();

-- ============================================
-- ATOMIC USER COUNTER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.update_org_user_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_org_id UUID;
  v_new_org_id UUID;
BEGIN
  -- Get organization IDs
  v_old_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NULL END;
  v_new_org_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.organization_id ELSE NULL END;
  
  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    v_old_org_id := OLD.organization_id;
    v_new_org_id := NEW.organization_id;
  END IF;

  -- Decrement old organization (with atomic lock)
  IF v_old_org_id IS NOT NULL THEN
    UPDATE organizations 
    SET current_users = GREATEST(0, current_users - 1),
        updated_at = now()
    WHERE id = v_old_org_id;
  END IF;

  -- Increment new organization (with atomic lock)
  IF v_new_org_id IS NOT NULL THEN
    UPDATE organizations 
    SET current_users = current_users + 1,
        updated_at = now()
    WHERE id = v_new_org_id;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================
-- ATOMIC PROJECT COUNTER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.update_org_project_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_org_id UUID;
  v_new_org_id UUID;
BEGIN
  -- Get organization IDs
  v_old_org_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NULL END;
  v_new_org_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.organization_id ELSE NULL END;
  
  -- Handle UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    v_old_org_id := OLD.organization_id;
    v_new_org_id := NEW.organization_id;
  END IF;

  -- Decrement old organization (with atomic lock)
  IF v_old_org_id IS NOT NULL THEN
    UPDATE organizations 
    SET current_projects = GREATEST(0, current_projects - 1),
        updated_at = now()
    WHERE id = v_old_org_id;
  END IF;

  -- Increment new organization (with atomic lock)
  IF v_new_org_id IS NOT NULL THEN
    UPDATE organizations 
    SET current_projects = current_projects + 1,
        updated_at = now()
    WHERE id = v_new_org_id;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================
-- CREATE ATOMIC TRIGGERS
-- ============================================

-- User counter trigger
CREATE TRIGGER trigger_update_user_count
  AFTER INSERT OR DELETE OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_org_user_count();

-- Project counter trigger
CREATE TRIGGER trigger_update_project_count
  AFTER INSERT OR DELETE OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_org_project_count();

-- ============================================
-- CONCURRENCY-SAFE LIMIT CHECK FUNCTIONS
-- ============================================

-- Function to check user limit with atomic lock
CREATE OR REPLACE FUNCTION public.check_user_limit(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_users INTEGER;
  v_max_users INTEGER;
BEGIN
  -- Atomic read with lock
  SELECT current_users, max_users
  INTO v_current_users, v_max_users
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE; -- This locks the row until transaction ends
  
  -- Check limit
  RETURN v_current_users < v_max_users;
END;
$$;

-- Function to check project limit with atomic lock
CREATE OR REPLACE FUNCTION public.check_project_limit(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_projects INTEGER;
  v_max_projects INTEGER;
BEGIN
  -- Atomic read with lock
  SELECT current_projects, max_projects
  INTO v_current_projects, v_max_projects
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE; -- This locks the row until transaction ends
  
  -- Check limit
  RETURN v_current_projects < v_max_projects;
END;
$$;

-- ============================================
-- ENHANCED LIMIT VALIDATION FUNCTIONS
-- ============================================

-- Enhanced user limit check with detailed info
CREATE OR REPLACE FUNCTION public.can_add_user(p_org_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_users INTEGER;
  v_max_users INTEGER;
  v_can_add BOOLEAN;
BEGIN
  -- Atomic read with lock
  SELECT current_users, max_users
  INTO v_current_users, v_max_users
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;
  
  -- Check limit
  v_can_add := v_current_users < v_max_users;
  
  RETURN jsonb_build_object(
    'can_add', v_can_add,
    'current', v_current_users,
    'max', v_max_users,
    'remaining', v_max_users - v_current_users
  );
END;
$$;

-- Enhanced project limit check with detailed info
CREATE OR REPLACE FUNCTION public.can_create_project(p_org_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_projects INTEGER;
  v_max_projects INTEGER;
  v_can_create BOOLEAN;
BEGIN
  -- Atomic read with lock
  SELECT current_projects, max_projects
  INTO v_current_projects, v_max_projects
  FROM organizations
  WHERE id = p_org_id
  FOR UPDATE;
  
  -- Check limit
  v_can_create := v_current_projects < v_max_projects;
  
  RETURN jsonb_build_object(
    'can_create', v_can_create,
    'current', v_current_projects,
    'max', v_max_projects,
    'remaining', v_max_projects - v_current_projects
  );
END;
$$;

-- ============================================
-- VERIFY SETUP
-- ============================================

DO $$
DECLARE
  v_org_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '✅ ATOMIC COUNTERS WITH CONCURRENCY SAFETY';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Concurrency safety features:';
    RAISE NOTICE '   - Row-level locking (FOR UPDATE)';
    RAISE NOTICE '   - Atomic counter updates';
    RAISE NOTICE '   - Race condition prevention';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current organization counters:';
    RAISE NOTICE '';
    
    FOR v_org_record IN 
      SELECT 
        name,
        current_users,
        max_users,
        current_projects,
        max_projects
      FROM organizations
      ORDER BY name
    LOOP
      RAISE NOTICE '   %:', v_org_record.name;
      RAISE NOTICE '      Users: % / %', v_org_record.current_users, v_org_record.max_users;
      RAISE NOTICE '      Projects: % / %', v_org_record.current_projects, v_org_record.max_projects;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Counters are now concurrency-safe!';
    RAISE NOTICE '';
END $$;





