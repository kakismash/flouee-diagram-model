-- ============================================
-- 🚀 EVENT SYSTEM V2: Idempotency, Deliveries, Canonical Events, Ordering
-- Applies to: MASTER (control plane)
-- ============================================

-- 1) Events table: idempotency + scheduling
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS project_version INTEGER,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS dead_letter BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_events_pending_scheduling
  ON events (status, next_attempt_at, organization_id, project_id, created_at);

-- 2) Deliveries table: per-slave delivery status + backoff
CREATE TABLE IF NOT EXISTS event_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slave_id UUID NOT NULL REFERENCES slave_configs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','retrying','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, slave_id)
);

CREATE INDEX IF NOT EXISTS idx_event_deliveries_status_schedule
  ON event_deliveries (status, next_attempt_at);

-- 3) Canonical events trigger: map to event_types ids
CREATE OR REPLACE FUNCTION create_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  event_type_id TEXT;
  user_id_val UUID;
  v_project_id UUID;
  v_project_version INTEGER;
BEGIN
  -- Map to canonical IDs declared in event_types
  IF TG_TABLE_NAME = 'projects' THEN
    IF TG_OP = 'INSERT' THEN event_type_id := 'project_created';
    ELSIF TG_OP = 'UPDATE' THEN event_type_id := 'project_updated';
    ELSIF TG_OP = 'DELETE' THEN event_type_id := 'project_deleted';
    END IF;
  ELSIF TG_TABLE_NAME = 'users' THEN
    IF TG_OP = 'INSERT' THEN event_type_id := 'user_created';
    ELSIF TG_OP = 'UPDATE' THEN event_type_id := 'user_updated';
    ELSIF TG_OP = 'DELETE' THEN event_type_id := 'user_deleted';
    END IF;
  ELSIF TG_TABLE_NAME = 'organizations' THEN
    IF TG_OP = 'INSERT' THEN event_type_id := 'org_created';
    ELSIF TG_OP = 'UPDATE' THEN event_type_id := 'org_updated';
    END IF;
  ELSE
    event_type_id := TG_TABLE_NAME || '_' || lower(TG_OP);
  END IF;

  user_id_val := COALESCE(
    current_setting('app.current_user_id', true)::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );

  v_project_id := CASE WHEN TG_TABLE_NAME = 'projects' THEN COALESCE(NEW.id, OLD.id)
                       ELSE COALESCE(NEW.project_id, OLD.project_id) END;
  v_project_version := COALESCE(NEW.version, OLD.version);

  INSERT INTO events (
    event_type,
    organization_id,
    project_id,
    user_id,
    data,
    old_data,
    idempotency_key,
    project_version,
    status,
    next_attempt_at
  ) VALUES (
    event_type_id,
    COALESCE(NEW.organization_id, OLD.organization_id),
    v_project_id,
    user_id_val,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN v_project_id IS NOT NULL AND v_project_version IS NOT NULL
      THEN (v_project_id::text || ':' || v_project_version::text)
      ELSE NULL END,
    v_project_version,
    'pending',
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to create event: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) Ordering & locking helpers (per org+project)
CREATE OR REPLACE FUNCTION acquire_project_lock(p_organization_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  k BIGINT;
BEGIN
  -- Hash org+project to a 64-bit key
  SELECT ('x' || substr(md5(p_organization_id::text || ':' || p_project_id::text),1,16))::bit(64)::bigint INTO k;
  RETURN pg_try_advisory_lock(k);
END;
$$;

CREATE OR REPLACE FUNCTION release_project_lock(p_organization_id UUID, p_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  k BIGINT;
BEGIN
  SELECT ('x' || substr(md5(p_organization_id::text || ':' || p_project_id::text),1,16))::bit(64)::bigint INTO k;
  PERFORM pg_advisory_unlock(k);
END;
$$;

GRANT EXECUTE ON FUNCTION acquire_project_lock(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION release_project_lock(UUID, UUID) TO authenticated, anon, service_role;

-- 5) Update get_pending_events to respect scheduling
-- Drop old signature to allow return type change
DO $$ BEGIN
  PERFORM 1 FROM pg_proc 
  WHERE proname = 'get_pending_events' 
    AND pg_function_is_visible(oid)
    AND oid = 'get_pending_events(uuid, integer)'::regprocedure;
  IF FOUND THEN
    EXECUTE 'DROP FUNCTION get_pending_events(UUID, INTEGER)';
  END IF;
END $$;

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
  max_retries INTEGER,
  idempotency_key TEXT,
  project_version INTEGER
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
    e.max_retries,
    e.idempotency_key,
    e.project_version
  FROM events e
  JOIN event_types et ON e.event_type = et.id
  WHERE e.organization_id = p_organization_id
    AND e.status IN ('pending','retrying')
    AND et.requires_slave_sync = true
    AND e.dead_letter = false
    AND e.next_attempt_at <= NOW()
  ORDER BY et.priority ASC, e.created_at ASC
  LIMIT p_limit;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON event_deliveries TO authenticated, anon, service_role;

-- 6) Utility function: schedule backoff for a delivery
CREATE OR REPLACE FUNCTION schedule_delivery_backoff(
  p_event_id UUID,
  p_slave_id UUID,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  attempts INTEGER;
  delay_seconds INTEGER;
BEGIN
  INSERT INTO event_deliveries(event_id, slave_id, status)
  VALUES(p_event_id, p_slave_id, 'retrying')
  ON CONFLICT (event_id, slave_id) DO UPDATE SET
    status = 'retrying',
    attempt_count = event_deliveries.attempt_count + 1,
    last_error = p_error,
    updated_at = NOW();

  SELECT attempt_count INTO attempts FROM event_deliveries
  WHERE event_id = p_event_id AND slave_id = p_slave_id;

  -- Exponential backoff: 5s, 15s, 45s, 2m15s, ... capped to 5m
  delay_seconds := LEAST(300, CAST(ROUND(5 * POWER(3, GREATEST(attempts-1,0))) AS INTEGER));

  UPDATE event_deliveries
  SET next_attempt_at = NOW() + make_interval(secs => delay_seconds)
  WHERE event_id = p_event_id AND slave_id = p_slave_id;
END;
$$;

GRANT EXECUTE ON FUNCTION schedule_delivery_backoff(UUID, UUID, TEXT) TO authenticated, anon, service_role;


