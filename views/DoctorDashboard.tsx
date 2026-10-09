import React, { useState, useEffect, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { formatDateToDDMMMYYYY, formatDateTimeToDDMMMYYYY } from '../utils/dateFormatter';
import { Stethoscope, Check, ChevronRight, ChevronLeft, User, Calendar, Save, Briefcase, CreditCard, Activity, Tag, FileText, Database, Clock, Share2, ShieldCheck, Search, Filter, History, ClipboardList, RefreshCcw, Upload, Trash2, Loader2, Plus, CheckCircle2 } from 'lucide-react';

const PROCEDURES = [
  "Lap Cholecystectomy",
  "Lap Appendectomy",
  "Lap Umbilical Hernioplasty",
  "Lap Inguinal Hernioplasty",
  "Laser Varicose Veins",
  "Laser Piles",
  "Laser Pilonidoplasty",
  "Laser Fistula + Perianal Abscess",
  "Laser Fissure",
  "Stapler Haemorrhoidectomy",
  "Other"
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayColorTheme {
  cardBg: string;
  cardBorder: string;
  cardHover: string;
  accentBar: string;
  dayTitle: string;
  dateBadge: string;
  breakBtn: string;
  footerBadge: string;
  timeInputFocus: string;
  statusBadge: string;
}

const DAY_COLOR_THEMES: Record<string, DayColorTheme> = {
  Monday: {
    cardBg: 'bg-sky-50/70',
    cardBorder: 'border-sky-200/90',
    cardHover: 'hover:border-sky-400 hover:shadow-sky-100/50',
    accentBar: 'bg-sky-500',
    dayTitle: 'text-sky-950',
    dateBadge: 'bg-sky-100 text-sky-800 border-sky-200',
    breakBtn: 'text-sky-700 bg-sky-100/80 hover:bg-sky-200 border-sky-200',
    footerBadge: 'text-sky-900 bg-sky-100/80 border-sky-200',
    timeInputFocus: 'focus:border-sky-500 focus:ring-sky-100',
    statusBadge: 'text-sky-700'
  },
  Tuesday: {
    cardBg: 'bg-emerald-50/70',
    cardBorder: 'border-emerald-200/90',
    cardHover: 'hover:border-emerald-400 hover:shadow-emerald-100/50',
    accentBar: 'bg-emerald-500',
    dayTitle: 'text-emerald-950',
    dateBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    breakBtn: 'text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200 border-emerald-200',
    footerBadge: 'text-emerald-900 bg-emerald-100/80 border-emerald-200',
    timeInputFocus: 'focus:border-emerald-500 focus:ring-emerald-100',
    statusBadge: 'text-emerald-700'
  },
  Wednesday: {
    cardBg: 'bg-violet-50/70',
    cardBorder: 'border-violet-200/90',
    cardHover: 'hover:border-violet-400 hover:shadow-violet-100/50',
    accentBar: 'bg-violet-500',
    dayTitle: 'text-violet-950',
    dateBadge: 'bg-violet-100 text-violet-800 border-violet-200',
    breakBtn: 'text-violet-700 bg-violet-100/80 hover:bg-violet-200 border-violet-200',
    footerBadge: 'text-violet-900 bg-violet-100/80 border-violet-200',
    timeInputFocus: 'focus:border-violet-500 focus:ring-violet-100',
    statusBadge: 'text-violet-700'
  },
  Thursday: {
    cardBg: 'bg-amber-50/70',
    cardBorder: 'border-amber-200/90',
    cardHover: 'hover:border-amber-400 hover:shadow-amber-100/50',
    accentBar: 'bg-amber-500',
    dayTitle: 'text-amber-950',
    dateBadge: 'bg-amber-100 text-amber-800 border-amber-200',
    breakBtn: 'text-amber-800 bg-amber-100/80 hover:bg-amber-200 border-amber-200',
    footerBadge: 'text-amber-900 bg-amber-100/80 border-amber-200',
    timeInputFocus: 'focus:border-amber-500 focus:ring-amber-100',
    statusBadge: 'text-amber-700'
  },
  Friday: {
    cardBg: 'bg-teal-50/70',
    cardBorder: 'border-teal-200/90',
    cardHover: 'hover:border-teal-400 hover:shadow-teal-100/50',
    accentBar: 'bg-teal-500',
    dayTitle: 'text-teal-950',
    dateBadge: 'bg-teal-100 text-teal-800 border-teal-200',
    breakBtn: 'text-teal-700 bg-teal-100/80 hover:bg-teal-200 border-teal-200',
    footerBadge: 'text-teal-900 bg-teal-100/80 border-teal-200',
    timeInputFocus: 'focus:border-teal-500 focus:ring-teal-100',
    statusBadge: 'text-teal-700'
  },
  Saturday: {
    cardBg: 'bg-indigo-50/70',
    cardBorder: 'border-indigo-200/90',
    cardHover: 'hover:border-indigo-400 hover:shadow-indigo-100/50',
    accentBar: 'bg-indigo-500',
    dayTitle: 'text-indigo-950',
    dateBadge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    breakBtn: 'text-indigo-700 bg-indigo-100/80 hover:bg-indigo-200 border-indigo-200',
    footerBadge: 'text-indigo-900 bg-indigo-100/80 border-indigo-200',
    timeInputFocus: 'focus:border-indigo-500 focus:ring-indigo-100',
    statusBadge: 'text-indigo-700'
  },
  Sunday: {
    cardBg: 'bg-rose-50/70',
    cardBorder: 'border-rose-200/90',
    cardHover: 'hover:border-rose-400 hover:shadow-rose-100/50',
    accentBar: 'bg-rose-500',
    dayTitle: 'text-rose-950',
    dateBadge: 'bg-rose-100 text-rose-800 border-rose-200',
    breakBtn: 'text-rose-700 bg-rose-100/80 hover:bg-rose-200 border-rose-200',
    footerBadge: 'text-rose-900 bg-rose-100/80 border-rose-200',
    timeInputFocus: 'focus:border-rose-500 focus:ring-rose-100',
    statusBadge: 'text-rose-700'
  }
};

const formatToDateTime = (dateString: string | undefined | null): string => {
  return formatDateTimeToDDMMMYYYY(dateString);
};

export const DoctorDashboard: React.FC = () => {
  const { 
    patients, 
    updateDoctorAssessment, 
    staffUsers, 
    updateStaff, 
    schedulingPermissions, 
    appointments, 
    updateAppointment,
    currentUserRole,
    activeDashboard,
    setActiveDashboard
  } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Current active view synced with side menu
  const activeTab: 'patients' | 'appointments' | 'availability' | 'profile' = useMemo(() => {
    if (activeDashboard === 'doctor_appointments') return 'appointments';
    if (activeDashboard === 'doctor_availability') return 'availability';
    if (activeDashboard === 'doctor_profile') return 'profile';
    return 'patients';
  }, [activeDashboard]);

  // Updated state for Date Range
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [formState, setFormState] = useState<Partial<DoctorAssessment>>({
    quickCode: undefined,
    painSeverity: undefined,
    affordability: undefined,
    conversionReadiness: undefined,
    tentativeSurgeryDate: '',
    surgeryProcedure: '',
    otherSurgeryName: '',
    notes: '',
    doctorSignature: ''
  });

  const getFormattedDoctorName = (name?: string) => {
    if (!name) return 'Doctor';
    const trimmed = name.trim();
    if (trimmed.toLowerCase().startsWith('dr.') || trimmed.toLowerCase().startsWith('dr ')) {
      return trimmed;
    }
    return `Dr. ${trimmed}`;
  };

  const currentDoctorId = localStorage.getItem('hms_hospital_id') || '';
  const loggedInDoctor = staffUsers?.find(u => u.id === currentDoctorId) || {
    id: currentDoctorId,
    name: localStorage.getItem('hms_hospital_name') || 'Doctor',
    email: localStorage.getItem('hms_hospital_email') || '',
    mobile: 'N/A',
    role: 'DOCTOR',
    registeredAt: new Date().toISOString()
  };

  const defaultAvailability = {
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    startTime: '09:00',
    endTime: '17:00',
    unavailableDates: []
  };

  const DEFAULT_DAY_SCHEDULES: any[] = [
    { day: "Monday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Tuesday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Wednesday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Thursday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Friday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Saturday", status: "Available", startTime: "09:00", endTime: "12:00", breaks: [] },
    { day: "Sunday", status: "Holiday", startTime: "09:00", endTime: "17:00", breaks: [] },
  ];

  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [newLeaveDate, setNewLeaveDate] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [isDirectoryCollapsed, setIsDirectoryCollapsed] = useState(false);

  const [daySchedules, setDaySchedules] = useState<any[]>(DEFAULT_DAY_SCHEDULES);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [blockedDateInput, setBlockedDateInput] = useState('');
  const [blockedReasonInput, setBlockedReasonInput] = useState('Vacation');

  // True Weekly Calendar state & helpers
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));

  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(currentWeekStart);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const weekdayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const shortWeekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = d.getDate();
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const isoDate = d.toISOString().split('T')[0];
      days.push({
        dateObj: d,
        weekday: weekdayName,
        shortWeekday,
        dateNum,
        monthStr,
        formattedDate: `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${String(dateNum).padStart(2, '0')} ${monthStr} ${year}`, // e.g. "Monday, 05 Oct 2026"
        isoDate
      });
    }
    return days;
  }, [currentWeekStart]);

  const weekRangeLabel = useMemo(() => {
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.dateNum} ${first.monthStr} - ${last.dateNum} ${last.monthStr}, ${last.dateObj.getFullYear()}`;
  }, [weekDays]);

  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleTodayWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  // Synchronize state with loaded metadata database records
  useEffect(() => {
    if (loggedInDoctor) {
      const av = (loggedInDoctor.availability || defaultAvailability) as any;
      setAvailableDays(av.availableDays || defaultAvailability.availableDays);
      setStartTime(av.startTime || defaultAvailability.startTime);
      setEndTime(av.endTime || defaultAvailability.endTime);
      setUnavailableDates(av.unavailableDates || defaultAvailability.unavailableDates);
      setDaySchedules(av.daySchedules || DEFAULT_DAY_SCHEDULES);
      setBlockedDates(av.blockedDates || []);
    }
  }, [loggedInDoctor.id, loggedInDoctor.availability]);

  useEffect(() => {
    if (selectedPatient) {
      setFormState(selectedPatient.doctorAssessment || {
        quickCode: undefined,
        painSeverity: undefined,
        affordability: undefined,
        conversionReadiness: undefined,
        tentativeSurgeryDate: '',
        surgeryProcedure: '',
        otherSurgeryName: '',
        notes: '',
        doctorSignature: ''
      });
    }
  }, [selectedPatient]);
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || isSavingAssessment) return;

    const { quickCode, doctorSignature, painSeverity, affordability, conversionReadiness, surgeryProcedure, otherSurgeryName } = formState;

    if (!quickCode || !doctorSignature) {
      alert("Please select a Quick Code and provide your signature.");
      return;
    }

    if (quickCode === SurgeonCode.S1) {
      if (!painSeverity || !affordability || !conversionReadiness || !surgeryProcedure) {
        alert("Please complete all additional surgery fields before saving.");
        return;
      }
      if (surgeryProcedure === 'Other' && !otherSurgeryName) {
        alert("Please specify the surgery procedure name.");
        return;
      }
    }

    let customStatus: string | undefined = undefined;
    if (formState.quickCode === SurgeonCode.M1) {
      customStatus = 'Medication Done';
    } else if (formState.quickCode === SurgeonCode.S1) {
      customStatus = 'Package Proposal';
    }

    setIsSavingAssessment(true);
    try {
      await updateDoctorAssessment(selectedPatient.id, formState, customStatus);
      setSelectedPatient(null);
    } catch (err) {
      alert("Failed to save assessment. Please try again.");
    } finally {
      setIsSavingAssessment(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Unsupported format. Please upload PNG, JPG, or WEBP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image is too large. Max size is 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = reader.result as string;
      updateStaff(loggedInDoctor.id, { photoUrl: b64 });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvailability = async () => {
    if (isSavingAvailability) return;
    setIsSavingAvailability(true);
    try {
      await updateStaff(loggedInDoctor.id, {
        availability: {
          availableDays,
          startTime,
          endTime,
          unavailableDates,
          daySchedules,
          blockedDates
        }
      });
      alert('Availability schedule saved successfully!');
    } catch (err) {
      alert('Failed to save availability schedule.');
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const updateDayScheduleField = (dayName: string, field: string, value: any) => {
    setDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        return { ...ds, [field]: value };
      }
      return ds;
    }));
  };

  const addBreakToDay = (dayName: string) => {
    setDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        const currentBreaks = ds.breaks || [];
        return {
          ...ds,
          breaks: [...currentBreaks, { startTime: "13:00", endTime: "14:00" }]
        };
      }
      return ds;
    }));
  };

  const updateBreakTime = (dayName: string, breakIdx: number, field: "startTime" | "endTime", val: string) => {
    setDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        const currentBreaks = [...(ds.breaks || [])];
        if (currentBreaks[breakIdx]) {
          currentBreaks[breakIdx] = { ...currentBreaks[breakIdx], [field]: val };
        }
        return { ...ds, breaks: currentBreaks };
      }
      return ds;
    }));
  };

  const removeBreakFromDay = (dayName: string, breakIdx: number) => {
    setDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        const currentBreaks = (ds.breaks || []).filter((_: any, idx: number) => idx !== breakIdx);
        return { ...ds, breaks: currentBreaks };
      }
      return ds;
    }));
  };

  const addBlockedDateItem = () => {
    if (!blockedDateInput) return;
    const dateExists = blockedDates.some(b => b.date === blockedDateInput);
    if (dateExists) {
      alert("This date is already blocked.");
      return;
    }
    const newItem = {
      date: blockedDateInput,
      category: blockedReasonInput as any,
      reason: blockedReasonInput
    };
    const updated = [...blockedDates, newItem].sort((a, b) => a.date.localeCompare(b.date));
    setBlockedDates(updated);
    // Sync into legacy unavailableDates
    if (!unavailableDates.includes(blockedDateInput)) {
      setUnavailableDates([...unavailableDates, blockedDateInput].sort());
    }
    setBlockedDateInput("");
  };

  const removeBlockedDateItem = (dateStr: string) => {
    setBlockedDates(prev => prev.filter(b => b.date !== dateStr));
    setUnavailableDates(prev => prev.filter(d => d !== dateStr));
  };

  // Filter patients based on Date Range and visibility criteria
  const allPatients = [...patients]
    .filter(p => {
      // Filter by Assigned Doctor
      const currentDoctorId = localStorage.getItem('hms_hospital_id');
      const currentDoctorName = localStorage.getItem('hms_hospital_name');
      const assignedId = p.doctorAssessment?.assignedDoctorId;
      const assignedName = p.doctorAssessment?.assignedDoctorName;

      // Doctors only see patients explicitly assigned to them
      if (currentDoctorId || currentDoctorName) {
        const idMatches = !!(assignedId && currentDoctorId && assignedId === currentDoctorId);
        const nameMatches = !!(assignedName && currentDoctorName && assignedName.toLowerCase().trim() === currentDoctorName.toLowerCase().trim());
        if (!idMatches && !nameMatches) {
          return false;
        }
      }

      // Helper to check if clinical assessment has actually been conducted by doctor
      const isAssessmentCompleted = (patientItem: Patient): boolean => {
        return Boolean(
          patientItem.doctorAssessment?.quickCode || 
          patientItem.doctorAssessment?.assessedAt || 
          patientItem.doctorAssessment?.doctorSignature ||
          patientItem.status === 'Doctor Done' ||
          patientItem.status === 'Medication Done' ||
          patientItem.status === 'Package Proposal'
        );
      };

      // Base visibility: Must be arrived or have an assessment
      const isVisible = p.status === 'Arrived' || isAssessmentCompleted(p);
      
      // Date range filter: Check if entry_date is within [startDate, endDate]
      const entryDateStr = p.entry_date || '';
      const inRange = entryDateStr >= startDate && entryDateStr <= endDate;
      
      return isVisible && inRange;
    })
    .sort((a, b) => {
      const isAssessmentDone = (pt: Patient) => Boolean(
        pt.doctorAssessment?.quickCode || 
        pt.doctorAssessment?.assessedAt || 
        pt.doctorAssessment?.doctorSignature ||
        pt.status === 'Doctor Done' ||
        pt.status === 'Medication Done' ||
        pt.status === 'Package Proposal'
      );
      // Sort: Pending first, then by time DESC
      const aIsPending = !isAssessmentDone(a);
      const bIsPending = !isAssessmentDone(b);
      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;
      const timeA = new Date(a.registeredAt).getTime();
      const timeB = new Date(b.registeredAt).getTime();
      return timeB - timeA;
    });

  const isAssessmentCompleted = (p: Patient): boolean => {
    return Boolean(
      p.doctorAssessment?.quickCode || 
      p.doctorAssessment?.assessedAt || 
      p.doctorAssessment?.doctorSignature ||
      p.status === 'Doctor Done' ||
      p.status === 'Medication Done' ||
      p.status === 'Package Proposal'
    );
  };

  const filteredDirectoryPatients = allPatients.filter(p => {
    const s = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(s) || 
           (p.id && p.id.toLowerCase().includes(s)) || 
           p.mobile.includes(s);
  });

  // Derived lists for Pending and Done sections
  const pendingPatients = filteredDirectoryPatients.filter(p => !isAssessmentCompleted(p));
  const donePatients = filteredDirectoryPatients.filter(p => isAssessmentCompleted(p));

  const pendingCount = allPatients.filter(p => p.status === 'Arrived' && !isAssessmentCompleted(p)).length;
  const doneCount = allPatients.filter(p => isAssessmentCompleted(p)).length;

  const doctorAppointments = useMemo(() => {
    return (appointments || []).filter(a => {
      const docId = loggedInDoctor.id;
      const docName = loggedInDoctor.name ? loggedInDoctor.name.toLowerCase().trim() : '';
      const docNameWithoutPrefix = docName.replace(/^dr\.?\s*/i, '');
      const aDocName = (a.assignedDoctorName || '').toLowerCase().trim();
      const aDocNameWithoutPrefix = aDocName.replace(/^dr\.?\s*/i, '');

      const matchDoc = !!(
        (docId && (a.assignedDoctorId === docId || a.doctor_id === docId)) ||
        (docName && aDocName && (aDocName === docName || aDocNameWithoutPrefix === docNameWithoutPrefix))
      );

      if (loggedInDoctor.id === 'static_doctor') {
        return matchDoc || !a.assignedDoctorId;
      }
      return matchDoc;
    }).sort((a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || '')));
  }, [appointments, loggedInDoctor]);
    
  const isSurgery = formState.quickCode === SurgeonCode.S1;

  // Reusable Patient Card component for the directory
  // Fixed: Use React.FC to properly handle key prop and avoid TS mapping errors
  const PatientCard: React.FC<{ p: Patient }> = ({ p }) => (
    <div 
      onClick={() => setSelectedPatient(p)} 
      className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
        selectedPatient?.id === p.id 
          ? 'border-hospital-500 bg-hospital-50 shadow-sm' 
          : isAssessmentCompleted(p) 
            ? 'border-gray-100 bg-gray-50' 
            : 'border-slate-100 bg-white'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-bold text-gray-800">{p.name}</div>
          <div className="text-[10px] text-gray-500 font-medium uppercase mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{p.age}Y • {p.gender} • {p.condition}</span>
            <span className="hidden sm:inline w-1 h-1 bg-slate-200 rounded-full"></span>
            <span className="flex items-center gap-1 text-hospital-600 font-bold">
              <Clock className="w-3 h-3" /> {p.entry_date}
            </span>
          </div>
          {p.updated_at && (
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1.5 flex items-center gap-1">
              <RefreshCcw className="w-2.5 h-2.5" /> Updated: {formatToDateTime(p.updated_at)}
            </div>
          )}
        </div>
        {isAssessmentCompleted(p) ? (
          <Check className="w-5 h-5 text-green-500 bg-green-100 rounded-full p-1" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">



      {activeTab === 'patients' ? (
        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-90px)] min-h-[600px] gap-4 sm:gap-6 animate-in fade-in duration-300">
          {/* Patient Directory Sidebar Panel */}
          {!isDirectoryCollapsed && (
            <div className="w-full lg:w-1/3 h-[500px] lg:h-full bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden shrink-0 transition-all duration-300">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDirectoryCollapsed(true)}
                    className="p-1.5 hover:bg-slate-200/80 text-slate-500 rounded-lg transition-colors cursor-pointer"
                    title="Collapse Patient Directory"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <User className="w-5 h-5 text-hospital-600" /> Patient Directory
                  </h3>
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Pending</span>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 leading-none">{pendingCount}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Done</span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 leading-none">{doneCount}</span>
                  </div>
                </div>
              </div>

              {/* Directory Filters */}
              <div className="p-3 bg-white border-b space-y-3 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search patients..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div 
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input') as HTMLInputElement | null;
                      if (input) {
                        try {
                          if (typeof input.showPicker === 'function') {
                            input.showPicker();
                          } else {
                            input.focus();
                          }
                        } catch {
                          input.focus();
                        }
                      }
                    }}
                    className="flex-1 relative flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter shrink-0 select-none">From</span>
                    <input
                      type="date"
                      className="w-full bg-transparent text-[11px] font-bold outline-none cursor-pointer"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          if (typeof e.currentTarget.showPicker === 'function') {
                            e.currentTarget.showPicker();
                          }
                        } catch {}
                      }}
                    />
                  </div>
                  <div 
                    onClick={(e) => {
                      const input = e.currentTarget.querySelector('input') as HTMLInputElement | null;
                      if (input) {
                        try {
                          if (typeof input.showPicker === 'function') {
                            input.showPicker();
                          } else {
                            input.focus();
                          }
                        } catch {
                          input.focus();
                        }
                      }
                    }}
                    className="flex-1 relative flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter shrink-0 select-none">To</span>
                    <input
                      type="date"
                      className="w-full bg-transparent text-[11px] font-bold outline-none cursor-pointer"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      onClick={(e) => {
                        try {
                          if (typeof e.currentTarget.showPicker === 'function') {
                            e.currentTarget.showPicker();
                          }
                        } catch {}
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-3 space-y-6">
                {/* Pending Section */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending Assessments
                    </span>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 rounded-full">{pendingPatients.length}</span>
                  </div>
                  <div className="space-y-2">
                    {pendingPatients.map(p => <PatientCard key={p.id} p={p} />)}
                    {pendingPatients.length === 0 && (
                      <div className="p-4 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                        No Pending patients
                      </div>
                    )}
                  </div>
                </div>

                {/* Done Section */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-emerald-500" /> Completed Today
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 rounded-full">{donePatients.length}</span>
                  </div>
                  <div className="space-y-2">
                    {donePatients.map(p => <PatientCard key={p.id} p={p} />)}
                    {donePatients.length === 0 && (
                      <div className="p-4 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                        No Completed assessments
                      </div>
                    )}
                  </div>
                </div>

                {filteredDirectoryPatients.length === 0 && (
                  <div className="pt-10 text-center text-slate-300 text-xs font-black uppercase tracking-widest">
                    No results for this date range
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Patient Assessment Workspace */}
          <div className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-[500px] lg:h-full transition-all duration-300 ${
            isDirectoryCollapsed ? 'w-full lg:w-full flex-1' : 'w-full lg:w-2/3'
          }`}>
            {selectedPatient ? (
              <form onSubmit={handleSave} className="flex flex-col h-full">
                <div className="p-4 sm:p-5 border-b bg-white shrink-0 flex items-center gap-3 overflow-x-auto scrollbar-thin">
                  {isDirectoryCollapsed && (
                    <button
                      type="button"
                      onClick={() => setIsDirectoryCollapsed(false)}
                      className="px-3.5 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shrink-0 cursor-pointer"
                      title="Expand Patient Directory"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span className="whitespace-nowrap">Directory ({pendingCount})</span>
                    </button>
                  )}
                  <div className="flex items-center gap-3 min-w-max pb-0.5 flex-1">
                    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-3 rounded-2xl shadow-sm min-w-[150px] flex-1 shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-3 h-3 text-indigo-500" />
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Name</span>
                      </div>
                      <div className="text-sm font-black text-indigo-900 truncate leading-tight">{selectedPatient.name}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-3 rounded-2xl shadow-sm min-w-[150px] flex-1 shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Activity className="w-3 h-3 text-blue-500" />
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Age / Gender</span>
                      </div>
                      <div className="text-sm font-black text-blue-900 leading-tight">{selectedPatient.age}Y <span className="text-blue-200">|</span> {selectedPatient.gender}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 p-3 rounded-2xl shadow-sm min-w-[150px] flex-1 shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Briefcase className="w-3 h-3 text-amber-500" />
                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Occupation</span>
                      </div>
                      <div className="text-sm font-black text-amber-900 truncate leading-tight">{selectedPatient.occupation || '---'}</div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 p-3 rounded-2xl shadow-sm min-w-[150px] flex-1 shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Share2 className="w-3 h-3 text-teal-500" />
                        <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest">Source</span>
                      </div>
                      <div className="text-sm font-black text-teal-900 truncate leading-tight">
                        {selectedPatient.source === 'Doctor Recommended' ? `Dr. ${selectedPatient.sourceDoctorName || 'Recommended'}` : selectedPatient.source}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-3 rounded-2xl shadow-sm min-w-[150px] flex-1 shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <ShieldCheck className="w-3 h-3 text-rose-500" />
                        <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Insurance Name</span>
                      </div>
                      <div className="text-sm font-black text-rose-900 truncate leading-tight">{selectedPatient.insuranceName || 'No'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8">
                  {/* Primary Condition Read-Only Field */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Primary Condition / Disease</label>
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm animate-in fade-in duration-500">
                      <div className="bg-hospital-100 p-2 rounded-lg">
                        <Activity className="w-5 h-5 text-hospital-600" />
                      </div>
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registered Diagnosis</div>
                        <div className="text-lg font-black text-slate-900 uppercase leading-none">{selectedPatient.condition}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Quick Code Assessment</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button type="button" onClick={() => setFormState(s => ({...s, quickCode: SurgeonCode.M1}))} className={`p-4 rounded-xl border-2 text-left transition-all ${formState.quickCode === SurgeonCode.M1 ? 'bg-blue-50 border-blue-500 shadow-xs' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                        <div className="font-bold text-sm text-slate-800">{SurgeonCode.M1}</div>
                        <div className="text-xs text-slate-500 mt-1">Patient requires medication only.</div>
                      </button>
                      <button type="button" onClick={() => setFormState(s => ({...s, quickCode: SurgeonCode.S1}))} className={`p-4 rounded-xl border-2 text-left transition-all ${formState.quickCode === SurgeonCode.S1 ? 'bg-emerald-50 border-emerald-500 shadow-xs' : 'bg-white border-gray-200 hover:border-emerald-300'}`}>
                        <div className="font-bold text-sm text-slate-800">{SurgeonCode.S1}</div>
                        <div className="text-xs text-slate-500 mt-1">Patient candidate for surgery.</div>
                      </button>
                    </div>
                  </div>

                  {isSurgery && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 sm:p-6 bg-emerald-50/40 rounded-2xl border border-emerald-100/80 animate-in fade-in">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Procedures</label>
                        <select required={isSurgery} value={formState.surgeryProcedure || ''} onChange={e => setFormState(s => ({...s, surgeryProcedure: e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 cursor-pointer">
                          <option value="">Select Procedure...</option>
                          {PROCEDURES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      {formState.surgeryProcedure === 'Other' && (
                        <div className="sm:col-span-2 animate-in slide-in-from-top-2 duration-200">
                          <label className="block text-[11px] font-bold text-hospital-700 uppercase mb-1.5 tracking-wider">Specific Procedure Name</label>
                          <input 
                            required 
                            type="text" 
                            className="w-full px-3 py-2.5 bg-white border border-hospital-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 placeholder:font-normal placeholder:text-slate-400" 
                            value={formState.otherSurgeryName || ''} 
                            onChange={e => setFormState(s => ({...s, otherSurgeryName: e.target.value}))} 
                            placeholder="Enter specific procedure name..." 
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Pain Severity</label>
                        <select required={isSurgery} value={formState.painSeverity || ''} onChange={e => setFormState(s => ({...s, painSeverity: e.target.value as PainSeverity}))} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 cursor-pointer">
                          <option value="">Select...</option>
                          {Object.values(PainSeverity).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Affordability</label>
                        <select required={isSurgery} value={formState.affordability || ''} onChange={e => setFormState(s => ({...s, affordability: e.target.value as Affordability}))} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 cursor-pointer">
                          <option value="">Select...</option>
                          {Object.values(Affordability).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Conversion Readiness</label>
                        <select required={isSurgery} value={formState.conversionReadiness || ''} onChange={e => setFormState(s => ({...s, conversionReadiness: e.target.value as ConversionReadiness}))} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 cursor-pointer">
                          <option value="">Select...</option>
                          {Object.values(ConversionReadiness).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Tentative Surgery Date</label>
                        {schedulingPermissions?.doctor ? (
                          <input 
                            type="date" 
                            value={formState.tentativeSurgeryDate || ''} 
                            onChange={e => setFormState(s => ({...s, tentativeSurgeryDate: e.target.value}))} 
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 font-mono" 
                          />
                        ) : (
                          <div className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-bold flex items-center gap-1.5">
                            <span className="text-amber-600 font-black">Locked:</span> Surgery scheduling disabled by Master Admin
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Clinical Findings & Notes</label>
                    <textarea
                      value={formState.notes || ''}
                      onChange={e => setFormState(s => ({...s, notes: e.target.value}))}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 min-h-[110px] placeholder:text-slate-400"
                      placeholder="Enter clinical observations..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5 tracking-wider">Digital Signature</label>
                    <input
                      type="text"
                      required
                      value={formState.doctorSignature || ''}
                      onChange={e => setFormState(s => ({...s, doctorSignature: e.target.value}))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 font-serif"
                      placeholder="Type your full name to sign"
                    />
                  </div>

                </div>
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Assessment Record
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSavingAssessment}
                    className="w-full sm:w-auto bg-hospital-600 text-white px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 hover:bg-hospital-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer ml-auto"
                  >
                    {isSavingAssessment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Assessment...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Assessment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-10">
                <Stethoscope className="w-24 h-24 mb-4" />
                <p className="text-lg font-bold text-center">Select a patient to begin assessment</p>
                {isDirectoryCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsDirectoryCollapsed(false)}
                    className="mt-4 px-4 py-2.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" /> Open Patient Directory ({pendingCount} Pending)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'appointments' ? (
        /* Doctor Scheduled Appointments Roster view */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-hospital-600 tracking-wider">Consultation Schedule</span>
              <h3 className="text-xl font-black text-slate-800">Scheduled Appointments</h3>
              <p className="text-xs text-slate-500">Patients booked specifically for Dr. {loggedInDoctor.name}</p>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Total Bookings: <strong className="text-hospital-700">{doctorAppointments.length}</strong>
            </div>
          </div>

          {doctorAppointments.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Calendar className="w-12 h-12 mx-auto text-slate-300" />
              <div className="font-bold text-slate-600 text-sm">No scheduled appointments</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">When patients are booked for your consultation by Sales or Front Office, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                  <tr>
                    <th className="p-4">Appt Slot</th>
                    <th className="p-4">Patient Name</th>
                    <th className="p-4">Mobile</th>
                    <th className="p-4">Condition</th>
                    <th className="p-4">Facility / Route</th>
                    <th className="p-4">Source</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {doctorAppointments.map((appt: Appointment) => (
                    <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 font-mono flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-hospital-500" /> {appt.date || 'TBD'} • {appt.time || 'TBD'}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-900">{appt.name}</td>
                      <td className="p-4 font-mono text-slate-600">{appt.mobile}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {appt.condition}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {appt.hospitalName || 'Consulting Clinic'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-100 text-slate-700">
                          {appt.source || 'Other'}
                        </span>
                        {appt.referral_person && <span className="text-[10px] text-slate-400 ml-1">({appt.referral_person})</span>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border ${
                          appt.status === 'Doctor Done'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {appt.status || 'Scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'profile' ? (
        /* Dedicated Doctor Profile View */
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-hospital-600 tracking-wider">Doctor Identity & Credentials</span>
              <h3 className="text-xl font-black text-slate-900">Doctor Profile</h3>
              <p className="text-xs text-slate-500 mt-0.5">Manage identity details, contact information, and profile picture.</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-hospital-50 border border-hospital-100 flex items-center justify-center text-hospital-600">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-slate-50/60 p-6 rounded-2xl border border-slate-200/60">
            {/* Identity Photo & Upload */}
            <div className="flex flex-col items-center text-center shrink-0">
              <div className="relative group mb-4">
                {loggedInDoctor.photoUrl ? (
                  <img 
                    src={loggedInDoctor.photoUrl} 
                    alt="Doctor" 
                    className="w-36 h-36 rounded-3xl object-cover border-4 border-white shadow-md transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-3xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <User className="w-10 h-10 text-slate-400" />
                    <span className="text-[10px] font-bold">No Photo</span>
                  </div>
                )}
              </div>

              <label className="cursor-pointer bg-hospital-600 hover:bg-hospital-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm">
                <Upload className="w-3.5 h-3.5" /> Upload Photo
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload} 
                />
              </label>
              <p className="text-[9px] text-slate-400 mt-2">Accepted formats: JPEG, PNG, WEBP (Max 2MB)</p>
              {photoError && <p className="text-[10px] text-rose-500 font-bold mt-1">{photoError}</p>}
            </div>

            {/* Profile Info Fields */}
            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Doctor Name</span>
                  <span className="text-sm font-black text-slate-900">{getFormattedDoctorName(loggedInDoctor.name)}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Clinic Role</span>
                  <span className="inline-block text-[10px] font-black text-hospital-700 bg-hospital-50 px-2.5 py-1 rounded-md border border-hospital-200 uppercase tracking-wider">
                    {loggedInDoctor.role}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Email ID</span>
                  <span className="text-sm font-black text-slate-800">{loggedInDoctor.email || 'N/A'}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Contact Number</span>
                  <span className="text-sm font-black text-slate-800 font-mono">{loggedInDoctor.mobile || 'N/A'}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs sm:col-span-2">
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1.5">Doctor Account ID</span>
                  <span className="text-xs font-mono font-bold text-slate-600">{loggedInDoctor.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Doctor Availability Mode - Dedicated Full Width Weekly Advanced Scheduler */
        <div className="w-full bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-100 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
                <Calendar className="w-5 h-5 text-hospital-600 shrink-0" /> WEEKLY ADVANCED SCHEDULER
              </h3>
              <p className="text-slate-500 text-xs mt-1">Configure consultation hours, breaks, holidays, and availability for each day of the week.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Saved in Database</span>
            </div>
          </div>

          {/* General Available Days Selector */}
          <div className="space-y-2">
            <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">General Available Days</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map(day => {
                const isChecked = availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      isChecked 
                        ? 'bg-hospital-600 text-white border-hospital-600 shadow-xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Week Calendar Header & Navigation Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Week View</span>
                <div className="text-sm font-black text-slate-900 mt-0.5">{weekRangeLabel}</div>
              </div>
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs w-full md:w-auto justify-between md:justify-start">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="px-3 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Previous Week</span><span className="sm:hidden">Prev</span>
                </button>
                <button
                  type="button"
                  onClick={handleTodayWeek}
                  className="px-3 py-1.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Return to Current Week"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="px-3 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Next Week"
                >
                  <span className="hidden sm:inline">Next Week</span><span className="sm:hidden">Next</span> <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 7 Days Weekly Scheduler Grid / Cards - Distinct Color Per Day & Exactly 3 Cards Per Row */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="block text-[11px] font-black uppercase text-slate-500 tracking-widest">Weekly Day Schedules (7 Days)</span>
                <span className="text-[10px] font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Color-Coded Days • 3 Cards Per Row
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {weekDays.map((wd) => {
                  const ds = daySchedules.find(s => s.day === wd.weekday) || {
                    day: wd.weekday,
                    status: "Available",
                    startTime: "09:00",
                    endTime: "17:00",
                    breaks: [{ startTime: "13:00", endTime: "14:00" }]
                  };
                  const theme = DAY_COLOR_THEMES[wd.weekday] || DAY_COLOR_THEMES.Monday;

                  return (
                    <div 
                      key={wd.isoDate} 
                      className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-4 space-y-3 shadow-2xs ${theme.cardHover} hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden`}
                    >
                      {/* Top colored accent indicator */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.accentBar}`} />

                      <div className="space-y-3 pt-1">
                        {/* Day Header */}
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-200/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full ${theme.accentBar} shrink-0 shadow-xs`} />
                            <div className={`text-xs sm:text-sm font-black uppercase tracking-wide truncate ${theme.dayTitle}`}>{wd.weekday}</div>
                            <div className={`text-[10px] sm:text-xs font-extrabold font-mono px-2 py-0.5 rounded-lg border shrink-0 ${theme.dateBadge}`}>
                              {wd.dateNum} {wd.monthStr} {wd.dateObj.getFullYear()}
                            </div>
                          </div>
                          <select
                            value={ds.status}
                            onChange={(e) => updateDayScheduleField(wd.weekday, "status", e.target.value)}
                            className="text-[11px] font-extrabold border border-slate-200 bg-white rounded-xl px-2.5 py-1 text-slate-700 outline-none focus:ring-2 focus:ring-hospital-500 shadow-2xs cursor-pointer shrink-0"
                          >
                            <option value="Available">Available</option>
                            <option value="Unavailable">Unavailable</option>
                            <option value="Holiday">Holiday</option>
                            <option value="Leave">Leave</option>
                          </select>
                        </div>

                        {/* Day Working Hours & Breaks */}
                        {ds.status === "Available" ? (
                          <div className="space-y-3 pt-0.5">
                            {/* Working Hours */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[8px] uppercase font-black text-slate-400 mb-1">Start Time</label>
                                <input
                                  type="time"
                                  value={ds.startTime || "09:00"}
                                  onChange={(e) => updateDayScheduleField(wd.weekday, "startTime", e.target.value)}
                                  className={`w-full bg-white border border-slate-200 px-2 py-1.5 rounded-xl text-[11px] font-bold text-slate-800 font-mono focus:border-hospital-500 focus:ring-2 ${theme.timeInputFocus} outline-none shadow-2xs`}
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-black text-slate-400 mb-1">End Time</label>
                                <input
                                  type="time"
                                  value={ds.endTime || "17:00"}
                                  onChange={(e) => updateDayScheduleField(wd.weekday, "endTime", e.target.value)}
                                  className={`w-full bg-white border border-slate-200 px-2 py-1.5 rounded-xl text-[11px] font-bold text-slate-800 font-mono focus:border-hospital-500 focus:ring-2 ${theme.timeInputFocus} outline-none shadow-2xs`}
                                />
                              </div>
                            </div>

                            {/* Breaks List */}
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Breaks</span>
                                <button
                                  type="button"
                                  onClick={() => addBreakToDay(wd.weekday)}
                                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 border ${theme.breakBtn}`}
                                >
                                  + Add Break
                                </button>
                              </div>

                              <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-0.5 scrollbar-thin">
                                {(ds.breaks || []).map((b: any, bIdx: number) => (
                                  <div key={bIdx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-xl shadow-2xs">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0">B{bIdx + 1}:</span>
                                    <input
                                      type="time"
                                      value={b.startTime}
                                      onChange={(e) => updateBreakTime(wd.weekday, bIdx, "startTime", e.target.value)}
                                      className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold text-slate-800 font-mono outline-none focus:border-hospital-500 w-[58px]"
                                    />
                                    <span className="text-slate-400 text-[10px] shrink-0">-</span>
                                    <input
                                      type="time"
                                      value={b.endTime}
                                      onChange={(e) => updateBreakTime(wd.weekday, bIdx, "endTime", e.target.value)}
                                      className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-lg text-[10px] font-semibold text-slate-800 font-mono outline-none focus:border-hospital-500 w-[58px]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeBreakFromDay(wd.weekday, bIdx)}
                                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg ml-auto transition-colors cursor-pointer shrink-0"
                                      title="Delete break"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                {(ds.breaks || []).length === 0 && (
                                  <p className="text-[10px] text-slate-400 italic py-0.5">No scheduled breaks.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100/90 text-slate-600 text-center py-8 rounded-2xl text-xs font-mono font-bold mt-1 border border-slate-200/60 flex flex-col items-center justify-center gap-1">
                            <span className="text-xl">
                              {ds.status === "Holiday" ? "🎉" : ds.status === "Leave" ? "📴" : "❌"}
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                              {ds.status === "Holiday" ? "Public Holiday" : ds.status === "Leave" ? "Leave Period" : "Closed / Unavailable"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-400 font-bold flex justify-between items-center mt-2">
                        <span className="uppercase tracking-wider text-[9px]">Target Date:</span>
                        <span className={`font-mono text-[11px] font-black px-2 py-0.5 rounded-md border ${theme.footerBadge}`}>{wd.isoDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4"></div>

          {/* Block Vacation / Emergency / Holiday Dates */}
          <div className="bg-slate-50/80 border border-slate-200/80 p-4 sm:p-5 rounded-2xl space-y-3">
            <span className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Block Vacation / Emergency / Holiday Dates</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Select Date</label>
                <input 
                  type="date" 
                  value={blockedDateInput} 
                  onChange={e => setBlockedDateInput(e.target.value)} 
                  className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold font-mono outline-none text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Block Category</label>
                <select
                  value={blockedReasonInput}
                  onChange={e => setBlockedReasonInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold outline-none text-slate-800 cursor-pointer"
                >
                  <option value="Vacation">Vacation Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Public Holiday">Public Holiday</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  type="button" 
                  onClick={addBlockedDateItem}
                  className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                >
                  Block Date
                </button>
              </div>
            </div>

            {/* Blocked Date Chips */}
            <div className="flex flex-wrap gap-2 mt-2">
              {blockedDates.map(b => (
                <span 
                  key={b.date} 
                  className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-2xs"
                >
                  <span className="font-mono">{b.date}</span>
                  <span className="bg-rose-100 text-[8px] px-1.5 py-0.5 rounded font-black tracking-wide text-rose-800 uppercase shrink-0">
                    {b.category || "Blocked"}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => removeBlockedDateItem(b.date)}
                    className="text-rose-400 hover:text-rose-900 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {blockedDates.length === 0 && (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">No custom blocked dates added</p>
              )}
            </div>
          </div>

          <button 
            type="button" 
            disabled={isSavingAvailability}
            onClick={handleSaveAvailability}
            className="w-full py-3.5 bg-hospital-600 text-white rounded-xl font-bold text-xs uppercase shadow-md hover:bg-hospital-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSavingAvailability ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Schedule...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Advanced Schedule Setting</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};