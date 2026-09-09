
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

export type DashboardKey = 'master' | 'master_access' | 'master_scheduling' | 'master_availability' | 'master_reports' | 'analytics_hub' | 'front_office' | 'doctor' | 'package' | 'sales';

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
  surgery_lost_date?: string;
  completed_surgery?: string;
  
  // Metadata for multi-table support
  sourceTable?: 'himas_data' | 'himas_appointments';

  // Role Specific Data
  doctorAssessment?: DoctorAssessment;
  packageProposal?: PackageProposal;
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
  status: 'Scheduled' | 'Arrived' | 'Cancelled' | 'Follow Up' | 'Confirmed' | 'Completed' | 'No Show' | string;
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
  availability?: {
    availableDays: string[]; // e.g. ["Monday", "Tuesday"]
    startTime: string; // e.g. "09:00"
    endTime: string; // e.g. "17:00"
    unavailableDates: string[]; // e.g. ["2026-06-15"]
    daySchedules?: DaySchedule[];
    blockedDates?: BlockedDate[];
  };
}

export interface DashboardStats {
  totalPatients: number;
  pendingDoctor: number;
  pendingPackage: number;
  readyForSurgery: number;
}
