
export type Role = 
  | 'MASTER' 
  | 'ADMIN' 
  | 'ANALYTICS' 
  | 'ANALYTICS_HUB' 
  | 'HOSPITAL'
  | 'FRONT_OFFICE' 
  | 'DOCTOR' 
  | 'DEACTIVATED_DOCTOR' 
  | 'PACKAGE_TEAM' 
  | 'PACKAGE' 
  | 'SALES'
  | null;

export type DashboardKey = 
  | 'master' 
  | 'master_access' 
  | 'master_scheduling' 
  | 'master_availability' 
  | 'master_reports' 
  | 'analytics_hub' 
  | 'analytics_give_access'
  | 'doctor_performance'
  | 'front_office' 
  | 'doctor' 
  | 'doctor_appointments'
  | 'doctor_availability'
  | 'doctor_profile'
  | 'package' 
  | 'sales';

export interface DashboardPermission {
  id: string;
  user_id?: string;
  role?: string;
  dashboard: DashboardKey;
  permission: string;
  status: boolean;
  granted_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardPermissionsState {
  analytics_hub_access: boolean;
  front_office_access: boolean;
  doctor_access: boolean;
  package_access: boolean;
  sales_access: boolean;
}

export type SchedulingTarget = 'analytics_hub' | 'doctor' | 'sales';

export interface SchedulingPermissionsState {
  analytics_hub: boolean;
  doctor: boolean;
  sales: boolean;
}

export interface ReportPermissionsState {
  doctor_performance: boolean;
  period_activity: boolean;
  financial_analytics: boolean;
  procedure_trends: boolean;
}

export type ReportPermissionKey = keyof ReportPermissionsState;

export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

export enum Condition {
  Piles = 'Piles',
  Fissure = 'Fissure',
  Fistula = 'Fistula',
  Hernia = 'Hernia',
  Gallstones = 'Gallstones',
  Appendix = 'Appendix',
  VaricoseVeins = 'Varicose Veins',
  Other = 'Other',
}

export enum SurgeonCode {
  M1 = 'M1 - Medication Only',
  S1 = 'S1 - Surgery Recommended',
}

export enum PainSeverity {
  Low = 'Low',
  Moderate = 'Moderate',
  High = 'High',
}

export enum Affordability {
  A1 = 'A1 - Basic',
  A2 = 'A2 - Mid',
  A3 = 'A3 - Premium',
}

export enum ConversionReadiness {
  CR1 = 'CR1 - Ready',
  CR2 = 'CR2 - Needs Push',
  CR3 = 'CR3 - Needs Counseling',
  CR4 = 'CR4 - Not Ready',
}

export interface DoctorAssessment {
  id?: string;
  patient_id?: string;
  notes?: string;
  quickCode?: SurgeonCode;
  assessedAt?: string;
  painSeverity?: PainSeverity;
  affordability?: Affordability;
  doctorSignature?: string;
  otherSurgeryName?: string;
  conversionReadiness?: ConversionReadiness;
  tentativeSurgeryDate?: string; // YYYY-MM-DD
  surgeryProcedure?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
}

export type ProposalOutcome = 'Scheduled' | 'Follow-Up' | 'Lost' | 'Completed';

export interface PackageProposal {
  decisionPattern: string;
  objectionIdentified: string;
  counselingStrategy: string;
  followUpDate: string; // YYYY-MM-DD
  proposalCreatedAt: string;
  modeOfPayment?: 'Cash' | 'Insurance' | 'Partly' | 'Insurance Approved';
  packageAmount?: string;
  preOpInvestigation?: 'Included' | 'Excluded';
  surgeryMedicines?: 'Included' | 'Excluded';
  equipment?: 'Included' | 'Excluded';
  icuCharges?: 'Included' | 'Excluded';
  roomType?: 'Private' | 'Deluxe' | 'Semi' | 'Economy';
  stayDays?: number;
  postFollowUp?: 'None' | 'Single' | 'Double' | 'Excluded' | 'Included';
  postFollowUpCount?: number;
  surgeryDate?: string;
  remarks?: string;
  outcome?: ProposalOutcome;
  outcomeDate?: string;
  lostReason?: string;
  proposalStage?: string;
}

export interface Patient {
  id: string; 
  hospital_id: string; 
  name: string;
  dob?: string; 
  gender: Gender;
  age: number;
  mobile: string;
  occupation: string;
  hasInsurance: 'Yes' | 'No' | 'Not Sure';
  insuranceName?: string; 
  source: string;
  sourceDoctorName?: string;
  condition: Condition;
  visitType: 'OPD' | 'Follow Up';
  visit_type?: string; // Persisted 'New' or 'Revisit'
  registeredAt: string;
  updated_at?: string;
  status_updated_at?: string;
  entry_date?: string;
  arrivalTime?: string;
  status?: string;
  
  // Counseling Sub-table Native Fields
  surgery_date?: string;
  followup_date?: string;
  followup_notes?: string;
  followup_history?: { id: string; date: string; status: string; notes?: string; createdAt: string; author: string }[];
  surgery_lost_date?: string;
  completed_surgery?: string;
  
  // Metadata for multi-table support
  sourceTable?: 'himas_data' | 'himas_appointments';

  // Role Specific Data
  doctorAssessment?: DoctorAssessment;
  packageProposal?: PackageProposal;
}

export type LeadStatus = 'New Leads' | 'Schedule' | 'Follow-up' | 'Junk';

export interface LeadNote {
  id: string;
  lead_id: string;
  note: string;
  created_at: string;
  created_date?: string;
  created_time?: string;
  created_by?: string;
  created_by_name: string;
}

export interface Appointment {
  id: string;
  hospital_id: string;
  name: string;
  source: string;
  sourceDoctorName?: string;
  referral_person?: string | null;
  condition: Condition;
  mobile: string;
  date: string; 
  time: string; 
  status: LeadStatus | 'Scheduled' | 'Arrived' | 'Cancelled' | 'Follow Up' | 'Confirmed' | 'Completed' | 'No Show' | string;
  bookingType: 'Follow Up' | 'Scheduled';
  visit_type?: string; // Persisted 'New' or 'Revisit'
  createdAt: string;
  assignedDoctorId?: string; // Added doctor availability sync
  assignedDoctorName?: string; // Added doctor availability sync
  username?: string; // Username of staff/agent creating or managing schedule
  assignment_type?: 'doctor' | 'hospital';
  doctor_id?: string | null;
  patient_id?: string | null;
  hospitalName?: string;
  notes?: string;
  followup_date?: string;
  followup_notes?: string;
  notes_list?: { id: string; text: string; date: string; author: string }[];
  followup_history?: { id: string; date: string; status: string; notes?: string; createdAt: string; author: string }[];
  scheduled_by?: string;
  scheduled_by_role?: string;
  doctor_assessment?: any;
}

/**
 * Determines who scheduled the appointment:
 * - If scheduled from Front Office -> "Front Office"
 * - If scheduled by Sales -> "Acquire OPD Team"
 */
export function getScheduleBy(item: any, staffUsers?: any[] | null): string {
  if (!item) return 'Front Office';

  // 1. Direct explicit scheduled_by field
  const explicitScheduledBy = 
    item.scheduled_by || 
    item.scheduledBy || 
    item.doctor_assessment?.scheduled_by || 
    item.doctor_assessment?.scheduledBy;

  if (explicitScheduledBy && typeof explicitScheduledBy === 'string') {
    const norm = explicitScheduledBy.toLowerCase().trim();
    if (norm === 'acquire opd team' || norm.includes('acquire') || norm.includes('sales')) {
      return 'Acquire OPD Team';
    }
    if (norm === 'front office' || norm.includes('front') || norm.includes('reception')) {
      return 'Front Office';
    }
    return explicitScheduledBy;
  }

  // 2. Direct scheduled_by_role
  const explicitRole = 
    item.scheduled_by_role || 
    item.scheduledByRole || 
    item.doctor_assessment?.scheduled_by_role;

  if (explicitRole && typeof explicitRole === 'string') {
    const r = explicitRole.toLowerCase().trim();
    if (r === 'sales') return 'Acquire OPD Team';
    if (r === 'front_office' || r === 'frontoffice') return 'Front Office';
  }

  // 3. Username / Remarks / Creator string
  const creator = (
    item.username || 
    item.remarks || 
    item.doctor_assessment?.username || 
    item.doctor_assessment?.created_by || 
    ''
  ).toString().toLowerCase().trim();

  if (creator) {
    if (creator.includes('sales') || creator.includes('acquire') || creator.includes('ruandas124')) {
      return 'Acquire OPD Team';
    }
    if (creator.includes('front') || creator.includes('reception') || creator.includes('punyareception') || creator.includes('desk')) {
      return 'Front Office';
    }
    if (staffUsers && Array.isArray(staffUsers)) {
      const match = staffUsers.find(u => 
        (u.name && u.name.toLowerCase() === creator) || 
        (u.email && u.email.toLowerCase() === creator) ||
        (u.username && u.username.toLowerCase() === creator)
      );
      if (match) {
        if (match.role === 'SALES') return 'Acquire OPD Team';
        if (match.role === 'FRONT_OFFICE') return 'Front Office';
      }
    }
  }

  // 4. Default: Front Office
  return 'Front Office';
}

export interface DaySchedule {
  day: string; // e.g. "Monday"
  status: 'Available' | 'Unavailable' | 'Holiday' | 'Leave';
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "17:00"
  breaks: { startTime: string; endTime: string }[];
}

export interface BlockedDate {
  date: string; // YYYY-MM-DD
  reason: 'Vacation' | 'Emergency Leave' | 'Public Holiday' | string;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  registeredAt: string;
  password?: string;
  photoUrl?: string; // Base64 profile photo
  registrationNumber?: string;
  specialization?: string;
  username?: string;
  department?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
  fullAddress?: string;
  accessStatus?: 'Active' | 'Revoked';
  grantedBy?: string;
  hospital_id?: string;
  hospitalName?: string;
  tenantId?: string;
  doctorDashboardLimit?: number;
  availability?: {
    availableDays: string[]; // e.g. ["Monday", "Tuesday"]
    startTime: string; // e.g. "09:00"
    endTime: string; // e.g. "17:00"
    unavailableDates: string[]; // e.g. ["2026-06-15"]
    daySchedules?: DaySchedule[];
    blockedDates?: BlockedDate[];
  };
}

export interface AnalyticsAccountHierarchy {
  account: StaffUser;
  frontOffice: StaffUser | null;
  doctors: StaffUser[];
  patientCount: number;
  appointmentCount: number;
}

export const HOSPITAL_LOGO_URL = "https://aeghhbrvlefahqdbnudc.supabase.co/storage/v1/object/public/IMG/Untitled_design__3_-removebg-preview.png";

export interface DashboardStats {
  totalPatients: number;
  pendingDoctor: number;
  pendingPackage: number;
  readyForSurgery: number;
}

export const normalizeSource = (source?: string | null): string => {
  if (!source) return 'Other';
  const clean = source.trim().toLowerCase().replace(/\s+/g, ' ');
  if (
    clean === 'acquire opd' || 
    clean === 'acqure opd' || 
    clean === 'acqire opd' || 
    clean === 'aquire opd' ||
    clean === 'acquire_opd' || 
    clean === 'acqure_opd' || 
    clean === 'acquireopd' || 
    clean === 'acqureopd' ||
    clean.includes('acquire opd') ||
    clean.includes('acqure opd') ||
    clean.includes('aquire opd') ||
    clean.includes('acqire opd') ||
    clean.includes('acquireopd') ||
    clean.includes('acqureopd') ||
    (clean.includes('acquire') && clean.includes('opd')) ||
    (clean.includes('acqure') && clean.includes('opd'))
  ) {
    return 'Other';
  }
  return source.trim();
};

export const normalizeToIsoDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  const datePart = dateString.split('T')[0].trim();
  const parts = datePart.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  const slashParts = datePart.split('/');
  if (slashParts.length === 3) {
    if (slashParts[0].length === 2 && slashParts[2].length === 4) {
      return `${slashParts[2]}-${slashParts[1].padStart(2, '0')}-${slashParts[0].padStart(2, '0')}`;
    }
    if (slashParts[0].length === 4) {
      return `${slashParts[0]}-${slashParts[1].padStart(2, '0')}-${slashParts[2].padStart(2, '0')}`;
    }
  }
  return datePart;
};
