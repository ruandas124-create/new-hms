export const DATABASE_SCHEMA_SQL = `-- =================================================================
-- HMS HOSPITAL MANAGEMENT DATABASE SCHEMA
-- Version: 3.3 (Clean Setup & Migration Support)
-- =================================================================

-- 1. APPOINTMENTS & PATIENT RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.himas_appointments (
    id TEXT PRIMARY KEY,
    hospital_id TEXT DEFAULT 'himas_facility_01',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status_updated_at TIMESTAMPTZ, 
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    occupation TEXT,
    dob DATE,
    source TEXT,
    source_doctor_name TEXT,
    condition TEXT,
    has_insurance TEXT DEFAULT 'No',
    insurance_name TEXT,
    entry_date DATE,
    booking_time TIME,
    arrival_time TIME,
    booking_status TEXT DEFAULT 'Scheduled', 
    visit_type TEXT, -- Persisted 'New' or 'Revisit'
    is_follow_up BOOLEAN DEFAULT FALSE,
    
    remarks TEXT,
    follow_up_date DATE,
    followup_date DATE,
    surgery_date DATE,
    surgery_lost_date DATE,
    completed_surgery DATE,
    
    doctor_assessment JSONB,
    package_proposal JSONB
);

-- Ensure all columns exist for existing tables
ALTER TABLE public.himas_appointments 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS visit_type TEXT,
ADD COLUMN IF NOT EXISTS followup_date DATE,
ADD COLUMN IF NOT EXISTS surgery_date DATE,
ADD COLUMN IF NOT EXISTS surgery_lost_date DATE,
ADD COLUMN IF NOT EXISTS completed_surgery DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS remarks TEXT;

CREATE INDEX IF NOT EXISTS idx_himas_status_updated_at ON public.himas_appointments (status_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_himas_updated_at ON public.himas_appointments (updated_at DESC);

-- 2. AUTO-UPDATE TRIGGER FUNCTION FOR 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_himas_appointments_updated_at ON public.himas_appointments;
CREATE TRIGGER update_himas_appointments_updated_at
BEFORE UPDATE ON public.himas_appointments
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- 3. STAFF USERS TABLE
CREATE TABLE IF NOT EXISTS public.staff_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    mobile TEXT,
    role TEXT,
    password TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) CONFIGURATION
ALTER TABLE public.himas_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Public Access on Appointments" ON public.himas_appointments;
DROP POLICY IF EXISTS "Allow Public Access on Staff" ON public.staff_users;

CREATE POLICY "Allow Public Access on Appointments" 
ON public.himas_appointments FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow Public Access on Staff" 
ON public.staff_users FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. REALTIME SYNC ENABLEMENT
-- Add both core tables to Supabase's realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.himas_appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_users;

-- 6. DEFAULT STAFF ACCOUNTS (Optional initial seed)
INSERT INTO public.staff_users (id, name, email, mobile, role, password)
VALUES 
  ('staff_master_01', 'Master Administrator', 'master@hms.com', '+10000000000', 'MASTER', 'Master@123'),
  ('staff_admin_01', 'Administrator', 'admin@hms.com', '+10000000001', 'ADMIN', 'Admin@123'),
  ('staff_front_01', 'Front Office Team', 'office@hms.com', '+10000000002', 'FRONT_OFFICE', 'Hms1984@'),
  ('staff_doc_01', 'Dr. John Watson', 'doctor@hms.com', '+10000000003', 'DOCTOR', 'Doctor@123'),
  ('staff_pack_01', 'Package Counselor', 'team@hms.com', '+10000000004', 'PACKAGE_TEAM', 'Team8131@'),
  ('staff_ana_01', 'Hospital Analytics', 'report@hms.com', '+10000000005', 'ANALYTICS', 'Report@123')
ON CONFLICT (id) DO NOTHING;

-- 7. ACCESS CONTROL & DASHBOARD PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.dashboard_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT 'global',
    role TEXT DEFAULT 'ALL',
    dashboard TEXT NOT NULL,
    permission TEXT DEFAULT 'access',
    status BOOLEAN DEFAULT true,
    granted_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dashboard_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow Public Access on Dashboard Permissions" ON public.dashboard_permissions;
CREATE POLICY "Allow Public Access on Dashboard Permissions" 
ON public.dashboard_permissions FOR ALL TO public USING (true) WITH CHECK (true);

-- Add to Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_permissions;

-- Default Dashboard Permissions Seed
INSERT INTO public.dashboard_permissions (id, user_id, role, dashboard, permission, status, granted_by)
VALUES
  ('perm_admin', 'global', 'ADMIN', 'admin', 'admin_access', true, 'master'),
  ('perm_analytics_hub', 'global', 'ADMIN', 'analytics_hub', 'analytics_hub_access', true, 'admin'),
  ('perm_front_office', 'global', 'ANALYTICS_HUB', 'front_office', 'front_office_access', true, 'analytics_hub'),
  ('perm_doctor', 'global', 'ANALYTICS_HUB', 'doctor', 'doctor_access', true, 'analytics_hub'),
  ('perm_package', 'global', 'ANALYTICS_HUB', 'package', 'package_access', true, 'analytics_hub')
ON CONFLICT (id) DO NOTHING;
`;
