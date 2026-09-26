export const DATABASE_SCHEMA_SQL = `-- =================================================================
-- SUPABASE POSTGRESQL COMPLETE DATABASE SCHEMA
-- Hospital Management System (HMS)
-- Covers: Appointments, Patients, Leads, Doctor Assessments,
-- Package Proposals, Counseling, Staff Accounts, Permissions,
-- Lead Notes & Realtime Synchronization
-- =================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- 1. APPOINTMENTS & PATIENT RECORDS TABLE (himas_appointments)
-- Stores both outpatient patient records and scheduled appointment leads
-- =================================================================
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
    visit_type TEXT, -- 'New' or 'Revisit' / 'OPD' or 'Follow Up'
    is_follow_up BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    
    -- Surgery & Counseling Tracking Fields
    follow_up_date DATE,
    followup_date DATE,
    surgery_date DATE,
    surgery_lost_date DATE,
    completed_surgery DATE,
    
    -- Structured Document Fields (JSONB)
    doctor_assessment JSONB,
    package_proposal JSONB
);

-- Ensure all columns exist for existing tables
ALTER TABLE public.himas_appointments 
ADD COLUMN IF NOT EXISTS hospital_id TEXT DEFAULT 'himas_facility_01',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS mobile TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS occupation TEXT,
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_doctor_name TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS has_insurance TEXT DEFAULT 'No',
ADD COLUMN IF NOT EXISTS insurance_name TEXT,
ADD COLUMN IF NOT EXISTS entry_date DATE,
ADD COLUMN IF NOT EXISTS booking_time TIME,
ADD COLUMN IF NOT EXISTS arrival_time TIME,
ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'Scheduled',
ADD COLUMN IF NOT EXISTS visit_type TEXT,
ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS follow_up_date DATE,
ADD COLUMN IF NOT EXISTS followup_date DATE,
ADD COLUMN IF NOT EXISTS surgery_date DATE,
ADD COLUMN IF NOT EXISTS surgery_lost_date DATE,
ADD COLUMN IF NOT EXISTS completed_surgery DATE,
ADD COLUMN IF NOT EXISTS doctor_assessment JSONB,
ADD COLUMN IF NOT EXISTS package_proposal JSONB;

-- Performance Indexes for himas_appointments
CREATE INDEX IF NOT EXISTS idx_himas_hospital_id ON public.himas_appointments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_himas_booking_status ON public.himas_appointments (booking_status);
CREATE INDEX IF NOT EXISTS idx_himas_entry_date ON public.himas_appointments (entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_himas_created_at ON public.himas_appointments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_himas_updated_at ON public.himas_appointments (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_himas_status_updated_at ON public.himas_appointments (status_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_himas_mobile ON public.himas_appointments (mobile);
CREATE INDEX IF NOT EXISTS idx_himas_condition ON public.himas_appointments (condition);
CREATE INDEX IF NOT EXISTS idx_himas_doc_assessment ON public.himas_appointments USING GIN (doctor_assessment);
CREATE INDEX IF NOT EXISTS idx_himas_package_proposal ON public.himas_appointments USING GIN (package_proposal);

-- =================================================================
-- 2. STAFF & DOCTORS USER TABLE (staff_users)
-- Stores Master, Admin, Analytics, Front Office, Doctors, Package & Sales
-- =================================================================
CREATE TABLE IF NOT EXISTS public.staff_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    mobile TEXT,
    role TEXT,
    password TEXT,
    hospital_id TEXT,
    hospital_name TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Extended profile & Doctor details
    specialization TEXT,
    department TEXT,
    registration_number TEXT,
    username TEXT,
    photo_url TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    full_address TEXT,
    access_status TEXT DEFAULT 'Active',
    granted_by TEXT,
    availability JSONB
);

-- Ensure all columns exist for existing staff_users table
ALTER TABLE public.staff_users 
ADD COLUMN IF NOT EXISTS hospital_id TEXT,
ADD COLUMN IF NOT EXISTS hospital_name TEXT,
ADD COLUMN IF NOT EXISTS specialization TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS full_address TEXT,
ADD COLUMN IF NOT EXISTS access_status TEXT DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS granted_by TEXT,
ADD COLUMN IF NOT EXISTS availability JSONB;

CREATE INDEX IF NOT EXISTS idx_staff_email ON public.staff_users (email);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.staff_users (role);
CREATE INDEX IF NOT EXISTS idx_staff_hospital_id ON public.staff_users (hospital_id);

-- =================================================================
-- 3. ACCESS CONTROL & DASHBOARD PERMISSIONS (dashboard_permissions)
-- Stores granular access rights per role and dashboard
-- =================================================================
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

ALTER TABLE public.dashboard_permissions 
ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'global',
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'ALL',
ADD COLUMN IF NOT EXISTS dashboard TEXT,
ADD COLUMN IF NOT EXISTS permission TEXT DEFAULT 'access',
ADD COLUMN IF NOT EXISTS status BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS granted_by TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_dashboard ON public.dashboard_permissions (dashboard);
CREATE INDEX IF NOT EXISTS idx_dashboard_permissions_role ON public.dashboard_permissions (role);

-- =================================================================
-- 4. LEAD & PATIENT NOTES TABLE (lead_notes)
-- Stores real-time audit trail of interaction notes with timestamp & author
-- =================================================================
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_date TEXT,
    created_time TEXT,
    created_by TEXT,
    created_by_name TEXT
);

ALTER TABLE public.lead_notes 
ADD COLUMN IF NOT EXISTS lead_id TEXT,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_date TEXT,
ADD COLUMN IF NOT EXISTS created_time TEXT,
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON public.lead_notes (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON public.lead_notes (created_at DESC);

-- =================================================================
-- 5. AUTO-UPDATE TRIGGER FUNCTION FOR 'updated_at'
-- Automatically updates the updated_at timestamp on row modification
-- =================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS update_himas_appointments_updated_at ON public.himas_appointments;
CREATE TRIGGER update_himas_appointments_updated_at
BEFORE UPDATE ON public.himas_appointments
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_permissions_updated_at ON public.dashboard_permissions;
CREATE TRIGGER update_dashboard_permissions_updated_at
BEFORE UPDATE ON public.dashboard_permissions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- =================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Enables RLS and grants access for anon and authenticated API clients
-- =================================================================
ALTER TABLE public.himas_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Public Access on Appointments" ON public.himas_appointments;
CREATE POLICY "Allow Public Access on Appointments" 
ON public.himas_appointments FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Public Access on Staff" ON public.staff_users;
CREATE POLICY "Allow Public Access on Staff" 
ON public.staff_users FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Public Access on Dashboard Permissions" ON public.dashboard_permissions;
CREATE POLICY "Allow Public Access on Dashboard Permissions" 
ON public.dashboard_permissions FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Public Access on Lead Notes" ON public.lead_notes;
CREATE POLICY "Allow Public Access on Lead Notes" 
ON public.lead_notes FOR ALL TO public USING (true) WITH CHECK (true);

-- =================================================================
-- 7. SUPABASE REALTIME PUBLICATION
-- Enables realtime notifications across all web clients
-- =================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'himas_appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.himas_appointments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'staff_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_users;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'dashboard_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_permissions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lead_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notes;
  END IF;
END $$;

-- Set replica identity for full realtime row updates
ALTER TABLE public.himas_appointments REPLICA IDENTITY FULL;
ALTER TABLE public.staff_users REPLICA IDENTITY FULL;
ALTER TABLE public.dashboard_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.lead_notes REPLICA IDENTITY FULL;

-- =================================================================
-- 8. INITIAL SEED DATA (Staff Users & Permissions)
-- Safe to run repeatedly (uses ON CONFLICT DO UPDATE / NOTHING)
-- =================================================================

-- Default Staff Accounts
INSERT INTO public.staff_users (id, name, email, mobile, role, password, hospital_id, hospital_name, specialization, department)
VALUES 
  ('staff_master_01', 'Master Administrator', 'master@hms.com', '+10000000000', 'MASTER', 'Master@123', NULL, 'Global Control Center', 'Administration', 'Executive Management'),
  ('himas_facility_01', 'HIMAS Hospital (Analytics A)', 'report@hms.com', '+91 98765 43210', 'ANALYTICS', 'Report@123', 'himas_facility_01', 'HIMAS Super Speciality Hospital', 'Hospital Analytics', 'Administration'),
  ('staff_front_01', 'Front Office Executive (Analytics A)', 'office@hms.com', '+91 98765 43211', 'FRONT_OFFICE', 'Hms1984@', 'himas_facility_01', 'HIMAS Super Speciality Hospital', 'Reception & Triage', 'Front Office'),
  ('staff_doc_01', 'Dr. S. K. Sharma (Analytics A)', 'doctor@hms.com', '+91 98765 43212', 'DOCTOR', 'Doctor@123', 'himas_facility_01', 'HIMAS Super Speciality Hospital', 'Laparoscopic Surgeon', 'General & Laparoscopic Surgery'),
  ('staff_doc_02', 'Dr. Anita Verma (Analytics A)', 'doctor.a2@hms.com', '+91 98765 43213', 'DOCTOR', 'Doctor@123', 'himas_facility_01', 'HIMAS Super Speciality Hospital', 'General Surgeon', 'General Surgery'),
  ('facility_apex_02', 'Apex Healthcare (Analytics B)', 'analytics.b@hms.com', '+91 98765 88800', 'ANALYTICS', 'AnalyticsB@123', 'facility_apex_02', 'Apex Multispeciality Hospital', 'Hospital Analytics', 'Administration'),
  ('staff_front_b', 'Front Office Executive (Analytics B)', 'office.b@hms.com', '+91 98765 88801', 'FRONT_OFFICE', 'OfficeB@123', 'facility_apex_02', 'Apex Multispeciality Hospital', 'Reception & Triage', 'Front Office'),
  ('staff_doc_b1', 'Dr. Rajesh Patel (Analytics B)', 'doctor.b1@hms.com', '+91 98765 88802', 'DOCTOR', 'DoctorB@123', 'facility_apex_02', 'Apex Multispeciality Hospital', 'Proctologist', 'Proctology & GI Surgery'),
  ('staff_doc_b2', 'Dr. Priya Nair (Analytics B)', 'doctor.b2@hms.com', '+91 98765 88803', 'DOCTOR', 'DoctorB@123', 'facility_apex_02', 'Apex Multispeciality Hospital', 'Vascular Surgeon', 'Vascular Surgery'),
  ('staff_sales_01', 'Sales Specialist', 'sales@hms.com', '+91 98765 99999', 'SALES', 'Sales@123', NULL, 'Central Sales Team', 'Patient Counseling', 'Sales & Conversion')
ON CONFLICT (id) DO UPDATE SET 
  hospital_id = EXCLUDED.hospital_id,
  hospital_name = EXCLUDED.hospital_name,
  role = EXCLUDED.role,
  specialization = COALESCE(EXCLUDED.specialization, staff_users.specialization),
  department = COALESCE(EXCLUDED.department, staff_users.department);

-- Default Dashboard Permissions Seed
INSERT INTO public.dashboard_permissions (id, user_id, role, dashboard, permission, status, granted_by)
VALUES
  ('perm_master', 'global', 'MASTER', 'master', 'master_access', true, 'system'),
  ('perm_admin', 'global', 'ADMIN', 'admin', 'admin_access', true, 'master'),
  ('perm_analytics_hub', 'global', 'ADMIN', 'analytics_hub', 'analytics_hub_access', true, 'admin'),
  ('perm_front_office', 'global', 'ANALYTICS_HUB', 'front_office', 'front_office_access', true, 'analytics_hub'),
  ('perm_doctor', 'global', 'ANALYTICS_HUB', 'doctor', 'doctor_access', true, 'analytics_hub'),
  ('perm_package', 'global', 'ANALYTICS_HUB', 'package', 'package_access', true, 'analytics_hub'),
  ('perm_sales', 'global', 'MASTER', 'sales', 'sales_access', true, 'master'),
  ('perm_sched_analytics_hub', 'global', 'MASTER', 'analytics_hub', 'sched_analytics_hub', true, 'master'),
  ('perm_sched_doctor', 'global', 'MASTER', 'doctor', 'sched_doctor', true, 'master'),
  ('perm_sched_sales', 'global', 'MASTER', 'sales', 'sched_sales', true, 'master'),
  ('perm_report_doctor_performance', 'global', 'MASTER', 'doctor_performance', 'report_doctor_performance', true, 'master'),
  ('perm_report_period_activity', 'global', 'MASTER', 'period_activity', 'report_period_activity', true, 'master'),
  ('perm_report_financial_analytics', 'global', 'MASTER', 'financial_analytics', 'report_financial_analytics', true, 'master'),
  ('perm_report_procedure_trends', 'global', 'MASTER', 'procedure_trends', 'report_procedure_trends', true, 'master')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = NOW();
`;
