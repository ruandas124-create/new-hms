import React, { useState, useEffect, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { SurgeonCode, PainSeverity, Affordability, ConversionReadiness, Patient, DoctorAssessment, Appointment } from '../types';
import { Stethoscope, Check, ChevronRight, ChevronLeft, User, Calendar, Save, Briefcase, CreditCard, Activity, Tag, FileText, Database, Clock, Share2, ShieldCheck, Search, Filter, History, ClipboardList, RefreshCcw, Upload, Trash2, Loader2 } from 'lucide-react';

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

const formatToDateTime = (dateString: string | undefined | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  // Use parts-based formatting to ensure absolute consistency for IST
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  return `${getPart('day')}-${getPart('month')}-${getPart('year')} ${getPart('hour')}:${getPart('minute')}`;
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
  const activeTab: 'patients' | 'appointments' | 'availability' = useMemo(() => {
    if (activeDashboard === 'doctor_appointments') return 'appointments';
    if (activeDashboard === 'doctor_availability') return 'availability';
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
  const [updatingApptId, setUpdatingApptId] = useState<string | null>(null);
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
        formattedDate: `${weekdayName}, ${dateNum} ${monthStr}`, // e.g. "Monday, 5 Oct"
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
    if (formState.quickCode === ('Doctor Done' as any)) {
      customStatus = 'Doctor Done';
    } else if (formState.quickCode === SurgeonCode.M1) {
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
      const matchDoc = a.assignedDoctorId === loggedInDoctor.id || a.assignedDoctorName === loggedInDoctor.name;
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button type="button" onClick={() => setFormState(s => ({...s, quickCode: SurgeonCode.M1}))} className={`p-4 rounded-xl border-2 text-left transition-all ${formState.quickCode === SurgeonCode.M1 ? 'bg-blue-50 border-blue-500 shadow-xs' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                        <div className="font-bold text-sm text-slate-800">{SurgeonCode.M1}</div>
                        <div className="text-xs text-slate-500 mt-1">Patient requires medication only.</div>
                      </button>
                      <button type="button" onClick={() => setFormState(s => ({...s, quickCode: SurgeonCode.S1}))} className={`p-4 rounded-xl border-2 text-left transition-all ${formState.quickCode === SurgeonCode.S1 ? 'bg-emerald-50 border-emerald-500 shadow-xs' : 'bg-white border-gray-200 hover:border-emerald-300'}`}>
                        <div className="font-bold text-sm text-slate-800">{SurgeonCode.S1}</div>
                        <div className="text-xs text-slate-500 mt-1">Patient candidate for surgery.</div>
                      </button>
                      <button type="button" onClick={() => setFormState(s => ({...s, quickCode: 'Doctor Done' as any}))} className={`p-4 rounded-xl border-2 text-left transition-all ${formState.quickCode === ('Doctor Done' as any) ? 'bg-teal-50 border-teal-500 shadow-xs' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                        <div className="font-bold text-sm text-slate-800">Doctor Done</div>
                        <div className="text-xs text-slate-500 mt-1">Consultation completed. No further procedure.</div>
                      </button>
                    </div>
                  </div>

                  {isSurgery && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 sm:p-6 bg-green-50/50 rounded-lg border border-green-100 animate-in fade-in">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Procedures</label>
                        <select required={isSurgery} value={formState.surgeryProcedure || ''} onChange={e => setFormState(s => ({...s, surgeryProcedure: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                          <option value="">Select Procedure...</option>
                          {PROCEDURES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      {formState.surgeryProcedure === 'Other' && (
                        <div className="sm:col-span-2 animate-in slide-in-from-top-2 duration-200">
                          <label className="block text-xs font-bold text-hospital-600 uppercase mb-2">Specific Procedure Name</label>
                          <input 
                            required 
                            type="text" 
                            className="w-full p-2 border border-hospital-200 rounded-md bg-white focus:border-hospital-500 outline-none" 
                            value={formState.otherSurgeryName || ''} 
                            onChange={e => setFormState(s => ({...s, otherSurgeryName: e.target.value}))} 
                            placeholder="Enter specific procedure name..." 
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Pain Severity</label>
                        <select required={isSurgery} value={formState.painSeverity || ''} onChange={e => setFormState(s => ({...s, painSeverity: e.target.value as PainSeverity}))} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                          <option value="">Select...</option>
                          {Object.values(PainSeverity).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Affordability</label>
                        <select required={isSurgery} value={formState.affordability || ''} onChange={e => setFormState(s => ({...s, affordability: e.target.value as Affordability}))} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                          <option value="">Select...</option>
                          {Object.values(Affordability).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Conversion Readiness</label>
                        <select required={isSurgery} value={formState.conversionReadiness || ''} onChange={e => setFormState(s => ({...s, conversionReadiness: e.target.value as ConversionReadiness}))} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                          <option value="">Select...</option>
                          {Object.values(ConversionReadiness).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tentative Surgery Date</label>
                        {schedulingPermissions?.doctor ? (
                          <input 
                            type="date" 
                            value={formState.tentativeSurgeryDate || ''} 
                            onChange={e => setFormState(s => ({...s, tentativeSurgeryDate: e.target.value}))} 
                            className="w-full p-2 border border-gray-300 rounded-md" 
                          />
                        ) : (
                          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-500 font-bold flex items-center gap-1.5">
                            <span className="text-amber-600 font-black">Locked:</span> Surgery scheduling disabled by Master Admin
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Clinical Findings & Notes</label>
                    <textarea
                      value={formState.notes || ''}
                      onChange={e => setFormState(s => ({...s, notes: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-md min-h-[120px]"
                      placeholder="Enter clinical observations..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Digital Signature</label>
                    <input
                      type="text"
                      required
                      value={formState.doctorSignature || ''}
                      onChange={e => setFormState(s => ({...s, doctorSignature: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-md font-serif"
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
                    <th className="p-4 text-center">Action</th>
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
                      <td className="p-4 text-center whitespace-nowrap">
                        {appt.status === 'Doctor Done' ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> Doctor Done
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={updatingApptId === appt.id}
                            onClick={async () => {
                              if (updatingApptId) return;
                              setUpdatingApptId(appt.id);
                              try {
                                await updateAppointment({
                                  ...appt,
                                  status: 'Doctor Done'
                                });
                              } catch (err) {
                                alert("Failed to update appointment status.");
                              } finally {
                                setUpdatingApptId(null);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-[11px] font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Mark appointment as Doctor Done"
                          >
                            {updatingApptId === appt.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Mark Doctor Done</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Doctor Availability & Profile Photo settings view */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Bio Profile Photo Column */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider mb-6 flex items-center gap-1.5">
              <User className="w-4 h-4 text-hospital-600" /> Identity photo
            </h3>
            
            <div className="relative group mb-4">
              {loggedInDoctor.photoUrl ? (
                <img 
                  src={loggedInDoctor.photoUrl} 
                  alt="Doctor" 
                  className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-md transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-405 gap-1.5">
                  <User className="w-8 h-8 text-slate-400" />
                  <span className="text-[9px] font-bold">No Photo</span>
                </div>
              )}
            </div>

            <label className="cursor-pointer bg-hospital-50 hover:bg-hospital-100 text-hospital-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm">
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

            <div className="w-full border-t border-slate-100 my-6"></div>

            <div className="w-full text-left space-y-3.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div>
                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Email ID</span>
                <span className="text-xs font-black text-slate-700">{loggedInDoctor.email}</span>
              </div>
              <div>
                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Contact Number</span>
                <span className="text-xs font-black text-slate-700 font-mono">{loggedInDoctor.mobile || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Clinic Role</span>
                <span className="text-[9px] font-black text-slate-700 bg-hospital-100 text-hospital-700 px-2.5 py-0.5 rounded-full border border-hospital-200 uppercase tracking-wide">
                  {loggedInDoctor.role}
                </span>
              </div>
            </div>
          </div>

          {/* Availability days and calendar settings */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-hospital-600" /> Weekly Advanced Scheduler
                </h3>
                <p className="text-slate-400 text-xs">True 7-day weekly calendar with exact dates, daily working hours, customizable breaks, status, and holidays.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">Saved in Database</span>
              </div>
            </div>

            {/* Weekdays picker checkboxes */}
            <div>
              <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">General Available Days</span>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(day => {
                  const isChecked = availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isChecked 
                          ? 'bg-hospital-600 text-white border-hospital-600 shadow-sm' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* True Weekly Calendar View with Week Navigation */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Active Week View</span>
                  <div className="text-xs font-extrabold text-slate-900 mt-0.5">{weekRangeLabel}</div>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                  <button
                    type="button"
                    onClick={handlePrevWeek}
                    className="px-3 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous Week
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
                    Next Week <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 7 Days Weekly Grid with Exact Dates and Horizontal Scroll support */}
              <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest pt-1">Detail Schedules by Date & Day (7 Days)</span>
              
              <div className="overflow-x-auto pb-2 scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-w-[280px]">
                  {weekDays.map((wd) => {
                    const ds = daySchedules.find(s => s.day === wd.weekday) || {
                      day: wd.weekday,
                      status: "Available",
                      startTime: "09:00",
                      endTime: "17:00",
                      breaks: [{ startTime: "13:00", endTime: "14:00" }]
                    };

                    return (
                      <div key={wd.isoDate} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm hover:border-hospital-400 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2 pb-2 border-b border-slate-200/60">
                            <div>
                              <div className="text-xs font-black text-slate-900">{wd.formattedDate}</div>
                              <div className="text-[10px] text-hospital-600 font-mono font-bold">{wd.isoDate}</div>
                            </div>
                            <select
                              value={ds.status}
                              onChange={(e) => updateDayScheduleField(wd.weekday, "status", e.target.value)}
                              className="text-[10px] font-extrabold border border-slate-200 bg-white rounded-lg px-2 py-1 text-slate-700 outline-none focus:border-hospital-500 shadow-xs"
                            >
                              <option value="Available">Available</option>
                              <option value="Unavailable">Unavailable</option>
                              <option value="Holiday">Holiday</option>
                              <option value="Leave">Leave</option>
                            </select>
                          </div>

                          {ds.status === "Available" ? (
                            <div className="space-y-3 pt-1">
                              {/* Start and end times */}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] uppercase font-extrabold text-slate-400 mb-0.5">Start Time</label>
                                  <input
                                    type="time"
                                    value={ds.startTime || "09:00"}
                                    onChange={(e) => updateDayScheduleField(wd.weekday, "startTime", e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-[11px] font-bold text-slate-800 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] uppercase font-extrabold text-slate-400 mb-0.5">End Time</label>
                                  <input
                                    type="time"
                                    value={ds.endTime || "17:00"}
                                    onChange={(e) => updateDayScheduleField(wd.weekday, "endTime", e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-[11px] font-bold text-slate-800 font-mono"
                                  />
                                </div>
                              </div>

                              {/* Breaks list */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider">Breaks</span>
                                  <button
                                    type="button"
                                    onClick={() => addBreakToDay(wd.weekday)}
                                    className="text-[9px] font-extrabold text-hospital-600 hover:text-hospital-800 bg-hospital-50 px-2 py-0.5 rounded-md"
                                  >
                                    + Add Break
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  {(ds.breaks || []).map((b: any, bIdx: number) => (
                                    <div key={bIdx} className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                                      <input
                                        type="time"
                                        value={b.startTime}
                                        onChange={(e) => updateBreakTime(wd.weekday, bIdx, "startTime", e.target.value)}
                                        className="bg-transparent text-[10px] font-semibold text-slate-700 w-16 font-mono outline-none"
                                      />
                                      <span className="text-slate-400 text-[10px]">-</span>
                                      <input
                                        type="time"
                                        value={b.endTime}
                                        onChange={(e) => updateBreakTime(wd.weekday, bIdx, "endTime", e.target.value)}
                                        className="bg-transparent text-[10px] font-semibold text-slate-700 w-16 font-mono outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeBreakFromDay(wd.weekday, bIdx)}
                                        className="text-rose-500 hover:text-rose-700 ml-auto p-0.5"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {(ds.breaks || []).length === 0 && (
                                    <p className="text-[10px] text-slate-400 italic">No scheduled breaks.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-200 text-slate-600 text-center py-5 rounded-xl text-xs font-mono font-bold mt-2">
                              {ds.status === "Holiday" ? "🎉 Public Holiday" : ds.status === "Leave" ? "📴 Leave Period" : "❌ Closed"}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 text-[9px] text-slate-400 font-bold flex justify-between items-center">
                          <span>Target Date:</span>
                          <span className="font-mono text-slate-700">{wd.isoDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Leaves and vacations manager */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
              <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Block Vacation / Emergency / Holiday Dates</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Select Date</label>
                  <input 
                    type="date" 
                    value={blockedDateInput} 
                    onChange={e => setBlockedDateInput(e.target.value)} 
                    className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs font-bold font-mono outline-none text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Block Category</label>
                  <select
                    value={blockedReasonInput}
                    onChange={e => setBlockedReasonInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs font-bold outline-none text-slate-700"
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
                    className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
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
                    className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-xs"
                  >
                    <span className="font-mono">{b.date}</span>
                    <span className="bg-rose-100 text-[8px] px-1.5 py-0.5 rounded font-black tracking-wide text-rose-800 uppercase shrink-0">
                      {b.category || "Blocked"}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => removeBlockedDateItem(b.date)}
                      className="text-rose-400 hover:text-rose-900 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                {blockedDates.length === 0 && (
                  <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">No custom blocked dates added</p>
                )}
              </div>
            </div>

            <button 
              type="button" 
              disabled={isSavingAvailability}
              onClick={handleSaveAvailability}
              className="w-full py-3 bg-hospital-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-hospital-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
        </div>
      )}
    </div>
  );
};