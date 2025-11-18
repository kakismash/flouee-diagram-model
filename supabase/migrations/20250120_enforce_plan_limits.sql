-- ============================================
-- 🔒 ENFORCE SUBSCRIPTION PLAN LIMITS
-- ============================================
-- PROBLEM: No validation of plan limits when creating projects/tables
-- SOLUTION: Triggers + Functions to enforce limits automatically
-- ============================================

-- ============================================
-- 1. FIX current_projects COUNTER
-- ============================================

-- Update all organizations to have correct counts
UPDATE organizations o
SET current_projects = (
  SELECT COUNT(*) 
  FROM projects p 
  WHERE p.organization_id = o.id
);

-- ============================================
-- 2. FUNCTION: Validate Project Limit
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_project_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_projects INTEGER;
  v_current_projects INTEGER;
  v_org_name TEXT;
  v_tier TEXT;
BEGIN
  -- Get organization limits
  SELECT 
    max_projects,
    current_projects,
    name,
    subscription_tier
  INTO v_max_projects, v_current_projects, v_org_name, v_tier
  FROM organizations
  WHERE id = NEW.organization_id;

  -- Allow super admins to bypass (for testing)
  IF (SELECT role FROM users WHERE id = auth.uid()) = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Check if limit would be exceeded
  IF v_current_projects >= v_max_projects THEN
    RAISE EXCEPTION 'Project limit reached. Organization "%" (% tier) has reached its limit of % projects. Current: %. Upgrade your plan to create more projects.',
      v_org_name,
      v_tier,
      v_max_projects,
      v_current_projects
      USING HINT = 'Upgrade to BASIC (5 projects) or PREMIUM (unlimited)';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 3. FUNCTION: Validate Table Limit
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_table_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_tables INTEGER;
  v_current_tables INTEGER;
  v_org_id UUID;
  v_org_name TEXT;
  v_tier TEXT;
BEGIN
  -- Get organization ID from project
  SELECT organization_id INTO v_org_id
  FROM projects
  WHERE id = NEW.id;

  -- Get organization limits
  SELECT 
    max_tables_per_project,
    name,
    subscription_tier
  INTO v_max_tables, v_org_name, v_tier
  FROM organizations
  WHERE id = v_org_id;

  -- Allow super admins to bypass
  IF (SELECT role FROM users WHERE id = auth.uid()) = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Count tables in schema_data
  v_current_tables := jsonb_array_length(COALESCE(NEW.schema_data->'tables', '[]'::jsonb));

  -- Check if limit would be exceeded
  IF v_current_tables > v_max_tables THEN
    RAISE EXCEPTION 'Table limit reached. Organization "%" (% tier) has reached its limit of % tables per project. Current: %.',
      v_org_name,
      v_tier,
      v_max_tables,
      v_current_tables
      USING HINT = 'Upgrade to BASIC (50 tables) or PREMIUM (unlimited)';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 4. CREATE TRIGGERS
-- ============================================

-- Trigger for project creation
DROP TRIGGER IF EXISTS trigger_validate_project_limit ON projects;
CREATE TRIGGER trigger_validate_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION validate_project_limit();

-- Trigger for table limit validation
DROP TRIGGER IF EXISTS trigger_validate_table_limit ON projects;
CREATE TRIGGER trigger_validate_table_limit
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  WHEN (NEW.schema_data IS NOT NULL)
  EXECUTE FUNCTION validate_table_limit();

-- ============================================
-- 5. UPDATE COUNTERS TRIGGER
-- ============================================

-- Auto-update current_projects counter
CREATE OR REPLACE FUNCTION public.update_org_project_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE organizations 
    SET current_projects = current_projects + 1 
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE organizations 
    SET current_projects = GREATEST(0, current_projects - 1)
    WHERE id = OLD.organization_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_project_count ON projects;
CREATE TRIGGER trigger_update_project_count
  AFTER INSERT OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_org_project_count();

-- ============================================
-- 6. RPC: Check Limits Before Action
-- ============================================

-- Function to check if user can create project
CREATE OR REPLACE FUNCTION public.can_create_project(p_organization_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_projects INTEGER;
  v_current_projects INTEGER;
  v_tier TEXT;
  v_can_create BOOLEAN;
BEGIN
  -- Get organization info
  SELECT 
    max_projects,
    current_projects,
    subscription_tier
  INTO v_max_projects, v_current_projects, v_tier
  FROM organizations
  WHERE id = p_organization_id;

  -- Check if under limit
  v_can_create := v_current_projects < v_max_projects;

  RETURN jsonb_build_object(
    'can_create', v_can_create,
    'current', v_current_projects,
    'max', v_max_projects,
    'tier', v_tier,
    'remaining', v_max_projects - v_current_projects
  );
END;
$$;

GRANT EXECUTE ON FUNCTION can_create_project(UUID) TO authenticated;

-- Function to check if user can add table
CREATE OR REPLACE FUNCTION public.can_add_table(p_project_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_tables INTEGER;
  v_current_tables INTEGER;
  v_tier TEXT;
  v_org_id UUID;
  v_can_add BOOLEAN;
BEGIN
  -- Get project's organization
  SELECT organization_id INTO v_org_id
  FROM projects
  WHERE id = p_project_id;

  -- Get organization limits
  SELECT 
    max_tables_per_project,
    subscription_tier
  INTO v_max_tables, v_tier
  FROM organizations
  WHERE id = v_org_id;

  -- Count current tables
  SELECT COALESCE(jsonb_array_length(schema_data->'tables'), 0)
  INTO v_current_tables
  FROM projects
  WHERE id = p_project_id;

  -- Check if under limit
  v_can_add := v_current_tables < v_max_tables;

  RETURN jsonb_build_object(
    'can_add', v_can_add,
    'current', v_current_tables,
    'max', v_max_tables,
    'tier', v_tier,
    'remaining', v_max_tables - v_current_tables
  );
END;
$$;

GRANT EXECUTE ON FUNCTION can_add_table(UUID) TO authenticated;

-- ============================================
-- 7. VERIFY
-- ============================================

DO $$
DECLARE
  v_org_record RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '✅ PLAN LIMITS ENFORCEMENT ENABLED';
    RAISE NOTICE '✅ ===================================';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Limits now enforced:';
    RAISE NOTICE '   - Projects per organization';
    RAISE NOTICE '   - Tables per project';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Current organization status:';
    RAISE NOTICE '';
    
    FOR v_org_record IN 
      SELECT 
        name,
        subscription_tier,
        current_projects,
        max_projects,
        max_tables_per_project
      FROM organizations
      ORDER BY name
    LOOP
      RAISE NOTICE '   % (%)', v_org_record.name, v_org_record.subscription_tier;
      RAISE NOTICE '      Projects: % / %', v_org_record.current_projects, v_org_record.max_projects;
      RAISE NOTICE '      Tables limit: %', v_org_record.max_tables_per_project;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Organizations over limit will be blocked from creating new projects!';
    RAISE NOTICE '';
END $$;






