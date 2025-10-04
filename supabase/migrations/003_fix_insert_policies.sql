-- Fix: Add missing INSERT policy for organizations
-- The signup trigger needs to create organizations

-- Drop existing org policies to recreate them
DROP POLICY IF EXISTS "orgs_select" ON organizations;
DROP POLICY IF EXISTS "orgs_update" ON organizations;

-- Recreate with INSERT policy included
CREATE POLICY "orgs_select" ON organizations
  FOR SELECT 
  USING (id = public.current_user_org_id());

CREATE POLICY "orgs_insert" ON organizations
  FOR INSERT 
  WITH CHECK (true);  -- Allow anyone to insert (will be used by signup trigger)

CREATE POLICY "orgs_update" ON organizations
  FOR UPDATE 
  USING (id = public.current_user_org_id());
