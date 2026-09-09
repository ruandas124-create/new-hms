
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  Patient, DoctorAssessment, PackageProposal, Role, StaffUser, Appointment, 
  Condition, SurgeonCode, PainSeverity, Affordability, ConversionReadiness, 
  ProposalOutcome, Gender, DashboardKey, DashboardPermission,
  SchedulingTarget, SchedulingPermissionsState, ReportPermissionsState
} from '../types';
import { supabase } from '../services/supabaseClient';

interface PatientFilters {
  startDate?: string;
  endDate?: string;
  condition?: string;
  source?: string;
  hasInsurance?: string;
  surgeryNeeded?: boolean;
  medicationOnly?: boolean;
  status?: 'New' | 'Consulted' | 'Counseled';
  searchTerm?: string;
}

interface HospitalContextType {
  currentUserRole: Role;
  setCurrentUserRole: (role: Role) => void;
  dashboardPermissions: Record<DashboardKey, boolean>;
  schedulingPermissions: SchedulingPermissionsState;
  reportPermissions: ReportPermissionsState;
  activeDashboard: DashboardKey;
  setActiveDashboard: (key: DashboardKey) => void;
  updateDashboardPermission: (dashboard: DashboardKey, status: boolean, grantedBy?: string) => Promise<void>;
  updateSchedulingPermission: (target: SchedulingTarget, status: boolean, grantedBy?: string) => Promise<void>;
  updateReportPermission: (reportKey: keyof ReportPermissionsState, status: boolean, grantedBy?: string) => Promise<void>;
  hasPermission: (role: Role, dashboard: DashboardKey) => boolean;
  getAccessibleDashboards: () => DashboardKey[];
  patients: Patient[];
  addPatient: (patientData: Omit<Patient, 'registeredAt' | 'hospital_id'>) => Promise<void>; 
  updatePatient: (targetId: string, patient: Patient) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  convertAppointment: (appointmentId: string, patientData: Omit<Patient, 'registeredAt' | 'hospital_id'>) => Promise<void>;
  updateDoctorAssessment: (patientId: string, assessment: Partial<DoctorAssessment>) => Promise<void>;
  updatePackageProposal: (patientId: string, proposal: PackageProposal) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  fetchFilteredPatients: (filters: PatientFilters, page: number, pageSize: number) => Promise<{ data: Patient[], count: number }>;
  appointments: Appointment[];
  addAppointment: (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'hospital_id' | 'status'> & { hospital_id?: string }) => Promise<void>;
  updateAppointment: (appointment: Appointment) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  staffUsers: StaffUser[];
  registerStaff: (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => void;
  updateStaff: (id: string, staffData: Partial<StaffUser>) => Promise<void>;
  saveStatus: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSavedAt: Date | null;
  refreshData: (isBackground?: boolean) => Promise<void>;
  isLoading: boolean;
  isStaffLoaded: boolean;
  systemName: string;
  updateSystemName: (name: string) => void;
}

const HospitalContext = createContext<HospitalContextType | undefined>(undefined);
const STORAGE_KEY_ROLE = 'hms_hospital_role';
const STORAGE_KEY_PERMS = 'hms_dashboard_permissions';
const STORAGE_KEY_SCHED_PERMS = 'hms_scheduling_permissions';
const STORAGE_KEY_REPORT_PERMS = 'hms_report_permissions';
const APPOINTMENTS_TABLE = 'himas_appointments';
const FACILITY_ID = 'himas_facility_01';

export const DEFAULT_PERMISSIONS: Record<DashboardKey, boolean> = {
  master: true,
  master_access: true,
  master_scheduling: true,
  master_availability: true,
  master_reports: true,
  analytics_hub: true,
  front_office: true,
  doctor: true,
  package: true,
  sales: true,
};

export const DEFAULT_SCHEDULING_PERMISSIONS: SchedulingPermissionsState = {
  analytics_hub: true,
  doctor: true,
  sales: true,
};

export const DEFAULT_REPORT_PERMISSIONS: ReportPermissionsState = {
  doctor_performance: true,
  period_activity: true,
  financial_analytics: true,
  procedure_trends: true,
};

export const DASHBOARD_TO_SLUG: Record<DashboardKey, string> = {
  master: 'master',
  master_access: 'master-access',
  master_scheduling: 'master-scheduling',
  master_availability: 'master-availability',
  master_reports: 'master-reports',
  analytics_hub: 'analytics-hub',
  front_office: 'front-office',
  doctor: 'doctor',
  package: 'package',
  sales: 'sales',
};

export const checkPermission = (
  role: Role, 
  dashboard: DashboardKey, 
  permissions: Record<DashboardKey, boolean>,
  user?: StaffUser
): boolean => {
  if (!role) return false;
  
  if (user && user.grantedBy === 'Master Admin' && user.accessStatus === 'Active') {
    if (dashboard === 'analytics_hub') return !!permissions.analytics_hub;
  }

  // 1. MASTER: Full complete access to all dashboards
  if (role === 'MASTER') return true;

  // 2. ADMIN: Access to Analytics Hub and permitted operational dashboards
  if (role === 'ADMIN') {
    if (dashboard === 'analytics_hub') return !!permissions.analytics_hub;
    if (dashboard === 'front_office') return !!permissions.front_office;
    if (dashboard === 'doctor') return !!permissions.doctor;
    if (dashboard === 'package') return !!permissions.package;
    if (dashboard === 'sales') return !!permissions.sales;
    return false;
  }

  // 3. ANALYTICS / ANALYTICS_HUB / HOSPITAL
  if (role === 'ANALYTICS' || role === 'ANALYTICS_HUB' || role === 'HOSPITAL') {
    if (dashboard === 'analytics_hub') return !!permissions.analytics_hub;
    if (dashboard === 'front_office') return !!permissions.front_office;
    if (dashboard === 'doctor') return !!permissions.doctor;
    if (dashboard === 'package') return !!permissions.package;
    if (dashboard === 'sales') return !!permissions.sales;
    return false;
  }

  // 4. FRONT_OFFICE: Can only access front_office if permitted
  if (role === 'FRONT_OFFICE') {
    if (dashboard === 'front_office') return !!permissions.front_office;
    return false;
  }

  // 5. DOCTOR: Can only access doctor if permitted
  if (role === 'DOCTOR') {
    if (dashboard === 'doctor') return !!permissions.doctor;
    return false;
  }

  // 6. PACKAGE_TEAM / PACKAGE: Can only access package if permitted
  if (role === 'PACKAGE_TEAM' || role === 'PACKAGE') {
    if (dashboard === 'package') return !!permissions.package;
    return false;
  }

  // 7. SALES: Can only access sales if permitted
  if (role === 'SALES') {
    if (dashboard === 'sales') return !!permissions.sales;
    return false;
  }

  return false;
};

export const getDefaultDashboardForRole = (role: Role, user?: StaffUser): DashboardKey => {
  if (user && user.grantedBy === 'Master Admin' && user.accessStatus === 'Active') {
    return 'analytics_hub';
  }
  switch (role) {
    case 'MASTER': return 'master_access';
    case 'ADMIN':
    case 'ANALYTICS':
    case 'HOSPITAL':
    case 'ANALYTICS_HUB': return 'analytics_hub';
    case 'FRONT_OFFICE': return 'front_office';
    case 'DOCTOR': return 'doctor';
    case 'PACKAGE_TEAM':
    case 'PACKAGE': return 'package';
    case 'SALES': return 'sales';
    default: return 'front_office';
  }
};

const getDashboardFromLocation = (): DashboardKey | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
  if (hash) {
    if (hash === 'master') return 'master_access';
    if (hash === 'master-access' || hash === 'master_access') return 'master_access';
    if (hash === 'master-scheduling' || hash === 'master_scheduling') return 'master_scheduling';
    if (hash === 'master-availability' || hash === 'master_availability') return 'master_availability';
    if (hash === 'master-reports' || hash === 'master_reports') return 'master_reports';
    if (hash === 'admin') return 'analytics_hub';
    if (hash === 'analytics' || hash === 'analytics-hub' || hash === 'analytics_hub') return 'analytics_hub';
    if (hash === 'front-office' || hash === 'front_office') return 'front_office';
    if (hash === 'doctor') return 'doctor';
    if (hash === 'package') return 'package';
    if (hash === 'sales') return 'sales';
  }

  const path = window.location.pathname.replace(/^\//, '').toLowerCase().trim();
  if (path) {
    if (path === 'master') return 'master_access';
    if (path === 'master-access' || path === 'master_access') return 'master_access';
    if (path === 'master-scheduling' || path === 'master_scheduling') return 'master_scheduling';
    if (path === 'master-availability' || path === 'master_availability') return 'master_availability';
    if (path === 'master-reports' || path === 'master_reports') return 'master_reports';
    if (path === 'admin') return 'analytics_hub';
    if (path === 'analytics' || path === 'analytics-hub' || path === 'analytics_hub') return 'analytics_hub';
    if (path === 'front-office' || path === 'front_office') return 'front_office';
    if (path === 'doctor') return 'doctor';
    if (path === 'package') return 'package';
    if (path === 'sales') return 'sales';
  }
  return null;
};

const nullify = (val: any) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
};

const mapRowToPatient = (row: any): Patient => {
  const dbProposal = row.package_proposal;
  let uiProposal: PackageProposal | undefined = undefined;

  if (dbProposal || row.follow_up_date || row.surgery_date || row.completed_surgery || row.surgery_lost_date) {
    let outcomeStatus = dbProposal?.status;
    if (outcomeStatus === 'Surgery Fixed' || outcomeStatus === 'Schedule Surgery') {
      outcomeStatus = 'Scheduled';
    } else if (outcomeStatus === 'Surgery Lost') {
      outcomeStatus = 'Lost';
    } else if (outcomeStatus === 'Surgery Completed') {
      outcomeStatus = 'Completed';
    }

    uiProposal = {
      outcome: (outcomeStatus || undefined) as ProposalOutcome,
      modeOfPayment: dbProposal?.paymentMode || undefined,
      surgeryDate: row.surgery_date || dbProposal?.surgeryDate || dbProposal?.outcomeDate || undefined,
      outcomeDate: row.completed_surgery || row.surgery_lost_date || dbProposal?.outcomeDate || undefined,
      roomType: dbProposal?.roomType || undefined,
      stayDays: dbProposal?.stayDays || undefined,
      icuCharges: dbProposal?.icuCharges || undefined,
      surgeryMedicines: dbProposal?.surgeryMedicines || undefined,
      preOpInvestigation: dbProposal?.preOpInvestigation || undefined,
      lostReason: dbProposal?.lostReason || undefined,
      remarks: row.remarks || dbProposal?.remarks || undefined,
      postFollowUp: dbProposal?.postOpFollowUp || undefined,
      postFollowUpCount: dbProposal?.postOpFollowUpCount || undefined,
      packageAmount: dbProposal?.packageAmount != null ? String(dbProposal.packageAmount) : undefined,
      equipment: (dbProposal?.equipment && Array.isArray(dbProposal.equipment) && dbProposal.equipment.length > 0) ? 'Included' : 'Excluded',
      decisionPattern: dbProposal?.decisionPattern || '',
      objectionIdentified: dbProposal?.objectionIdentified || '',
      counselingStrategy: dbProposal?.counselingStrategy || '',
      followUpDate: row.followup_date || row.follow_up_date || dbProposal?.followUpDate || '',
      proposalCreatedAt: dbProposal?.proposalCreatedAt || new Date().toISOString(),
      proposalStage: dbProposal?.proposalStage || undefined,
    };
  }
  
  let uiAssessment: DoctorAssessment | undefined = undefined;
  if (row.doctor_assessment) {
    uiAssessment = {
      ...row.doctor_assessment,
      patient_id: row.id,
    };
  }

  return {
    id: row.id || '',
    hospital_id: row.hospital_id || '',
    name: row.name || '',
    dob: row.dob || '',
    gender: (row.gender || Gender.Other) as Gender,
    age: row.age || 0,
    mobile: row.mobile || '',
    occupation: row.occupation || '',
    hasInsurance: row.has_insurance || 'No',
    insuranceName: row.insurance_name || '',
    source: row.source || 'Other',
    sourceDoctorName: row.source_doctor_name || '',
    condition: (row.condition || Condition.Other) as Condition,
    visitType: row.is_follow_up ? 'Follow Up' : 'OPD',
    visit_type: row.visit_type || '',
    registeredAt: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    status_updated_at: row.status_updated_at || null,
    entry_date: row.entry_date || '',
    arrivalTime: row.arrival_time || '',
    status: row.booking_status || 'Arrived',
    packageProposal: uiProposal,
    doctorAssessment: uiAssessment,
    surgery_date: row.surgery_date || '',
    followup_date: row.followup_date || '',
    surgery_lost_date: row.surgery_lost_date || '',
    completed_surgery: row.completed_surgery || '',
    sourceTable: APPOINTMENTS_TABLE as any
  };
};

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUserRole, setCurrentUserRoleState] = useState<Role>(null);
  const [dashboardPermissions, setDashboardPermissions] = useState<Record<DashboardKey, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_PERMS);
      if (saved) {
        try {
          return { ...DEFAULT_PERMISSIONS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_PERMISSIONS;
        }
      }
    }
    return DEFAULT_PERMISSIONS;
  });

  const [schedulingPermissions, setSchedulingPermissions] = useState<SchedulingPermissionsState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_SCHED_PERMS);
      if (saved) {
        try {
          return { ...DEFAULT_SCHEDULING_PERMISSIONS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_SCHEDULING_PERMISSIONS;
        }
      }
    }
    return DEFAULT_SCHEDULING_PERMISSIONS;
  });

  const [reportPermissions, setReportPermissions] = useState<ReportPermissionsState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_REPORT_PERMS);
      if (saved) {
        try {
          return { ...DEFAULT_REPORT_PERMISSIONS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_REPORT_PERMISSIONS;
        }
      }
    }
    return DEFAULT_REPORT_PERMISSIONS;
  });

  const [activeDashboard, setActiveDashboardState] = useState<DashboardKey>(() => {
    const locDash = getDashboardFromLocation();
    if (locDash) return locDash;
    const savedRole = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ROLE) : null;
    return getDefaultDashboardForRole(savedRole as Role);
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStaffLoaded, setIsStaffLoaded] = useState(false);
  const [systemName, setSystemNameState] = useState<string>(() => localStorage.getItem('hms_system_name') || 'HMS');

  const updateSystemName = (name: string) => {
    setSystemNameState(name);
    localStorage.setItem('hms_system_name', name);
  };

  const setActiveDashboard = (key: DashboardKey) => {
    setActiveDashboardState(key);
    if (typeof window !== 'undefined') {
      const slug = DASHBOARD_TO_SLUG[key] || key;
      if (window.location.hash !== `#/${slug}`) {
        window.location.hash = `#/${slug}`;
      }
    }
  };

  const hasPermission = (role: Role, dashboard: DashboardKey): boolean => {
    const user = staffUsers.find(s => s.id === (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_id') : null));
    return checkPermission(role, dashboard, dashboardPermissions, user);
  };

  const getAccessibleDashboards = (): DashboardKey[] => {
    if (!currentUserRole) return [];
    if (currentUserRole === 'MASTER') return ['master_access', 'master_scheduling', 'master_availability', 'master_reports'];
    const all: DashboardKey[] = ['analytics_hub', 'front_office', 'doctor', 'package', 'sales'];
    const user = staffUsers.find(s => s.id === (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_id') : null));
    return all.filter(d => checkPermission(currentUserRole, d, dashboardPermissions, user));
  };

  const updateDashboardPermission = async (dashboard: DashboardKey, status: boolean, grantedBy: string = 'master') => {
    const updated = { ...dashboardPermissions, [dashboard]: status };
    setDashboardPermissions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_PERMS, JSON.stringify(updated));
    }

    try {
      const permId = `perm_${dashboard}`;
      await supabase.from('dashboard_permissions').upsert({
        id: permId,
        user_id: 'global',
        role: 'ALL',
        dashboard,
        permission: `${dashboard}_access`,
        status,
        granted_by: grantedBy,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase permission sync notice (local state remains active):', e);
    }
  };

  const updateSchedulingPermission = async (target: SchedulingTarget, status: boolean, grantedBy: string = 'master') => {
    const updated = { ...schedulingPermissions, [target]: status };
    setSchedulingPermissions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SCHED_PERMS, JSON.stringify(updated));
    }

    try {
      const permId = `perm_sched_${target}`;
      await supabase.from('dashboard_permissions').upsert({
        id: permId,
        user_id: 'global',
        role: target.toUpperCase(),
        dashboard: target,
        permission: 'scheduling_access',
        status,
        granted_by: grantedBy,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase scheduling permission sync notice:', e);
    }
  };

  const updateReportPermission = async (reportKey: keyof ReportPermissionsState, status: boolean, grantedBy: string = 'master') => {
    const updated = { ...reportPermissions, [reportKey]: status };
    setReportPermissions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_REPORT_PERMS, JSON.stringify(updated));
    }

    try {
      const permId = `perm_report_${reportKey}`;
      await supabase.from('dashboard_permissions').upsert({
        id: permId,
        user_id: 'global',
        role: 'ALL',
        dashboard: 'analytics_hub',
        permission: `report_${reportKey}_access`,
        status,
        granted_by: grantedBy,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase report permission sync notice:', e);
    }
  };

  // Sync with URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const loc = getDashboardFromLocation();
      if (loc && loc !== activeDashboard) {
        setActiveDashboardState(loc);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeDashboard]);

  // When role changes, if current dashboard is not permitted, default to primary dashboard
  useEffect(() => {
    if (currentUserRole && isStaffLoaded) {
      const user = staffUsers.find(s => s.id === (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_id') : null));
      const isCurrentAllowed = checkPermission(currentUserRole, activeDashboard, dashboardPermissions, user);
      if (!isCurrentAllowed) {
        const primary = getDefaultDashboardForRole(currentUserRole, user);
        setActiveDashboardState(primary);
        const slug = DASHBOARD_TO_SLUG[primary] || primary;
        window.location.hash = `#/${slug}`;
      }
    }
  }, [currentUserRole, dashboardPermissions, isStaffLoaded, staffUsers]);

  useEffect(() => {
    const savedRole = localStorage.getItem(STORAGE_KEY_ROLE);
    if (savedRole) {
      setCurrentUserRoleState(savedRole as Role);
    }
    
    // Initial fetch of data
    refreshData(false);

    // Setup Supabase Realtime Channels for Instant Synchronization
    const appointmentsChannel = supabase
      .channel('hms_appointments_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: APPOINTMENTS_TABLE },
        (payload) => {
          console.log('[Realtime] postgres_changes on hms_appointments:', payload);
          refreshData(true);
        }
      )
      .subscribe();

    const staffChannel = supabase
      .channel('staff_users_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_users' },
        (payload) => {
          console.log('[Realtime] postgres_changes on staff_users:', payload);
          refreshData(true);
        }
      )
      .subscribe();

    const permsChannel = supabase
      .channel('dashboard_permissions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_permissions' },
        (payload) => {
          console.log('[Realtime] postgres_changes on dashboard_permissions:', payload);
          refreshData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(permsChannel);
    };
  }, []);

  const setCurrentUserRole = (role: Role) => {
    setCurrentUserRoleState(role);
    if (role) {
      localStorage.setItem(STORAGE_KEY_ROLE, role);
      // Auto-route to primary dashboard if not already permitted on active dashboard
      const user = staffUsers.find(s => s.id === (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_id') : null));
      const isAllowed = checkPermission(role, activeDashboard, dashboardPermissions, user);
      if (!isAllowed) {
        const primary = getDefaultDashboardForRole(role, user);
        setActiveDashboardState(primary);
        const slug = DASHBOARD_TO_SLUG[primary] || primary;
        window.location.hash = `#/${slug}`;
      }
    } else {
      localStorage.removeItem(STORAGE_KEY_ROLE);
    }
  };

  const syncToSheets = async (patient: any) => {
    const url = process.env.VITE_APPSCRIPT_URL;
    if (!url) return;
    try {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(patient),
        mode: 'no-cors',
      });
    } catch (e) {
      console.warn('Google Sheets sync background error:', e);
    }
  };

  const refreshData = async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    try {
      const fetchAllAppointments = async () => {
        let allAppts: any[] = [];
        let from = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(APPOINTMENTS_TABLE)
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);

          if (error) {
            return { data: null, error };
          }

          if (data && data.length > 0) {
            allAppts = [...allAppts, ...data];
            if (data.length < limit) {
              hasMore = false;
            } else {
              from += limit;
            }
          } else {
            hasMore = false;
          }
        }

        // Deduplicate by ID just in case of race conditions/real-time inserts during pagination
        const uniqueAppts = Array.from(new Map(allAppts.map(item => [item.id, item])).values());
        return { data: uniqueAppts, error: null };
      };

      const [
        { data: apptRows, error: apptError },
        { data: staffData, error: staffError },
        { data: permRows, error: permError }
      ] = await Promise.all([
        fetchAllAppointments(),
        supabase.from('staff_users').select('*'),
        supabase.from('dashboard_permissions').select('*')
      ]);

      if (!permError && permRows && permRows.length > 0) {
        const mappedDash: Record<DashboardKey, boolean> = { ...DEFAULT_PERMISSIONS };
        const mappedSched: SchedulingPermissionsState = { ...DEFAULT_SCHEDULING_PERMISSIONS };
        const mappedReport: ReportPermissionsState = { ...DEFAULT_REPORT_PERMISSIONS };

        permRows.forEach((r: any) => {
          if (r.id?.startsWith('perm_sched_')) {
            const target = r.dashboard as SchedulingTarget;
            if (target && mappedSched[target] !== undefined) {
              mappedSched[target] = r.status !== false;
            }
          } else if (r.id?.startsWith('perm_report_')) {
            const rKey = r.id.replace('perm_report_', '') as keyof ReportPermissionsState;
            if (rKey && mappedReport[rKey] !== undefined) {
              mappedReport[rKey] = r.status !== false;
            }
          } else {
            const d = r.dashboard as DashboardKey;
            if (d && mappedDash[d] !== undefined) {
              mappedDash[d] = r.status !== false;
            }
          }
        });

        setDashboardPermissions(mappedDash);
        setSchedulingPermissions(mappedSched);
        setReportPermissions(mappedReport);

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_PERMS, JSON.stringify(mappedDash));
          localStorage.setItem(STORAGE_KEY_SCHED_PERMS, JSON.stringify(mappedSched));
          localStorage.setItem(STORAGE_KEY_REPORT_PERMS, JSON.stringify(mappedReport));
        }
      }

      if (apptError) throw apptError;

      const metadataRows = (apptRows || []).filter((r: any) => r.id && r.id.startsWith('doctor_metadata_'));

      const consolidatedPatients = (apptRows || [])
        .filter((r: any) => 
          (r.booking_status === 'Arrived' || 
          (r.doctor_assessment !== null && (r.doctor_assessment.quickCode !== undefined || r.doctor_assessment.notes !== undefined)) || 
          r.package_proposal !== null) &&
          !(r.id && r.id.startsWith('doctor_metadata_'))
        )
        .map(row => mapRowToPatient(row));
      
      setPatients(consolidatedPatients);
      
      const appointmentLeads = (apptRows || [])
        .filter((r: any) => 
          ['Scheduled', 'Follow Up'].includes(r.booking_status) && 
          (r.doctor_assessment === null || (r.doctor_assessment.quickCode === undefined && r.doctor_assessment.notes === undefined)) &&
          r.package_proposal === null &&
          !(r.id && r.id.startsWith('doctor_metadata_'))
        )
        .map((r: any) => ({
          id: r.id || '',
          hospital_id: r.doctor_assessment?.hospital_id || r.hospital_id || '',
          name: r.name || '',
          source: r.source || r.doctor_assessment?.source || '',
          sourceDoctorName: r.source_doctor_name || '',
          referral_person: r.doctor_assessment?.referral_person || (r.source === 'Referral' ? r.source_doctor_name : null) || null,
          condition: (r.condition || Condition.Other) as Condition,
          mobile: r.mobile || '',
          date: r.entry_date || '',
          time: r.booking_time || '',
          status: r.booking_status || 'Scheduled',
          bookingType: r.booking_status === 'Follow Up' ? 'Follow Up' : 'Scheduled',
          visit_type: r.visit_type || '',
          createdAt: r.created_at || new Date().toISOString(),
          assignedDoctorId: r.doctor_assessment?.assignedDoctorId || r.doctor_assessment?.doctor_id || undefined,
          assignedDoctorName: r.doctor_assessment?.assignedDoctorName || undefined,
          username: r.doctor_assessment?.username || r.remarks || 'Master Admin',
          assignment_type: r.doctor_assessment?.assignment_type || (r.doctor_assessment?.assignedDoctorId ? 'doctor' : 'hospital'),
          doctor_id: r.doctor_assessment?.doctor_id || r.doctor_assessment?.assignedDoctorId || null,
          patient_id: r.doctor_assessment?.patient_id || null,
          hospitalName: r.doctor_assessment?.hospitalName || undefined
        }));
      setAppointments(appointmentLeads as Appointment[]);

      if (!staffError && staffData) {
        const mergedStaff = (staffData || []).map((u: any) => {
          const metaRow = metadataRows.find((m: any) => m.id === `doctor_metadata_${u.id}`);
          if (metaRow && metaRow.doctor_assessment) {
            const meta = metaRow.doctor_assessment;
            return {
              ...u,
              photoUrl: meta.photoUrl || undefined,
              availability: meta.availability || undefined,
              registrationNumber: meta.registrationNumber || undefined,
              specialization: meta.specialization || undefined,
              username: meta.username || undefined,
              department: meta.department || undefined,
              accessStatus: meta.accessStatus !== undefined ? meta.accessStatus : (u.accessStatus || 'Active'),
              grantedBy: meta.grantedBy !== undefined ? meta.grantedBy : (u.grantedBy || undefined),
              hospital_id: meta.hospital_id || u.hospital_id || undefined,
              hospitalName: meta.hospitalName || u.hospitalName || undefined,
              address: meta.address || u.address || undefined,
              city: meta.city || u.city || undefined,
              state: meta.state || u.state || undefined,
              pincode: meta.pincode || u.pincode || undefined,
              fullAddress: meta.fullAddress || u.fullAddress || undefined,
            };
          }
          return {
            ...u,
            accessStatus: u.accessStatus || 'Active',
          };
        });
        setStaffUsers(mergedStaff);
        setIsStaffLoaded(true);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error('[Hospital] Global Sync Failure:', err);
      setSaveStatus('error');
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  };

  const addPatient = async (patientData: Omit<Patient, 'registeredAt' | 'hospital_id'>) => {
    setSaveStatus('saving');
    try {
      const dbRecord = {
        id: patientData.id,
        name: patientData.name,
        dob: nullify(patientData.dob),
        gender: patientData.gender,
        age: patientData.age,
        mobile: patientData.mobile,
        occupation: patientData.occupation,
        source: patientData.source,
        source_doctor_name: patientData.sourceDoctorName,
        condition: patientData.condition,
        is_follow_up: patientData.visitType === 'Follow Up',
        visit_type: patientData.visit_type || '',
        has_insurance: patientData.hasInsurance,
        insurance_name: patientData.insuranceName,
        booking_status: 'Arrived',
        entry_date: patientData.entry_date || new Date().toISOString().split('T')[0],
        arrival_time: patientData.arrivalTime || new Date().toTimeString().split(' ')[0],
        hospital_id: FACILITY_ID,
        doctor_assessment: patientData.doctorAssessment || null,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from(APPOINTMENTS_TABLE).insert(dbRecord);
      if (error) throw error;
      
      syncToSheets({ ...patientData, registeredAt: dbRecord.updated_at, status: 'Arrived' });
      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Add Patient Error:', err);
      setSaveStatus('error');
    }
  };

  const updatePatient = async (targetId: string, patient: Patient) => {
    setSaveStatus('saving');
    try {
      const existingPatient = patients.find(p => p.id === targetId);
      let dbPackageProposal = null;
      let followUpDateVal = null;
      let surgeryDateVal = null;
      let surgeryLostDateVal = null;
      let completedSurgeryVal = null;
      let remarksVal = null;
      
      const oldOutcome = existingPatient?.packageProposal?.outcome;
      const newOutcome = patient.packageProposal?.outcome;
      let statusUpdatedAtVal = existingPatient?.status_updated_at;

      if (newOutcome && newOutcome !== oldOutcome) {
        statusUpdatedAtVal = new Date().toISOString();
      }

      if (patient.packageProposal) {
        const uiProposal = patient.packageProposal;
        followUpDateVal = nullify(uiProposal.followUpDate);
        surgeryDateVal = nullify(uiProposal.surgeryDate);
        remarksVal = nullify(uiProposal.remarks);
        
        if (uiProposal.outcome === 'Lost') {
          surgeryLostDateVal = nullify(uiProposal.outcomeDate);
        } else if (uiProposal.outcome === 'Completed') {
          completedSurgeryVal = nullify(uiProposal.outcomeDate);
        }

        dbPackageProposal = {
          status: uiProposal.outcome ? (uiProposal.outcome === 'Scheduled' ? 'Surgery Fixed' : (uiProposal.outcome === 'Completed' ? 'Surgery Completed' : uiProposal.outcome)) : null,
          paymentMode: nullify(uiProposal.modeOfPayment),
          outcomeDate: nullify(uiProposal.outcomeDate || uiProposal.surgeryDate),
          roomType: nullify(uiProposal.roomType),
          stayDays: nullify(uiProposal.stayDays),
          icuCharges: nullify(uiProposal.icuCharges),
          followUpDate: followUpDateVal,
          decisionPattern: nullify(uiProposal.decisionPattern),
          surgeryMedicines: nullify(uiProposal.surgeryMedicines),
          proposalCreatedAt: uiProposal.proposalCreatedAt,
          counselingStrategy: nullify(uiProposal.counselingStrategy),
          preOpInvestigation: nullify(uiProposal.preOpInvestigation),
          objectionIdentified: nullify(uiProposal.objectionIdentified),
          lostReason: nullify(uiProposal.lostReason),
          remarks: remarksVal,
          postOpFollowUp: nullify(uiProposal.postFollowUp),
          postOpFollowUpCount: nullify(uiProposal.postFollowUpCount),
          packageAmount: uiProposal.packageAmount ? parseInt(uiProposal.packageAmount.replace(/,/g, ''), 10) : null,
          equipment: uiProposal.equipment,
          proposalStage: nullify(uiProposal.proposalStage),
        };
      }

      // Sync internal patient_id with potential new primary ID
      const updatedAssessment = patient.doctorAssessment ? {
        ...patient.doctorAssessment,
        patient_id: patient.id
      } : null;

      const updateData = {
        id: patient.id, // Explicitly include id to support primary key updates
        name: patient.name,
        dob: nullify(patient.dob),
        age: patient.age,
        gender: patient.gender,
        mobile: patient.mobile,
        occupation: patient.occupation,
        source: patient.source,
        condition: patient.condition,
        is_follow_up: patient.visitType === 'Follow Up',
        visit_type: patient.visit_type || existingPatient?.visit_type || '',
        has_insurance: patient.hasInsurance,
        insurance_name: patient.insuranceName,
        source_doctor_name: patient.sourceDoctorName,
        entry_date: nullify(patient.entry_date) || new Date().toISOString().split('T')[0],
        arrival_time: nullify(patient.arrivalTime) || new Date().toTimeString().split(' ')[0].substring(0, 5),
        booking_status: patient.status || 'Arrived',
        package_proposal: dbPackageProposal,
        doctor_assessment: updatedAssessment,
        remarks: remarksVal,
        follow_up_date: followUpDateVal,
        followup_date: followUpDateVal,
        surgery_date: surgeryDateVal,
        surgery_lost_date: surgeryLostDateVal,
        completed_surgery: completedSurgeryVal,
        status_updated_at: statusUpdatedAtVal,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from(APPOINTMENTS_TABLE).update(updateData).eq('id', targetId);
      if (error) throw error;
      
      syncToSheets(patient);
      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Update Patient Error:', err);
      setSaveStatus('error');
    }
  };

  const deletePatient = async (id: string) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase.from(APPOINTMENTS_TABLE).delete().eq('id', id);
      if (error) throw error;
      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      setSaveStatus('error');
    }
  };
  
  const convertAppointment = async (appointmentId: string, patientData: Omit<Patient, 'registeredAt' | 'hospital_id'>) => {
    setSaveStatus('saving');
    try {
        const dbRecord = {
            id: patientData.id,
            name: patientData.name,
            dob: nullify(patientData.dob),
            gender: patientData.gender,
            age: patientData.age,
            mobile: patientData.mobile,
            occupation: patientData.occupation,
            source: patientData.source,
            source_doctor_name: patientData.sourceDoctorName,
            condition: patientData.condition,
            is_follow_up: patientData.visitType === 'Follow Up',
            visit_type: patientData.visit_type || '',
            has_insurance: patientData.hasInsurance,
            insurance_name: patientData.insuranceName,
            booking_status: 'Arrived',
            entry_date: patientData.entry_date || new Date().toISOString().split('T')[0],
            arrival_time: patientData.arrivalTime || new Date().toTimeString().split(' ')[0].substring(0, 5),
            hospital_id: FACILITY_ID,
            doctor_assessment: patientData.doctorAssessment || null,
            updated_at: new Date().toISOString()
        };
        
        const { error: insertError } = await supabase.from(APPOINTMENTS_TABLE).insert(dbRecord);
        if (insertError) throw insertError;
        const { error: deleteError } = await supabase.from(APPOINTMENTS_TABLE).delete().eq('id', appointmentId);
        
        syncToSheets({ ...patientData, registeredAt: dbRecord.updated_at, status: 'Arrived' });
        await refreshData();
        setSaveStatus('saved');
        setLastSavedAt(new Date());
    } catch (err) {
        setSaveStatus('error');
    }
  };

  const updateDoctorAssessment = async (patientId: string, assessmentData: Partial<DoctorAssessment>) => {
    setSaveStatus('saving');
    try {
        const patient = patients.find(p => p.id === patientId);
        if (!patient) throw new Error("Patient not found");
        const existingAssessment = patient.doctorAssessment || {};
        const updatedAssessment = {
            ...existingAssessment,
            ...assessmentData,
            assessedAt: new Date().toISOString()
        };
        const { error } = await supabase
            .from(APPOINTMENTS_TABLE)
            .update({ 
                doctor_assessment: updatedAssessment,
                updated_at: new Date().toISOString()
            })
            .eq('id', patientId);
        if (error) throw error;

        syncToSheets({ ...patient, doctorAssessment: updatedAssessment });
        await refreshData();
        setSaveStatus('saved');
        setLastSavedAt(new Date());
    } catch (err) {
        setSaveStatus('error');
    }
  };

  const updatePackageProposal = async (patientId: string, proposal: PackageProposal) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) await updatePatient(patientId, { ...patient, packageProposal: proposal });
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id);
  const fetchFilteredPatients = async (filters: PatientFilters, page: number, pageSize: number) => { return { data: patients, count: patients.length }; };

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'hospital_id' | 'status'> & { hospital_id?: string }) => {
    setSaveStatus('saving');
    try {
      const activeRole = currentUserRole || 
        (typeof window !== 'undefined' ? (localStorage.getItem('hms_hospital_role') || localStorage.getItem('user_role')) : null);
      const isRoleMasterOrSales = activeRole === 'MASTER' || activeRole === 'SALES';

      const activeUsername = appointmentData.username || 
        (typeof window !== 'undefined' ? (localStorage.getItem('hms_hospital_name') || localStorage.getItem('username') || localStorage.getItem('hms_hospital_email')) : '') || 
        (isRoleMasterOrSales ? (activeRole === 'SALES' ? 'Sales Executive' : 'Master Admin') : 'Staff');

      const resolvedAssignmentType = appointmentData.assignment_type || (appointmentData.assignedDoctorId ? 'doctor' : 'hospital');
      const resolvedDoctorId = appointmentData.assignedDoctorId || appointmentData.doctor_id || null;
      const resolvedHospitalId = appointmentData.hospital_id || FACILITY_ID;
      const resolvedHospitalName = appointmentData.hospitalName || null;
      const resolvedPatientId = appointmentData.patient_id || null;

      // Only Master Admin and Sales Lead can record Source and Referral Person
      const resolvedSource = isRoleMasterOrSales ? (appointmentData.source || 'Other') : (appointmentData.source || 'Other');
      const resolvedReferralPerson = isRoleMasterOrSales && appointmentData.source === 'Referral'
        ? (appointmentData.referral_person?.trim() || null)
        : null;

      const dbRecord = {
        id: `APP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        name: appointmentData.name,
        mobile: appointmentData.mobile,
        source: resolvedSource,
        source_doctor_name: resolvedReferralPerson || nullify(appointmentData.sourceDoctorName),
        condition: appointmentData.condition,
        entry_date: nullify(appointmentData.date),
        booking_time: nullify(appointmentData.time),
        is_follow_up: appointmentData.bookingType === 'Follow Up',
        booking_status: appointmentData.bookingType || 'Scheduled',
        visit_type: (appointmentData as any).visit_type || '',
        hospital_id: resolvedHospitalId,
        remarks: activeUsername,
        updated_at: new Date().toISOString(),
        doctor_assessment: {
          assignedDoctorId: resolvedDoctorId,
          assignedDoctorName: appointmentData.assignedDoctorName || (resolvedAssignmentType === 'hospital' && !resolvedDoctorId ? null : (appointmentData.assignedDoctorName || null)),
          username: activeUsername,
          assignment_type: resolvedAssignmentType,
          doctor_id: resolvedDoctorId,
          hospital_id: resolvedHospitalId,
          hospitalName: resolvedHospitalName,
          patient_id: resolvedPatientId,
          appointment_date: appointmentData.date,
          appointment_time: appointmentData.time,
          source: resolvedSource,
          referral_person: resolvedReferralPerson
        }
      };
      const { error } = await supabase.from(APPOINTMENTS_TABLE).insert(dbRecord);
      if (error) throw error;
      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const updateAppointment = async (appointment: Appointment) => {
    setSaveStatus('saving');
    try {
      const activeRole = currentUserRole || 
        (typeof window !== 'undefined' ? (localStorage.getItem('hms_hospital_role') || localStorage.getItem('user_role')) : null);
      const isRoleMasterOrSales = activeRole === 'MASTER' || activeRole === 'SALES';

      const activeUsername = appointment.username || 
        (typeof window !== 'undefined' ? (localStorage.getItem('hms_hospital_name') || localStorage.getItem('username') || localStorage.getItem('hms_hospital_email')) : '') || 
        'Master Admin';

      const resolvedAssignmentType = appointment.assignment_type || (appointment.assignedDoctorId ? 'doctor' : 'hospital');
      const resolvedDoctorId = appointment.assignedDoctorId || appointment.doctor_id || null;
      const resolvedHospitalId = appointment.hospital_id || FACILITY_ID;
      const resolvedHospitalName = appointment.hospitalName || null;
      const resolvedPatientId = appointment.patient_id || null;

      // Existing record to prevent unauthorized role from overwriting source or referral person
      const existingAppt = appointments.find(a => a.id === appointment.id);

      const resolvedSource = isRoleMasterOrSales 
        ? appointment.source 
        : (existingAppt?.source || 'Other');
      
      const resolvedReferralPerson = isRoleMasterOrSales
        ? (appointment.source === 'Referral' ? (appointment.referral_person?.trim() || null) : null)
        : (existingAppt?.referral_person || null);

      const updateData: any = {
        name: appointment.name,
        mobile: appointment.mobile,
        source: resolvedSource,
        source_doctor_name: resolvedReferralPerson || nullify(appointment.sourceDoctorName),
        condition: appointment.condition,
        entry_date: nullify(appointment.date),
        booking_time: nullify(appointment.time),
        booking_status: appointment.bookingType, 
        is_follow_up: appointment.bookingType === 'Follow Up',
        visit_type: appointment.visit_type || '',
        hospital_id: resolvedHospitalId,
        remarks: activeUsername,
        updated_at: new Date().toISOString(),
        doctor_assessment: {
          assignedDoctorId: resolvedDoctorId,
          assignedDoctorName: appointment.assignedDoctorName || (resolvedAssignmentType === 'hospital' && !resolvedDoctorId ? null : (appointment.assignedDoctorName || null)),
          username: activeUsername,
          assignment_type: resolvedAssignmentType,
          doctor_id: resolvedDoctorId,
          hospital_id: resolvedHospitalId,
          hospitalName: resolvedHospitalName,
          patient_id: resolvedPatientId,
          appointment_date: appointment.date,
          appointment_time: appointment.time,
          source: resolvedSource,
          referral_person: resolvedReferralPerson
        }
      };
      const { error } = await supabase.from(APPOINTMENTS_TABLE).update(updateData).eq('id', appointment.id);
      if (error) throw error;
      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const deleteAppointment = async (id: string) => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase.from(APPOINTMENTS_TABLE).delete().eq('id', id);
      if (error) throw error;
      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      setSaveStatus('error');
    }
  };

  const registerStaff = async (staffData: Omit<StaffUser, 'id' | 'registeredAt'>) => {
    setSaveStatus('saving');
    try {
      const newStaffId = Math.random().toString(36).substring(2, 11);
      
      const dbStaff = {
        id: newStaffId,
        name: staffData.name,
        email: staffData.email,
        mobile: staffData.mobile || 'N/A',
        role: staffData.role,
        password: staffData.password,
        registered_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('staff_users').insert(dbStaff);
      if (error) throw error;
      
      const metadataToSave: any = {};
      if (staffData.photoUrl !== undefined) metadataToSave.photoUrl = staffData.photoUrl;
      if (staffData.registrationNumber !== undefined) metadataToSave.registrationNumber = staffData.registrationNumber;
      if (staffData.specialization !== undefined) metadataToSave.specialization = staffData.specialization;
      if (staffData.username !== undefined) metadataToSave.username = staffData.username;
      if (staffData.department !== undefined) metadataToSave.department = staffData.department;
      if (staffData.availability !== undefined) metadataToSave.availability = staffData.availability;
      if (staffData.address !== undefined) metadataToSave.address = staffData.address;
      if (staffData.state !== undefined) metadataToSave.state = staffData.state;
      if (staffData.city !== undefined) metadataToSave.city = staffData.city;
      if (staffData.pincode !== undefined) metadataToSave.pincode = staffData.pincode;
      if (staffData.fullAddress !== undefined) metadataToSave.fullAddress = staffData.fullAddress;
      if (staffData.accessStatus !== undefined) metadataToSave.accessStatus = staffData.accessStatus;
      if (staffData.grantedBy !== undefined) metadataToSave.grantedBy = staffData.grantedBy;
      if (staffData.hospital_id !== undefined) metadataToSave.hospital_id = staffData.hospital_id;
      if (staffData.hospitalName !== undefined) metadataToSave.hospitalName = staffData.hospitalName;
      
      if (Object.keys(metadataToSave).length > 0) {
        const recordId = `doctor_metadata_${newStaffId}`;
        const newRecord = {
          id: recordId,
          name: `System Doctor Metadata - ${newStaffId}`,
          mobile: '0000000000',
          booking_status: 'DoctorMetadata',
          doctor_assessment: metadataToSave,
          updated_at: new Date().toISOString(),
          hospital_id: FACILITY_ID
        };
        await supabase.from(APPOINTMENTS_TABLE).insert(newRecord);
      }

      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Register Staff Error:', err);
      setSaveStatus('error');
    }
  };

  const updateStaff = async (id: string, staffData: Partial<StaffUser>) => {
    setSaveStatus('saving');
    try {
      if (
        staffData.photoUrl !== undefined ||
        staffData.availability !== undefined ||
        staffData.registrationNumber !== undefined ||
        staffData.specialization !== undefined ||
        staffData.username !== undefined ||
        staffData.department !== undefined ||
        staffData.address !== undefined ||
        staffData.state !== undefined ||
        staffData.city !== undefined ||
        staffData.pincode !== undefined ||
        staffData.fullAddress !== undefined ||
        staffData.accessStatus !== undefined ||
        staffData.grantedBy !== undefined ||
        staffData.hospital_id !== undefined ||
        staffData.hospitalName !== undefined
      ) {
        const recordId = `doctor_metadata_${id}`;
        const { data: existing } = await supabase
          .from(APPOINTMENTS_TABLE)
          .select('id, doctor_assessment')
          .eq('id', recordId)
          .maybeSingle();

        const currentAssessment = existing?.doctor_assessment || {};
        const updatedAssessment = {
          ...currentAssessment,
        };
        if (staffData.photoUrl !== undefined) updatedAssessment.photoUrl = staffData.photoUrl;
        if (staffData.availability !== undefined) updatedAssessment.availability = staffData.availability;
        if (staffData.registrationNumber !== undefined) updatedAssessment.registrationNumber = staffData.registrationNumber;
        if (staffData.specialization !== undefined) updatedAssessment.specialization = staffData.specialization;
        if (staffData.username !== undefined) updatedAssessment.username = staffData.username;
        if (staffData.department !== undefined) updatedAssessment.department = staffData.department;
        if (staffData.address !== undefined) updatedAssessment.address = staffData.address;
        if (staffData.state !== undefined) updatedAssessment.state = staffData.state;
        if (staffData.city !== undefined) updatedAssessment.city = staffData.city;
        if (staffData.pincode !== undefined) updatedAssessment.pincode = staffData.pincode;
        if (staffData.fullAddress !== undefined) updatedAssessment.fullAddress = staffData.fullAddress;
        if (staffData.accessStatus !== undefined) updatedAssessment.accessStatus = staffData.accessStatus;
        if (staffData.grantedBy !== undefined) updatedAssessment.grantedBy = staffData.grantedBy;
        if (staffData.hospital_id !== undefined) updatedAssessment.hospital_id = staffData.hospital_id;
        if (staffData.hospitalName !== undefined) updatedAssessment.hospitalName = staffData.hospitalName;

        if (existing) {
          await supabase
            .from(APPOINTMENTS_TABLE)
            .update({
              doctor_assessment: updatedAssessment,
              updated_at: new Date().toISOString()
            })
            .eq('id', recordId);
        } else {
          const newRecord = {
            id: recordId,
            name: `System Doctor Metadata - ${id}`,
            mobile: '0000000000',
            booking_status: 'DoctorMetadata',
            doctor_assessment: updatedAssessment,
            updated_at: new Date().toISOString(),
            hospital_id: FACILITY_ID
          };
          await supabase.from(APPOINTMENTS_TABLE).insert(newRecord);
        }
      }

      const dbStaffData: any = {};
      if (staffData.name !== undefined) dbStaffData.name = staffData.name;
      if (staffData.email !== undefined) dbStaffData.email = staffData.email;
      if (staffData.mobile !== undefined) dbStaffData.mobile = staffData.mobile;
      if (staffData.role !== undefined) dbStaffData.role = staffData.role;
      if (staffData.password !== undefined) dbStaffData.password = staffData.password;

      if (Object.keys(dbStaffData).length > 0) {
        const { error } = await supabase.from('staff_users').update(dbStaffData).eq('id', id);
        if (error) throw error;
      }

      await refreshData();
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Update Staff Error:', err);
      setSaveStatus('error');
    }
  };

  const isMasterOrSales = currentUserRole === 'MASTER' || currentUserRole === 'SALES' ||
    (typeof window !== 'undefined' && ['MASTER', 'SALES'].includes(localStorage.getItem('hms_hospital_role') || localStorage.getItem('user_role') || ''));

  const authorizedAppointments = useMemo(() => {
    if (isMasterOrSales) {
      return appointments;
    }
    // Restrict Source and Referral Person visibility to Master Admin and Sales Lead only
    return appointments.map(app => ({
      ...app,
      source: '',
      sourceDoctorName: '',
      referral_person: null
    }));
  }, [appointments, isMasterOrSales]);

  return (
    <HospitalContext.Provider value={{
      currentUserRole, setCurrentUserRole,
      dashboardPermissions, activeDashboard, setActiveDashboard,
      updateDashboardPermission, hasPermission, getAccessibleDashboards,
      schedulingPermissions, updateSchedulingPermission,
      reportPermissions, updateReportPermission,
      patients, addPatient, updatePatient, deletePatient, convertAppointment,
      updateDoctorAssessment, updatePackageProposal,
      getPatientById, fetchFilteredPatients,
      appointments: authorizedAppointments, addAppointment, updateAppointment, deleteAppointment,
      staffUsers, registerStaff, updateStaff,
      saveStatus, lastSavedAt, refreshData, isLoading, isStaffLoaded,
      systemName, updateSystemName
    }}>
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospital = () => {
  const context = useContext(HospitalContext);
  if (context === undefined) throw new Error('useHospital must be used within a HospitalProvider');
  return context;
};
