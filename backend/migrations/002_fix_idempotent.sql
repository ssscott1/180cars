-- Run this in Supabase SQL Editor if 001 partially applied.
-- Safely drops and recreates triggers and RLS policies.

-- ============================================================
-- DROP & RECREATE TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS trg_dealership_locations_updated_at ON dealership_locations;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
DROP TRIGGER IF EXISTS trg_rental_agreements_updated_at ON rental_agreements;
DROP TRIGGER IF EXISTS trg_rental_payment_schedule_updated_at ON rental_payment_schedule;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dealership_locations_updated_at
  BEFORE UPDATE ON dealership_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rental_agreements_updated_at
  BEFORE UPDATE ON rental_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rental_payment_schedule_updated_at
  BEFORE UPDATE ON rental_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DROP & RECREATE RLS POLICIES
-- ============================================================
-- dealership_locations
DROP POLICY IF EXISTS "locations_system_admin_all"    ON dealership_locations;
DROP POLICY IF EXISTS "locations_read_authenticated"  ON dealership_locations;

-- users
DROP POLICY IF EXISTS "users_system_admin_all" ON users;
DROP POLICY IF EXISTS "users_read_own"         ON users;

-- members
DROP POLICY IF EXISTS "members_system_admin_all"              ON members;
DROP POLICY IF EXISTS "members_location_admin_own_location"   ON members;
DROP POLICY IF EXISTS "members_view_own_profile"              ON members;
DROP POLICY IF EXISTS "members_update_own_profile"            ON members;

-- vehicles
DROP POLICY IF EXISTS "vehicles_system_admin_all"             ON vehicles;
DROP POLICY IF EXISTS "vehicles_location_admin_own_location"  ON vehicles;
DROP POLICY IF EXISTS "vehicles_member_view_assigned"         ON vehicles;

-- rental_agreements
DROP POLICY IF EXISTS "agreements_system_admin_all"             ON rental_agreements;
DROP POLICY IF EXISTS "agreements_location_admin_own_location"  ON rental_agreements;
DROP POLICY IF EXISTS "agreements_member_view_own"              ON rental_agreements;

-- rental_payment_schedule
DROP POLICY IF EXISTS "payments_system_admin_all"             ON rental_payment_schedule;
DROP POLICY IF EXISTS "payments_location_admin_own_location"  ON rental_payment_schedule;
DROP POLICY IF EXISTS "payments_member_view_own"              ON rental_payment_schedule;

-- audit_log
DROP POLICY IF EXISTS "audit_system_admin_all"    ON audit_log;
DROP POLICY IF EXISTS "audit_location_admin_read" ON audit_log;

-- Helper functions
CREATE OR REPLACE FUNCTION get_user_type(uid UUID)
RETURNS TEXT AS $$
  SELECT user_type FROM users WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_location(uid UUID)
RETURNS UUID AS $$
  SELECT location_id FROM users WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- dealership_locations policies
CREATE POLICY "locations_system_admin_all" ON dealership_locations
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');
CREATE POLICY "locations_read_authenticated" ON dealership_locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- users policies
CREATE POLICY "users_system_admin_all" ON users
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (id = auth.uid());

-- members policies
CREATE POLICY "members_system_admin_all" ON members
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');
CREATE POLICY "members_location_admin_own_location" ON members
  FOR ALL USING (
    get_user_type(auth.uid()) = 'location_admin'
    AND location_id = get_user_location(auth.uid())
  );
CREATE POLICY "members_view_own_profile" ON members
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "members_update_own_profile" ON members
  FOR UPDATE USING (user_id = auth.uid());

-- vehicles policies
CREATE POLICY "vehicles_system_admin_all" ON vehicles
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');
CREATE POLICY "vehicles_location_admin_own_location" ON vehicles
  FOR ALL USING (
    get_user_type(auth.uid()) = 'location_admin'
    AND location_id = get_user_location(auth.uid())
  );
CREATE POLICY "vehicles_member_view_assigned" ON vehicles
  FOR SELECT USING (
    get_user_type(auth.uid()) = 'member'
    AND id IN (
      SELECT ra.vehicle_id FROM rental_agreements ra
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid() AND ra.agreement_status = 'active'
    )
  );

-- rental_agreements policies
CREATE POLICY "agreements_system_admin_all" ON rental_agreements
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');
CREATE POLICY "agreements_location_admin_own_location" ON rental_agreements
  FOR ALL USING (
    get_user_type(auth.uid()) = 'location_admin'
    AND vehicle_id IN (
      SELECT id FROM vehicles WHERE location_id = get_user_location(auth.uid())
    )
  );
CREATE POLICY "agreements_member_view_own" ON rental_agreements
  FOR SELECT USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- rental_payment_schedule policies
CREATE POLICY "payments_system_admin_all" ON rental_payment_schedule
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');
CREATE POLICY "payments_location_admin_own_location" ON rental_payment_schedule
  FOR ALL USING (
    get_user_type(auth.uid()) = 'location_admin'
    AND agreement_id IN (
      SELECT ra.id FROM rental_agreements ra
      JOIN vehicles v ON v.id = ra.vehicle_id
      WHERE v.location_id = get_user_location(auth.uid())
    )
  );
CREATE POLICY "payments_member_view_own" ON rental_payment_schedule
  FOR SELECT USING (
    agreement_id IN (
      SELECT ra.id FROM rental_agreements ra
      JOIN members m ON m.id = ra.member_id
      WHERE m.user_id = auth.uid()
    )
  );

-- audit_log policies
CREATE POLICY "audit_system_admin_all" ON audit_log
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');
CREATE POLICY "audit_location_admin_read" ON audit_log
  FOR SELECT USING (get_user_type(auth.uid()) = 'location_admin');
