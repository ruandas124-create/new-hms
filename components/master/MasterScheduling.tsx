import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { SchedulingTarget, Appointment, Condition } from '../../types';
import { 
  Calendar, Clock, User, CheckCircle2, XCircle, Search, Filter, 
  Plus, AlertCircle, RefreshCw, BarChart3, Activity, Target, Check, 
  ChevronRight, Phone, Stethoscope, FileText, UserCheck, Shield,
  Building2, ArrowLeft, X, CheckCircle, ChevronDown, Sparkles, Lock,
  Eye, Pencil, Trash2, MapPin, Tag, CreditCard, Info, Coffee
} from 'lucide-react';

const STATUS_OPTIONS: { label: string; dotClass: string }[] = [
  { label: 'New Leads', dotClass: 'bg-indigo-500' },
  { label: 'Schedule', dotClass: 'bg-blue-500' },
  { label: 'Follow-up', dotClass: 'bg-amber-500' },
  { label: 'Junk', dotClass: 'bg-slate-400' },
];

export const normalizeTimeSlot = (timeStr?: string): string => {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return trimmed;
  let [_, hStr, mStr, ampm] = match;
  let h = parseInt(hStr, 10);
  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  }
  return `${String(h).padStart(2, '0')}:${mStr}`;
};

export function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export function formatDisplayDate(dateStr?: string): { dayStr: string; dateFormatted: string } {
  if (!dateStr) return { dayStr: '', dateFormatted: '--' };
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return { dayStr: '', dateFormatted: dateStr };
    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { dayStr, dateFormatted };
  } catch {
    return { dayStr: '', dateFormatted: dateStr };
  }
}

export interface DoctorSlotInfo {
  time: string; // "09:00"
  displayTime: string; // "09:00 AM"
  isBooked: boolean;
  bookedPatientName?: string;
}

export interface DoctorAvailabilityDetails {
  isAvailableOnDate: boolean;
  unavailabilityReason?: string;
  doctorName: string;
  specialization?: string;
  hospitalName?: string;
  weekday: string;
  formattedDate: string;
  workingStartTime: string;
  workingEndTime: string;
  breaks: { startTime: string; endTime: string }[];
  slots: DoctorSlotInfo[];
  availableCount: number;
  bookedCount: number;
  regularDays: string[];
}

const isDoctorAvailableOnDate = (doctor: any, dateString: string | undefined): boolean => {
  if (!dateString || !doctor) return true;
  const availability = doctor.availability;
  if (!availability) return true;

  const dateObj = new Date(dateString + 'T00:00:00');
  const formattedDate = dateString.split('T')[0];

  // Blocked dates check
  if (availability.blockedDates && Array.isArray(availability.blockedDates)) {
    const isBlocked = availability.blockedDates.some((b: any) => {
      if (!b) return false;
      if (typeof b === 'string') return b === formattedDate;
      if (b.date) return b.date === formattedDate;
      const from = b.startDate || b.from;
      const to = b.endDate || b.to;
      if (from && to) return formattedDate >= from && formattedDate <= to;
      if (from) return formattedDate === from;
      return false;
    });
    if (isBlocked) return false;
  }
  if (availability.unavailableDates && Array.isArray(availability.unavailableDates) && availability.unavailableDates.includes(formattedDate)) {
    return false;
  }

  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  if (availability.daySchedules && Array.isArray(availability.daySchedules) && availability.daySchedules.length > 0) {
    const dayConfig = availability.daySchedules.find((ds: any) => ds.day?.toLowerCase() === weekday.toLowerCase());
    if (dayConfig) {
      if (dayConfig.status !== "Available") return false;
    } else if (availability.availableDays && availability.availableDays.length > 0) {
      if (!availability.availableDays.some((d: string) => d.toLowerCase() === weekday.toLowerCase())) return false;
    }
  } else if (availability.availableDays && availability.availableDays.length > 0) {
    if (!availability.availableDays.some((d: string) => d.toLowerCase() === weekday.toLowerCase())) return false;
  }

  return true;
};

const getDoctorAvailabilityDetailed = (
  doctor: any, 
  dateString: string | undefined, 
  allAppointments: Appointment[] = []
): DoctorAvailabilityDetails | null => {
  if (!doctor) return null;
  if (!dateString) return null;

  const dateObj = new Date(dateString + 'T00:00:00');
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = dateString.split('T')[0];

  const availability = doctor.availability || {};
  const regularDays: string[] = availability.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // 1. Check blocked dates / unavailable dates
  let isBlocked = false;
  let blockReason = 'Doctor is on scheduled leave.';
  if (availability.blockedDates && Array.isArray(availability.blockedDates)) {
    for (const b of availability.blockedDates) {
      if (!b) continue;
      if (typeof b === 'string' && b === formattedDate) {
        isBlocked = true;
        break;
      }
      if (b.date && b.date === formattedDate) {
        isBlocked = true;
        blockReason = b.reason ? `Doctor on scheduled leave (${b.reason}).` : blockReason;
        break;
      }
      const from = b.startDate || b.from;
      const to = b.endDate || b.to;
      if (from && to && formattedDate >= from && formattedDate <= to) {
        isBlocked = true;
        blockReason = b.reason ? `Doctor on scheduled leave (${b.reason}).` : blockReason;
        break;
      }
    }
  }
  if (!isBlocked && Array.isArray(availability.unavailableDates) && availability.unavailableDates.includes(formattedDate)) {
    isBlocked = true;
    blockReason = 'Doctor marked this date as unavailable.';
  }

  if (isBlocked) {
    return {
      isAvailableOnDate: false,
      unavailabilityReason: blockReason,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      hospitalName: doctor.hospitalName,
      weekday,
      formattedDate,
      workingStartTime: '',
      workingEndTime: '',
      breaks: [],
      slots: [],
      availableCount: 0,
      bookedCount: 0,
      regularDays
    };
  }

  // 2. Check weekday schedule
  let isDayAvailable = true;
  let daySchedule: any = null;
  if (Array.isArray(availability.daySchedules) && availability.daySchedules.length > 0) {
    daySchedule = availability.daySchedules.find((ds: any) => ds.day?.toLowerCase() === weekday.toLowerCase());
    if (daySchedule) {
      if (daySchedule.status !== 'Available') {
        isDayAvailable = false;
      }
    } else if (!regularDays.some(d => d.toLowerCase() === weekday.toLowerCase())) {
      isDayAvailable = false;
    }
  } else {
    if (!regularDays.some(d => d.toLowerCase() === weekday.toLowerCase())) {
      isDayAvailable = false;
    }
  }

  if (!isDayAvailable) {
    return {
      isAvailableOnDate: false,
      unavailabilityReason: `Doctor is not scheduled for consultations on ${weekday}s.`,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      hospitalName: doctor.hospitalName,
      weekday,
      formattedDate,
      workingStartTime: '',
      workingEndTime: '',
      breaks: [],
      slots: [],
      availableCount: 0,
      bookedCount: 0,
      regularDays
    };
  }

  // 3. Shift hours and breaks
  const shiftStart = daySchedule?.startTime || availability.startTime || '09:00';
  const shiftEnd = daySchedule?.endTime || availability.endTime || '17:00';
  const breaksList: { startTime: string; endTime: string }[] = daySchedule?.breaks || [];

  const [sh, sm] = shiftStart.split(':').map(Number);
  const [eh, em] = shiftEnd.split(':').map(Number);
  const startMinutes = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm);
  const endMinutes = (isNaN(eh) ? 17 : eh) * 60 + (isNaN(em) ? 0 : em);

  if (startMinutes >= endMinutes) {
    return {
      isAvailableOnDate: false,
      unavailabilityReason: 'Working hours are not properly configured for this day.',
      doctorName: doctor.name,
      specialization: doctor.specialization,
      hospitalName: doctor.hospitalName,
      weekday,
      formattedDate,
      workingStartTime: shiftStart,
      workingEndTime: shiftEnd,
      breaks: breaksList,
      slots: [],
      availableCount: 0,
      bookedCount: 0,
      regularDays
    };
  }

  // 4. Find appointments booked for this doctor on this date
  const docAppointments = (allAppointments || []).filter(app => {
    if (!app || app.status === 'Cancelled' || app.status === 'Junk') return false;
    const appDate = (app.date || '').split('T')[0];
    if (appDate !== formattedDate) return false;
    const matchId = (app.assignedDoctorId && app.assignedDoctorId === doctor.id) ||
                    (app.doctor_id && app.doctor_id === doctor.id);
    if (matchId) return true;
    if (app.assignedDoctorName && app.assignedDoctorName.toLowerCase() === doctor.name.toLowerCase()) return true;
    return false;
  });

  const slots: DoctorSlotInfo[] = [];
  for (let min = startMinutes; min < endMinutes; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // Respect breaks
    const isInBreak = breaksList.some(br => {
      if (!br.startTime || !br.endTime) return false;
      const [bsh, bsm] = br.startTime.split(':').map(Number);
      const [beh, bem] = br.endTime.split(':').map(Number);
      const bsMin = bsh * 60 + bsm;
      const beMin = beh * 60 + bem;
      return min >= bsMin && min < beMin;
    });

    if (isInBreak) {
      continue;
    }

    const matchingApp = docAppointments.find(app => normalizeTimeSlot(app.time) === timeStr);

    slots.push({
      time: timeStr,
      displayTime: formatDisplayTime(timeStr),
      isBooked: !!matchingApp,
      bookedPatientName: matchingApp ? matchingApp.name : undefined
    });
  }

  const availableCount = slots.filter(s => !s.isBooked).length;
  const bookedCount = slots.filter(s => s.isBooked).length;

  return {
    isAvailableOnDate: slots.length > 0,
    unavailabilityReason: slots.length === 0 ? 'No open consultation slots available for this date.' : undefined,
    doctorName: doctor.name,
    specialization: doctor.specialization,
    hospitalName: doctor.hospitalName,
    weekday,
    formattedDate,
    workingStartTime: shiftStart,
    workingEndTime: shiftEnd,
    breaks: breaksList,
    slots,
    availableCount,
    bookedCount,
    regularDays
  };
};

const defaultHospitalSlots: DoctorSlotInfo[] = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30'
].map(t => ({
  time: t,
  displayTime: formatDisplayTime(t),
  isBooked: false
}));

const getAvailableSlotsForDoctorAndDate = (doctor: any, dateString: string | undefined): string[] => {
  const defaultSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', 
    '15:00', '15:30', '16:00', '16:30', '17:00'
  ];
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
    if (dayConfig && dayConfig.status === "Available") {
      start = dayConfig.startTime || start;
      end = dayConfig.endTime || end;
      breaksList = dayConfig.breaks || [];
    }
  }

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMinutes = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm);
  const endMinutes = (isNaN(eh) ? 17 : eh) * 60 + (isNaN(em) ? 0 : em);

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

const getInitials = (name?: string): string => {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getStatusStyle = (status?: string) => {
  switch (status) {
    case 'New Leads':
      return {
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
        dotClass: 'bg-indigo-500'
      };
    case 'Schedule':
      return {
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotClass: 'bg-blue-500'
      };
    case 'Follow-up':
      return {
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
        dotClass: 'bg-amber-500'
      };
    case 'Junk':
      return {
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200/80',
        dotClass: 'bg-slate-400'
      };
    default:
      return {
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotClass: 'bg-blue-500'
      };
  }
};

export const MasterScheduling: React.FC = () => {
  const { 
    appointments, 
    addAppointment, 
    updateAppointment, 
    schedulingPermissions, 
    updateSchedulingPermission,
    staffUsers,
    patients = []
  } = useHospital();

  const [updatingTarget, setUpdatingTarget] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('all');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [showBookModal, setShowBookModal] = useState(false);

  // Assignment Form State
  const [assignmentType, setAssignmentType] = useState<'doctor' | 'hospital'>('doctor');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [hospitalSearch, setHospitalSearch] = useState('');

  // Patient Fields
  const [patientMode, setPatientMode] = useState<'new' | 'existing'>('new');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientName, setPatientName] = useState('');
  const [mobile, setMobile] = useState('');
  const [condition, setCondition] = useState<Condition>(Condition.Other);
  const [apptDate, setApptDate] = useState(new Date().toISOString().split('T')[0]);
  const [apptTime, setApptTime] = useState('');
  const [isTimeSelectorOpen, setIsTimeSelectorOpen] = useState(true);
  const acqureOpd = 'OPD'; // Read-only / unchangeable
  const [source, setSource] = useState('');
  const [referralPerson, setReferralPerson] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Actions Dropdown & Modals State
  const [activeDropdownApp, setActiveDropdownApp] = useState<Appointment | null>(null);
  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top?: number; bottom?: number; right: number; placement: 'top' | 'bottom' }>({ right: 16, placement: 'bottom' });

  // View Appointment Modal State
  const [viewModalApp, setViewModalApp] = useState<Appointment | null>(null);

  // Edit Appointment Modal State
  const [editModalApp, setEditModalApp] = useState<Appointment | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editCondition, setEditCondition] = useState<Condition>(Condition.Other);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editAssignmentType, setEditAssignmentType] = useState<'doctor' | 'hospital'>('doctor');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editHospitalId, setEditHospitalId] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editReferralPerson, setEditReferralPerson] = useState('');
  const [editStatus, setEditStatus] = useState<string>('Scheduled');
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // View Patient Modal State
  const [viewPatientData, setViewPatientData] = useState<{
    appointment: Appointment;
    patient?: any;
  } | null>(null);

  // Notes Modal State
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTargetApp, setNoteTargetApp] = useState<Appointment | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [targetNotes, setTargetNotes] = useState<import('../../types').LeadNote[]>([]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-actions-menu]') && !target.closest('[data-actions-btn]')) {
        setActiveDropdownApp(null);
        setStatusSubmenuOpen(false);
      }
    };
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.closest && target.closest('[data-actions-menu]')) {
        return;
      }
      setActiveDropdownApp(null);
      setStatusSubmenuOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const toggleDropdown = (e: React.MouseEvent<HTMLButtonElement>, app: Appointment) => {
    e.stopPropagation();
    if (activeDropdownApp?.id === app.id) {
      setActiveDropdownApp(null);
      setStatusSubmenuOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    
    // Check if dropdown fits below (estimate 320px height)
    const spaceBelow = screenHeight - rect.bottom;
    const placement = spaceBelow < 320 ? 'top' : 'bottom';
    
    // Right offset relative to viewport right
    const right = Math.max(12, screenWidth - rect.right);
    
    setDropdownPosition({
      top: placement === 'bottom' ? rect.bottom + 6 : undefined,
      bottom: placement === 'top' ? (screenHeight - rect.top + 6) : undefined,
      right,
      placement
    });
    setActiveDropdownApp(app);
    setStatusSubmenuOpen(false);
  };

  const handleOpenEditModal = (app: Appointment) => {
    setEditModalApp(app);
    setEditName(app.name || '');
    setEditMobile(app.mobile || '');
    setEditCondition(app.condition || Condition.Other);
    setEditDate(app.date || new Date().toISOString().split('T')[0]);
    setEditTime(app.time || '10:00');
    const resolvedType = app.assignment_type || (app.assignedDoctorId ? 'doctor' : 'hospital');
    setEditAssignmentType(resolvedType);
    setEditDoctorId(app.assignedDoctorId || app.doctor_id || '');
    setEditHospitalId(app.hospital_id || '');
    setEditSource(app.source || 'Other');
    setEditReferralPerson(app.referral_person || '');
    setEditStatus(app.status || 'Scheduled');
    setEditFormError(null);
  };

  const handleOpenPatientModal = (app: Appointment) => {
    const matched = patients.find(p => 
      (app.patient_id && p.id === app.patient_id) ||
      (p.mobile && p.mobile === app.mobile) ||
      (p.name && p.name.toLowerCase() === app.name.toLowerCase())
    );
    setViewPatientData({
      appointment: app,
      patient: matched || null
    });
  };

  // Doctors who have been granted access via Access Management
  const doctorsWithAccess = useMemo(() => {
    return staffUsers.filter(u => u.role === 'DOCTOR' && u.accessStatus !== 'Revoked');
  }, [staffUsers]);

  // Hospitals who have been granted access via Access Management
  const hospitalsWithAccess = useMemo(() => {
    return staffUsers.filter(u => u.role === 'HOSPITAL' && u.accessStatus !== 'Revoked');
  }, [staffUsers]);

  // Matching Patient for View Details modal
  const viewModalPatient = useMemo(() => {
    if (!viewModalApp) return null;
    return patients.find(p => 
      (viewModalApp.patient_id && p.id === viewModalApp.patient_id) ||
      (p.mobile && p.mobile === viewModalApp.mobile) ||
      (p.name && p.name.toLowerCase() === viewModalApp.name.toLowerCase())
    ) || null;
  }, [viewModalApp, patients]);

  // Matching Doctor for View Details modal
  const viewModalDoctor = useMemo(() => {
    if (!viewModalApp) return null;
    return doctorsWithAccess.find(d => 
      (viewModalApp.doctor_id && d.id === viewModalApp.doctor_id) || 
      (viewModalApp.assignedDoctorId && d.id === viewModalApp.assignedDoctorId) ||
      (viewModalApp.assignedDoctorName && d.name.toLowerCase() === viewModalApp.assignedDoctorName.toLowerCase())
    ) || null;
  }, [viewModalApp, doctorsWithAccess]);

  // Matching Hospital for View Details modal
  const viewModalHospital = useMemo(() => {
    if (!viewModalApp) return null;
    return hospitalsWithAccess.find(h => 
      (viewModalApp.hospital_id && h.id === viewModalApp.hospital_id) || 
      (viewModalApp.hospitalName && h.name.toLowerCase() === viewModalApp.hospitalName.toLowerCase())
    ) || null;
  }, [viewModalApp, hospitalsWithAccess]);

  // Filtered doctor list for search
  const filteredDoctorsWithAccess = useMemo(() => {
    if (!doctorSearch.trim()) return doctorsWithAccess;
    const q = doctorSearch.toLowerCase();
    return doctorsWithAccess.filter(d => 
      d.name.toLowerCase().includes(q) || 
      (d.specialization && d.specialization.toLowerCase().includes(q)) ||
      (d.hospitalName && d.hospitalName.toLowerCase().includes(q))
    );
  }, [doctorsWithAccess, doctorSearch]);

  // Filtered hospital list for search
  const filteredHospitalsWithAccess = useMemo(() => {
    if (!hospitalSearch.trim()) return hospitalsWithAccess;
    const q = hospitalSearch.toLowerCase();
    return hospitalsWithAccess.filter(h => 
      h.name.toLowerCase().includes(q) || 
      (h.city && h.city.toLowerCase().includes(q))
    );
  }, [hospitalsWithAccess, hospitalSearch]);

  // Doctors belonging to the selected hospital (Hospital -> Doctor selection)
  const hospitalDoctors = useMemo(() => {
    if (!selectedHospitalId) return [];
    const selectedHosp = hospitalsWithAccess.find(h => h.id === selectedHospitalId);
    return doctorsWithAccess.filter(doc => {
      if (doc.hospital_id && doc.hospital_id === selectedHospitalId) return true;
      if (selectedHosp && doc.hospitalName && doc.hospitalName.toLowerCase() === selectedHosp.name.toLowerCase()) return true;
      return false;
    });
  }, [doctorsWithAccess, selectedHospitalId, hospitalsWithAccess]);

  // Selected Doctor Object (in Doctor mode or Hospital mode)
  const activeSelectedDoctor = useMemo(() => {
    return doctorsWithAccess.find(d => d.id === selectedDoctorId) || staffUsers.find(d => d.id === selectedDoctorId && d.role === 'DOCTOR');
  }, [doctorsWithAccess, staffUsers, selectedDoctorId]);

  // Selected Hospital Object
  const activeSelectedHospital = useMemo(() => {
    return hospitalsWithAccess.find(h => h.id === selectedHospitalId);
  }, [hospitalsWithAccess, selectedHospitalId]);

  // Associated Hospital for the selected Doctor (in Doctor Mode)
  const doctorAssociatedHospital = useMemo(() => {
    if (!activeSelectedDoctor) return null;
    if (activeSelectedDoctor.hospital_id) {
      const found = hospitalsWithAccess.find(h => h.id === activeSelectedDoctor.hospital_id);
      if (found) return found;
    }
    if (activeSelectedDoctor.hospitalName) {
      const found = hospitalsWithAccess.find(h => h.name.toLowerCase() === activeSelectedDoctor.hospitalName?.toLowerCase());
      if (found) return found;
      return { id: activeSelectedDoctor.hospital_id || 'hosp-linked', name: activeSelectedDoctor.hospitalName, role: 'HOSPITAL' as any, email: '', mobile: '', registeredAt: '' };
    }
    return null;
  }, [activeSelectedDoctor, hospitalsWithAccess]);

  // Detailed Doctor Availability based on the existing Doctor Availability section (single source of truth)
  const doctorAvailabilityDetailed = useMemo(() => {
    return getDoctorAvailabilityDetailed(activeSelectedDoctor, apptDate, appointments);
  }, [activeSelectedDoctor, apptDate, appointments]);

  // Available time slots (respects doctor shifts, breaks, and existing appointments)
  const availableTimeSlots = useMemo(() => {
    if (doctorAvailabilityDetailed && doctorAvailabilityDetailed.slots.length > 0) {
      return doctorAvailabilityDetailed.slots.map(s => s.time);
    }
    return getAvailableSlotsForDoctorAndDate(activeSelectedDoctor, apptDate);
  }, [doctorAvailabilityDetailed, activeSelectedDoctor, apptDate]);

  // Automatically refresh Appt Time when Doctor or Appt Date changes:
  // If previously selected time slot is invalid or booked for the newly selected doctor/date, clear it.
  useEffect(() => {
    if (activeSelectedDoctor) {
      if (!doctorAvailabilityDetailed || !doctorAvailabilityDetailed.isAvailableOnDate) {
        if (apptTime) setApptTime('');
      } else {
        const matchingSlot = doctorAvailabilityDetailed.slots.find(
          s => normalizeTimeSlot(s.time) === normalizeTimeSlot(apptTime)
        );
        if (!matchingSlot || matchingSlot.isBooked) {
          if (apptTime) setApptTime('');
        }
      }
    }
  }, [selectedDoctorId, apptDate, doctorAvailabilityDetailed, activeSelectedDoctor]);

  // Filtered registered patients for search
  const filteredRegisteredPatients = useMemo(() => {
    if (!patientSearchTerm.trim()) return patients.slice(0, 8);
    const q = patientSearchTerm.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.mobile.includes(q)
    ).slice(0, 10);
  }, [patients, patientSearchTerm]);

  // Handle Hospital selection change (resets doctor)
  const handleHospitalChange = (hospId: string) => {
    setSelectedHospitalId(hospId);
    setSelectedDoctorId(''); // Reset doctor when hospital changes
    setFormError(null);
  };

  // Handle Assignment type switch
  const handleAssignmentTypeChange = (type: 'doctor' | 'hospital') => {
    setAssignmentType(type);
    setSelectedDoctorId('');
    setSelectedHospitalId('');
    setDoctorSearch('');
    setHospitalSearch('');
    setFormError(null);
  };

  // Handle selecting an existing registered patient
  const handleSelectExistingPatient = (pt: any) => {
    setSelectedPatientId(pt.id);
    setPatientName(pt.name);
    setMobile(pt.mobile);
    if (pt.condition) {
      setCondition(pt.condition as Condition);
    }
    setPatientSearchTerm('');
  };

  // Filtered appointments for table
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const matchSearch = 
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.mobile.includes(searchTerm) ||
        (app.username && app.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.assignedDoctorName && app.assignedDoctorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (app.hospitalName && app.hospitalName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchDoctor = selectedDoctorFilter === 'all' || app.assignedDoctorId === selectedDoctorFilter || app.doctor_id === selectedDoctorFilter;
      const matchHospital = selectedHospitalFilter === 'all' || app.hospital_id === selectedHospitalFilter || (app.hospitalName && app.hospitalName.toLowerCase() === selectedHospitalFilter.toLowerCase());
      const matchStatus = selectedStatusFilter === 'all' || app.status === selectedStatusFilter;

      return matchSearch && matchDoctor && matchHospital && matchStatus;
    });
  }, [appointments, searchTerm, selectedDoctorFilter, selectedHospitalFilter, selectedStatusFilter]);

  // Toggle module scheduling permission
  const handleTogglePermission = async (target: SchedulingTarget) => {
    const current = !!schedulingPermissions[target];
    const nextState = !current;
    setUpdatingTarget(target);
    try {
      await updateSchedulingPermission(target, nextState);
      setToastMessage(`${target.replace('_', ' ').toUpperCase()} scheduling access set to ${nextState ? 'ON' : 'OFF'}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update scheduling permission:', err);
    } finally {
      setUpdatingTarget(null);
    }
  };

  // Book appointment submission
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (assignmentType === 'doctor') {
      if (!selectedDoctorId) {
        setFormError('Please select an authorized Doctor granted in Access Management.');
        return;
      }
    } else {
      if (!selectedHospitalId) {
        setFormError('Please select an authorized Hospital granted in Access Management.');
        return;
      }
    }

    if (!patientName.trim()) {
      setFormError('Patient Full Name is required.');
      return;
    }

    if (!mobile.trim()) {
      setFormError('Mobile Number is required.');
      return;
    }

    if (!apptDate) {
      setFormError('Appointment Date is required.');
      return;
    }

    if (!apptTime) {
      setFormError('Appointment Time is required. Please select an available consultation slot.');
      return;
    }

    if (activeSelectedDoctor) {
      if (!doctorAvailabilityDetailed?.isAvailableOnDate) {
        setFormError(`No availability for ${activeSelectedDoctor.name} on the selected date.`);
        return;
      }
      const chosenSlot = doctorAvailabilityDetailed.slots.find(
        s => normalizeTimeSlot(s.time) === normalizeTimeSlot(apptTime)
      );
      if (!chosenSlot) {
        setFormError("Selected time slot is outside the doctor's configured consultation hours.");
        return;
      }
      if (chosenSlot.isBooked) {
        setFormError(`The time slot ${formatDisplayTime(apptTime)} is already booked for this doctor. Please choose an available slot.`);
        return;
      }
    }

    if (!source) {
      setFormError('Source is required. Please select a source.');
      return;
    }

    if (source === 'Referral' && !referralPerson.trim()) {
      setFormError('Referral Person is required when Source is Referral.');
      return;
    }

    setIsSubmitting(true);
    try {
      const masterUsername = localStorage.getItem('username') || 'Master Admin';

      let finalHospitalId = 'HOSP_12345';
      let finalHospitalName: string | undefined = undefined;
      let finalDoctorId: string | null = null;
      let finalDoctorName: string | null = null;

      if (assignmentType === 'doctor') {
        const doc = doctorsWithAccess.find(d => d.id === selectedDoctorId);
        finalDoctorId = doc?.id || null;
        finalDoctorName = doc?.name || null;
        
        // Associated Hospital
        if (doctorAssociatedHospital) {
          finalHospitalId = doctorAssociatedHospital.id;
          finalHospitalName = doctorAssociatedHospital.name;
        } else if (doc?.hospitalName) {
          finalHospitalName = doc.hospitalName;
          finalHospitalId = doc.hospital_id || 'HOSP_12345';
        }
      } else {
        // Hospital assignment
        const hosp = hospitalsWithAccess.find(h => h.id === selectedHospitalId);
        finalHospitalId = hosp?.id || selectedHospitalId;
        finalHospitalName = hosp?.name || 'Assigned Hospital';

        // Doctor is optional
        if (selectedDoctorId) {
          const doc = hospitalDoctors.find(d => d.id === selectedDoctorId) || doctorsWithAccess.find(d => d.id === selectedDoctorId);
          finalDoctorId = doc?.id || null;
          finalDoctorName = doc?.name || null;
        } else {
          finalDoctorId = null;
          finalDoctorName = null;
        }
      }

      await addAppointment({
        name: patientName.trim(),
        mobile: mobile.trim(),
        date: apptDate,
        time: apptTime,
        bookingType: 'Scheduled',
        visit_type: acqureOpd,
        condition: condition || Condition.Other,
        source: source,
        referral_person: source === 'Referral' ? referralPerson.trim() : null,
        assignment_type: assignmentType,
        doctor_id: finalDoctorId,
        hospital_id: finalHospitalId,
        hospitalName: finalHospitalName,
        assignedDoctorId: finalDoctorId || undefined,
        assignedDoctorName: finalDoctorName || undefined,
        patient_id: selectedPatientId || null,
        username: masterUsername
      });

      const confirmationMsg = assignmentType === 'doctor'
        ? `Appointment confirmed & assigned to ${finalDoctorName}`
        : (finalDoctorId 
            ? `Appointment confirmed for ${finalHospitalName} with ${finalDoctorName}` 
            : `Appointment confirmed & assigned to ${finalHospitalName} only`);

      setToastMessage(confirmationMsg);
      setTimeout(() => setToastMessage(null), 3500);
      
      // Close modal & reset
      setShowBookModal(false);
      setPatientName('');
      setMobile('');
      setSelectedDoctorId('');
      setSelectedHospitalId('');
      setSelectedPatientId('');
      setDoctorSearch('');
      setHospitalSearch('');
      setApptTime('');
      setIsTimeSelectorOpen(true);
      setSource('');
      setReferralPerson('');
      setFormError(null);
    } catch (err) {
      console.error('Failed to book appointment:', err);
      setFormError('Failed to book appointment. Please check network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick status update
  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      const appToUpdate = appointments.find(a => a.id === appId);
      if (appToUpdate) {
        await updateAppointment({ 
          ...appToUpdate, 
          status: status as any,
          bookingType: status === 'Follow Up' ? 'Follow Up' : 'Scheduled'
        });
        setToastMessage(`Appointment status updated to ${status}`);
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSaveEditAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalApp) return;
    setEditFormError(null);

    if (!editName.trim()) {
      setEditFormError('Patient Name is required');
      return;
    }
    if (!editMobile.trim()) {
      setEditFormError('Mobile Number is required');
      return;
    }
    if (!editDate) {
      setEditFormError('Appointment Date is required');
      return;
    }
    if (!editTime) {
      setEditFormError('Appointment Time is required');
      return;
    }
    if (editAssignmentType === 'doctor' && !editDoctorId) {
      setEditFormError('Please select a doctor');
      return;
    }
    if (editAssignmentType === 'hospital' && !editHospitalId) {
      setEditFormError('Please select a hospital facility');
      return;
    }

    setIsEditSubmitting(true);
    try {
      let finalDoctorId = editDoctorId || null;
      let finalDoctorName: string | null = null;
      let finalHospitalId = editHospitalId || 'HOSP_12345';
      let finalHospitalName: string | undefined = undefined;

      if (editAssignmentType === 'doctor') {
        const doc = doctorsWithAccess.find(d => d.id === editDoctorId);
        finalDoctorName = doc?.name || null;
        if (doc?.hospital_id) {
          const hosp = hospitalsWithAccess.find(h => h.id === doc.hospital_id);
          finalHospitalId = hosp?.id || doc.hospital_id;
          finalHospitalName = hosp?.name || doc.hospitalName;
        } else if (doc?.hospitalName) {
          finalHospitalName = doc.hospitalName;
        }
      } else {
        const hosp = hospitalsWithAccess.find(h => h.id === editHospitalId);
        finalHospitalName = hosp?.name || 'Assigned Facility';
        if (editDoctorId) {
          const doc = doctorsWithAccess.find(d => d.id === editDoctorId);
          finalDoctorName = doc?.name || null;
        } else {
          finalDoctorId = null;
          finalDoctorName = null;
        }
      }

      await updateAppointment({
        ...editModalApp,
        name: editName.trim(),
        mobile: editMobile.trim(),
        condition: editCondition,
        date: editDate,
        time: editTime,
        assignment_type: editAssignmentType,
        doctor_id: finalDoctorId,
        assignedDoctorId: finalDoctorId || undefined,
        assignedDoctorName: finalDoctorName || undefined,
        hospital_id: finalHospitalId,
        hospitalName: finalHospitalName,
        source: editSource || editModalApp.source,
        referral_person: editSource === 'Referral' ? editReferralPerson.trim() : null,
        status: editStatus as any,
        bookingType: editStatus === 'Follow Up' ? 'Follow Up' : 'Scheduled'
      });

      setToastMessage(`Appointment for ${editName} updated successfully`);
      setTimeout(() => setToastMessage(null), 3000);
      setEditModalApp(null);
    } catch (err) {
      console.error('Failed to update appointment:', err);
      setEditFormError('Failed to save changes. Please try again.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Note Modal Handlers
  const openNoteModal = async (app: Appointment) => {
    setNoteTargetApp(app);
    setNewNoteContent('');
    setTargetNotes([]);
    setShowNoteModal(true);
    
    setIsLoadingNotes(true);
    try {
      const { fetchNotesForLead } = await import('../../services/noteService');
      const notes = await fetchNotesForLead(app.patient_id || app.id);
      setTargetNotes(notes);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteTargetApp || !newNoteContent.trim()) return;
    setIsSavingNote(true);
    try {
      const { addNoteForLead } = await import('../../services/noteService');
      const activeRole = typeof window !== 'undefined' ? (localStorage.getItem('hms_hospital_role') || localStorage.getItem('user_role')) : null;
      const username = staffUsers.find(u => u.role === activeRole)?.name || 'Master Admin';
      const staffId = staffUsers.find(u => u.role === activeRole)?.id || 'staff_master_01';
      
      const newNote = await addNoteForLead({
        leadId: noteTargetApp.patient_id || noteTargetApp.id,
        note: newNoteContent,
        hospitalId: noteTargetApp.hospital_id,
        createdBy: staffId,
        createdByName: username
      });
      setTargetNotes([newNote, ...targetNotes]);
      setNewNoteContent('');
      setToastMessage('Note added successfully');
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Quick Action */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-hospital-600 mb-1">
              <Calendar className="w-4 h-4" /> 2. Scheduling & Access Matrix
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Master Scheduling Management
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Book and assign master appointments directly to doctors or hospitals granted via Access Management, with complete provenance tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowBookModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-hospital-200"
          >
            <Plus className="w-4 h-4" /> Book Master Appointment
          </button>
        </div>

        {/* Scheduling Permission Targets (Hidden as requested) */}
        <div className="hidden">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
            Module Scheduling Access Privileges
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                target: 'analytics_hub' as SchedulingTarget,
                label: 'Analytics Hub Scheduling',
                desc: 'Permits the Analytics Hub team to coordinate and schedule follow-ups and reviews.',
                icon: BarChart3
              },
              {
                target: 'doctor' as SchedulingTarget,
                label: 'Doctor Scheduling',
                desc: 'Permits attending doctors to set tentative surgery dates and schedule clinical reviews.',
                icon: Activity
              },
              {
                target: 'sales' as SchedulingTarget,
                label: 'Sales Scheduling',
                desc: 'Permits Sales representatives to book patient consults and lead appointments directly.',
                icon: Target
              }
            ].map(item => {
              const isGranted = !!schedulingPermissions[item.target];
              const isUpdating = updatingTarget === item.target;

              return (
                <div
                  key={item.target}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    isGranted ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleTogglePermission(item.target)}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase"
                    >
                      {isGranted ? 'Revoke (OFF)' : 'Grant (ON)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Live Scheduling Console & Appointments Table */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 md:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Hospital Appointments Roster
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {filteredAppointments.length} {filteredAppointments.length === 1 ? 'Appointment' : 'Appointments'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live schedule feed and patient appointments registry with clinician assignment and provenance.
            </p>
          </div>

          {/* Reset Filters shortcut */}
          {(searchTerm || selectedDoctorFilter !== 'all' || selectedHospitalFilter !== 'all' || selectedStatusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedDoctorFilter('all');
                setSelectedHospitalFilter('all');
                setSelectedStatusFilter('all');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all self-start sm:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search patient, hospital, doctor..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50/90 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-hospital-500 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-hospital-500/20 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Doctor */}
          <div className="relative">
            <select
              value={selectedDoctorFilter}
              onChange={e => setSelectedDoctorFilter(e.target.value)}
              className={`w-full appearance-none pl-3.5 pr-8 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-hospital-500/20 transition-all ${
                selectedDoctorFilter !== 'all'
                  ? 'bg-hospital-50/60 border-hospital-300 text-hospital-900 font-bold'
                  : 'bg-slate-50/90 hover:bg-slate-50 focus:bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Doctors</option>
              {doctorsWithAccess.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter by Hospital */}
          <div className="relative">
            <select
              value={selectedHospitalFilter}
              onChange={e => setSelectedHospitalFilter(e.target.value)}
              className={`w-full appearance-none pl-3.5 pr-8 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-hospital-500/20 transition-all ${
                selectedHospitalFilter !== 'all'
                  ? 'bg-hospital-50/60 border-hospital-300 text-hospital-900 font-bold'
                  : 'bg-slate-50/90 hover:bg-slate-50 focus:bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Hospitals</option>
              {hospitalsWithAccess.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter by Status */}
          <div className="relative">
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className={`w-full appearance-none pl-3.5 pr-8 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-hospital-500/20 transition-all ${
                selectedStatusFilter !== 'all'
                  ? 'bg-hospital-50/60 border-hospital-300 text-hospital-900 font-bold'
                  : 'bg-slate-50/90 hover:bg-slate-50 focus:bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map(st => (
                <option key={st.label} value={st.label}>{st.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Appointments List Table */}
        {filteredAppointments.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200/60">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">No Appointments Match Criteria</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No scheduled records found matching your filters. Try clearing your search or status criteria.
              </p>
            </div>
            {(searchTerm || selectedDoctorFilter !== 'all' || selectedHospitalFilter !== 'all' || selectedStatusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDoctorFilter('all');
                  setSelectedHospitalFilter('all');
                  setSelectedStatusFilter('all');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            <div className="overflow-x-auto table-container w-full">
              <table className="w-full text-left border-collapse min-w-[960px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th scope="col" className="py-3.5 pl-5 pr-4">Patient Name</th>
                    <th scope="col" className="py-3.5 px-4">Disease</th>
                    <th scope="col" className="py-3.5 px-4">Date & Slot</th>
                    <th scope="col" className="py-3.5 px-4">Source</th>
                    <th scope="col" className="py-3.5 px-4">Doctor / Facility</th>
                    <th scope="col" className="py-3.5 px-4">Status</th>
                    <th scope="col" className="py-3.5 px-4">Scheduled By</th>
                    <th scope="col" className="py-3.5 px-4">Date Created</th>
                    <th scope="col" className="py-3.5 pl-4 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-xs">
                  {filteredAppointments.map(app => {
                    const creator = app.username || 'Master Admin';
                    const isHospitalOnly = app.assignment_type === 'hospital' && !app.assignedDoctorName && !app.doctor_id;
                    const dateInfo = formatDisplayDate(app.date);
                    const formattedTime = formatDisplayTime(app.time);
                    const statusStyle = getStatusStyle(app.status);

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* 1. Patient Name */}
                        <td className="py-4 pl-5 pr-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                              {getInitials(app.name)}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="font-bold text-slate-900 text-sm leading-none flex items-center gap-2">
                                <span className="truncate">{app.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  {app.mobile}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Disease */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          {app.condition ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              {app.condition}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Not specified</span>
                          )}
                        </td>

                        {/* 3. Date & Slot */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{dateInfo.dateFormatted}</span>
                            </div>
                            <div className="text-[11px] text-hospital-600 flex items-center gap-1.5 font-bold">
                              <Clock className="w-3 h-3 text-hospital-500 shrink-0" />
                              <span>{formattedTime}</span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Source */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          {app.source ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200/80">
                              {app.source === 'Referral' && app.referral_person ? `Ref: ${app.referral_person}` : app.source}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Direct</span>
                          )}
                        </td>

                        {/* 5. Doctor / Facility */}
                        <td className="py-4 px-4 align-middle">
                          {isHospitalOnly ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate max-w-[160px]">{app.hospitalName || 'Assigned Facility'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate max-w-[160px]">{app.assignedDoctorName || 'Assigned Doctor'}</span>
                              </div>
                              {app.hospitalName && (
                                <div className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate max-w-[160px]">{app.hospitalName}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. Status */}
                        <td className="py-4 px-4 align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border shadow-2xs ${statusStyle.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusStyle.dotClass}`} />
                            {app.status || 'Schedule'}
                          </span>
                        </td>

                        {/* 7. Scheduled By */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{creator}</span>
                          </div>
                        </td>

                        {/* 8. Date Created */}
                        <td className="py-4 px-4 align-middle whitespace-nowrap">
                          <div className="text-xs font-semibold text-slate-600">
                            {formatDisplayDate(app.createdAt.split('T')[0]).dateFormatted}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(app.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* 9. Action Dropdown */}
                        <td className="py-4 pl-4 pr-5 text-right align-middle whitespace-nowrap">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              data-actions-btn={app.id}
                              onClick={(e) => toggleDropdown(e, app)}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs ${
                                activeDropdownApp?.id === app.id
                                  ? 'bg-hospital-50 text-hospital-700 border-hospital-300 ring-2 ring-hospital-500/20'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span>Actions</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdownApp?.id === app.id ? 'rotate-180 text-hospital-600' : 'text-slate-400'}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-800 font-bold">{filteredAppointments.length}</strong> of{' '}
                <strong className="text-slate-800 font-bold">{appointments.length}</strong> total records
              </span>
              {filteredAppointments.length < appointments.length && (
                <span className="text-[11px] text-slate-400 font-medium">
                  Filters applied ({appointments.length - filteredAppointments.length} filtered out)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Book Master Appointment Modal — Matches Front Office Design exactly */}
      {showBookModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col md:flex-row max-h-[94dvh] md:max-h-[88vh]">
            
            {/* Left Header Banner (Desktop) */}
            <div className="hidden md:flex w-72 bg-slate-900 text-white p-8 flex-col justify-between shrink-0">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 text-white border border-white/10">
                  <Calendar className="w-6 h-6 text-hospital-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-hospital-400 mb-2 block">
                  Master Scheduling
                </span>
                <h2 className="text-3xl font-black mb-4 leading-tight">
                  Book Master Appointment
                </h2>
                <p className="text-xs text-white/60 font-medium leading-relaxed mb-6">
                  Assign appointments directly to verified doctors or hospitals configured through Access Management.
                </p>

                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-wider text-white/40">Provenance Record</div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{localStorage.getItem('username') || 'Master Admin'}</span>
                  </div>
                  <div className="text-[10px] text-white/50">
                    Role: <span className="text-hospital-300 font-bold">Master Administrator</span>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setShowBookModal(false)} 
                className="flex items-center gap-2 text-white/50 hover:text-white font-black uppercase text-[10px] tracking-widest transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel & Close
              </button>
            </div>

            {/* Right Form Container */}
            <div className="flex-1 p-4 sm:p-6 md:p-10 bg-white overflow-y-auto relative">
              {/* Mobile Close Button */}
              <button 
                type="button" 
                onClick={() => setShowBookModal(false)} 
                className="absolute top-4 right-4 md:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="md:hidden mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-hospital-600">Master Scheduling</span>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Book Master Appointment</h2>
              </div>

              {formError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleBookAppointment} className="space-y-6">
                
                {/* 1. Assignment Type: Doctor vs. Hospital */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2.5 tracking-widest">
                    Assigned To <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-200/60 rounded-2xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => handleAssignmentTypeChange('doctor')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        assignmentType === 'doctor'
                          ? 'bg-white text-emerald-700 shadow-md border border-slate-200/60'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Stethoscope className="w-4 h-4" /> Doctor
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAssignmentTypeChange('hospital')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        assignmentType === 'hospital'
                          ? 'bg-white text-indigo-700 shadow-md border border-slate-200/60'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Building2 className="w-4 h-4" /> Hospital
                    </button>
                  </div>
                </div>

                {/* 2. Doctor Assignment Flow */}
                {assignmentType === 'doctor' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          Select Doctor (Access Granted) <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-emerald-600 font-bold">
                          {doctorsWithAccess.length} active doctors
                        </span>
                      </div>

                      {/* Search box if list is large */}
                      {doctorsWithAccess.length > 5 && (
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={doctorSearch}
                            onChange={e => setDoctorSearch(e.target.value)}
                            placeholder="Search authorized doctor..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
                          />
                        </div>
                      )}

                      <select
                        id="doctor-assignment-select"
                        required
                        className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500"
                        value={selectedDoctorId}
                        onChange={e => {
                          setSelectedDoctorId(e.target.value);
                          setIsTimeSelectorOpen(true);
                          setFormError(null);
                        }}
                      >
                        <option value="">Select Doctor...</option>
                        {filteredDoctorsWithAccess.map(doc => {
                          const isAvailable = isDoctorAvailableOnDate(doc, apptDate);
                          return (
                            <option key={doc.id} value={doc.id}>
                              {doc.name} {doc.specialization ? `(${doc.specialization})` : ''} {doc.hospitalName ? `— ${doc.hospitalName}` : ''} {!isAvailable ? '[Unavailable Date]' : ''}
                            </option>
                          );
                        })}
                      </select>

                      {doctorsWithAccess.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2 font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          No doctors found with granted Access. Grant doctor access in Access Management first.
                        </p>
                      )}
                    </div>

                    {/* Show Doctor's Associated Hospital */}
                    {activeSelectedDoctor && (
                      <div className="p-3.5 bg-indigo-50/70 border border-indigo-100/80 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">
                              Doctor's Associated Hospital
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              {doctorAssociatedHospital?.name || activeSelectedDoctor.hospitalName || 'General Facility'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                          Auto-Linked
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Hospital Assignment Flow */}
                {assignmentType === 'hospital' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          Select Hospital (Access Granted) <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] text-indigo-600 font-bold">
                          {hospitalsWithAccess.length} active hospitals
                        </span>
                      </div>

                      {/* Search box for hospitals */}
                      {hospitalsWithAccess.length > 5 && (
                        <div className="relative mb-2">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={hospitalSearch}
                            onChange={e => setHospitalSearch(e.target.value)}
                            placeholder="Search authorized hospital..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
                          />
                        </div>
                      )}

                      <select
                        required
                        className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500"
                        value={selectedHospitalId}
                        onChange={e => handleHospitalChange(e.target.value)}
                      >
                        <option value="">Select Hospital...</option>
                        {filteredHospitalsWithAccess.map(hosp => (
                          <option key={hosp.id} value={hosp.id}>
                            {hosp.name} {hosp.city ? `(${hosp.city})` : ''}
                          </option>
                        ))}
                      </select>

                      {hospitalsWithAccess.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2 font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          No hospitals found with granted Access. Grant hospital access in Access Management first.
                        </p>
                      )}
                    </div>

                    {/* Hospital -> Doctor Selection (Optional) */}
                    {selectedHospitalId && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            Assign Doctor (Optional)
                          </label>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {hospitalDoctors.length > 0 ? `${hospitalDoctors.length} doctors available` : 'Hospital-Only Assignment'}
                          </span>
                        </div>

                        <select
                          id="hospital-doctor-assignment-select"
                          className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500"
                          value={selectedDoctorId}
                          onChange={e => {
                            setSelectedDoctorId(e.target.value);
                            setIsTimeSelectorOpen(true);
                            setFormError(null);
                          }}
                        >
                          <option value="">Not Selected (Hospital Only)</option>
                          {hospitalDoctors.map(doc => {
                            const isAvailable = isDoctorAvailableOnDate(doc, apptDate);
                            return (
                              <option key={doc.id} value={doc.id}>
                                {doc.name} {doc.specialization ? `(${doc.specialization})` : ''} {!isAvailable ? '[Unavailable Date]' : ''}
                              </option>
                            );
                          })}
                        </select>

                        {hospitalDoctors.length === 0 ? (
                          <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            ℹ️ No doctors currently linked to this hospital in Access Management. The appointment will be assigned to <strong>{activeSelectedHospital?.name}</strong> only.
                          </p>
                        ) : !selectedDoctorId ? (
                          <p className="text-[11px] text-indigo-700 mt-2 bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 font-medium">
                            ✓ No doctor selected: Patient will be assigned to <strong>{activeSelectedHospital?.name}</strong> only.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Patient Assignment Fields */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      Patient Details
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPatientMode('new')}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-colors ${
                          patientMode === 'new' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        New Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setPatientMode('existing')}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg transition-colors ${
                          patientMode === 'existing' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Select Existing Patient
                      </button>
                    </div>
                  </div>

                  {/* Existing Patient Search Picker */}
                  {patientMode === 'existing' && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={patientSearchTerm}
                          onChange={e => setPatientSearchTerm(e.target.value)}
                          placeholder="Search patient name or mobile..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hospital-500"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-100">
                        {filteredRegisteredPatients.map(pt => (
                          <div
                            key={pt.id}
                            onClick={() => handleSelectExistingPatient(pt)}
                            className="p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{pt.name}</span>
                              <span className="text-slate-400 text-[10px] ml-2 font-mono">{pt.mobile}</span>
                            </div>
                            <span className="text-[10px] text-hospital-600 font-black uppercase">Select</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient Name */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      className="w-full text-2xl font-black border-b-2 border-slate-100 p-2 outline-none focus:border-hospital-500 placeholder-slate-200" 
                      value={patientName} 
                      onChange={e => setPatientName(e.target.value)} 
                      placeholder="Patient Name" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mobile Number */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="tel" 
                        className="w-full text-xl font-mono border-b-2 border-slate-100 p-2 outline-none focus:border-hospital-500" 
                        value={mobile} 
                        onChange={e => setMobile(e.target.value)} 
                        placeholder="9988776655" 
                      />
                    </div>

                    {/* Primary Complaint / Condition */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                        Primary Complaint
                      </label>
                      <select 
                        required 
                        className="w-full border-b-2 border-slate-100 p-2 outline-none focus:border-hospital-500 text-sm font-bold bg-white" 
                        value={condition} 
                        onChange={e => setCondition(e.target.value as Condition)}
                      >
                        {Object.values(Condition).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    {/* Appointment Date */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                        Appt Date <span className="text-red-500">*</span>
                      </label>
                      <input 
                        required 
                        type="date" 
                        className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500" 
                        value={apptDate} 
                        onChange={e => {
                          setApptDate(e.target.value);
                          setIsTimeSelectorOpen(true);
                          setFormError(null);
                        }} 
                      />
                    </div>

                    {/* Acqure OPD (Read-only / Locked) */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest flex items-center justify-between">
                        <span>Acqure OPD</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400">
                          <Lock className="w-2.5 h-2.5" /> Locked
                        </span>
                      </label>
                      <input 
                        type="text" 
                        readOnly 
                        disabled
                        value={acqureOpd} 
                        className="w-full border-b-2 border-slate-200 p-2 text-sm font-bold bg-slate-100 text-slate-600 outline-none cursor-not-allowed select-none rounded-t" 
                        title="Acqure OPD is read-only and unchangeable"
                      />
                    </div>

                    {/* Appointment Time & Doctor Availability (Single Source of Truth) */}
                    <div className="md:col-span-2 space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-hospital-600" />
                          <span>Appt Time <span className="text-red-500">*</span></span>
                        </label>
                        {apptTime && (
                          <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Selected: {formatDisplayTime(apptTime)}
                          </span>
                        )}
                      </div>

                      {/* Interactive Time Selector Trigger */}
                      <button
                        type="button"
                        onClick={() => setIsTimeSelectorOpen(prev => !prev)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all ${
                          apptTime 
                            ? 'bg-emerald-50/50 border-emerald-300 text-slate-900 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                            apptTime ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900">
                              {apptTime ? formatDisplayTime(apptTime) : 'Click to select appointment time...'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {activeSelectedDoctor 
                                ? `Attending: ${activeSelectedDoctor.name}` 
                                : 'Select a doctor above to check specific availability'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-hospital-700 bg-hospital-50 px-2.5 py-1 rounded-lg border border-hospital-200">
                            {isTimeSelectorOpen ? 'Hide Roster' : 'Choose Slot'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isTimeSelectorOpen ? 'rotate-180 text-hospital-600' : ''}`} />
                        </div>
                      </button>

                      {/* Doctor Availability & Time Slots Panel */}
                      {isTimeSelectorOpen && (
                        <div className="p-4 sm:p-5 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-4 animate-in fade-in duration-200">
                          
                          {/* 1. Doctor Availability Header */}
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                              <div>
                                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-hospital-600 mb-0.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Doctor Availability</span>
                                </div>
                                {activeSelectedDoctor ? (
                                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                    <span className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                                      <Stethoscope className="w-4 h-4 text-emerald-600" />
                                      {activeSelectedDoctor.name}
                                    </span>
                                    {activeSelectedDoctor.specialization && (
                                      <span className="text-[11px] font-semibold text-slate-600">
                                        • {activeSelectedDoctor.specialization}
                                      </span>
                                    )}
                                    {(activeSelectedDoctor.hospitalName || doctorAssociatedHospital?.name) && (
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                        {doctorAssociatedHospital?.name || activeSelectedDoctor.hospitalName}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs font-bold text-slate-500 mt-0.5">
                                    No doctor selected
                                  </div>
                                )}
                              </div>

                              {/* Status Badge */}
                              {activeSelectedDoctor && (
                                doctorAvailabilityDetailed?.isAvailableOnDate ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Available Today
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 self-start sm:self-auto">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Unavailable
                                  </span>
                                )
                              )}
                            </div>

                            {/* Doctor Working Hours & Breaks Summary */}
                            {activeSelectedDoctor && doctorAvailabilityDetailed?.isAvailableOnDate && (
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200/80">
                                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{doctorAvailabilityDetailed.weekday}, {formatDisplayDate(apptDate).dateFormatted}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                                  <Clock className="w-3.5 h-3.5 text-hospital-600" />
                                  <span>Hours: <strong className="text-slate-900">{formatDisplayTime(doctorAvailabilityDetailed.workingStartTime)} – {formatDisplayTime(doctorAvailabilityDetailed.workingEndTime)}</strong></span>
                                </div>
                                {doctorAvailabilityDetailed.breaks && doctorAvailabilityDetailed.breaks.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px] font-bold">
                                    <Coffee className="w-3 h-3 text-amber-600" />
                                    <span>
                                      Break: {doctorAvailabilityDetailed.breaks.map(b => `${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}`).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 2. When No Doctor is Selected */}
                          {!activeSelectedDoctor ? (
                            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-1 flex-1">
                                <div className="font-black text-amber-950">
                                  Please select a Doctor for this appointment
                                </div>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Appointment time slots are dynamically calculated based on the attending doctor's consultation roster, shift hours, and break schedules in <strong>Doctor Availability</strong>.
                                </p>
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById('doctor-assignment-select') || document.getElementById('hospital-doctor-assignment-select');
                                      if (el) {
                                        el.focus();
                                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                  >
                                    Select Doctor Above
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : !doctorAvailabilityDetailed?.isAvailableOnDate ? (
                            /* 3. Clearly show: "No availability for this doctor on the selected date." */
                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                              <div className="flex items-start gap-2.5">
                                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-sm font-black text-rose-900">
                                    No availability for this doctor on the selected date.
                                  </div>
                                  {doctorAvailabilityDetailed?.unavailabilityReason && (
                                    <p className="text-xs text-rose-700 mt-0.5">
                                      {doctorAvailabilityDetailed.unavailabilityReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {doctorAvailabilityDetailed?.regularDays && (
                                <div className="text-[11px] text-rose-800 bg-white/80 p-2.5 rounded-lg border border-rose-200/70 flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                  <span>
                                    <strong>Regular Consulting Days:</strong> {doctorAvailabilityDetailed.regularDays.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* 4. Display available time slots as easy-to-click buttons/chips */
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                                <span>Select Consultation Time Slot</span>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1 text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available ({doctorAvailabilityDetailed.availableCount})
                                  </span>
                                  <span className="flex items-center gap-1 text-slate-400">
                                    <span className="w-2 h-2 rounded-full bg-slate-300"></span> Booked ({doctorAvailabilityDetailed.bookedCount})
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-52 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200/90">
                                {doctorAvailabilityDetailed.slots.map(slot => {
                                  const isSelected = normalizeTimeSlot(apptTime) === normalizeTimeSlot(slot.time);

                                  if (slot.isBooked) {
                                    return (
                                      <button
                                        key={slot.time}
                                        type="button"
                                        disabled
                                        title={`Slot ${slot.displayTime} is already booked${slot.bookedPatientName ? ` by ${slot.bookedPatientName}` : ''}`}
                                        className="p-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-100 text-slate-400 line-through cursor-not-allowed opacity-70 flex flex-col items-center justify-center gap-0.5 select-none transition-none"
                                      >
                                        <span>{slot.displayTime}</span>
                                        <span className="text-[8px] font-black uppercase tracking-tight text-slate-400 no-underline flex items-center gap-0.5">
                                          <Lock className="w-2.5 h-2.5" /> Booked
                                        </span>
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      onClick={() => {
                                        setApptTime(slot.time);
                                        setFormError(null);
                                      }}
                                      className={`p-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-md ring-2 ring-emerald-300 scale-[1.02]'
                                          : 'bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-800 border border-slate-200 shadow-sm active:scale-95'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1">
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                        {slot.displayTime}
                                      </span>
                                      <span className={`text-[8px] uppercase tracking-wider ${isSelected ? 'text-emerald-100' : 'text-emerald-600 font-bold'}`}>
                                        Available
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 px-1">
                                <span>• Slots outside shift hours and breaks are excluded automatically.</span>
                                {apptTime && (
                                  <span className="text-emerald-700 font-bold">
                                    ✓ Chosen Time Slot: {formatDisplayTime(apptTime)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Fallback for Hospital-Only booking (assignmentType is hospital with no doctor selected) */}
                          {assignmentType === 'hospital' && !activeSelectedDoctor && (
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                                Standard Hospital Facility OPD Hours
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1.5 bg-white rounded-xl border border-slate-200">
                                {defaultHospitalSlots.map(slot => {
                                  const isSelected = normalizeTimeSlot(apptTime) === normalizeTimeSlot(slot.time);
                                  return (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      onClick={() => {
                                        setApptTime(slot.time);
                                        setFormError(null);
                                      }}
                                      className={`p-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center cursor-pointer ${
                                        isSelected
                                          ? 'bg-indigo-600 text-white border-2 border-indigo-600 shadow-md ring-2 ring-indigo-300'
                                          : 'bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-800 border border-slate-200'
                                      }`}
                                    >
                                      <span className="flex items-center gap-1">
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                        {slot.displayTime}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Source */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                        Source <span className="text-red-500">*</span>
                      </label>
                      <select 
                        required
                        className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500" 
                        value={source} 
                        onChange={e => {
                          const val = e.target.value;
                          setSource(val);
                          if (val !== 'Referral') {
                            setReferralPerson('');
                          }
                        }}
                      >
                        <option value="">Select Source...</option>
                        <option value="Google">Google</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Walking">Walking</option>
                        <option value="Relatives / Friend">Relatives / Friend</option>
                        <option value="Billboard">Billboard</option>
                        <option value="Referral">Referral</option>
                      </select>
                    </div>

                    {/* Dynamic Referral Person when Source = Referral */}
                    {source === 'Referral' && (
                      <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="block text-[10px] font-black uppercase text-hospital-600 mb-2 tracking-widest">
                          Referral Person <span className="text-red-500">*</span>
                        </label>
                        <input 
                          required 
                          type="text"
                          className="w-full text-base font-bold border-b-2 border-hospital-200 p-2 outline-none focus:border-hospital-500 placeholder-slate-400 bg-white" 
                          value={referralPerson} 
                          onChange={e => setReferralPerson(e.target.value)} 
                          placeholder="Enter referral person name" 
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-hospital-600 hover:bg-hospital-700 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:scale-[1.01] transition-all mt-6 disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Master Appointment...' : 'Create Appointment'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Consolidated Actions Dropdown Menu */}
      {activeDropdownApp && (
        <div
          data-actions-menu
          style={{
            position: 'fixed',
            top: dropdownPosition.top !== undefined ? `${dropdownPosition.top}px` : undefined,
            bottom: dropdownPosition.bottom !== undefined ? `${dropdownPosition.bottom}px` : undefined,
            right: `${dropdownPosition.right}px`,
            zIndex: 100,
            width: '230px',
          }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 text-slate-800 text-xs animate-in fade-in zoom-in-95 duration-150 select-none overflow-hidden"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span className="truncate max-w-[130px] font-bold text-slate-700">{activeDropdownApp.name}</span>
            <span className="font-mono text-slate-400 text-[10px]">{activeDropdownApp.time}</span>
          </div>

          <div className="p-1 space-y-0.5">
            {/* View Details */}
            <button
              type="button"
              onClick={() => {
                setViewModalApp(activeDropdownApp);
                setActiveDropdownApp(null);
                setStatusSubmenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-hospital-700 rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-hospital-600" />
              <span className="font-bold">View Details</span>
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                handleOpenEditModal(activeDropdownApp);
                setActiveDropdownApp(null);
                setStatusSubmenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-hospital-700 rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <Pencil className="w-4 h-4 text-slate-400" />
              <span>Edit</span>
            </button>

            {/* Add Note */}
            <button
              type="button"
              onClick={() => {
                openNoteModal(activeDropdownApp);
                setActiveDropdownApp(null);
                setStatusSubmenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-hospital-700 rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Add Note</span>
            </button>

            {/* Update Status */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusSubmenuOpen(!statusSubmenuOpen);
                }}
                className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-xl flex items-center justify-between transition-colors ${
                  statusSubmenuOpen ? 'bg-hospital-50 text-hospital-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className={`w-4 h-4 ${statusSubmenuOpen ? 'text-hospital-600' : 'text-slate-400'}`} />
                  <span>Update Status</span>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${statusSubmenuOpen ? 'rotate-90 text-hospital-600' : ''}`} />
              </button>

              {statusSubmenuOpen && (
                <div className="mt-1 mb-1 mx-1 p-1 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-0.5 max-h-48 overflow-y-auto">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st.label}
                      type="button"
                      onClick={() => {
                        handleUpdateStatus(activeDropdownApp.id, st.label);
                        setActiveDropdownApp(null);
                        setStatusSubmenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 text-left text-[11px] font-bold rounded-lg flex items-center justify-between transition-colors ${
                        activeDropdownApp.status === st.label
                          ? 'bg-white text-hospital-700 shadow-xs'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${st.dotClass}`} />
                        <span>{st.label}</span>
                      </span>
                      {activeDropdownApp.status === st.label && (
                        <Check className="w-3.5 h-3.5 text-hospital-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Patient */}
            <button
              type="button"
              onClick={() => {
                handleOpenPatientModal(activeDropdownApp);
                setActiveDropdownApp(null);
                setStatusSubmenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-hospital-700 rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>View Patient</span>
            </button>

            <div className="border-t border-slate-100 my-1" />

            {/* Cancel */}
            <button
              type="button"
              onClick={() => {
                handleUpdateStatus(activeDropdownApp.id, 'Cancelled');
                setActiveDropdownApp(null);
                setStatusSubmenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* View Appointment Details Modal */}
      {viewModalApp && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-hospital-100 border border-hospital-200 text-hospital-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Appointment Details</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                    <span>ID: {viewModalApp.id}</span>
                    {viewModalApp.createdAt && (
                      <>
                        <span>•</span>
                        <span>Logged: {new Date(viewModalApp.createdAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewModalApp(null)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Quick Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status:</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    viewModalApp.status === 'Arrived' || viewModalApp.status === 'Completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : viewModalApp.status === 'Confirmed'
                      ? 'bg-teal-50 text-teal-700 border border-teal-200'
                      : viewModalApp.status === 'Cancelled'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : viewModalApp.status === 'No Show'
                      ? 'bg-slate-100 text-slate-600 border border-slate-300'
                      : viewModalApp.status === 'Follow Up'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {viewModalApp.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700">
                    Visit: {viewModalApp.visit_type || 'OPD'}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-700">
                    {viewModalApp.assignment_type === 'doctor' ? 'Doctor Direct Assignment' : 'Hospital Facility Queue'}
                  </span>
                </div>
              </div>

              {/* 1. Patient Information */}
              <div className="rounded-2xl border border-slate-200/80 p-4 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" /> Patient Details
                  </span>
                  {viewModalPatient ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Matched in EHR (UHID: {viewModalPatient.id})
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Intake Lead
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">{viewModalApp.name}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile Number</span>
                    <a 
                      href={`tel:${viewModalApp.mobile}`}
                      className="text-xs font-bold text-hospital-600 hover:text-hospital-700 flex items-center gap-1 mt-1 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" /> {viewModalApp.mobile}
                    </a>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Clinical Condition</span>
                    <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      {viewModalApp.condition}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Visit Classification</span>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      {viewModalApp.visit_type || viewModalApp.bookingType || 'Outpatient Consultation'}
                    </div>
                  </div>
                </div>

                {/* Additional EHR Patient Demographics if linked */}
                {viewModalPatient && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] bg-slate-50/70 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 font-medium block text-[9px] uppercase">Age / Gender</span>
                      <strong className="text-slate-700 font-bold">
                        {viewModalPatient.age ? `${viewModalPatient.age} yrs` : '—'} / {viewModalPatient.gender || '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block text-[9px] uppercase">Insurance</span>
                      <strong className="text-slate-700 font-bold">
                        {viewModalPatient.hasInsurance === 'Yes' ? (viewModalPatient.insuranceName || 'Insured') : 'Self-Pay'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block text-[9px] uppercase">Registered</span>
                      <strong className="text-slate-700 font-bold truncate block">
                        {viewModalPatient.registeredAt || '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block text-[9px] uppercase">Occupation</span>
                      <strong className="text-slate-700 font-bold truncate block">
                        {viewModalPatient.occupation || '—'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Slot & Date Schedule */}
              <div className="rounded-2xl border border-slate-200/80 p-4 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Slot & Date
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Slot Type: {viewModalApp.bookingType || 'Standard'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled Date</span>
                    <div className="text-xs font-black text-slate-800 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-hospital-600" />
                      {viewModalApp.date}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Time Slot</span>
                    <div className="text-xs font-black text-slate-800 flex items-center gap-1.5 mt-1">
                      <Clock className="w-3.5 h-3.5 text-hospital-600" />
                      {viewModalApp.time}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Created Timestamp</span>
                    <div className="text-[11px] font-semibold text-slate-700 mt-1 truncate">
                      {viewModalApp.createdAt ? new Date(viewModalApp.createdAt).toLocaleString() : 'System Scheduled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Assigned Doctor & Hospital */}
              <div className="rounded-2xl border border-slate-200/80 p-4 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-500" /> Assigned Doctor / Hospital
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    {viewModalApp.assignment_type === 'hospital' ? 'Hospital Queue' : 'Direct Doctor'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Doctor</span>
                    <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 mt-1">
                      <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{viewModalApp.assignedDoctorName || viewModalDoctor?.name || 'No Specific Doctor Assigned'}</span>
                    </div>
                    {viewModalDoctor?.specialization && (
                      <div className="text-[11px] text-emerald-700 font-medium mt-1">
                        Specialization: {viewModalDoctor.specialization}
                      </div>
                    )}
                    {viewModalApp.doctor_id && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Doctor ID: {viewModalApp.doctor_id}
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hospital / Facility</span>
                    <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 mt-1">
                      <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{viewModalApp.hospitalName || viewModalHospital?.name || 'Primary Facility'}</span>
                    </div>
                    {viewModalHospital?.city && (
                      <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {viewModalHospital.city}
                      </div>
                    )}
                    {viewModalApp.hospital_id && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Facility ID: {viewModalApp.hospital_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Other Relevant Details: Source & Provenance */}
              <div className="rounded-2xl border border-slate-200/80 p-4 bg-white shadow-xs">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Source & Provenance
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Acquisition Channel</span>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      {viewModalApp.source || 'Direct / Walk-in'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Referral Partner / Doctor</span>
                    <div className="text-xs font-bold text-slate-800 mt-1">
                      {viewModalApp.referral_person || viewModalApp.sourceDoctorName || 'None'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scheduled By</span>
                    <div className="text-xs font-bold text-indigo-700 flex items-center gap-1 mt-1">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      {viewModalApp.username || 'Master Admin'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Clinical Intake & Counseling Evaluation (if present) */}
              {viewModalPatient?.doctorAssessment || viewModalPatient?.packageProposal ? (
                <div className="rounded-2xl border border-slate-200/80 p-4 bg-emerald-50/30 shadow-xs">
                  <div className="flex items-center justify-between mb-3 border-b border-emerald-100 pb-2">
                    <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" /> Clinical Assessment & Counseling Notes
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {viewModalPatient?.doctorAssessment && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">Doctor Assessment</span>
                        <div className="text-[11px] text-slate-700">
                          <strong>Quick Code:</strong> {viewModalPatient.doctorAssessment.quickCode || '—'}
                        </div>
                        {viewModalPatient.doctorAssessment.notes && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 italic">
                            "{viewModalPatient.doctorAssessment.notes}"
                          </div>
                        )}
                      </div>
                    )}
                    {viewModalPatient?.packageProposal && (
                      <div className="p-3 bg-white rounded-xl border border-emerald-100 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">Package Counseling</span>
                        <div className="text-[11px] text-slate-700">
                          <strong>Proposed Amount:</strong> {viewModalPatient.packageProposal.packageAmount ? `₹${viewModalPatient.packageProposal.packageAmount}` : '—'}
                        </div>
                        {viewModalPatient.packageProposal.counselingStrategy && (
                          <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 italic">
                            "{viewModalPatient.packageProposal.counselingStrategy}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-[11px] flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Clinical diagnosis notes and package counseling strategy will be documented during the patient's OPD intake session.
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewModalApp(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewModalApp;
                    setViewModalApp(null);
                    handleOpenPatientModal(target);
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Patient Record</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = viewModalApp;
                    setViewModalApp(null);
                    handleOpenEditModal(target);
                  }}
                  className="px-4 py-2 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Pencil className="w-3.5 h-3.5 text-white" />
                  <span>Edit Appointment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editModalApp && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Appointment</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {editModalApp.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalApp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAppointment} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {editFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Patient Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Condition / Complaint <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value as Condition)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                  >
                    {Object.values(Condition).map((cond) => (
                      <option key={cond} value={cond}>{cond}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st.label} value={st.label}>{st.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Time Slot <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Assignment Type */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Assign To
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditAssignmentType('doctor')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      editAssignmentType === 'doctor'
                        ? 'bg-white text-hospital-700 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Doctor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditAssignmentType('hospital')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      editAssignmentType === 'hospital'
                        ? 'bg-white text-hospital-700 shadow-sm border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Hospital</span>
                  </button>
                </div>

                {editAssignmentType === 'doctor' ? (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Select Doctor <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editDoctorId}
                      onChange={(e) => setEditDoctorId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500"
                    >
                      <option value="">Select Doctor...</option>
                      {doctorsWithAccess.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} {doc.hospitalName ? `(${doc.hospitalName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Select Hospital / Facility <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={editHospitalId}
                      onChange={(e) => setEditHospitalId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500"
                    >
                      <option value="">Select Hospital Facility...</option>
                      {hospitalsWithAccess.map((hosp) => (
                        <option key={hosp.id} value={hosp.id}>
                          {hosp.name} ({hosp.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Source & Referral */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Source
                  </label>
                  <select
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                  >
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Walking">Walking</option>
                    <option value="Relatives / Friend">Relatives / Friend</option>
                    <option value="Billboard">Billboard</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {editSource === 'Referral' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-hospital-600 mb-1">
                      Referral Person <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editReferralPerson}
                      onChange={(e) => setEditReferralPerson(e.target.value)}
                      placeholder="Name of referrer"
                      className="w-full px-3 py-2 bg-hospital-50/50 border border-hospital-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-hospital-500 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalApp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-5 py-2 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {isEditSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Patient Details Modal */}
      {viewPatientData && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Patient Record</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {viewPatientData.patient ? `UHID: ${viewPatientData.patient.id}` : 'Scheduled Lead'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPatientData(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {viewPatientData.patient ? (
                <>
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">{viewPatientData.patient.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {viewPatientData.patient.gender} • {viewPatientData.patient.age} yrs • {viewPatientData.patient.occupation || 'Self'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-black text-[10px] uppercase border border-emerald-200">
                      {viewPatientData.patient.status || 'Active'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mobile</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {viewPatientData.patient.mobile}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Insurance</span>
                      <span className="font-bold text-slate-800">
                        {viewPatientData.patient.hasInsurance === 'Yes' ? (viewPatientData.patient.insuranceName || 'Yes') : 'No'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Registered At</span>
                      <span className="font-bold text-slate-800">
                        {viewPatientData.patient.registeredAt ? new Date(viewPatientData.patient.registeredAt).toLocaleDateString() : '—'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                      <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Condition</span>
                      <span className="font-bold text-emerald-700">
                        {viewPatientData.patient.condition}
                      </span>
                    </div>
                  </div>

                  {viewPatientData.patient.doctorAssessment && (
                    <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block">Doctor Assessment Summary</span>
                      <div className="flex flex-wrap gap-2 text-[11px] font-bold text-indigo-900">
                        {viewPatientData.patient.doctorAssessment.quickCode && (
                          <span className="px-2 py-0.5 bg-indigo-100 rounded-md">Code: {viewPatientData.patient.doctorAssessment.quickCode}</span>
                        )}
                        {viewPatientData.patient.doctorAssessment.surgeryNeeded && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">Surgery Advised</span>
                        )}
                        {viewPatientData.patient.doctorAssessment.assignedDoctorName && (
                          <span className="px-2 py-0.5 bg-white rounded-md text-slate-700">Dr. {viewPatientData.patient.doctorAssessment.assignedDoctorName}</span>
                        )}
                      </div>
                      {viewPatientData.patient.doctorAssessment.notes && (
                        <p className="text-[11px] text-slate-600 font-medium italic mt-1">"{viewPatientData.patient.doctorAssessment.notes}"</p>
                      )}
                    </div>
                  )}

                  {viewPatientData.patient.packageProposal && (
                    <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                      <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">Package Counseling</span>
                      <div className="flex items-center justify-between font-bold text-[11px] text-emerald-950">
                        <span>Outcome: {viewPatientData.patient.packageProposal.outcome || 'Pending'}</span>
                        {viewPatientData.patient.packageProposal.packageAmount && (
                          <span className="font-black text-emerald-700">₹{viewPatientData.patient.packageProposal.packageAmount}</span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-amber-900 space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Scheduled Appointment Lead</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      This patient is currently booked on the Master Scheduling Roster. Once the patient arrives for their appointment and completes front office intake, an official hospital file will be generated.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <div className="text-sm font-extrabold text-slate-900">{viewPatientData.appointment.name}</div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {viewPatientData.appointment.mobile}</span>
                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-bold text-[9px]">
                        {viewPatientData.appointment.condition}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <span>Scheduled: <strong>{viewPatientData.appointment.date}</strong> at <strong>{viewPatientData.appointment.time}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewPatientData(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Note Modal */}
      {showNoteModal && noteTargetApp && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Notes</h3>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {noteTargetApp.name} • {noteTargetApp.mobile}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
              {/* Add New Note */}
              <div className="space-y-2.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Add New Note
                </label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Type note content here..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={!newNoteContent.trim() || isSavingNote}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs"
                  >
                    {isSavingNote ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Save Note</span>
                  </button>
                </div>
              </div>

              {/* Previous Notes */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Previous Notes</h4>
                
                {isLoadingNotes ? (
                  <div className="flex items-center justify-center p-6 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                ) : targetNotes.length === 0 ? (
                  <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs font-semibold italic">
                    No previous notes found for this lead.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {targetNotes.map(note => (
                      <div key={note.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs relative">
                        <p className="text-xs text-slate-700 whitespace-pre-wrap font-medium">{note.note}</p>
                        <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {note.created_by_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {note.created_date} • {note.created_time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
