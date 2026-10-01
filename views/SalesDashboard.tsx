import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { Appointment, Patient, SurgeonCode, Condition, Gender } from '../types';
import { supabase } from '../services/supabaseClient';
import { 
  TrendingUp, Calendar, Phone, Search, CheckCircle2, 
  Clock, Lock, ArrowRight, ArrowLeft, Filter,
  Building2, Stethoscope, Eye, Tag, X,
  MessageSquare, Edit3, CalendarCheck, Check,
  Loader2, AlertCircle, RefreshCw
} from 'lucide-react';

const isDoctorAssociatedWithHospital = (doctor: any, hospital: any): boolean => {
  if (!doctor || !hospital) return false;
  const hospIds = [hospital.id, hospital.hospital_id].filter(Boolean);
  if (doctor.hospital_id && hospIds.includes(doctor.hospital_id)) return true;
  const hospNames = [hospital.hospitalName, hospital.name].filter(Boolean).map((n: string) => n.toLowerCase().trim());
  if (doctor.hospitalName && hospNames.includes(doctor.hospitalName.toLowerCase().trim())) return true;
  return false;
};

const isDoctorAvailableOnDate = (doctor: any, dateString: string | undefined): boolean => {
  if (!dateString) return true;
  if (!doctor || !doctor.id) return true;
  if (doctor.role === 'DEACTIVATED_DOCTOR') return false;

  const availability = doctor.availability || {};
  const formattedDate = dateString;

  if (availability.blockedDates) {
    const isBlocked = (availability.blockedDates || []).some((b: any) => b.date === formattedDate);
    if (isBlocked) return false;
  }
  if (availability.unavailableDates && availability.unavailableDates.includes(formattedDate)) {
    return false;
  }

  const weekday = new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  if (availability.daySchedules) {
    const dayConfig = (availability.daySchedules || []).find((ds: any) => ds.day === weekday);
    if (dayConfig) {
      if (dayConfig.status !== 'Available') return false;
    }
  } else if (availability.availableDays && availability.availableDays.length > 0) {
    if (!availability.availableDays.includes(weekday)) return false;
  }

  return true;
};

const getAvailableSlotsForDoctorAndDate = (doctor: any, dateString: string | undefined): string[] => {
  const defaultSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  if (!dateString) return defaultSlots;
  if (!doctor) return defaultSlots;
  if (!isDoctorAvailableOnDate(doctor, dateString)) return [];

  const availability = doctor.availability || {};
  let start = availability.startTime || '09:00';
  let end = availability.endTime || '17:00';
  let breaksList: any[] = [];

  const weekday = new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
  if (availability.daySchedules) {
    const dayConfig = (availability.daySchedules || []).find((ds: any) => ds.day === weekday);
    if (dayConfig && dayConfig.status === 'Available') {
      start = dayConfig.startTime || start;
      end = dayConfig.endTime || end;
      breaksList = dayConfig.breaks || [];
    }
  }

  const [sh, sm] = (start || '09:00').split(':').map(Number);
  const [eh, em] = (end || '17:00').split(':').map(Number);
  const startMinutes = (sh || 9) * 60 + (sm || 0);
  const endMinutes = (eh || 17) * 60 + (em || 0);

  const slotsList: string[] = [];
  for (let min = startMinutes; min < endMinutes; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const isDuringBreak = breaksList.some((br: any) => {
      if (!br.startTime || !br.endTime) return false;
      const [bsh, bsm] = br.startTime.split(':').map(Number);
      const [beh, bem] = br.endTime.split(':').map(Number);
      const bsMin = bsh * 60 + bsm;
      const beMin = beh * 60 + bem;
      return min >= bsMin && min < beMin;
    });

    if (!isDuringBreak) {
      slotsList.push(timeStr);
    }
  }

  return slotsList.length > 0 ? slotsList : defaultSlots;
};

const sourceConfig = [
  { name: 'Google' },
  { name: 'YouTube' },
  { name: 'Website' },
  { name: 'Facebook' },
  { name: 'Instagram' },
  { name: 'WhatsApp' },
  { name: 'Referral' },
  { name: 'Walking' },
  { name: 'Relatives / Friend' },
  { name: 'Hospital Billboards' },
  { name: 'Doctor Recommended' },
  { name: 'Acquire OPD' },
  { name: 'Others' }
];

const SOURCE_DISPLAY_MAP: Record<string, string> = {
  'Acquire OPD': 'Acquire OPD',
  'Google': 'Google',
  'YouTube': 'YouTube',
  'Website': 'Website',
  'Facebook': 'Facebook',
  'Instagram': 'Instagram',
  'WhatsApp': 'WhatsApp',
  'Referral': 'Referral',
  'Walking': 'Walking',
  'Relatives / Friend': 'Relatives / Friend',
  'Hospital Billboards': 'Hospital Billboards',
  'Doctor Recommended': 'Doctor Recommended',
  'Other': 'Others',
  'Others': 'Others'
};

const getSourceDisplay = (source: string | undefined): string => {
  if (!source) return 'Acquire OPD';
  const clean = source.trim().toLowerCase().replace(/\s+/g, ' ');
  if (
    clean === 'acquire opd' || 
    clean === 'acqure opd' || 
    clean === 'acquire_opd' || 
    clean === 'acqure_opd' || 
    clean === 'acquireopd' || 
    clean === 'acqureopd'
  ) {
    return 'Acquire OPD';
  }
  if (source.startsWith('Other: ')) return 'Others';
  return SOURCE_DISPLAY_MAP[source] || source;
};

// All unique project/system statuses recognized across Master, Front Office, Doctor, and Counseling workflows
// Every status appears exactly once (no duplicates like 'Schedule'/'Scheduled' or 'Follow Up'/'Follow-up')
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
  'Junk',
  'Pending Scheduling'
];

export const normalizeProjectStatus = (status?: string): string => {
  if (!status) return '';
  const trimmed = status.trim();
  const lower = trimmed.toLowerCase();
  
  if (lower === 'scheduled' || lower === 'schedule') return 'Scheduled';
  if (lower === 'follow-up' || lower === 'follow up') return 'Follow-up';
  if (lower === 'surgery scheduled' || lower === 'surgery fixed') return 'Surgery Scheduled';
  if (lower === 'in consultation' || lower === 'in-consultation') return 'In Consultation';
  if (lower === 'follow-up surgery' || lower === 'follow up surgery') return 'Follow-Up Surgery';
  
  const found = ALL_PROJECT_STATUSES.find(st => st.toLowerCase() === lower);
  if (found) return found;
  
  return trimmed;
};

export const getStatusBadgeStyle = (status?: string): { badge: string; dot: string } => {
  if (!status) return { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  const s = status.toLowerCase();
  if (s.includes('scheduled') || s === 'schedule') {
    return { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
  }
  if (s.includes('follow-up') || s.includes('follow up')) {
    return { badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
  }
  if (s.includes('arrived')) {
    return { badge: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500' };
  }
  if (s.includes('in consultation') || s.includes('in-consultation')) {
    return { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' };
  }
  if (s.includes('doctor done')) {
    return { badge: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' };
  }
  if (s.includes('medication done')) {
    return { badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' };
  }
  if (s.includes('package proposal')) {
    return { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
  }
  if (s.includes('surgery completed') || s.includes('completed')) {
    return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  }
  if (s.includes('confirmed')) {
    return { badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' };
  }
  if (s.includes('lost') || s.includes('cancelled')) {
    return { badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
  }
  if (s.includes('revisit')) {
    return { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' };
  }
  if (s.includes('junk') || s.includes('no show')) {
    return { badge: 'bg-slate-100 text-slate-600 border-slate-300', dot: 'bg-slate-400' };
  }
  if (s.includes('new leads') || s.includes('pending')) {
    return { badge: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500' };
  }
  return { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
};

export interface BookingRecord {
  id: string;
  appointmentId: string;
  patientId?: string;
  name: string;
  mobile: string;
  age?: number;
  gender?: Gender | string;
  city?: string;
  condition: Condition | string;
  source: string;
  referralPerson?: string | null;
  status: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  scheduledBy?: string;
  quickCode?: SurgeonCode;
  notes?: string;
  notesList?: { id: string; text: string; date: string; author: string }[];
  followupDate?: string;
  followupNotes?: string;
  followupHistory?: { id: string; date: string; status: string; notes?: string; createdAt: string; author: string }[];
  assignmentType?: 'doctor' | 'hospital';
}
 
// Helper to get today's date in local YYYY-MM-DD format
const getTodayLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const SalesDashboard: React.FC = () => {
  const { 
    patients, 
    appointments, 
    addAppointment, 
    updateAppointment, 
    updatePatient,
    staffUsers, 
    schedulingPermissions 
  } = useHospital();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>(() => getTodayLocalDate()); // Default to current local date
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('ALL');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');
  const [statusUpdateSuccessMessage, setStatusUpdateSuccessMessage] = useState<string | null>(null);

  // Modals & Scheduling state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleStep, setScheduleStep] = useState<'ROUTE_SELECTION' | 'BOOKING_FORM'>('ROUTE_SELECTION');
  const [selectedRoute, setSelectedRoute] = useState<'HOSPITAL' | 'DOCTOR' | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [bookingToEdit, setBookingToEdit] = useState<BookingRecord | null>(null);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<BookingRecord | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [updatingStatusBookingId, setUpdatingStatusBookingId] = useState<string | null>(null);

  // Follow-up Modal state
  // Sales users can update booking status only to: Follow-up or Scheduled
  const [followupBooking, setFollowupBooking] = useState<BookingRecord | null>(null);
  const [followupDateInput, setFollowupDateInput] = useState('');
  const [followupStatusInput, setFollowupStatusInput] = useState<'Follow-up' | 'Scheduled'>('Follow-up');
  const [followupNotesInput, setFollowupNotesInput] = useState('');
  const [followupHistoryList, setFollowupHistoryList] = useState<{
    id: string;
    leadId: string;
    note: string;
    author: string;
    date: string;
    time: string;
    createdAt: string;
    status?: string;
  }[]>([]);
  const [isLoadingFollowupHistory, setIsLoadingFollowupHistory] = useState(false);
  const [isSavingFollowup, setIsSavingFollowup] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);

  // Notes Modal state
  const [notesBooking, setNotesBooking] = useState<BookingRecord | null>(null);
  const [newNoteInput, setNewNoteInput] = useState('');

  // Booking Form Data
  const [bookingFormData, setBookingFormData] = useState({
    name: '',
    mobile: '',
    condition: Condition.Other,
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    source: 'Acquire OPD',
    referralPerson: '',
    sourceDoctorName: '',
    sourceOtherDetails: ''
  });

  // Doctors & Hospitals lists
  const doctors = useMemo(() => {
    return (staffUsers || []).filter(u => u.role === 'DOCTOR' && u.accessStatus !== 'Revoked');
  }, [staffUsers]);

  const hospitals = useMemo(() => {
    return (staffUsers || []).filter(u => 
      (u.role === 'HOSPITAL' || u.role === 'ANALYTICS' || u.role === 'ANALYTICS_HUB') && 
      u.accessStatus !== 'Revoked'
    );
  }, [staffUsers]);

  // Doctors associated with currently selected hospital
  const doctorsForSelectedHospital = useMemo(() => {
    if (!selectedHospitalId) return [];
    const hosp = hospitals.find(h => h.id === selectedHospitalId);
    if (!hosp) return [];
    return doctors.filter(d => isDoctorAssociatedWithHospital(d, hosp));
  }, [selectedHospitalId, hospitals, doctors]);

  // Unified Patient Bookings list
  const patientBookings: BookingRecord[] = useMemo(() => {
    const list: BookingRecord[] = [];
    const processedAppointmentIds = new Set<string>();

    // 1. Process all appointments (the single source of truth for bookings)
    (appointments || []).forEach(a => {
      processedAppointmentIds.add(a.id);

      // Match linked patient if available
      const matchingPatient = patients.find(p => 
        (a.patient_id && p.id === a.patient_id) || 
        (a.mobile && p.mobile === a.mobile)
      );

      const assignedDoc = doctors.find(d => d.id === a.assignedDoctorId || d.id === a.doctor_id);
      const assignedHosp = hospitals.find(h => h.id === a.hospital_id || (assignedDoc && assignedDoc.hospital_id === h.id));

      const notesArr = a.notes_list || (a.notes ? [{
        id: `note_legacy_${a.id}`,
        text: a.notes,
        date: a.createdAt || new Date().toISOString(),
        author: a.username || 'Sales'
      }] : []);

      // Reflect current lifecycle status (Arrived, Doctor Done, Medication Done, Package Proposal, Surgery Scheduled, etc.)
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
          else if (matchingPatient.status === 'Doctor Done' && (matchingPatient.doctorAssessment.assessedAt || matchingPatient.doctorAssessment.doctorSignature || matchingPatient.doctorAssessment.quickCode)) {
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
        status: normalizeProjectStatus(resolvedStatus),
        assignedHospitalId: assignedHosp?.id || a.hospital_id,
        assignedHospitalName: assignedHosp?.name || a.hospitalName || assignedDoc?.hospitalName,
        assignedDoctorId: assignedDoc?.id || a.assignedDoctorId,
        assignedDoctorName: assignedDoc?.name || a.assignedDoctorName,
        appointmentDate: a.date,
        appointmentTime: a.time,
        scheduledBy: a.username || 'Sales Executive',
        quickCode: matchingPatient?.doctorAssessment?.quickCode,
        notes: a.notes || matchingPatient?.doctorAssessment?.notes || '',
        notesList: notesArr,
        followupDate: a.followup_date || (matchingPatient as any)?.followup_date,
        followupNotes: a.followup_notes,
        followupHistory: a.followup_history || [],
        assignmentType: a.assignment_type
      });
    });

    // 2. Also include any registered patient records that do not have an appointment yet
    (patients || []).forEach(p => {
      const hasAppt = appointments.some(a => 
        (a.patient_id && a.patient_id === p.id) || 
        (a.mobile && p.mobile === p.mobile)
      );
      if (hasAppt) return;

      const assignedDoc = doctors.find(d => d.id === p.doctorAssessment?.assignedDoctorId);
      const assignedHosp = hospitals.find(h => h.id === p.hospital_id || (assignedDoc && assignedDoc.hospital_id === h.id));

      let pStatus = p.status || 'Pending Scheduling';
      if (p.packageProposal?.outcome) {
        switch (p.packageProposal.outcome) {
          case 'Scheduled': pStatus = 'Surgery Scheduled'; break;
          case 'Follow-Up': pStatus = 'Follow-Up Surgery'; break;
          case 'Lost': pStatus = 'Surgery Lost'; break;
          case 'Completed': pStatus = 'Surgery Completed'; break;
        }
      } else if (p.doctorAssessment) {
        if (p.doctorAssessment.quickCode === SurgeonCode.S1) pStatus = 'Package Proposal';
        else if (p.doctorAssessment.quickCode === SurgeonCode.M1) pStatus = 'Medication Done';
        else if (p.status === 'Doctor Done' && (p.doctorAssessment.assessedAt || p.doctorAssessment.doctorSignature || p.doctorAssessment.quickCode)) {
          pStatus = 'Doctor Done';
        }
      } else if (p.status && p.status !== 'Scheduled' && p.status !== 'Doctor Done') {
        pStatus = p.status;
      }

      list.push({
        id: `p_${p.id}`,
        appointmentId: '',
        patientId: p.id,
        name: p.name,
        mobile: p.mobile,
        age: p.age,
        gender: p.gender,
        city: (p as any).city || (p as any).address || '',
        condition: p.condition || Condition.Other,
        source: p.source || 'Other',
        referralPerson: p.sourceDoctorName || null,
        status: normalizeProjectStatus(pStatus),
        assignedHospitalId: assignedHosp?.id || p.hospital_id,
        assignedHospitalName: assignedHosp?.name || assignedDoc?.hospitalName,
        assignedDoctorId: assignedDoc?.id || p.doctorAssessment?.assignedDoctorId,
        assignedDoctorName: assignedDoc?.name || p.doctorAssessment?.assignedDoctorName,
        appointmentDate: (p as any).entry_date || p.registeredAt?.split('T')[0],
        appointmentTime: (p as any).arrivalTime || '10:00',
        scheduledBy: 'Hospital Front Office',
        quickCode: p.doctorAssessment?.quickCode,
        notes: p.doctorAssessment?.notes || '',
        notesList: [],
        followupDate: (p as any).followup_date,
        followupNotes: '',
        followupHistory: []
      });
    });

    // Sort by appointment date descending (newest bookings first)
    return list.sort((x, y) => {
      const dateX = x.appointmentDate || '1970-01-01';
      const dateY = y.appointmentDate || '1970-01-01';
      return dateY.localeCompare(dateX);
    });
  }, [appointments, patients, doctors, hospitals]);

  // Comprehensive list of all statuses present across project and live records
  // "Every status appears only once in the dropdown. Follow-up must appear only once. Scheduled must appear only once."
  const allDropdownStatuses = useMemo(() => {
    const set = new Set<string>();
    
    // Add all canonical project statuses
    ALL_PROJECT_STATUSES.forEach(st => set.add(st));

    // Normalize any record statuses so variations merge strictly into their single entry
    patientBookings.forEach(b => {
      if (b.status && b.status.trim()) {
        const norm = normalizeProjectStatus(b.status);
        if (norm) {
          set.add(norm);
        }
      }
    });

    return Array.from(set);
  }, [patientBookings]);

  // Helper to count occurrences of a status for user convenience
  const getStatusCount = (st: string) => {
    const targetNorm = normalizeProjectStatus(st);
    return patientBookings.filter(b => normalizeProjectStatus(b.status) === targetNorm).length;
  };

  // Filtered Patient Bookings
  const filteredBookings = useMemo(() => {
    return patientBookings.filter(booking => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        booking.name.toLowerCase().includes(q) ||
        booking.mobile.includes(q) ||
        (booking.assignedDoctorName && booking.assignedDoctorName.toLowerCase().includes(q)) ||
        (booking.assignedHospitalName && booking.assignedHospitalName.toLowerCase().includes(q)) ||
        (booking.city && booking.city.toLowerCase().includes(q)) ||
        (booking.source && booking.source.toLowerCase().includes(q));

      // Match Current Status filter
      let matchesStatus = true;
      if (statusFilter && statusFilter !== 'ALL') {
        const targetNorm = normalizeProjectStatus(statusFilter);
        const currentNorm = normalizeProjectStatus(booking.status);
        matchesStatus = (currentNorm === targetNorm);
      }

      const matchesHospital = selectedHospitalFilter === 'ALL' || booking.assignedHospitalId === selectedHospitalFilter;
      const matchesDoctor = selectedDoctorFilter === 'ALL' || booking.assignedDoctorId === selectedDoctorFilter;
      const bookingDate = (booking.appointmentDate || '').split('T')[0].trim();
      const matchesDate = !dateFilter || bookingDate === dateFilter;

      return matchesSearch && matchesStatus && matchesHospital && matchesDoctor && matchesDate;
    });
  }, [patientBookings, searchTerm, statusFilter, selectedHospitalFilter, selectedDoctorFilter, dateFilter]);

  // Metric counts
  const totalBookingsCount = patientBookings.length;
  const scheduledCount = patientBookings.filter(b => normalizeProjectStatus(b.status) === 'Scheduled').length;
  const inConsultationCount = patientBookings.filter(b => {
    const s = normalizeProjectStatus(b.status);
    return s === 'Arrived' || s === 'In Consultation';
  }).length;
  const followUpCount = patientBookings.filter(b => normalizeProjectStatus(b.status) === 'Follow-up' || Boolean(b.followupDate)).length;

  const hasSchedulingAccess = schedulingPermissions.sales;

  // Status Update Permission: Sales users can update a booking status only to: Follow-up or Scheduled
  const handleQuickUpdateStatus = async (booking: BookingRecord, newStatus: string) => {
    if (updatingStatusBookingId) return;
    if (newStatus !== 'Scheduled' && newStatus !== 'Follow-up') {
      alert("Permission notice: Sales users can only update status to 'Follow-up' or 'Scheduled'.");
      return;
    }
    if (!booking.appointmentId) {
      alert("This record cannot be updated directly as it does not have an active appointment ID.");
      return;
    }

    const appt = appointments.find(a => a.id === booking.appointmentId);
    if (!appt) return;

    setUpdatingStatusBookingId(booking.id);
    try {
      await updateAppointment({
        ...appt,
        status: newStatus,
        bookingType: newStatus === 'Follow-up' ? 'Follow Up' : 'Scheduled'
      });

      setStatusUpdateSuccessMessage(`Status updated to "${newStatus}" for ${booking.name}`);
      setTimeout(() => setStatusUpdateSuccessMessage(null), 3000);
    } catch (err) {
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatusBookingId(null);
    }
  };

  // Initiate booking or scheduling for a new patient or edit existing booking
  const handleOpenScheduleModal = (booking: BookingRecord | null = null) => {
    if (booking) {
      setBookingToEdit(booking);
      if (booking.assignedHospitalId) {
        setSelectedRoute('HOSPITAL');
        setSelectedHospitalId(booking.assignedHospitalId);
        setSelectedDoctorId(booking.assignedDoctorId || '');
      } else if (booking.assignedDoctorId) {
        setSelectedRoute('DOCTOR');
        setSelectedDoctorId(booking.assignedDoctorId);
        setSelectedHospitalId('');
      } else {
        setSelectedRoute(null);
        setSelectedHospitalId('');
        setSelectedDoctorId('');
      }

      setBookingFormData({
        name: booking.name || '',
        mobile: booking.mobile || '',
        condition: (booking.condition as Condition) || Condition.Other,
        date: booking.appointmentDate || new Date().toISOString().split('T')[0],
        time: booking.appointmentTime || '10:00',
        source: 'Acquire OPD',
        referralPerson: '',
        sourceDoctorName: '',
        sourceOtherDetails: ''
      });
      // When editing existing booking, go straight to form
      setScheduleStep('BOOKING_FORM');
    } else {
      setBookingToEdit(null);
      setSelectedRoute(null);
      setSelectedHospitalId('');
      setSelectedDoctorId('');
      setBookingFormData({
        name: '',
        mobile: '',
        condition: Condition.Other,
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        source: 'Acquire OPD',
        referralPerson: '',
        sourceDoctorName: '',
        sourceOtherDetails: ''
      });
      setScheduleStep('ROUTE_SELECTION');
    }

    setShowScheduleModal(true);
  };

  const handleContinueToBooking = () => {
    if (selectedRoute === 'HOSPITAL') {
      if (!selectedHospitalId) {
        alert('Please select a hospital facility.');
        return;
      }
    } else if (selectedRoute === 'DOCTOR') {
      if (!selectedDoctorId) {
        alert('Please select an attending doctor.');
        return;
      }
    } else {
      alert('Please choose either Hospital or Doctor option to proceed.');
      return;
    }
    setScheduleStep('BOOKING_FORM');
  };

  // Submit appointment booking / scheduling
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingBooking) return;
    if (!hasSchedulingAccess) {
      alert('Scheduling access is currently disabled by Master Admin.');
      return;
    }

    if (!bookingFormData.name || !bookingFormData.mobile || !bookingFormData.date || !bookingFormData.time || !bookingFormData.condition) {
      alert('Please fill in patient name, mobile, condition, appointment date and time.');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const activeUsername = localStorage.getItem('hms_hospital_name') || 
        localStorage.getItem('username') || 
        'Sales Executive';

      let finalHospitalId: string | undefined = undefined;
      let finalHospitalName: string | undefined = undefined;
      let finalDoctorId: string | undefined = undefined;
      let finalDoctorName: string | undefined = undefined;
      let assignmentType: 'hospital' | 'doctor' = 'hospital';

      if (selectedRoute === 'HOSPITAL') {
        const hosp = hospitals.find(h => h.id === selectedHospitalId);
        finalHospitalId = hosp?.hospital_id || hosp?.id || selectedHospitalId;
        finalHospitalName = hosp?.hospitalName || hosp?.name || 'Hospital Facility';

        if (selectedDoctorId) {
          const doc = doctors.find(d => d.id === selectedDoctorId);
          finalDoctorId = doc?.id;
          finalDoctorName = doc?.name;
          assignmentType = 'doctor';
        } else {
          assignmentType = 'hospital';
        }
      } else if (selectedRoute === 'DOCTOR') {
        const doc = doctors.find(d => d.id === selectedDoctorId);
        finalDoctorId = doc?.id;
        finalDoctorName = doc?.name;
        assignmentType = 'doctor';
        finalHospitalId = doc?.hospital_id || 'independent';
        finalHospitalName = doc?.hospitalName || 'Consulting Clinic';
      }

      // Source Rule: When Sales schedules/books an appointment, the system must automatically set source as Acquire OPD
      const sourceVal = 'Acquire OPD';

      // Status is Scheduled by default for new bookings, or preserves Follow-up if editing a follow-up booking
      const assignedStatus = (bookingToEdit?.status === 'Follow-up' || bookingToEdit?.status === 'Follow Up') ? 'Follow-up' : 'Scheduled';

      const payload: any = {
        name: bookingFormData.name.trim(),
        mobile: bookingFormData.mobile.trim(),
        source: sourceVal,
        sourceDoctorName: undefined,
        referral_person: null,
        condition: bookingFormData.condition as Condition,
        date: bookingFormData.date,
        time: bookingFormData.time,
        assignedDoctorId: finalDoctorId,
        assignedDoctorName: finalDoctorName,
        doctor_id: finalDoctorId || null,
        hospital_id: finalHospitalId,
        hospitalName: finalHospitalName,
        assignment_type: assignmentType,
        bookingType: assignedStatus === 'Follow-up' ? 'Follow Up' : 'Scheduled',
        status: assignedStatus,
        visit_type: 'OPD',
        username: activeUsername,
        patient_id: bookingToEdit?.patientId || null
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
      } else {
        await addAppointment(payload);
      }

      setShowScheduleModal(false);
      setScheduleStep('ROUTE_SELECTION');
      setBookingToEdit(null);
      setSelectedRoute(null);
      setSelectedHospitalId('');
      setSelectedDoctorId('');
    } catch (err) {
      alert('Failed to save booking. Please try again.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Follow-up handler: Database-driven persistence for Follow-up remarks & history
  const handleOpenFollowup = async (booking: BookingRecord) => {
    setFollowupBooking(booking);
    setFollowupDateInput(booking.followupDate || new Date().toISOString().split('T')[0]);
    const initialStatus = normalizeProjectStatus(booking.status) === 'Scheduled' ? 'Scheduled' : 'Follow-up';
    setFollowupStatusInput(initialStatus);
    setFollowupNotesInput('');
    setFollowupError(null);
    setIsLoadingFollowupHistory(true);

    const linkedAppt = appointments.find(a => (booking.appointmentId && a.id === booking.appointmentId) || (booking.mobile && a.mobile === booking.mobile));
    const linkedPat = patients.find(p => (booking.patientId && p.id === booking.patientId) || (booking.mobile && p.mobile === booking.mobile));

    const leadIds = Array.from(new Set([
      booking.appointmentId, 
      booking.patientId, 
      booking.id,
      linkedAppt?.id,
      linkedPat?.id,
      booking.patientId ? booking.patientId.split('_V')[0] : null,
      linkedPat ? linkedPat.id.split('_V')[0] : null
    ].filter(Boolean))) as string[];

    // 1. Fetch notes from Supabase database table lead_notes
    let dbNotesList: any[] = [];
    try {
      const { data, error } = await supabase
        .from('lead_notes')
        .select('*')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbNotesList = data;
      }
    } catch (e) {
      console.warn("Could not query lead_notes from database:", e);
    }

    // 2. Merge database lead_notes with appointment record's followupHistory & notes
    const mergedMap = new Map<string, {
      id: string;
      leadId: string;
      note: string;
      author: string;
      date: string;
      time: string;
      createdAt: string;
      status?: string;
    }>();

    dbNotesList.forEach(item => {
      mergedMap.set(item.id, {
        id: item.id,
        leadId: item.lead_id,
        note: item.note,
        author: item.created_by_name || 'Sales User',
        date: item.created_date || (item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : ''),
        time: item.created_time || (item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
        createdAt: item.created_at || new Date().toISOString(),
        status: ''
      });
    });

    // Check booking followupHistory
    (booking.followupHistory || []).forEach(item => {
      if (item.notes && item.notes.trim()) {
        const existing = mergedMap.get(item.id);
        if (!existing) {
          mergedMap.set(item.id, {
            id: item.id,
            leadId: booking.appointmentId || booking.id,
            note: item.notes,
            author: item.author || 'Sales User',
            date: item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : ''),
            time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            createdAt: item.createdAt || new Date().toISOString(),
            status: item.status
          });
        }
      }
    });

    // Check appointment in context for followup_history and followup_notes
    if (booking.appointmentId) {
      const appt = appointments.find(a => a.id === booking.appointmentId);
      if (appt) {
        (appt.followup_history || (appt as any).doctor_assessment?.followup_history || []).forEach((item: any) => {
          if (item.notes && item.notes.trim()) {
            const key = item.id || `appt_note_${item.notes.substring(0, 15)}_${item.createdAt}`;
            if (!mergedMap.has(key)) {
              mergedMap.set(key, {
                id: key,
                leadId: appt.id,
                note: item.notes,
                author: item.author || appt.username || 'Sales User',
                date: item.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : ''),
                time: item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
                createdAt: item.createdAt || appt.createdAt || new Date().toISOString(),
                status: item.status
              });
            }
          }
        });

        if (appt.followup_notes && appt.followup_notes.trim()) {
          const key = `appt_followup_note_${appt.id}`;
          if (!mergedMap.has(key) && !Array.from(mergedMap.values()).some(v => v.note === appt.followup_notes)) {
            mergedMap.set(key, {
              id: key,
              leadId: appt.id,
              note: appt.followup_notes,
              author: appt.username || 'Sales User',
              date: appt.followup_date || (appt.createdAt ? new Date(appt.createdAt).toLocaleDateString('en-GB') : ''),
              time: appt.createdAt ? new Date(appt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
              createdAt: appt.createdAt || new Date().toISOString(),
              status: appt.status
            });
          }
        }
      }
    }

    // Chronological order with latest note clearly at the top
    const sortedList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setFollowupHistoryList(sortedList);
    setIsLoadingFollowupHistory(false);
  };

  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupBooking || isSavingFollowup) return;

    // Sales users can update booking status only to: Follow-up or Scheduled
    const allowedStatus: 'Follow-up' | 'Scheduled' = (followupStatusInput === 'Scheduled') ? 'Scheduled' : 'Follow-up';

    setIsSavingFollowup(true);
    setFollowupError(null);

    try {
      const activeUsername = localStorage.getItem('hms_hospital_name') || 
        localStorage.getItem('username') || 
        'Sales Executive';
      const activeUserId = localStorage.getItem('hms_hospital_id') || 'sales_user';
      const leadId = followupBooking.appointmentId || followupBooking.patientId || followupBooking.id;

      const nowIso = new Date().toISOString();
      const nowDate = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const newNoteText = followupNotesInput.trim();

      let updatedHistory = followupBooking.followupHistory || [];

      // If remarks/notes entered, save permanently to database
      if (newNoteText) {
        const noteId = `fn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // 1. Permanent database insertion into lead_notes table
        try {
          const { error: dbError } = await supabase.from('lead_notes').insert({
            id: noteId,
            lead_id: leadId,
            note: newNoteText,
            created_at: nowIso,
            created_date: nowDate,
            created_time: nowTime,
            created_by: activeUserId,
            created_by_name: activeUsername
          });
          if (dbError) {
            console.warn("Could not insert into lead_notes table:", dbError);
          }
        } catch (dbErr) {
          console.warn("lead_notes insert exception:", dbErr);
        }

        const newHistoryItem = {
          id: noteId,
          date: followupDateInput || nowDate,
          status: allowedStatus,
          notes: newNoteText,
          createdAt: nowIso,
          author: activeUsername
        };
        updatedHistory = [newHistoryItem, ...updatedHistory];

        // Prepend to current modal history list so latest note appears clearly at the top
        setFollowupHistoryList(prev => [{
          id: noteId,
          leadId: leadId,
          note: newNoteText,
          author: activeUsername,
          date: nowDate,
          time: nowTime,
          createdAt: nowIso,
          status: allowedStatus
        }, ...prev]);
      }

      // 2. Permanent database update to appointment record
      if (followupBooking.appointmentId) {
        const appt = appointments.find(a => a.id === followupBooking.appointmentId);
        if (appt) {
          await updateAppointment({
            ...appt,
            status: allowedStatus,
            bookingType: allowedStatus === 'Follow-up' ? 'Follow Up' : 'Scheduled',
            followup_date: followupDateInput,
            followup_notes: newNoteText || appt.followup_notes,
            followup_history: updatedHistory
          });
        }
      }

      if (followupBooking.patientId) {
        const pat = patients.find(p => p.id === followupBooking.patientId);
        if (pat) {
          await updatePatient(pat.id, {
            ...pat,
            followup_date: followupDateInput
          } as any);
        }
      }

      setFollowupNotesInput('');
      setStatusUpdateSuccessMessage(`Follow-up saved permanently to database (Status: "${allowedStatus}")`);
      setTimeout(() => setStatusUpdateSuccessMessage(null), 3500);
      setFollowupBooking(null);
    } catch (err: any) {
      setFollowupError(err.message || 'Failed to save follow-up to database.');
    } finally {
      setIsSavingFollowup(false);
    }
  };

  // Notes handler
  const handleOpenNotes = (booking: BookingRecord) => {
    setNotesBooking(booking);
    setNewNoteInput('');
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesBooking || !newNoteInput.trim() || isSavingNote) return;

    setIsSavingNote(true);
    try {
      const activeUsername = localStorage.getItem('hms_hospital_name') || 
        localStorage.getItem('username') || 
        'Sales Executive';

      const newNoteObj = {
        id: `note_${Date.now()}`,
        text: newNoteInput.trim(),
        date: new Date().toISOString(),
        author: activeUsername
      };

      const existingList = notesBooking.notesList || [];
      const updatedList = [newNoteObj, ...existingList];
      const combinedNotesStr = `${newNoteObj.text} (${newNoteObj.author} - ${new Date().toLocaleDateString()})\n${notesBooking.notes || ''}`.trim();

      if (notesBooking.appointmentId) {
        const appt = appointments.find(a => a.id === notesBooking.appointmentId);
        if (appt) {
          await updateAppointment({
            ...appt,
            notes: combinedNotesStr,
            notes_list: updatedList
          });
        }
      }

      if (notesBooking.patientId) {
        const pat = patients.find(p => p.id === notesBooking.patientId);
        if (pat) {
          await updatePatient(pat.id, {
            ...pat,
            doctorAssessment: {
              ...pat.doctorAssessment,
              notes: combinedNotesStr
            }
          } as any);
        }
      }

      setNewNoteInput('');
      setNotesBooking({
        ...notesBooking,
        notes: combinedNotesStr,
        notesList: updatedList
      });
    } catch (err) {
      alert("Failed to save note. Please try again.");
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      {statusUpdateSuccessMessage && (
        <div className="fixed top-5 right-5 z-[200] bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-3 duration-200">
          <Check className="w-4 h-4" />
          <span>{statusUpdateSuccessMessage}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-rose-900/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" /> Sales Patient Bookings & Scheduling
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">Patient Bookings & Schedules</h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Manage patient bookings, consultation schedules, follow-ups, and notes for hospital facilities and consulting doctors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasSchedulingAccess ? (
              <button
                id="schedule-patient-btn"
                onClick={() => handleOpenScheduleModal(null)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-900/40 active:scale-95"
              >
                <Calendar className="w-4 h-4" /> Schedule Patient
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-sm">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Scheduling Governed by Master
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`p-5 rounded-2xl border text-left transition-all space-y-1.5 ${
            statusFilter === 'ALL' ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Bookings</span>
            <Calendar className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{totalBookingsCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">All registered & scheduled patient bookings</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Scheduled')}
          className={`p-5 rounded-2xl border text-left transition-all space-y-1.5 ${
            statusFilter === 'Scheduled' ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Scheduled</span>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-600">{scheduledCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Upcoming doctor & hospital consultations</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Arrived')}
          className={`p-5 rounded-2xl border text-left transition-all space-y-1.5 ${
            statusFilter === 'Arrived' ? 'bg-cyan-50/50 border-cyan-300 ring-2 ring-cyan-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">In-Consultation / Arrived</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{inConsultationCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Patients at facility or undergoing assessment</p>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('Follow-up')}
          className={`p-5 rounded-2xl border text-left transition-all space-y-1.5 ${
            statusFilter === 'Follow-up' ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-500/20 shadow-md' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Follow-up</span>
            <CalendarCheck className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">{followUpCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Active follow-ups scheduled or pending call</p>
        </button>
      </div>

      {/* Main Container: Patient Bookings & Scheduling */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Navigation / Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 px-6 py-4 gap-4 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-600" /> Patient Bookings & Schedule Management
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter by Current Status, edit booking details, schedule follow-ups, and add internal notes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold hidden md:inline">
              Available Doctors: <strong className="text-slate-700">{doctors.length}</strong> | Hospitals: <strong className="text-slate-700">{hospitals.length}</strong>
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Filter Controls Row: Current Status Dropdown Filter */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            
            {/* CURRENT STATUS DROPDOWN FILTER (Contains ALL project/system statuses) */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label 
                  htmlFor="current-status-dropdown-filter" 
                  className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5 shrink-0"
                >
                  <Filter className="w-4 h-4 text-rose-600" /> Current Status:
                </label>
                <select
                  id="current-status-dropdown-filter"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-xs min-w-[240px] cursor-pointer"
                >
                  <option value="ALL">All Current Statuses ({totalBookingsCount})</option>
                  {allDropdownStatuses.map(statusName => {
                    const count = getStatusCount(statusName);
                    return (
                      <option key={statusName} value={statusName}>
                        {statusName} {count > 0 ? `(${count})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {statusFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors border border-rose-200"
                  title="Reset status filter to All"
                >
                  <X className="w-3.5 h-3.5" /> Clear Filter
                </button>
              )}
            </div>

            {/* Search and Facility Dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search patient, phone, doctor..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
                />
              </div>

              <select
                value={selectedHospitalFilter}
                onChange={e => setSelectedHospitalFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
              >
                <option value="ALL">All Hospitals</option>
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>{h.hospitalName || h.name}</option>
                ))}
              </select>

              <select
                value={selectedDoctorFilter}
                onChange={e => setSelectedDoctorFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
              >
                <option value="ALL">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 shadow-xs"
                    title="Filter by appointment date"
                  />
                  {dateFilter && (
                     <button 
                       type="button"
                       onClick={() => setDateFilter('')}
                       className="absolute right-2 top-2.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                       title="Clear date filter to show all dates"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                  )}
                </div>
                {dateFilter !== getTodayLocalDate() && (
                  <button
                    type="button"
                    onClick={() => setDateFilter(getTodayLocalDate())}
                    className="px-2.5 py-2.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                    title="Reset date filter to current date"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Master Admin Scheduling Alert */}
          {!hasSchedulingAccess && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-xs font-bold">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Master Admin Governance:</strong> Scheduling authority has been paused for Sales. You can view bookings, update follow-up statuses, and add notes, but creating new schedules is locked.
              </span>
            </div>
          )}

          {/* Patient Bookings Table */}
          <div className="overflow-x-auto table-container w-full border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs min-w-[1100px]">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Patient Details</th>
                  <th className="py-3.5 px-4">Booking Slot & Date</th>
                  <th className="py-3.5 px-4">Assigned Destination</th>
                  <th className="py-3.5 px-4">Condition & Source</th>
                  <th className="py-3.5 px-4">Current Status & Action</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <div className="font-bold text-slate-600">No patient bookings found matching status "{statusFilter}"</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {statusFilter !== 'ALL' ? 'Select "All Current Statuses" from the dropdown or adjust your search.' : 'Adjust your filters or click "Schedule Patient"'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map(booking => {
                    const isFollowUpDue = Boolean(booking.followupDate);
                    const statusStyle = getStatusBadgeStyle(booking.status);
                    return (
                      <tr key={booking.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Patient Details */}
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                              {booking.name}
                              {booking.quickCode === SurgeonCode.S1 && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-black border border-rose-200">
                                  S1 Surgery
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" /> {booking.mobile}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              {booking.age ? <span>{booking.age} Yrs</span> : null}
                              {booking.gender ? <span>• {booking.gender}</span> : null}
                              {booking.city ? <span>• {booking.city}</span> : null}
                            </div>
                          </div>
                        </td>

                        {/* Booking Slot & Date */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-500" />
                              {booking.appointmentDate || 'Not scheduled'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Slot: <strong className="text-slate-700">{booking.appointmentTime || '10:00'}</strong>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              By: <span className="font-mono font-semibold text-slate-600">{booking.scheduledBy || 'Sales'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Destination */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {booking.assignedHospitalName ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate max-w-[170px]">{booking.assignedHospitalName}</span>
                              </div>
                            ) : null}

                            {booking.assignedDoctorName ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[170px]">{booking.assignedDoctorName}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 italic">
                                Hospital Front Office Direct
                              </div>
                            )}

                            {booking.assignmentType === 'doctor' && (
                              <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                                Doctor Flow
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Condition & Source */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 font-bold rounded-md text-[11px]">
                              {booking.condition}
                            </span>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{booking.source}</span>
                              {booking.referralPerson && (
                                <span className="text-rose-600 font-bold">({booking.referralPerson})</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Current Status & Sales Update Permission (Allowed: Follow-up or Scheduled only) */}
                        <td className="py-4 px-4">
                          <div className="space-y-1.5">
                            {/* Current Status Badge */}
                            <div>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border shadow-2xs ${statusStyle.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyle.dot}`} />
                                {booking.status}
                              </span>
                            </div>

                            {/* Status Update Dropdown: Sales users can update booking status only to: Follow-up or Scheduled */}
                            {booking.appointmentId && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Set:</span>
                                <select
                                  aria-label="Update Booking Status"
                                  value={
                                    normalizeProjectStatus(booking.status) === 'Follow-up' 
                                      ? 'Follow-up' 
                                      : (normalizeProjectStatus(booking.status) === 'Scheduled' ? 'Scheduled' : '')
                                  }
                                  onChange={e => handleQuickUpdateStatus(booking, e.target.value)}
                                  className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-0.5 outline-none hover:border-slate-300 focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-2xs"
                                >
                                  <option value="" disabled>Update Status...</option>
                                  <option value="Follow-up">Follow-up</option>
                                  <option value="Scheduled">Scheduled</option>
                                </select>
                              </div>
                            )}

                            {/* Follow-up Date indicator */}
                            {isFollowUpDue && (
                              <div className="text-[10px] text-amber-700 font-bold flex items-center gap-1 pt-0.5">
                                <CalendarCheck className="w-3 h-3 text-amber-600" />
                                <span>Next: {booking.followupDate}</span>
                              </div>
                            )}

                            {/* Notes count indicator */}
                            {Boolean(booking.notesList?.length || booking.notes) && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <MessageSquare className="w-2.5 h-2.5 text-slate-400" />
                                <span>{booking.notesList?.length || 1} note{(booking.notesList?.length || 1) > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions: Edit, Follow-up, Notes */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* View Detail */}
                            <button
                              onClick={() => setSelectedBookingForDetail(booking)}
                              className="px-2 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1"
                              title="View Booking Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit Booking */}
                            {hasSchedulingAccess && (
                              <button
                                onClick={() => handleOpenScheduleModal(booking)}
                                className="px-2.5 py-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1"
                                title="Edit Booking Details"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                            )}

                            {/* Add Follow-up */}
                            <button
                              onClick={() => handleOpenFollowup(booking)}
                              className="px-2.5 py-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1"
                              title="Add or Update Follow-up"
                            >
                              <CalendarCheck className="w-3 h-3" /> Follow-up
                            </button>

                            {/* Add / View Notes */}
                            <button
                              onClick={() => handleOpenNotes(booking)}
                              className="px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1"
                              title="Add Notes"
                            >
                              <MessageSquare className="w-3 h-3" /> Notes
                            </button>
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
      </div>

      {/* SCHEDULE PATIENT MODAL: 2 OPTIONS (HOSPITAL / DOCTOR) + EXISTING BOOKING POPUP */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94dvh] sm:max-h-[90vh]">
            
            {/* Modal Body */}
            <div className="flex-1 p-5 sm:p-7 md:p-8 bg-white overflow-y-auto relative">
              {/* Close Button */}
              <button 
                type="button" 
                onClick={() => { setShowScheduleModal(false); setBookingToEdit(null); }} 
                className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors z-10 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* STEP 1: ROUTE SELECTION (2 OPTIONS: HOSPITAL vs DOCTOR) */}
              {scheduleStep === 'ROUTE_SELECTION' ? (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Step 1 of 2</span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Schedule Patient</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select whether you want to schedule with a Hospital facility or directly with a Doctor.
                    </p>
                  </div>

                  {/* Exactly 2 options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: Hospital */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoute('HOSPITAL');
                        setSelectedDoctorId('');
                        if (!selectedHospitalId && hospitals.length > 0) {
                          setSelectedHospitalId(hospitals[0].id);
                        }
                      }}
                      className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                        selectedRoute === 'HOSPITAL'
                          ? 'border-indigo-600 bg-indigo-50/40 shadow-md ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div className={`p-3 rounded-xl ${
                          selectedRoute === 'HOSPITAL' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedRoute === 'HOSPITAL' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                        }`}>
                          {selectedRoute === 'HOSPITAL' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base">Hospital</div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Schedule with a hospital facility and optionally select an affiliated doctor.
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Doctor */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoute('DOCTOR');
                        setSelectedHospitalId('');
                        if (!selectedDoctorId && doctors.length > 0) {
                          setSelectedDoctorId(doctors[0].id);
                        }
                      }}
                      className={`p-5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between group ${
                        selectedRoute === 'DOCTOR'
                          ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-3">
                        <div className={`p-3 rounded-xl ${
                          selectedRoute === 'DOCTOR' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <Stethoscope className="w-6 h-6" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedRoute === 'DOCTOR' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                        }`}>
                          {selectedRoute === 'DOCTOR' && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-base">Doctor</div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Schedule directly with an attending doctor without requiring a hospital.
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Sub-Selection based on chosen option */}
                  {selectedRoute === 'HOSPITAL' && (
                    <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-4 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-indigo-900 mb-1.5 tracking-wider">
                          1. Select Hospital Facility *
                        </label>
                        <select
                          required
                          value={selectedHospitalId}
                          onChange={e => {
                            setSelectedHospitalId(e.target.value);
                            setSelectedDoctorId('');
                          }}
                          className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                        >
                          <option value="">Select Hospital Facility...</option>
                          {hospitals.map(h => (
                            <option key={h.id} value={h.id}>
                              {h.hospitalName || h.name} {h.city ? `(${h.city})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedHospitalId && (
                        <div className="animate-in fade-in duration-200">
                          <label className="block text-[10px] font-black uppercase text-indigo-900 mb-1.5 tracking-wider flex items-center justify-between">
                            <span>2. Select Associated Doctor (Optional)</span>
                            <span className="text-[9px] text-indigo-600 normal-case font-medium">Leave blank for Hospital Front Office only</span>
                          </label>
                          <select
                            value={selectedDoctorId}
                            onChange={e => setSelectedDoctorId(e.target.value)}
                            className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                          >
                            <option value="">-- No Doctor (Hospital Front Office Only) --</option>
                            {doctorsForSelectedHospital.map(d => (
                              <option key={d.id} value={d.id}>
                                {d.name} {d.specialization ? `• ${d.specialization}` : ''}
                              </option>
                            ))}
                          </select>
                          {doctorsForSelectedHospital.length === 0 && (
                            <p className="text-[10px] text-slate-400 mt-1 italic">
                              No doctors currently associated with this facility. Booking will route to Hospital Front Office.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedRoute === 'DOCTOR' && (
                    <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4 animate-in fade-in duration-200">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-emerald-900 mb-1.5 tracking-wider">
                          Select Attending Doctor *
                        </label>
                        <select
                          required
                          value={selectedDoctorId}
                          onChange={e => setSelectedDoctorId(e.target.value)}
                          className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                        >
                          <option value="">Select Doctor...</option>
                          {doctors.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.specialization ? `• ${d.specialization}` : ''} {d.hospitalName ? `(${d.hospitalName})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-emerald-700 mt-1.5 font-medium">
                          Direct doctor consultation flow. Hospital selection is NOT required.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Continue Button */}
                  <div className="pt-4 border-t flex justify-end gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => { setShowScheduleModal(false); setBookingToEdit(null); }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!selectedRoute || (selectedRoute === 'HOSPITAL' && !selectedHospitalId) || (selectedRoute === 'DOCTOR' && !selectedDoctorId)}
                      onClick={handleContinueToBooking}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                      Continue to Booking Form <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: EXISTING BOOKING POPUP */
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">
                        {bookingToEdit?.appointmentId ? 'Edit Patient Booking' : 'Step 2 of 2: Booking Details'}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                        {bookingToEdit?.appointmentId ? 'Update Booking' : 'Book Appointment'}
                      </h3>
                    </div>

                    {/* Routing Summary Badge */}
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        {selectedRoute === 'HOSPITAL' ? (
                          <>
                            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="truncate max-w-[160px]">
                              {hospitals.find(h => h.id === selectedHospitalId)?.hospitalName || hospitals.find(h => h.id === selectedHospitalId)?.name}
                            </span>
                            {selectedDoctorId && (
                              <span className="text-emerald-700">
                                • {doctors.find(d => d.id === selectedDoctorId)?.name}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-800 font-bold">
                              {doctors.find(d => d.id === selectedDoctorId)?.name}
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setScheduleStep('ROUTE_SELECTION')}
                        className="text-xs text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleBookingSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                          Full Name *
                        </label>
                        <input 
                          required 
                          className="w-full text-xl sm:text-2xl font-black border-b-2 border-slate-100 p-2 outline-none focus:border-rose-500 placeholder-slate-200" 
                          value={bookingFormData.name} 
                          onChange={e => setBookingFormData({ ...bookingFormData, name: e.target.value })} 
                          placeholder="Patient Name" 
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                          Mobile Number *
                        </label>
                        <input 
                          required 
                          type="tel" 
                          className="w-full text-lg sm:text-xl font-mono border-b-2 border-slate-100 p-2 outline-none focus:border-rose-500" 
                          value={bookingFormData.mobile} 
                          onChange={e => setBookingFormData({ ...bookingFormData, mobile: e.target.value })} 
                          placeholder="9988776655" 
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                          Primary Complaint *
                        </label>
                        <select 
                          required 
                          className="w-full border-b-2 border-slate-100 p-2 outline-none focus:border-rose-500 text-sm font-bold bg-white" 
                          value={bookingFormData.condition} 
                          onChange={e => setBookingFormData({ ...bookingFormData, condition: e.target.value as Condition })}
                        >
                          <option value="">Select Condition</option>
                          {Object.values(Condition).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                          Appt Date *
                        </label>
                        <input 
                          required 
                          type="date" 
                          className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold" 
                          value={bookingFormData.date} 
                          onChange={e => setBookingFormData({ ...bookingFormData, date: e.target.value, time: '' })} 
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                          Preferred Doctor
                        </label>
                        {selectedRoute === 'DOCTOR' ? (
                          <div className="w-full border-b-2 border-slate-100 p-2 bg-slate-50 rounded-lg text-sm font-bold text-emerald-800 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <Stethoscope className="w-4 h-4 text-emerald-600" />
                              {doctors.find(d => d.id === selectedDoctorId)?.name}
                            </span>
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Selected Doctor
                            </span>
                          </div>
                        ) : (
                          <select 
                            className="w-full border-b-2 border-slate-100 p-2 bg-white text-sm font-bold" 
                            value={selectedDoctorId} 
                            onChange={e => {
                              setSelectedDoctorId(e.target.value);
                              setBookingFormData({ ...bookingFormData, time: '' });
                            }}
                          >
                            <option value="">-- No Doctor (Hospital Front Office Only) --</option>
                            {doctorsForSelectedHospital.map(d => {
                              const isAvailable = isDoctorAvailableOnDate(d, bookingFormData.date);
                              return (
                                <option key={d.id} value={d.id} disabled={!isAvailable}>
                                  {d.name} {!isAvailable ? '(Unavailable Today)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                          Appt Time *
                        </label>
                        {(() => {
                          const activeDoc = doctors.find(d => d.id === selectedDoctorId);
                          const slots = getAvailableSlotsForDoctorAndDate(activeDoc, bookingFormData.date);
                          const bookedSlots = appointments
                            ?.filter(a => a.assignedDoctorId === selectedDoctorId && a.date === bookingFormData.date && a.id !== bookingToEdit?.appointmentId)
                            ?.map(a => a.time ? a.time.substring(0, 5) : '') || [];
                          return (
                            <select
                              required
                              className="w-full border-b-2 border-slate-100 p-2 bg-white text-sm font-bold"
                              value={bookingFormData.time}
                              onChange={e => setBookingFormData({ ...bookingFormData, time: e.target.value })}
                            >
                              <option value="">Select Time Slot...</option>
                              {slots.map(s => {
                                const isBooked = bookedSlots.includes(s);
                                return (
                                  <option key={s} value={s} disabled={isBooked}>
                                    {s} {isBooked ? '(Booked)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest flex items-center justify-between">
                          <span>Lead Source</span>
                          <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Auto: Acquire OPD
                          </span>
                        </label>
                        <input 
                          type="text" 
                          readOnly 
                          disabled
                          value="Acquire OPD" 
                          className="w-full border-b-2 border-slate-200 p-2 text-sm font-bold bg-slate-100 text-slate-700 outline-none cursor-not-allowed select-none rounded-t" 
                          title="Appointments scheduled by Sales are automatically set to Acquire OPD"
                        />
                      </div>

                      {getSourceDisplay(bookingFormData.source) === 'Doctor Recommended' && (
                        <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="block text-[10px] font-black uppercase text-rose-600 mb-2 tracking-widest">
                            Referring Doctor Name *
                          </label>
                          <input 
                            required 
                            className="w-full text-lg font-bold border-b-2 border-rose-200 p-2 outline-none focus:border-rose-500 placeholder-slate-300" 
                            value={bookingFormData.sourceDoctorName} 
                            onChange={e => setBookingFormData({ ...bookingFormData, sourceDoctorName: e.target.value })} 
                            placeholder="Dr. Enter Referring Doctor Name" 
                          />
                        </div>
                      )}

                      {getSourceDisplay(bookingFormData.source) === 'Referral' && (
                        <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="block text-[10px] font-black uppercase text-rose-600 mb-2 tracking-widest">
                            Referral Person / Partner *
                          </label>
                          <input 
                            required 
                            className="w-full text-lg font-bold border-b-2 border-rose-200 p-2 outline-none focus:border-rose-500 placeholder-slate-300" 
                            value={bookingFormData.referralPerson} 
                            onChange={e => setBookingFormData({ ...bookingFormData, referralPerson: e.target.value })} 
                            placeholder="Enter contact or partner name" 
                          />
                        </div>
                      )}

                      {getSourceDisplay(bookingFormData.source) === 'Others' && (
                        <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="block text-[10px] font-black uppercase text-rose-600 mb-2 tracking-widest">
                            Source Details *
                          </label>
                          <input 
                            required 
                            className="w-full text-lg font-bold border-b-2 border-rose-200 p-2 outline-none focus:border-rose-500 placeholder-slate-300" 
                            value={bookingFormData.sourceOtherDetails} 
                            onChange={e => setBookingFormData({ ...bookingFormData, sourceOtherDetails: e.target.value })} 
                            placeholder="Enter specific source name or details..." 
                          />
                        </div>
                      )}
                    </div>

                    {/* Attribution info */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Scheduled by: <strong className="text-slate-800">{localStorage.getItem('hms_hospital_name') || 'Sales Executive'}</strong></span>
                      <span className="font-mono text-slate-400">HMS Booking System</span>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setScheduleStep('ROUTE_SELECTION')}
                        className="px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Route Selection
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmittingBooking}
                        className="py-3.5 px-8 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-rose-900/30 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmittingBooking ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{bookingToEdit?.appointmentId ? 'Updating Booking...' : 'Scheduling Patient...'}</span>
                          </>
                        ) : (
                          <span>{bookingToEdit?.appointmentId ? 'Update Booking' : 'Confirm & Schedule Patient'}</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP MODAL (Sales status update strictly limited to 'Follow-up' and 'Scheduled') */}
      {followupBooking && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 max-h-[92dvh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Patient Booking Follow-Up</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{followupBooking.name}</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{followupBooking.mobile}</div>
              </div>
              <button 
                onClick={() => setFollowupBooking(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFollowup} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-wider">
                  Next Follow-Up Date *
                </label>
                <input
                  required
                  type="date"
                  value={followupDateInput}
                  onChange={e => setFollowupDateInput(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-wider flex items-center justify-between">
                  <span>Booking Status *</span>
                  <span className="text-[10px] font-medium text-amber-700 normal-case">Sales Allowed: Follow-up or Scheduled</span>
                </label>
                <select
                  value={followupStatusInput}
                  onChange={e => setFollowupStatusInput(e.target.value as 'Follow-up' | 'Scheduled')}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Follow-up">Follow-up</option>
                  <option value="Scheduled">Scheduled</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Sales permissions strictly permit updating status to <strong>Follow-up</strong> or <strong>Scheduled</strong>.
                </p>
              </div>

              {followupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{followupError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-wider">
                  Follow-Up Remarks / Conversation Notes
                </label>
                <textarea
                  rows={3}
                  value={followupNotesInput}
                  onChange={e => setFollowupNotesInput(e.target.value)}
                  placeholder="Record summary of discussion, concerns, or next scheduled touchpoint..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Complete Follow-Up Remarks / Conversation Notes History */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Follow-Up Remarks / Conversation Notes History
                  </span>
                  {followupHistoryList.length > 0 && (
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {followupHistoryList.length} {followupHistoryList.length === 1 ? 'note' : 'notes'}
                    </span>
                  )}
                </div>

                {isLoadingFollowupHistory ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>Loading follow-up history from database...</span>
                  </div>
                ) : followupHistoryList.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs text-slate-400 italic">
                    No previous follow-up notes
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {followupHistoryList.map((item, idx) => (
                      <div 
                        key={item.id || idx} 
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          idx === 0 
                            ? 'bg-amber-50/50 border-amber-200 shadow-xs' 
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] mb-1.5">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-900 font-black text-[9px] uppercase tracking-wider">
                                Latest Note
                              </span>
                            )}
                            <span>Added by: <strong className="text-slate-900">{item.author || 'Sales User'}</strong></span>
                          </span>
                          <span className="font-mono text-slate-500 font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{item.date || '---'}</span>
                            {item.time && <span>• {item.time}</span>}
                          </span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap leading-relaxed text-xs">
                          {item.note}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  disabled={isSavingFollowup}
                  onClick={() => setFollowupBooking(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFollowup}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingFollowup ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Note...</span>
                    </>
                  ) : (
                    <span>Save Follow-Up</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTES MODAL */}
      {notesBooking && (
        <div className="fixed inset-0 z-[130] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 max-h-[92dvh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Booking Notes & Remarks</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{notesBooking.name}</h3>
                <div className="text-xs text-slate-500 font-mono mt-0.5">{notesBooking.mobile}</div>
              </div>
              <button 
                onClick={() => setNotesBooking(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-wider">
                  Add Internal Note
                </label>
                <textarea
                  required
                  rows={3}
                  value={newNoteInput}
                  onChange={e => setNewNoteInput(e.target.value)}
                  placeholder="Enter counseling observations, special requests, patient preferences, or financial details..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingNote || !newNoteInput.trim()}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSavingNote ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Note...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Save Note</span>
                    </>
                  )}
                </button>
              </div>

              {/* Notes Timeline */}
              <div className="space-y-2 pt-4 border-t">
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Notes History</div>
                {(!notesBooking.notesList || notesBooking.notesList.length === 0) && !notesBooking.notes ? (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    No notes recorded yet for this booking.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {(notesBooking.notesList || []).map(noteItem => (
                      <div key={noteItem.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span className="font-mono text-slate-700">{noteItem.author}</span>
                          <span>{new Date(noteItem.date).toLocaleDateString()} {new Date(noteItem.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap">{noteItem.text}</p>
                      </div>
                    ))}
                    {(!notesBooking.notesList || notesBooking.notesList.length === 0) && notesBooking.notes && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap">
                        {notesBooking.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setNotesBooking(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BOOKING DETAILS MODAL */}
      {selectedBookingForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-6 max-h-[94dvh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Patient Booking Profile</span>
                <h3 className="text-xl font-black text-slate-900">{selectedBookingForDetail.name}</h3>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">{selectedBookingForDetail.mobile}</div>
              </div>
              <button 
                onClick={() => setSelectedBookingForDetail(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Pill */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Status</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${getStatusBadgeStyle(selectedBookingForDetail.status).dot}`} />
                    {selectedBookingForDetail.status}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Condition Category</div>
                  <div className="text-xs font-black text-rose-700 text-right mt-0.5">
                    {selectedBookingForDetail.quickCode || selectedBookingForDetail.condition}
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Condition / Complaint</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedBookingForDetail.condition}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Source Channel</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedBookingForDetail.source}
                    {selectedBookingForDetail.referralPerson && ` (${selectedBookingForDetail.referralPerson})`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Location</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedBookingForDetail.city || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Age / Gender</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedBookingForDetail.age ? `${selectedBookingForDetail.age} Yrs` : '—'} / {selectedBookingForDetail.gender || '—'}
                  </div>
                </div>
              </div>

              {/* Assignment & Scheduling Info */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Scheduling & Destination
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Hospital</div>
                    <div className="font-bold text-indigo-900 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{selectedBookingForDetail.assignedHospitalName || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Doctor</div>
                    <div className="font-bold text-emerald-900 mt-0.5 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedBookingForDetail.assignedDoctorName || 'Front Office Direct'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Appointment Date</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedBookingForDetail.appointmentDate || 'Pending'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Slot Time</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedBookingForDetail.appointmentTime || 'Pending'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Scheduled By</div>
                    <div className="font-mono text-slate-700 mt-0.5 font-semibold">
                      {selectedBookingForDetail.scheduledBy || 'Sales Operations'}
                    </div>
                  </div>
                </div>
              </div>

              {selectedBookingForDetail.followupDate && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-600" /> Scheduled Follow-Up
                  </div>
                  <p className="text-amber-900 mt-0.5 font-bold">
                    Date: {selectedBookingForDetail.followupDate}
                  </p>
                  {selectedBookingForDetail.followupNotes && (
                    <p className="text-amber-800 text-xs mt-1">{selectedBookingForDetail.followupNotes}</p>
                  )}
                </div>
              )}

              {selectedBookingForDetail.notes && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Notes & Remarks</div>
                  <p className="text-slate-700 mt-1 leading-relaxed text-xs">{selectedBookingForDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <button
                type="button"
                onClick={() => setSelectedBookingForDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const b = selectedBookingForDetail;
                    setSelectedBookingForDetail(null);
                    handleOpenFollowup(b);
                  }}
                  className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-amber-600 text-white rounded-xl hover:bg-amber-500 shadow-md flex items-center gap-1.5"
                >
                  <CalendarCheck className="w-3.5 h-3.5" /> Follow-Up
                </button>
                {hasSchedulingAccess && (
                  <button
                    type="button"
                    onClick={() => {
                      const b = selectedBookingForDetail;
                      setSelectedBookingForDetail(null);
                      handleOpenScheduleModal(b);
                    }}
                    className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-xl hover:bg-rose-500 shadow-md shadow-rose-900/30 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
