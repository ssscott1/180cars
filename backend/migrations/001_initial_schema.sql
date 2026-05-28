-- 180Cars - Initial Database Schema
-- Run this migration in your Supabase SQL editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: dealership_locations
-- ============================================================
CREATE TABLE IF NOT EXISTS dealership_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  address     TEXT,
  city        VARCHAR(100),
  state       VARCHAR(50),
  postcode    VARCHAR(10),
  phone       VARCHAR(20),
  email       VARCHAR(255),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: users  (maps Supabase auth.users → our roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        VARCHAR(255) NOT NULL,
  user_type    VARCHAR(50)  NOT NULL DEFAULT 'member'
                  CHECK (user_type IN ('system_admin', 'location_admin', 'member')),
  location_id  UUID REFERENCES dealership_locations(id) ON DELETE SET NULL,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: members
-- ============================================================
CREATE TABLE IF NOT EXISTS members (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  location_id                UUID REFERENCES dealership_locations(id) ON DELETE SET NULL,
  first_name                 VARCHAR(100) NOT NULL,
  last_name                  VARCHAR(100) NOT NULL,
  dob                        DATE,
  mobile                     VARCHAR(20),
  email                      VARCHAR(255) NOT NULL,
  address                    TEXT,
  drivers_license_number     VARCHAR(100) UNIQUE,
  drivers_license_file_path  TEXT,
  medicare_number            VARCHAR(50),
  employer_name              VARCHAR(255),
  employer_phone             VARCHAR(20),
  bank_account_name          VARCHAR(255),
  bank_bsb                   VARCHAR(10),
  bank_account_number        VARCHAR(20),
  bank_statement_file_path   TEXT,
  member_status              VARCHAR(50) NOT NULL DEFAULT 'inactive'
                               CHECK (member_status IN ('active', 'inactive', 'suspended')),
  approval_status            VARCHAR(50) NOT NULL DEFAULT 'pending_approval'
                               CHECK (approval_status IN ('pending_approval', 'approved', 'rejected')),
  rejection_reason           TEXT,
  stripe_customer_id         VARCHAR(255),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id          UUID REFERENCES dealership_locations(id) ON DELETE SET NULL,
  make                 VARCHAR(100) NOT NULL,
  model                VARCHAR(100) NOT NULL,
  year                 INTEGER NOT NULL,
  rego                 VARCHAR(20) NOT NULL UNIQUE,
  vin                  VARCHAR(50) NOT NULL UNIQUE,
  engine_number        VARCHAR(50) NOT NULL UNIQUE,
  description          TEXT,
  purchase_price       DECIMAL(10, 2) NOT NULL,
  weekly_rental_amount DECIMAL(10, 2) NOT NULL,
  deposit_amount       DECIMAL(10, 2) NOT NULL,
  vehicle_status       VARCHAR(50) NOT NULL DEFAULT 'available'
                         CHECK (vehicle_status IN ('available', 'assigned_to_member', 'in_service', 'retired')),
  insurance_provider   VARCHAR(255),
  insurance_policy     VARCHAR(255),
  insurance_expiry     DATE,
  rego_expiry          DATE,
  supplying_dealer     VARCHAR(255),
  invoice_file_path    TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: rental_agreements
-- ============================================================
CREATE TABLE IF NOT EXISTS rental_agreements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id             UUID NOT NULL REFERENCES vehicles(id),
  member_id              UUID NOT NULL REFERENCES members(id),
  agreement_status       VARCHAR(50) NOT NULL DEFAULT 'active'
                           CHECK (agreement_status IN ('active', 'terminated', 'completed')),
  weekly_rental_amount   DECIMAL(10, 2) NOT NULL,
  deposit_amount         DECIMAL(10, 2) NOT NULL,
  minimum_term_weeks     INTEGER NOT NULL DEFAULT 12,
  early_termination_fee  DECIMAL(10, 2),
  start_date             DATE NOT NULL,
  end_date               DATE,
  termination_date       DATE,
  termination_reason     TEXT,
  created_by_admin_id    UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: rental_payment_schedule
-- ============================================================
CREATE TABLE IF NOT EXISTS rental_payment_schedule (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id                   UUID NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
  payment_type                   VARCHAR(50) NOT NULL
                                   CHECK (payment_type IN ('deposit', 'weekly_rental')),
  week_number                    INTEGER NOT NULL,
  due_date                       DATE NOT NULL,
  amount_due                     DECIMAL(10, 2) NOT NULL,
  payment_status                 VARCHAR(50) NOT NULL DEFAULT 'pending'
                                   CHECK (payment_status IN ('pending', 'paid', 'overdue', 'failed', 'waived')),
  paid_at                        TIMESTAMPTZ,
  payment_confirmed_at           TIMESTAMPTZ,
  payment_confirmed_by_admin_id  UUID REFERENCES auth.users(id),
  stripe_payment_intent_id       VARCHAR(255),
  notes                          TEXT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action         VARCHAR(255) NOT NULL,
  resource_type  VARCHAR(100),
  resource_id    UUID,
  details        JSONB,
  ip_address     INET,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_rego         ON vehicles(rego);
CREATE INDEX IF NOT EXISTS idx_vehicles_status       ON vehicles(vehicle_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_location     ON vehicles(location_id);
CREATE INDEX IF NOT EXISTS idx_members_email         ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_status        ON members(member_status, approval_status);
CREATE INDEX IF NOT EXISTS idx_members_location      ON members(location_id);
CREATE INDEX IF NOT EXISTS idx_agreements_member     ON rental_agreements(member_id);
CREATE INDEX IF NOT EXISTS idx_agreements_vehicle    ON rental_agreements(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_agreements_status     ON rental_agreements(agreement_status);
CREATE INDEX IF NOT EXISTS idx_payments_agreement    ON rental_payment_schedule(agreement_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date     ON rental_payment_schedule(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status       ON rental_payment_schedule(payment_status);
CREATE INDEX IF NOT EXISTS idx_audit_user            ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource        ON audit_log(resource_type, resource_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
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
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE dealership_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE members                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_agreements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_payment_schedule  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user type
CREATE OR REPLACE FUNCTION get_user_type(uid UUID)
RETURNS TEXT AS $$
  SELECT user_type FROM users WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user location_id
CREATE OR REPLACE FUNCTION get_user_location(uid UUID)
RETURNS UUID AS $$
  SELECT location_id FROM users WHERE id = uid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ──────────────────────────────────────────────────────────
-- dealership_locations policies
-- ──────────────────────────────────────────────────────────
CREATE POLICY "locations_system_admin_all" ON dealership_locations
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');

CREATE POLICY "locations_read_authenticated" ON dealership_locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ──────────────────────────────────────────────────────────
-- users policies
-- ──────────────────────────────────────────────────────────
CREATE POLICY "users_system_admin_all" ON users
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- members policies
-- ──────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────
-- vehicles policies
-- ──────────────────────────────────────────────────────────
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
      WHERE m.user_id = auth.uid()
        AND ra.agreement_status = 'active'
    )
  );

-- ──────────────────────────────────────────────────────────
-- rental_agreements policies
-- ──────────────────────────────────────────────────────────
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
    member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────
-- rental_payment_schedule policies
-- ──────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────
-- audit_log policies
-- ──────────────────────────────────────────────────────────
CREATE POLICY "audit_system_admin_all" ON audit_log
  FOR ALL USING (get_user_type(auth.uid()) = 'system_admin');

CREATE POLICY "audit_location_admin_read" ON audit_log
  FOR SELECT USING (get_user_type(auth.uid()) = 'location_admin');

-- ============================================================
-- STORAGE BUCKETS (run separately or via Supabase dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle_invoices', 'vehicle_invoices', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('driver_licenses', 'driver_licenses', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('bank_statements', 'bank_statements', false);

-- ============================================================
-- SEED: Default dealership location
-- ============================================================
INSERT INTO dealership_locations (name, city, state, is_active)
VALUES ('Head Office', 'Sydney', 'NSW', true)
ON CONFLICT DO NOTHING;
