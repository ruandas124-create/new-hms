import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { Appointment, Patient, SurgeonCode, Condition, Gender, normalizeSource, normalizeToIsoDate } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  Calendar, Phone, Search, CheckCircle2, Clock, Lock, ArrowRight, ArrowLeft, Filter,
  Building2, Stethoscope, Eye, Tag, X, MessageSquare, Edit3, CalendarCheck, Check,
  Loader2, AlertCircle, RefreshCw, RefreshCcw, User, PlusCircle, CheckCircle,
  FileText, Download, Printer, MapPin, ChevronRight, ChevronLeft, UserCheck,
  FileSpreadsheet, Chrome, Facebook, Users as UsersIcon, Share2, Globe
} from 'lucide-react';
import { formatDateToDDMMMYYYY } from '../utils/dateFormatter';

const getTodayLocalIso = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftIsoDate = (isoDate: string, days: number): string => {
  if (!isoDate) return getTodayLocalIso();
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return getTodayLocalIso();
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatReadableDate = (isoDate: string): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = getTodayLocalIso();
  const isToday = isoDate === today;
  const formatted = formatDateToDDMMMYYYY(d);
  return isToday ? `Today • ${formatted}` : formatted;
};

const isDoctorAssociatedWithHospital = (doctor: any, hospital: any): boolean => {
  if (!doctor || !hospital) return false;
  const hospIds = [hospital.id, hospital.hospital_id].filter(Boolean);
  if (doctor.hospital_id && hospIds.includes(doctor.hospital_id)) return true;
  const hospNames = [hospital.hospitalName, hospital.name].filter(Boolean).map((n: string) => n.toLowerCase().trim());
  if (doctor.hospitalName && hospNames.includes(doctor.hospitalName.toLowerCase().trim())) return true;
  return false;
};

const isDoctorAvailableOnDate = (doctor: any, dateString: string | undefined): boolean => {
  if (!dateString || !doctor || !doctor.id || doctor.role === 'DEACTIVATED_DOCTOR') {
    return false;
  }

  const availability = doctor.availability || {};
  const formattedDate = dateString.split('T')[0];

  if (availability.blockedDates && Array.isArray(availability.blockedDates)) {
    const isBlocked = availability.blockedDates.some((b: any) => {
      if (!b) return false;
      if (typeof b === 'string') return b === formattedDate;
      if (b.date) return b.date === formattedDate;
      const from = b.startDate || b.from;
      const to = b.endDate || b.to;
      if (from && to) return formattedDate >= from && formattedDate <= to;
      return false;
    });
    if (isBlocked) return false;
  }

  if (Array.isArray(availability.unavailableDates) && availability.unavailableDates.includes(formattedDate)) {
    return false;
  }

  const dateObj = new Date(dateString + 'T00:00:00');
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  if (Array.isArray(availability.daySchedules) && availability.daySchedules.length > 0) {
    const dayConfig = availability.daySchedules.find((ds: any) => ds.day?.toLowerCase() === weekday.toLowerCase());
    if (dayConfig) {
      if (dayConfig.status !== 'Available') return false;
    } else if (Array.isArray(availability.availableDays) && availability.availableDays.length > 0) {
      if (!availability.availableDays.some((d: string) => d.toLowerCase() === weekday.toLowerCase())) {
        return false;
      }
    } else {
      return false;
    }
  } else if (Array.isArray(availability.availableDays) && availability.availableDays.length > 0) {
    if (!availability.availableDays.some((d: string) => d.toLowerCase() === weekday.toLowerCase())) {
      return false;
    }
  } else {
    return false;
  }

  return true;
};

const getAvailableSlotsForDoctorAndDate = (doctor: any, dateString: string | undefined): string[] => {
  const defaultSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
  if (!dateString) return defaultSlots;
  if (!doctor || !doctor.id) return defaultSlots;

  if (!isDoctorAvailableOnDate(doctor, dateString)) return [];

  const availability = doctor.availability || {};
  const dateObj = new Date(dateString + 'T00:00:00');
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  let shiftStart = availability.startTime || '09:00';
  let shiftEnd = availability.endTime || '17:00';
  let breaksList: { startTime: string; endTime: string }[] = [];

  if (Array.isArray(availability.daySchedules) && availability.daySchedules.length > 0) {
    const dayConfig = availability.daySchedules.find((ds: any) => ds.day?.toLowerCase() === weekday.toLowerCase());
    if (dayConfig && dayConfig.status === 'Available') {
      shiftStart = dayConfig.startTime || shiftStart;
      shiftEnd = dayConfig.endTime || shiftEnd;
      breaksList = dayConfig.breaks || [];
    } else {
      return [];
    }
  }

  if (!shiftStart || !shiftEnd) return defaultSlots;

  const [sh, sm] = shiftStart.split(':').map(Number);
  const [eh, em] = shiftEnd.split(':').map(Number);
  const startMinutes = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm);
  const endMinutes = (isNaN(eh) ? 17 : eh) * 60 + (isNaN(em) ? 0 : em);

  if (startMinutes >= endMinutes) return defaultSlots;

  const slotsList: string[] = [];
  for (let min = startMinutes; min < endMinutes; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const isDuringBreak = (breaksList || []).some((br: any) => {
      if (!br.startTime || !br.endTime) return false;
      const [bsh, bsm] = br.startTime.split(':').map(Number);
      const [beh, bem] = br.endTime.split(':').map(Number);
      const bsMin = (isNaN(bsh) ? 0 : bsh) * 60 + (isNaN(bsm) ? 0 : bsm);
      const beMin = (isNaN(beh) ? 0 : beh) * 60 + (isNaN(bem) ? 0 : bem);
      return min >= bsMin && min < beMin;
    });

    if (!isDuringBreak) {
      slotsList.push(timeStr);
    }
  }

  return slotsList.length > 0 ? slotsList : defaultSlots;
};

const sourceConfig = [
  { name: "Google / YouTube / Website" },
  { name: "FB / Insta / WhatsApp" },
  { name: "Self / Old Patient / Relative" },
  { name: "Friend + Online" },
  { name: "Hospital Billboards" },
  { name: "Doctor Recommended" },
  { name: "Others" }
];

const SOURCE_DISPLAY_MAP: Record<string, string> = {
  'Google': 'Google / YouTube / Website',
  'YouTube': 'Google / YouTube / Website',
  'Website': 'Google / YouTube / Website',
  'Facebook': 'FB / Insta / WhatsApp',
  'Instagram': 'FB / Insta / WhatsApp',
  'WhatsApp': 'FB / Insta / WhatsApp',
  'Old Patient / Relatives': 'Self / Old Patient / Relative',
  'Friends / Online': 'Friend + Online',
  'Hospital Billboards': 'Hospital Billboards',
  'Doctor Recommended': 'Doctor Recommended',
  'Other': 'Others',
  'Others': 'Others'
};

const getSourceDisplay = (source: string | undefined): string => {
  if (!source) return 'Others';
  const norm = normalizeSource(source);
  if (norm === 'Other' || norm === 'Others') return 'Others';
  if (source.startsWith('Other: ')) return 'Others';
  return SOURCE_DISPLAY_MAP[norm] || SOURCE_DISPLAY_MAP[source] || source;
};

export const ALL_PROJECT_STATUSES: string[] = [
  'Scheduled',
  'Follow-up',
  'Arrived',
  'In Consultation',
  'Doctor Done',
  'Medication Done',
  'Package Proposal',
  'Surgery Scheduled',
  'Follow-Up Surgery',
  'Surgery Completed',
  'Surgery Lost',
  'Completed',
  'Confirmed',
  'Revisit',
  'Cancelled',
  'No Show',
  'New Leads',
  'Junk'
];

export const normalizeProjectStatus = (status?: string): string => {
  if (!status) return 'Scheduled';
  const trimmed = status.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower === 'scheduled' || lower === 'schedule') return 'Scheduled';
  if (lower === 'follow up' || lower === 'follow-up') return 'Follow-up';
  if (lower === 'arrived' || lower === 'registered' || lower === 'checked-in') return 'Arrived';
  if (lower === 'in consultation' || lower === 'consulting') return 'In Consultation';
  if (lower === 'doctor done' || lower === 'doctor_done' || lower === 'consulted') return 'Doctor Done';
  if (lower === 'medication done' || lower === 'medication_done' || lower === 'medication only') return 'Medication Done';
  if (lower === 'package proposal' || lower === 'package_proposal' || lower === 'counseling') return 'Package Proposal';
  if (lower === 'surgery scheduled' || lower === 'surgery_scheduled') return 'Surgery Scheduled';
  if (lower === 'follow-up surgery' || lower === 'followup_surgery') return 'Follow-Up Surgery';
  if (lower === 'surgery completed' || lower === 'surgery_completed') return 'Surgery Completed';
  if (lower === 'surgery lost' || lower === 'surgery_lost') return 'Surgery Lost';
  if (lower === 'completed') return 'Completed';
  if (lower === 'confirmed') return 'Confirmed';
  if (lower === 'revisit') return 'Revisit';
  if (lower === 'cancelled' || lower === 'canceled') return 'Cancelled';
  if (lower === 'no show' || lower === 'no-show') return 'No Show';
  if (lower === 'new leads' || lower === 'new lead' || lower === 'new') return 'New Leads';
  if (lower === 'junk') return 'Junk';
  return trimmed;
};

const getStatusBadgeStyle = (status: string) => {
  const norm = normalizeProjectStatus(status);
  switch (norm) {
    case 'Scheduled':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Follow-up':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Arrived':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Consultation':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Doctor Done':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Medication Done':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'Package Proposal':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'Surgery Scheduled':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Surgery Completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Surgery Lost':
    case 'Cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'No Show':
    case 'Junk':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getTodayLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface BookingRecord {
  id: string;
  appointmentId?: string;
  patientId?: string;
  name: string;
  mobile: string;
  age?: number;
  gender?: string;
  city?: string;
  condition: Condition | string;
  source: string;
  referralPerson?: string | null;
  sourceDoctorName?: string | null;
  sourceOtherDetails?: string | null;
  status: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  appointmentDate: string;
  appointmentTime: string;
  scheduledBy: string;
  createdByUserId?: string;
  quickCode?: SurgeonCode;
  notes?: string;
  notesList?: { id: string; text: string; date: string; author: string }[];
  followupDate?: string;
  followupNotes?: string;
  followupHistory?: any[];
}

export const SalesDashboard: React.FC = () => {
  const { 
    patients = [], 
    appointments = [], 
    addAppointment, 
    updateAppointment, 
    updatePatient,
    staffUsers = [], 
    schedulingPermissions,
    conditions = [],
    currentUserStaff,
    currentTenantId,
    currentUserId,
    isLoading
  } = useHospital();

  const todayIso = useMemo(() => getTodayLocalDate(), []);

  // Tabs: Replicated from Front Office layout with REGISTRY strictly REMOVED
  const [activeTab, setActiveTab] = useState<'APPOINTMENTS' | 'GLOBAL_SEARCH'>('APPOINTMENTS');

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [showAllDates, setShowAllDates] = useState(false);

  // Filters State
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'ALL',
    hospitalId: 'ALL',
    doctorId: 'ALL',
    condition: 'ALL',
    source: 'ALL'
  });

  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Booking Modal States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<'SELECT_HOSPITAL' | 'FORM'>('SELECT_HOSPITAL');
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<BookingRecord | null>(null);

  // Follow-up & Notes Modals
  const [followupBooking, setFollowupBooking] = useState<BookingRecord | null>(null);
  const [followupDateInput, setFollowupDateInput] = useState('');
  const [followupStatusInput, setFollowupStatusInput] = useState<'Follow-up' | 'Scheduled'>('Follow-up');
  const [followupNotesInput, setFollowupNotesInput] = useState('');
  const [followupHistoryList, setFollowupHistoryList] = useState<any[]>([]);
  const [isLoadingFollowupHistory, setIsLoadingFollowupHistory] = useState(false);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);

  const [notesBooking, setNotesBooking] = useState<BookingRecord | null>(null);
  const [newNoteInput, setNewNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<BookingRecord | null>(null);

  // Booking Form State - Lead Source & Primary Complaint are mandatory
  const [bookingFormData, setBookingFormData] = useState({
    name: '',
    mobile: '',
    condition: '' as Condition | string,
    date: todayIso,
    time: '10:00',
    source: '',
    sourceOtherDetails: '',
    referralPerson: '',
    sourceDoctorName: ''
  });

  // Doctor & Hospital Collections
  const doctors = useMemo(() => {
    return (staffUsers || []).filter(u => u.role === 'DOCTOR' && u.accessStatus !== 'Revoked');
  }, [staffUsers]);

  const hospitals = useMemo(() => {
    return (staffUsers || []).filter(u => 
      (u.role === 'HOSPITAL' || u.role === 'ANALYTICS' || u.role === 'ANALYTICS_HUB') && 
      u.accessStatus !== 'Revoked'
    );
  }, [staffUsers]);

  // Authorized Hospitals for the logged in Sales user
  const authorizedHospitals = useMemo(() => {
    const userHospId = currentUserStaff?.hospital_id || currentTenantId;
    if (userHospId) {
      const match = hospitals.filter(h => h.id === userHospId || h.hospital_id === userHospId);
      if (match.length > 0) return match;
    }
    return hospitals;
  }, [hospitals, currentUserStaff, currentTenantId]);

  // Filtered Authorized Hospitals for the searchable hospital selector
  const filteredAuthorizedHospitals = useMemo(() => {
    if (!hospitalSearch.trim()) return authorizedHospitals;
    const term = hospitalSearch.toLowerCase().trim();
    return authorizedHospitals.filter(h => {
      const name = (h.hospitalName || h.name || '').toLowerCase();
      const city = (h.city || '').toLowerCase();
      const state = (h.state || '').toLowerCase();
      return name.includes(term) || city.includes(term) || state.includes(term);
    });
  }, [authorizedHospitals, hospitalSearch]);

  // Load Lead Source options corresponding to the selected hospital, matching Front Office
  const availableLeadSourcesForHospital = useMemo(() => {
    const baseSources = sourceConfig.map(s => s.name);
    const sourceSet = new Set<string>(baseSources);

    if (selectedHospitalId) {
      const hosp = hospitals.find(h => h.id === selectedHospitalId || h.hospital_id === selectedHospitalId);
      const hospId = hosp?.hospital_id || hosp?.id || selectedHospitalId;

      if ((hosp as any)?.leadSources && Array.isArray((hosp as any).leadSources)) {
        (hosp as any).leadSources.forEach((s: string) => {
          if (s && typeof s === 'string' && s.trim()) sourceSet.add(s.trim());
        });
      }

      appointments.forEach(a => {
        if (a.hospital_id === hospId || (hosp && a.hospitalName === (hosp.hospitalName || hosp.name))) {
          if (a.source) {
            const display = getSourceDisplay(a.source);
            if (display && display !== 'Others') sourceSet.add(display);
          }
        }
      });
    }

    return Array.from(sourceSet);
  }, [selectedHospitalId, hospitals, appointments]);

  // Load Primary Complaint values corresponding to the selected hospital, matching Front Office
  const availableConditionsForHospital = useMemo(() => {
    const baseConditions = conditions && conditions.length > 0 ? conditions : Object.values(Condition);
    const conditionSet = new Set<string>(baseConditions);

    if (selectedHospitalId) {
      const hosp = hospitals.find(h => h.id === selectedHospitalId || h.hospital_id === selectedHospitalId);
      const hospId = hosp?.hospital_id || hosp?.id || selectedHospitalId;

      if ((hosp as any)?.conditions && Array.isArray((hosp as any).conditions)) {
        (hosp as any).conditions.forEach((c: string) => {
          if (c && typeof c === 'string' && c.trim()) conditionSet.add(c.trim());
        });
      }

      appointments.forEach(a => {
        if (a.hospital_id === hospId || (hosp && a.hospitalName === (hosp.hospitalName || hosp.name))) {
          if (a.condition && typeof a.condition === 'string' && a.condition.trim()) {
            conditionSet.add(a.condition.trim());
          }
        }
      });
    }

    return Array.from(conditionSet);
  }, [selectedHospitalId, conditions, hospitals, appointments]);

  // Synchronize options with selected hospital: clear any previously selected values that are invalid for new hospital
  useEffect(() => {
    if (!selectedHospitalId) return;

    setBookingFormData(prev => {
      let nextCondition = prev.condition;
      let nextSource = prev.source;

      if (nextCondition && !availableConditionsForHospital.includes(nextCondition)) {
        nextCondition = '';
      }

      if (nextSource && !availableLeadSourcesForHospital.includes(nextSource)) {
        nextSource = '';
      }

      return {
        ...prev,
        condition: nextCondition,
        source: nextSource,
        sourceDoctorName: nextSource === 'Doctor Recommended' ? prev.sourceDoctorName : '',
        sourceOtherDetails: nextSource === 'Others' ? prev.sourceOtherDetails : '',
        referralPerson: (nextSource === 'Referral' || nextSource === 'Relatives / Friend') ? prev.referralPerson : ''
      };
    });
  }, [selectedHospitalId, availableConditionsForHospital, availableLeadSourcesForHospital]);

  // Doctors for chosen hospital
  const doctorsForSelectedHospital = useMemo(() => {
    if (!selectedHospitalId) return [];
    const hosp = hospitals.find(h => h.id === selectedHospitalId || h.hospital_id === selectedHospitalId);
    if (!hosp) return [];
    return doctors.filter(d => isDoctorAssociatedWithHospital(d, hosp));
  }, [selectedHospitalId, hospitals, doctors]);

  // Helper to accurately resolve hospital name for every booking record
  const getBookingHospitalName = (booking: { assignedHospitalName?: string; hospitalName?: string; assignedHospitalId?: string; hospital_id?: string; assignedDoctorId?: string }): string => {
    if (booking.assignedHospitalName) return booking.assignedHospitalName;
    if (booking.hospitalName) return booking.hospitalName;
    const hospId = booking.assignedHospitalId || booking.hospital_id;
    if (hospId) {
      const match = hospitals.find(h => h.id === hospId || h.hospital_id === hospId || h.tenantId === hospId);
      if (match) return match.hospitalName || match.name;
      const staffMatch = (staffUsers || []).find(u => u.id === hospId || u.hospital_id === hospId || u.tenantId === hospId);
      if (staffMatch) return staffMatch.hospitalName || staffMatch.name;
    }
    if (booking.assignedDoctorId) {
      const doc = doctors.find(d => d.id === booking.assignedDoctorId);
      if (doc?.hospitalName) return doc.hospitalName;
      if (doc?.hospital_id) {
        const match = hospitals.find(h => h.id === doc.hospital_id || h.hospital_id === doc.hospital_id || h.tenantId === doc.hospital_id);
        if (match) return match.hospitalName || match.name;
      }
    }
    if (authorizedHospitals.length === 1) {
      return authorizedHospitals[0].hospitalName || authorizedHospitals[0].name;
    }
    return 'Hospital Facility';
  };

  // Unified Bookings List strictly isolated to the authenticated Sales user
  const patientBookings: BookingRecord[] = useMemo(() => {
    const list: BookingRecord[] = [];
    const activeSalesId = currentUserId || (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_id') : null);
    const activeSalesStaff = currentUserStaff || (staffUsers || []).find(u => u.id === activeSalesId);
    const activeSalesEmail = (activeSalesStaff?.email || (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_email') : '') || '').toLowerCase().trim();
    const activeSalesName = (activeSalesStaff?.name || (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_name') : '') || '').toLowerCase().trim();

    (appointments || []).forEach(a => {
      // Security & Isolation: Show only the logged-in Sales user's bookings
      const apptCreatorId = a.created_by_user_id || 
                            a.sales_user_id ||
                            a.doctor_assessment?.created_by_user_id || 
                            a.doctor_assessment?.sales_user_id || 
                            a.doctor_assessment?.created_by;

      if (activeSalesId) {
        if (apptCreatorId && apptCreatorId !== activeSalesId) {
          return;
        }
        if (!apptCreatorId) {
          const aUsername = (a.username || a.doctor_assessment?.username || '').toLowerCase().trim();
          const matchesName = activeSalesName && aUsername === activeSalesName;
          const matchesEmail = activeSalesEmail && aUsername === activeSalesEmail;
          const matchesRemarks = a.remarks && (a.remarks === activeSalesId || a.remarks.toLowerCase().trim() === activeSalesName);
          if (!matchesName && !matchesEmail && !matchesRemarks) {
            return;
          }
        }
      }

      const matchingPatient = patients.find(p => 
        (a.patient_id && p.id === a.patient_id) || 
        (a.mobile && p.mobile === a.mobile)
      );

      const assignedDoc = doctors.find(d => d.id === a.assignedDoctorId || d.id === a.doctor_id);
      const assignedHosp = hospitals.find(h => h.id === a.hospital_id || (assignedDoc && assignedDoc.hospital_id === h.id));

      let resolvedStatus = a.status || a.bookingType || 'Scheduled';
      if (matchingPatient) {
        if (matchingPatient.packageProposal?.outcome) {
          switch (matchingPatient.packageProposal.outcome) {
            case 'Scheduled': resolvedStatus = 'Surgery Scheduled'; break;
            case 'Follow-Up': resolvedStatus = 'Follow-Up Surgery'; break;
            case 'Lost': resolvedStatus = 'Surgery Lost'; break;
            case 'Completed': resolvedStatus = 'Surgery Completed'; break;
          }
        } else if (matchingPatient.doctorAssessment) {
          if (matchingPatient.doctorAssessment.quickCode === SurgeonCode.S1) resolvedStatus = 'Package Proposal';
          else if (matchingPatient.doctorAssessment.quickCode === SurgeonCode.M1) resolvedStatus = 'Medication Done';
          else if (matchingPatient.status === 'Doctor Done' && (matchingPatient.doctorAssessment.assessedAt || matchingPatient.doctorAssessment.doctorSignature)) {
            resolvedStatus = 'Doctor Done';
          }
        } else if (matchingPatient.status && matchingPatient.status !== 'Scheduled' && matchingPatient.status !== 'Doctor Done') {
          resolvedStatus = matchingPatient.status;
        }
      }

      list.push({
        id: a.id,
        appointmentId: a.id,
        patientId: a.patient_id || matchingPatient?.id,
        name: a.name || matchingPatient?.name || 'Unnamed Patient',
        mobile: a.mobile || matchingPatient?.mobile || '',
        age: matchingPatient?.age,
        gender: matchingPatient?.gender,
        city: (matchingPatient as any)?.city || (matchingPatient as any)?.address || '',
        condition: a.condition || matchingPatient?.condition || Condition.Other,
        source: a.source || matchingPatient?.source || 'Other',
        referralPerson: a.referral_person,
        sourceDoctorName: a.sourceDoctorName,
        sourceOtherDetails: a.doctor_assessment?.source_other_details || (a.source?.startsWith('Other: ') ? a.source.replace('Other: ', '') : null),
        status: normalizeProjectStatus(resolvedStatus),
        assignedHospitalId: assignedHosp?.id || a.hospital_id,
        assignedHospitalName: assignedHosp?.hospitalName || assignedHosp?.name || a.hospitalName,
        assignedDoctorId: assignedDoc?.id || a.assignedDoctorId,
        assignedDoctorName: assignedDoc?.name || a.assignedDoctorName,
        appointmentDate: normalizeToIsoDate(a.date) || a.date,
        appointmentTime: a.time || '10:00',
        scheduledBy: a.username || (a.scheduled_by_role === 'sales' ? 'Sales' : 'Front Office'),
        createdByUserId: apptCreatorId || activeSalesId || undefined,
        quickCode: matchingPatient?.doctorAssessment?.quickCode,
        notes: a.notes || '',
        notesList: a.notes_list || [],
        followupDate: a.followup_date || matchingPatient?.followup_date,
        followupNotes: a.followup_notes || matchingPatient?.followup_notes,
        followupHistory: a.followup_history || matchingPatient?.followup_history || []
      });
    });

    return list.sort((x, y) => {
      const dateX = x.appointmentDate || '1970-01-01';
      const dateY = y.appointmentDate || '1970-01-01';
      return dateY.localeCompare(dateX);
    });
  }, [appointments, patients, doctors, hospitals, currentUserId, currentUserStaff, staffUsers]);

  // Tab Filtered Data
  const displayedBookings = useMemo(() => {
    let result = patientBookings;

    // Filter by Tab Date context
    if (activeTab === 'APPOINTMENTS' && !showAllDates) {
      result = result.filter(b => b.appointmentDate === selectedDate);
    }

    // Search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(b => 
        b.name.toLowerCase().includes(term) ||
        b.mobile.includes(term) ||
        b.id.toLowerCase().includes(term) ||
        (b.assignedDoctorName && b.assignedDoctorName.toLowerCase().includes(term)) ||
        (b.assignedHospitalName && b.assignedHospitalName.toLowerCase().includes(term))
      );
    }

    // Extended filters
    if (filters.startDate) {
      result = result.filter(b => b.appointmentDate >= filters.startDate);
    }
    if (filters.endDate) {
      result = result.filter(b => b.appointmentDate <= filters.endDate);
    }
    if (filters.status !== 'ALL') {
      result = result.filter(b => normalizeProjectStatus(b.status) === filters.status);
    }
    if (filters.hospitalId !== 'ALL') {
      result = result.filter(b => b.assignedHospitalId === filters.hospitalId);
    }
    if (filters.doctorId !== 'ALL') {
      result = result.filter(b => b.assignedDoctorId === filters.doctorId);
    }
    if (filters.condition !== 'ALL') {
      result = result.filter(b => b.condition === filters.condition);
    }
    if (filters.source !== 'ALL') {
      result = result.filter(b => b.source === filters.source);
    }

    return result;
  }, [patientBookings, activeTab, selectedDate, showAllDates, searchTerm, filters]);

  // Statistics
  const totalCount = patientBookings.length;
  const scheduledCount = patientBookings.filter(b => normalizeProjectStatus(b.status) === 'Scheduled').length;
  const arrivedCount = patientBookings.filter(b => {
    const s = normalizeProjectStatus(b.status);
    return s === 'Arrived' || s === 'In Consultation' || s === 'Doctor Done';
  }).length;
  const followUpCount = patientBookings.filter(b => normalizeProjectStatus(b.status) === 'Follow-up' || Boolean(b.followupDate)).length;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'ALL') count++;
    if (filters.hospitalId !== 'ALL') count++;
    if (filters.doctorId !== 'ALL') count++;
    if (filters.condition !== 'ALL') count++;
    if (filters.source !== 'ALL') count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    if (showAllDates) count++;
    return count;
  }, [filters, showAllDates]);

  const hasSchedulingAccess = schedulingPermissions.sales !== false;

  // Book Appointment Flow Initiator
  const handleOpenBookAppointment = (bookingToModify: BookingRecord | null = null) => {
    if (bookingToModify) {
      setBookingToEdit(bookingToModify);
      const hospId = bookingToModify.assignedHospitalId || '';
      setSelectedHospitalId(hospId);
      setSelectedDoctorId(bookingToModify.assignedDoctorId || '');
      setBookingFormData({
        name: bookingToModify.name || '',
        mobile: bookingToModify.mobile || '',
        condition: bookingToModify.condition || '',
        date: bookingToModify.appointmentDate || todayIso,
        time: bookingToModify.appointmentTime || '10:00',
        source: getSourceDisplay(bookingToModify.source) || bookingToModify.source || '',
        sourceOtherDetails: bookingToModify.sourceOtherDetails || (bookingToModify.source?.startsWith('Other: ') ? bookingToModify.source.replace('Other: ', '') : ''),
        referralPerson: bookingToModify.referralPerson || '',
        sourceDoctorName: bookingToModify.sourceDoctorName || ''
      });
      // Skip hospital selector when editing existing booking
      setBookingStep('FORM');
    } else {
      setBookingToEdit(null);
      setHospitalSearch('');
      setSelectedDoctorId('');
      setBookingFormData({
        name: '',
        mobile: '',
        condition: '',
        date: selectedDate || todayIso,
        time: '10:00',
        source: '',
        sourceOtherDetails: '',
        referralPerson: '',
        sourceDoctorName: ''
      });

      // If user is authorized for exactly 1 hospital, auto-select it and go straight to form
      if (authorizedHospitals.length === 1) {
        setSelectedHospitalId(authorizedHospitals[0].id);
        setBookingStep('FORM');
      } else {
        setSelectedHospitalId('');
        setBookingStep('SELECT_HOSPITAL');
      }
    }
    setShowBookingModal(true);
  };

  const handleSelectHospital = (hosp: any) => {
    setSelectedHospitalId(hosp.id);
    setSelectedDoctorId('');
    setBookingStep('FORM');
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingBooking) return;

    if (!selectedHospitalId) {
      setFeedbackBanner({ type: 'error', message: 'Please select a hospital facility.' });
      return;
    }

    if (!bookingFormData.name.trim() || !bookingFormData.mobile.trim() || !bookingFormData.date || !bookingFormData.time) {
      setFeedbackBanner({ type: 'error', message: 'Please complete all required fields (Name, Mobile, Date, Time).' });
      return;
    }

    // MANDATORY VALIDATION: Primary Complaint & Lead Source
    if (!bookingFormData.condition || !bookingFormData.condition.trim()) {
      setFeedbackBanner({ type: 'error', message: 'Primary Complaint is mandatory. Please select a condition.' });
      return;
    }

    if (!bookingFormData.source || !bookingFormData.source.trim()) {
      setFeedbackBanner({ type: 'error', message: 'Lead Source is mandatory. Please select a lead source.' });
      return;
    }

    if (bookingFormData.source === 'Doctor Recommended' && !bookingFormData.sourceDoctorName?.trim()) {
      setFeedbackBanner({ type: 'error', message: 'Please provide the referring Doctor Name.' });
      return;
    }

    if (bookingFormData.source === 'Others' && !bookingFormData.sourceOtherDetails?.trim()) {
      setFeedbackBanner({ type: 'error', message: 'Please provide specific Source Name / Details.' });
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const hosp = hospitals.find(h => h.id === selectedHospitalId || h.hospital_id === selectedHospitalId);
      const finalHospitalId = hosp?.hospital_id || hosp?.id || selectedHospitalId;
      const finalHospitalName = hosp?.hospitalName || hosp?.name || 'Hospital Facility';

      const doc = doctors.find(d => d.id === selectedDoctorId);
      const activeSalesId = currentUserId || (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_id') : null) || 'staff_sales_01';
      const activeUsername = (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_name') : null) || currentUserStaff?.name || 'Sales Executive';
      const activeEmail = (typeof window !== 'undefined' ? localStorage.getItem('hms_hospital_email') : null) || currentUserStaff?.email || '';

      const normalizedSourceValue = bookingFormData.source === 'Others' && bookingFormData.sourceOtherDetails?.trim()
        ? `Other: ${bookingFormData.sourceOtherDetails.trim()}`
        : bookingFormData.source;

      const payload: any = {
        name: bookingFormData.name.trim(),
        mobile: bookingFormData.mobile.trim(),
        source: normalizedSourceValue,
        sourceDoctorName: bookingFormData.source === 'Doctor Recommended' ? bookingFormData.sourceDoctorName?.trim() : undefined,
        referral_person: (bookingFormData.source === 'Referral' || bookingFormData.source === 'Relatives / Friend') ? bookingFormData.referralPerson?.trim() : null,
        condition: bookingFormData.condition as Condition,
        date: bookingFormData.date,
        time: bookingFormData.time,
        hospital_id: finalHospitalId,
        hospitalName: finalHospitalName,
        assignedDoctorId: doc?.id || null,
        assignedDoctorName: doc?.name || null,
        doctor_id: doc?.id || null,
        assignment_type: 'hospital',
        bookingType: 'Scheduled',
        status: 'Scheduled',
        visit_type: 'OPD',
        username: activeUsername,
        scheduled_by: 'Acquire OPD team',
        scheduled_by_role: 'sales',
        created_by_user_id: activeSalesId,
        sales_user_id: activeSalesId,
        doctor_assessment: {
          created_by_user_id: activeSalesId,
          sales_user_id: activeSalesId,
          created_by: activeSalesId,
          created_by_name: activeUsername,
          created_by_email: activeEmail,
          username: activeUsername,
          scheduled_by: 'Acquire OPD team',
          scheduled_by_role: 'sales',
          source: bookingFormData.source,
          source_other_details: bookingFormData.sourceOtherDetails?.trim() || null,
          sourceDoctorName: bookingFormData.sourceDoctorName?.trim() || null,
          referral_person: bookingFormData.referralPerson?.trim() || null,
          condition: bookingFormData.condition
        }
      };

      if (bookingToEdit?.appointmentId) {
        const existing = appointments.find(a => a.id === bookingToEdit.appointmentId);
        if (existing) {
          await updateAppointment({
            ...existing,
            ...payload
          });
        } else {
          await addAppointment(payload);
        }
        setFeedbackBanner({ type: 'success', message: `Booking updated successfully for ${payload.name} at ${finalHospitalName}.` });
      } else {
        await addAppointment(payload);
        setFeedbackBanner({ type: 'success', message: `Appointment booked successfully for ${payload.name} at ${finalHospitalName}.` });
      }

      setShowBookingModal(false);
      setBookingToEdit(null);
      setSelectedHospitalId('');
      setSelectedDoctorId('');
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', message: err?.message || 'Failed to save appointment. Please check details.' });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Follow-up Handler
  const handleOpenFollowup = async (booking: BookingRecord) => {
    setFollowupBooking(booking);
    setFollowupDateInput(booking.followupDate || '');
    setFollowupStatusInput(booking.status === 'Scheduled' ? 'Scheduled' : 'Follow-up');
    setFollowupNotesInput('');
    setFollowupError(null);
    setIsLoadingFollowupHistory(true);

    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', booking.id)
        .order('created_at', { ascending: false });

      if (error) {
        setFollowupHistoryList(booking.followupHistory || []);
      } else {
        const mapped = (data || []).map((item: any) => ({
          id: item.id,
          leadId: item.lead_id,
          note: item.note,
          author: item.created_by_name || item.created_by || 'Sales',
          date: item.created_date || (item.created_at ? formatDateToDDMMMYYYY(item.created_at) : ''),
          time: item.created_time || (item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '')
        }));
        setFollowupHistoryList(mapped);
      }
    } catch {
      setFollowupHistoryList(booking.followupHistory || []);
    } finally {
      setIsLoadingFollowupHistory(false);
    }
  };

  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupBooking || isSavingFollowup) return;
    setFollowupError(null);
    setIsSavingFollowup(true);

    try {
      const activeUsername = localStorage.getItem('hms_hospital_name') || localStorage.getItem('username') || 'Sales';
      const now = new Date();
      const createdDateStr = formatDateToDDMMMYYYY(now);
      const createdTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      if (followupNotesInput.trim()) {
        await supabase.from('lead_notes').insert({
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          lead_id: followupBooking.id,
          note: followupNotesInput.trim(),
          created_at: now.toISOString(),
          created_date: createdDateStr,
          created_time: createdTimeStr,
          created_by: 'sales',
          created_by_name: activeUsername
        });
      }

      const appt = appointments.find(a => a.id === followupBooking.appointmentId || a.id === followupBooking.id);
      if (appt) {
        await updateAppointment({
          ...appt,
          status: followupStatusInput,
          bookingType: followupStatusInput === 'Follow-up' ? 'Follow Up' : 'Scheduled',
          followup_date: followupDateInput || '',
          followup_notes: followupNotesInput.trim() || appt.followup_notes
        });
      }

      const p = patients.find(pat => pat.id === followupBooking.appointmentId || pat.id === followupBooking.id);
      if (p) {
        await updatePatient(p.id, {
          ...p,
          followup_date: followupDateInput || '',
          doctorAssessment: p.doctorAssessment ? {
            ...p.doctorAssessment,
            followup_date: followupDateInput || ''
          } : undefined
        });
      }

      setFeedbackBanner({ type: 'success', message: `Follow-up updated for ${followupBooking.name}.` });
      setFollowupBooking(null);
    } catch (err: any) {
      setFollowupError(err?.message || 'Failed to update follow-up record.');
    } finally {
      setIsSavingFollowup(false);
    }
  };

  // Notes Handler
  const handleOpenNotes = (booking: BookingRecord) => {
    setNotesBooking(booking);
    setNewNoteInput('');
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesBooking || !newNoteInput.trim() || isSavingNote) return;
    setIsSavingNote(true);

    try {
      const activeUsername = localStorage.getItem('hms_hospital_name') || localStorage.getItem('username') || 'Sales';
      const now = new Date();

      await supabase.from('lead_notes').insert({
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        lead_id: notesBooking.id,
        note: newNoteInput.trim(),
        created_at: now.toISOString(),
        created_date: formatDateToDDMMMYYYY(now),
        created_time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        created_by: 'sales',
        created_by_name: activeUsername
      });

      const updatedNotes = [
        ...(notesBooking.notesList || []),
        {
          id: `note_${Date.now()}`,
          text: newNoteInput.trim(),
          date: formatDateToDDMMMYYYY(now),
          author: activeUsername
        }
      ];

      const appt = appointments.find(a => a.id === notesBooking.appointmentId || a.id === notesBooking.id);
      if (appt) {
        await updateAppointment({
          ...appt,
          notes_list: updatedNotes
        });
      }

      setFeedbackBanner({ type: 'success', message: `Note saved for ${notesBooking.name}.` });
      setNotesBooking(null);
      setNewNoteInput('');
    } catch (err: any) {
      setFeedbackBanner({ type: 'error', message: err?.message || 'Failed to save note.' });
    } finally {
      setIsSavingNote(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Appt ID', 'Date', 'Time', 'Hospital', 'Patient Name', 'Mobile', 'Doctor', 'Condition', 'Source', 'Status', 'Scheduled By'];
    const rows = displayedBookings.map(b => [
      b.id,
      b.appointmentDate ? formatDateToDDMMMYYYY(b.appointmentDate) : '',
      b.appointmentTime,
      getBookingHospitalName(b),
      b.name,
      b.mobile,
      b.assignedDoctorName || 'Front Office',
      b.condition,
      getSourceDisplay(b.source),
      b.status,
      b.scheduledBy
    ].map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_bookings_export_${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-300 ${
          feedbackBanner.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-bold">{feedbackBanner.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setFeedbackBanner(null)} 
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header matching Front Office Dashboard */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
      </div>

      {/* Navigation Segmented Tab Switcher (Matching Front Office, Registry Strictly Removed) */}
      <div className="flex bg-slate-100/90 p-1 rounded-2xl w-full sm:w-fit shadow-xs overflow-x-auto scrollbar-none gap-1">
        {(['APPOINTMENTS', 'GLOBAL_SEARCH'] as const).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 sm:flex-initial px-4 sm:px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === tab 
                ? 'bg-white text-hospital-700 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab === 'APPOINTMENTS' && <CalendarCheck className="w-4 h-4 text-emerald-600" />}
            {tab === 'GLOBAL_SEARCH' && <Search className="w-4 h-4 text-indigo-600" />}
            {tab === 'APPOINTMENTS' ? 'Scheduled Roster' : 'Global Search & Audit'}
          </button>
        ))}
      </div>

      {/* Main Search and Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          
          <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
            {/* Schedule Date indicator (Matching Front Office) */}
            {activeTab === 'APPOINTMENTS' && (
              <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/90 flex items-center gap-2.5 shadow-2xs shrink-0">
                <div className="w-7 h-7 rounded-lg bg-hospital-100 text-hospital-700 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                    Schedule Date
                  </span>
                  <div className="text-xs font-black text-slate-900 flex items-center gap-2 mt-0.5 whitespace-nowrap">
                    <span>{formatReadableDate(selectedDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(shiftIsoDate(selectedDate, -1));
                      setShowAllDates(false);
                    }}
                    title="Previous Day"
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(todayIso);
                      setShowAllDates(false);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-colors ${
                      selectedDate === todayIso && !showAllDates
                        ? 'bg-hospital-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(shiftIsoDate(selectedDate, 1));
                      setShowAllDates(false);
                    }}
                    title="Next Day"
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Search Input */}
            <div className="relative flex-1 max-w-full sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search patient, mobile, ID, hospital..." 
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 outline-none font-semibold text-xs text-slate-800 transition-all" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>

            {/* Filters Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                  showFilters || activeFilterCount > 0 
                    ? 'bg-hospital-50 border-hospital-300 text-hospital-700 shadow-2xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-hospital-600" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-hospital-600 text-white text-[10px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Action Button: Book Appointment (Front Office Styling) */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto shrink-0">
            {hasSchedulingAccess ? (
              <button 
                id="book-appointment-btn"
                onClick={() => handleOpenBookAppointment(null)} 
                className="w-full sm:w-auto bg-hospital-600 hover:bg-hospital-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" /> Book Appointment
              </button>
            ) : (
              <div className="px-3.5 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Scheduling Governed by Master
              </div>
            )}
          </div>
        </div>

        {/* Expandable Filters Panel */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              
              {/* Date Filter for Scheduled Roster */}
              {activeTab === 'APPOINTMENTS' && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Roster Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => {
                      setSelectedDate(e.target.value);
                      setShowAllDates(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white"
                  />
                </div>
              )}

              {/* Date Range for Global Search */}
              {activeTab === 'GLOBAL_SEARCH' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">From Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">To Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white"
                    />
                  </div>
                </>
              )}

              {/* Hospital Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Hospital</label>
                <select
                  value={filters.hospitalId}
                  onChange={e => setFilters({ ...filters, hospitalId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white cursor-pointer"
                >
                  <option value="ALL">All Hospitals</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.hospitalName || h.name}</option>
                  ))}
                </select>
              </div>

              {/* Doctor Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Doctor</label>
                <select
                  value={filters.doctorId}
                  onChange={e => setFilters({ ...filters, doctorId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white cursor-pointer"
                >
                  <option value="ALL">All Doctors</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Status</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters({ ...filters, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  {ALL_PROJECT_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Condition Filter */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Condition</label>
                <select
                  value={filters.condition}
                  onChange={e => setFilters({ ...filters, condition: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white cursor-pointer"
                >
                  <option value="ALL">All Conditions</option>
                  {conditions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                {activeTab === 'APPOINTMENTS' && (
                  <button
                    type="button"
                    onClick={() => setShowAllDates(!showAllDates)}
                    className={`px-3 py-1.5 rounded-lg font-bold border transition-all ${
                      showAllDates ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {showAllDates ? 'Filtering Active Date' : 'Show All Dates'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(todayIso);
                    setShowAllDates(false);
                    setFilters({
                      startDate: '',
                      endDate: '',
                      status: 'ALL',
                      hospitalId: 'ALL',
                      doctorId: 'ALL',
                      condition: 'ALL',
                      source: 'ALL'
                    });
                  }}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" /> Reset Filters
                </button>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Container (Front Office Table Layout with Hospital Column) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
              <tr>
                <th className="p-5 whitespace-nowrap">{activeTab === 'APPOINTMENTS' ? 'APPT TIME' : 'APPT DATE / TIME'}</th>
                <th className="p-5 whitespace-nowrap">PATIENT DETAILS</th>
                {/* 2. ADD HOSPITAL COLUMN */}
                <th className="p-5 whitespace-nowrap">HOSPITAL</th>
                <th className="p-5 whitespace-nowrap">CONSULTING DOCTOR</th>
                <th className="p-5 whitespace-nowrap">COMPLAINT</th>
                <th className="p-5 whitespace-nowrap">SOURCE</th>
                <th className="p-5 whitespace-nowrap">STATUS</th>
                <th className="p-5 whitespace-nowrap">SCHEDULE BY</th>
                <th className="p-5 text-right whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-7 h-7 text-hospital-600 animate-spin" />
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Loading appointments...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <Calendar className="w-8 h-8 text-slate-300" />
                      <span className="text-xs font-extrabold text-slate-700">
                        {activeTab === 'APPOINTMENTS' && !showAllDates
                          ? `No scheduled bookings for ${formatDateToDDMMMYYYY(selectedDate)}`
                          : 'No bookings match your filter criteria'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {activeTab === 'APPOINTMENTS' && patientBookings.length > 0 && !showAllDates
                          ? `There are ${patientBookings.length} total booking(s) across other dates.`
                          : 'Try adjusting filters or book a new appointment.'}
                      </span>
                      {activeTab === 'APPOINTMENTS' && patientBookings.length > 0 && !showAllDates && (
                        <button
                          type="button"
                          onClick={() => setShowAllDates(true)}
                          className="mt-2 px-4 py-2 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <CalendarCheck className="w-4 h-4" />
                          <span>View All {patientBookings.length} Bookings</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedBookings.map(booking => {
                  const hospName = getBookingHospitalName(booking);

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      {/* 1. Appt Time & Date */}
                      <td className="p-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="font-mono font-black text-slate-800 flex items-center gap-1.5 text-xs">
                            <Clock className="w-3.5 h-3.5 text-hospital-600" /> {booking.appointmentTime || '10:00'}
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> {formatDateToDDMMMYYYY(booking.appointmentDate)}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 font-bold mt-0.5">
                            {booking.id}
                          </span>
                        </div>
                      </td>

                      {/* 2. Patient Details */}
                      <td className="p-5">
                        <div className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                          {booking.name}
                          {booking.quickCode === SurgeonCode.S1 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-black border border-rose-200">
                              S1 Surgery
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" /> {booking.mobile}
                        </div>
                        {(booking.age || booking.gender || booking.city) && (
                          <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                            {booking.age ? `${booking.age}Y` : ''} {booking.gender ? `• ${booking.gender}` : ''} {booking.city ? `• ${booking.city}` : ''}
                          </div>
                        )}
                      </td>

                      {/* 3. HOSPITAL COLUMN (Actual associated hospital) */}
                      <td className="p-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 font-bold">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate max-w-[180px]">
                              {hospName}
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium block">
                              Facility ID: {booking.assignedHospitalId || 'Auto'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Consulting Doctor */}
                      <td className="p-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 font-bold">
                            <Stethoscope className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-800">
                              {booking.assignedDoctorName || 'Front Office Queue'}
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium block">
                              {booking.assignedDoctorId ? 'Surgeon Assigned' : 'Triage Desk'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Complaint (Condition) */}
                      <td className="p-5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-50 text-slate-800">
                          {booking.condition}
                        </span>
                      </td>

                      {/* 6. Lead Source */}
                      <td className="p-5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-100 text-slate-700">
                          {getSourceDisplay(booking.source)}
                        </span>
                      </td>

                      {/* 7. Current Status */}
                      <td className="p-5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border tracking-wider ${getStatusBadgeStyle(booking.status)}`}>
                          {booking.status}
                        </span>
                        {booking.followupDate && (
                          <span className="block text-[9px] font-bold text-amber-600 mt-1">
                            Follow-up: {formatDateToDDMMMYYYY(booking.followupDate)}
                          </span>
                        )}
                      </td>

                      {/* 8. Scheduled By */}
                      <td className="p-5 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-600 font-mono">
                          {booking.scheduledBy}
                        </span>
                      </td>

                      {/* 9. Actions */}
                      <td className="p-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenFollowup(booking)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Schedule Follow-up"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Follow-up</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenNotes(booking)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="Add Note"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedBookingForDetail(booking)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            title="View Full Booking Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {hasSchedulingAccess && (
                            <button
                              type="button"
                              onClick={() => handleOpenBookAppointment(booking)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              title="Edit Booking"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. FAST & SIMPLE HOSPITAL-FIRST BOOKING MODAL */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92dvh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-hospital-50 text-hospital-600 border border-hospital-200 font-bold">
                  {bookingStep === 'SELECT_HOSPITAL' ? (
                    <Building2 className="w-5 h-5 text-hospital-600" />
                  ) : (
                    <CalendarCheck className="w-5 h-5 text-hospital-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {bookingToEdit ? 'Update Appointment Booking' : 'Book Appointment'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {bookingStep === 'SELECT_HOSPITAL' 
                      ? 'Step 1: Select hospital facility to begin booking'
                      : 'Step 2: Enter patient details & schedule appointment slot'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setShowBookingModal(false); setBookingToEdit(null); }} 
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              
              {/* STEP 1: FAST SEARCHABLE HOSPITAL SELECTION */}
              {bookingStep === 'SELECT_HOSPITAL' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1.5 tracking-wider">
                      Select Hospital Facility <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      Choose which hospital you are booking this patient for. Only authorized facilities are listed.
                    </p>
                    
                    {/* Searchable Select Hospital Dropdown */}
                    <div className="mb-3">
                      <select
                        value={selectedHospitalId}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            const found = authorizedHospitals.find(h => h.id === val);
                            if (found) handleSelectHospital(found);
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500 cursor-pointer shadow-2xs"
                      >
                        <option value="">-- Select Hospital Facility ({authorizedHospitals.length} available) --</option>
                        {authorizedHospitals.map(h => (
                          <option key={h.id} value={h.id}>
                            {h.hospitalName || h.name} {h.city ? `• ${h.city}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative mb-3">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input 
                        type="text" 
                        value={hospitalSearch}
                        onChange={e => setHospitalSearch(e.target.value)}
                        placeholder="Search hospital by name, city, location..."
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white max-h-[360px] overflow-y-auto shadow-2xs">
                    {filteredAuthorizedHospitals.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-1">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                        <p className="text-xs font-bold text-slate-600">No matching hospital facilities found</p>
                        <p className="text-[11px] text-slate-400">Try modifying your search or contact Master Admin for access.</p>
                      </div>
                    ) : (
                      filteredAuthorizedHospitals.map(hosp => {
                        const hospDocs = doctors.filter(d => isDoctorAssociatedWithHospital(d, hosp));
                        const isSelected = selectedHospitalId === hosp.id;

                        return (
                          <div 
                            key={hosp.id}
                            onClick={() => handleSelectHospital(hosp)}
                            className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isSelected ? 'bg-hospital-50/70 border-l-4 border-hospital-600' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {hosp.hospitalName || hosp.name}
                                </h4>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  {hosp.city ? <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3 text-slate-400" /> {hosp.city}</span> : null}
                                  <span>• {hospDocs.length} Consulting Doctor(s)</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="px-3.5 py-1.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 active:scale-95"
                            >
                              Select <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: COMPLETE APPOINTMENT BOOKING FORM */}
              {bookingStep === 'FORM' && (
                <form id="sales-booking-form" onSubmit={handleBookingSubmit} className="space-y-4 animate-in fade-in duration-200">
                  
                  {/* Selected Hospital Summary Bar */}
                  <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 flex items-center justify-center shrink-0 font-bold border border-indigo-200 shadow-2xs">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider block">
                          Selected Hospital
                        </span>
                        <div className="text-xs sm:text-sm font-black text-slate-900 truncate">
                          {hospitals.find(h => h.id === selectedHospitalId)?.hospitalName || hospitals.find(h => h.id === selectedHospitalId)?.name}
                        </div>
                      </div>
                    </div>

                    {!bookingToEdit && (
                      <button
                        type="button"
                        onClick={() => setBookingStep('SELECT_HOSPITAL')}
                        className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                      >
                        Change
                      </button>
                    )}
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Full Name <span className="text-rose-500">*</span></label>
                      <input required className="w-full text-2xl font-black border-b-2 border-slate-100 p-2 outline-none focus:border-hospital-500 placeholder-slate-200" value={bookingFormData.name || ''} onChange={e => setBookingFormData({...bookingFormData, name: e.target.value})} placeholder="Patient Name" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Mobile Number <span className="text-rose-500">*</span></label>
                      <input required type="tel" maxLength={15} className="w-full text-xl font-mono border-b-2 border-slate-100 p-2 outline-none focus:border-hospital-500" value={bookingFormData.mobile || ''} onChange={e => setBookingFormData({...bookingFormData, mobile: e.target.value})} placeholder="9988776655" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Lead Source <span className="text-rose-500">*</span></label>
                      <select 
                        required 
                        className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white cursor-pointer" 
                        value={getSourceDisplay(bookingFormData.source) || ''} 
                        onChange={e => setBookingFormData({...bookingFormData, source: e.target.value})}
                      >
                        <option value="">Select Source</option>
                        {availableLeadSourcesForHospital.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Primary Complaint <span className="text-rose-500">*</span></label>
                      <select required className="w-full border-b-2 border-slate-100 p-2 outline-none focus:border-hospital-500 text-sm font-bold bg-white cursor-pointer" value={bookingFormData.condition || ''} onChange={e => setBookingFormData({...bookingFormData, condition: e.target.value})}>
                        <option value="">Select Condition</option>
                        {
                          [...availableConditionsForHospital]
                            .filter(c => c !== 'Other' && c !== 'Others')
                            .sort()
                            .concat('Other')
                            .map(c => <option key={c} value={c}>{c}</option>)
                        }
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Appt Date <span className="text-rose-500">*</span></label>
                      <input required type="date" className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold cursor-pointer" value={bookingFormData.date || ''} onChange={e => setBookingFormData({...bookingFormData, date: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Preferred Doctor</label>
                      <select 
                        className="w-full border-b-2 border-slate-100 p-2 bg-white text-sm font-bold outline-none focus:border-hospital-500 cursor-pointer" 
                        value={selectedDoctorId || ''} 
                        onChange={e => {
                          const docId = e.target.value;
                          setSelectedDoctorId(docId);
                        }}
                      >
                        <option value="">General OPD / Any Available Doctor</option>
                        {doctorsForSelectedHospital.map(d => {
                          const isAvailable = isDoctorAvailableOnDate(d, bookingFormData.date);
                          return (
                            <option key={d.id} value={d.id}>
                              {d.name} {bookingFormData.date && !isAvailable ? '(Unavailable on Date)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Appt Time Slot <span className="text-rose-500">*</span></label>
                      {(() => {
                        const activeDoc = doctors.find(d => d.id === selectedDoctorId);
                        const slots = getAvailableSlotsForDoctorAndDate(activeDoc, bookingFormData.date);
                        const effectiveSlots = slots && slots.length > 0 
                          ? slots 
                          : ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
                        const bookedSlots = appointments
                          ?.filter(a => a.assignedDoctorId === selectedDoctorId && a.date === bookingFormData.date && a.id !== bookingToEdit?.appointmentId && a.status !== 'Cancelled' && a.status !== 'Junk')
                          ?.map(a => a.time ? a.time.substring(0, 5) : '') || [];

                        return (
                          <select
                            required
                            className="w-full border-b-2 border-slate-100 p-2 bg-white text-sm font-bold outline-none focus:border-hospital-500 cursor-pointer"
                            value={bookingFormData.time || ''}
                            onChange={e => setBookingFormData({...bookingFormData, time: e.target.value})}
                          >
                            <option value="">Select Time Slot...</option>
                            {effectiveSlots.map(s => {
                              const isBooked = bookedSlots.includes(s);
                              return (
                                <option key={s} value={s}>
                                  {s} {isBooked ? '(Booked)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Lead Source <span className="text-rose-500">*</span></label>
                      <select required className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white cursor-pointer" value={bookingFormData.source || ''} onChange={e => setBookingFormData({...bookingFormData, source: e.target.value})}>
                        <option value="">Select Source</option>
                        {availableLeadSourcesForHospital.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {getSourceDisplay(bookingFormData.source) === 'Doctor Recommended' && (
                      <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black uppercase text-hospital-600 mb-2 tracking-widest">Doctor Name <span className="text-rose-500">*</span></label>
                        <input required className="w-full text-xl font-bold border-b-2 border-hospital-100 p-2 outline-none focus:border-hospital-500 placeholder-slate-200" value={bookingFormData.sourceDoctorName || ''} onChange={e => setBookingFormData({...bookingFormData, sourceDoctorName: e.target.value})} placeholder="Dr. Enter Name" />
                      </div>
                    )}
                    {getSourceDisplay(bookingFormData.source) === 'Others' && (
                      <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black uppercase text-hospital-600 mb-2 tracking-widest">Source Name / Details <span className="text-rose-500">*</span></label>
                        <input required className="w-full text-xl font-bold border-b-2 border-hospital-100 p-2 outline-none focus:border-hospital-500 placeholder-slate-200" value={bookingFormData.sourceOtherDetails || ''} onChange={e => setBookingFormData({...bookingFormData, sourceOtherDetails: e.target.value})} placeholder="Enter specific source name or details..." />
                      </div>
                    )}
                    {(getSourceDisplay(bookingFormData.source) === 'Referral' || getSourceDisplay(bookingFormData.source) === 'Relatives / Friend') && (
                      <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black uppercase text-hospital-600 mb-2 tracking-widest">Referral Partner / Person <span className="text-rose-500">*</span></label>
                        <input required className="w-full text-xl font-bold border-b-2 border-hospital-100 p-2 outline-none focus:border-hospital-500 placeholder-slate-200" value={bookingFormData.referralPerson || ''} onChange={e => setBookingFormData({...bookingFormData, referralPerson: e.target.value})} placeholder="Enter referrer name" />
                      </div>
                    )}
                 </div>
                 <button 
                   type="submit" 
                   disabled={isSubmittingBooking}
                   className="w-full py-3 px-5 bg-hospital-600 hover:bg-hospital-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-6 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                 >
                   {isSubmittingBooking ? (
                     <>
                       <Loader2 className="w-4 h-4 animate-spin" />
                       <span>{bookingToEdit ? 'Updating Appointment...' : 'Saving Appointment...'}</span>
                     </>
                   ) : (
                     <span>{bookingToEdit ? 'Update Appointment' : 'Create Appointment'}</span>
                   )}
                 </button>
               </form>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
              {bookingStep === 'FORM' && !bookingToEdit ? (
                <button
                  type="button"
                  onClick={() => setBookingStep('SELECT_HOSPITAL')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Hospitals
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowBookingModal(false); setBookingToEdit(null); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {bookingStep === 'FORM' && (
                  <button
                    type="submit"
                    form="sales-booking-form"
                    disabled={isSubmittingBooking}
                    className="px-6 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingBooking && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmittingBooking ? 'Saving...' : bookingToEdit ? 'Update Booking' : 'Confirm & Book Appointment'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* FOLLOW-UP MODAL */}
      {followupBooking && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92dvh] shadow-2xl overflow-hidden flex flex-col border border-slate-100">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Follow-up Management: {followupBooking.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Update follow-up date and log call notes into the audit trail
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setFollowupBooking(null)} 
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {followupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{followupError}</span>
                </div>
              )}

              <form id="followup-form" onSubmit={handleSaveFollowup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Status Option
                    </label>
                    <select
                      value={followupStatusInput}
                      onChange={e => setFollowupStatusInput(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-hospital-500"
                    >
                      <option value="Follow-up">Follow-up</option>
                      <option value="Scheduled">Scheduled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Next Follow-up Date
                    </label>
                    <input 
                      type="date"
                      value={followupDateInput}
                      onChange={e => setFollowupDateInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-hospital-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Call Notes / Remark
                  </label>
                  <textarea
                    rows={3}
                    value={followupNotesInput}
                    onChange={e => setFollowupNotesInput(e.target.value)}
                    placeholder="Enter discussion notes with patient..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-hospital-500 resize-none"
                  />
                </div>
              </form>

              {/* Follow-up Audit Trail */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Previous Call History</h4>
                {isLoadingFollowupHistory ? (
                  <div className="py-4 text-center text-xs text-slate-400">Loading history...</div>
                ) : followupHistoryList.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-400 text-center italic">No previous notes recorded.</div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {followupHistoryList.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <p className="text-slate-800 font-medium">{item.note}</p>
                        <div className="text-[10px] text-slate-400 flex items-center justify-between font-mono">
                          <span>By: {item.author}</span>
                          <span>{item.date} {item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFollowupBooking(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="followup-form"
                disabled={isSavingFollowup}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingFollowup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSavingFollowup ? 'Saving...' : 'Save Follow-up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NOTES MODAL */}
      {notesBooking && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-100">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Add Note: {notesBooking.name}
              </h3>
              <button type="button" onClick={() => setNotesBooking(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="p-4 sm:p-6 space-y-4">
              <textarea
                required
                rows={4}
                value={newNoteInput}
                onChange={e => setNewNoteInput(e.target.value)}
                placeholder="Type lead note here..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-hospital-500 resize-none"
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNotesBooking(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote || !newNoteInput.trim()}
                  className="px-5 py-2 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingNote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSavingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 max-h-[90vh]">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-hospital-50 border border-hospital-200 text-hospital-600 flex items-center justify-center font-black">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {selectedBookingForDetail.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedBookingForDetail.id} • {selectedBookingForDetail.mobile}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedBookingForDetail(null)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Hospital</span>
                  <span className="font-bold text-slate-800">{getBookingHospitalName(selectedBookingForDetail)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Doctor</span>
                  <span className="font-bold text-slate-800">{selectedBookingForDetail.assignedDoctorName || 'Front Office Queue'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Date & Time</span>
                  <span className="font-bold text-slate-800">{formatDateToDDMMMYYYY(selectedBookingForDetail.appointmentDate)} at {selectedBookingForDetail.appointmentTime}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Current Status</span>
                  <span className="font-bold text-slate-800">{selectedBookingForDetail.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Condition</span>
                  <span className="font-bold text-slate-800">{selectedBookingForDetail.condition}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Lead Source</span>
                  <span className="font-bold text-slate-800">{getSourceDisplay(selectedBookingForDetail.source)}</span>
                </div>
              </div>

              {selectedBookingForDetail.notes && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-700 block">Primary Notes</span>
                  <p className="text-slate-700 font-medium">{selectedBookingForDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBookingForDetail(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
