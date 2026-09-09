import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { SurgeonCode, PainSeverity, Affordability, ConversionReadiness, Patient, DoctorAssessment } from '../types';
import { Stethoscope, Check, ChevronRight, User, Calendar, Save, Briefcase, CreditCard, Activity, Tag, FileText, Database, Clock, Share2, ShieldCheck, Search, Filter, History, ClipboardList, RefreshCcw, Upload, Trash2 } from 'lucide-react';

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
  const { patients, updateDoctorAssessment, staffUsers, updateStaff, schedulingPermissions } = useHospital();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'patients' | 'availability'>('patients');

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

  const currentDoctorId = localStorage.getItem('hms_hospital_id') || 'static_doctor';
  const loggedInDoctor = staffUsers?.find(u => u.id === currentDoctorId) || {
    id: currentDoctorId,
    name: localStorage.getItem('hms_hospital_name') || 'Demo Doctor',
    email: localStorage.getItem('hms_hospital_email') || 'doctor@hms.com',
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

  const [daySchedules, setDaySchedules] = useState<any[]>(DEFAULT_DAY_SCHEDULES);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [blockedDateInput, setBlockedDateInput] = useState('');
  const [blockedReasonInput, setBlockedReasonInput] = useState('Vacation');

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
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

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

    updateDoctorAssessment(selectedPatient.id, formState);
    setSelectedPatient(null);
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

      if (currentDoctorId === 'static_doctor') {
        // Static/Demo doctor also sees unassigned patients for evaluating demo data easily
        if (assignedId && assignedId !== 'static_doctor') return false;
      } else {
        // Dynamic doctors ONLY see patients explicitly assigned to them
        if (assignedId !== currentDoctorId && assignedName !== currentDoctorName) {
          return false;
        }
      }

      // Base visibility: Must be arrived or have an assessment
      const isVisible = p.status === 'Arrived' || p.doctorAssessment !== undefined;
      
      // Date range filter: Check if entry_date is within [startDate, endDate]
      const entryDateStr = p.entry_date || '';
      const inRange = entryDateStr >= startDate && entryDateStr <= endDate;
      
      return isVisible && inRange;
    })
    .sort((a, b) => {
      // Sort: Pending first, then by time DESC
      const aIsPending = a.status === 'Arrived' && !a.doctorAssessment;
      const bIsPending = b.status === 'Arrived' && !b.doctorAssessment;
      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;
      const timeA = new Date(a.registeredAt).getTime();
      const timeB = new Date(b.registeredAt).getTime();
      return timeB - timeA;
    });

  const filteredDirectoryPatients = allPatients.filter(p => {
    const s = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(s) || 
           (p.id && p.id.toLowerCase().includes(s)) || 
           p.mobile.includes(s);
  });

  // Derived lists for Pending and Done sections
  const pendingPatients = filteredDirectoryPatients.filter(p => !p.doctorAssessment);
  const donePatients = filteredDirectoryPatients.filter(p => !!p.doctorAssessment);

  const pendingCount = allPatients.filter(p => p.status === 'Arrived' && !p.doctorAssessment).length;
  const doneCount = allPatients.filter(p => !!p.doctorAssessment).length;
    
  const isSurgery = formState.quickCode === SurgeonCode.S1;

  // Reusable Patient Card component for the directory
  // Fixed: Use React.FC to properly handle key prop and avoid TS mapping errors
  const PatientCard: React.FC<{ p: Patient }> = ({ p }) => (
    <div 
      onClick={() => setSelectedPatient(p)} 
      className={`p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
        selectedPatient?.id === p.id 
          ? 'border-hospital-500 bg-hospital-50 shadow-sm' 
          : p.doctorAssessment 
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
        {p.doctorAssessment ? (
          <Check className="w-5 h-5 text-green-500 bg-green-100 rounded-full p-1" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header and Tab Layout Switcher */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Doctor Pic */}
          <div className="relative shrink-0">
            {loggedInDoctor.photoUrl ? (
              <img 
                src={loggedInDoctor.photoUrl} 
                alt="Profile" 
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-hospital-50 text-hospital-700 flex items-center justify-center border border-hospital-150 text-[10px] uppercase font-black font-mono">
                {loggedInDoctor.name ? loggedInDoctor.name.substring(0, 2) : 'DR'}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-green-500 w-3.5 h-3.5 rounded-full border-2 border-white"></span>
          </div>

          <div>
            <div className="text-[9px] font-black text-hospital-600 uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-hospital-600" /> Active Profile
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">
              Dr. {loggedInDoctor.name}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Manage live clinical patient queues and scheduled leaves.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'patients'
                ? 'bg-white text-hospital-700 shadow'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" /> Patients Queue
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('availability')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              activeTab === 'availability'
                ? 'bg-white text-hospital-700 shadow'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" /> Availability Mode
          </button>
        </div>
      </div>

      {activeTab === 'patients' ? (
        <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-210px)] gap-6 animate-in fade-in duration-300">
          <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden h-[450px] lg:h-full">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
               <h3 className="font-bold text-gray-700 flex items-center gap-2">
                 <User className="w-5 h-5 text-hospital-600" /> Patient Directory
               </h3>
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
                <div className="flex-1 relative flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter shrink-0">From</span>
                  <input
                    type="date"
                    className="w-full bg-transparent text-[11px] font-bold outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1 relative flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter shrink-0">To</span>
                  <input
                    type="date"
                    className="w-full bg-transparent text-[11px] font-bold outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
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

          <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            {selectedPatient ? (
              <form onSubmit={handleSave} className="flex flex-col h-full">
                <div className="p-4 sm:p-6 border-b bg-white shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-3 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <User className="w-3 h-3 text-indigo-500" />
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Name</span>
                      </div>
                      <div className="text-sm font-black text-indigo-900 truncate leading-tight">{selectedPatient.name}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-3 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Activity className="w-3 h-3 text-blue-500" />
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Age / Gender</span>
                      </div>
                      <div className="text-sm font-black text-blue-900 leading-tight">{selectedPatient.age}Y <span className="text-blue-200">|</span> {selectedPatient.gender}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 p-3 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Briefcase className="w-3 h-3 text-amber-500" />
                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Occupation</span>
                      </div>
                      <div className="text-sm font-black text-amber-900 truncate leading-tight">{selectedPatient.occupation || '---'}</div>
                    </div>
                    <div className="bg-gradient-to-br from-teal-50 to-white border border-teal-100 p-3 rounded-2xl shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Share2 className="w-3 h-3 text-teal-500" />
                        <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest">Source</span>
                      </div>
                      <div className="text-sm font-black text-teal-900 truncate leading-tight">
                        {selectedPatient.source === 'Doctor Recommended' ? `Dr. ${selectedPatient.sourceDoctorName || 'Recommended'}` : selectedPatient.source}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-100 p-3 rounded-2xl shadow-sm">
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
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button type="button" onClick={() => setFormState(s => ({...s, quickCode: SurgeonCode.M1}))} className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${formState.quickCode === SurgeonCode.M1 ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
                        <div className="font-bold">{SurgeonCode.M1}</div>
                        <div className="text-xs text-gray-600">Patient requires medication only.</div>
                      </button>
                      <button type="button" onClick={() => setFormState(s => ({...s, quickCode: SurgeonCode.S1}))} className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${formState.quickCode === SurgeonCode.S1 ? 'bg-green-50 border-green-500' : 'bg-white border-gray-200 hover:border-green-300'}`}>
                        <div className="font-bold">{SurgeonCode.S1}</div>
                        <div className="text-xs text-gray-600">Patient candidate for surgery.</div>
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
                <div className="p-6 border-t bg-gray-50 flex justify-end shrink-0">
                  <button type="submit" className="w-full sm:w-auto bg-hospital-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-hospital-700 transition-all">
                    <Save className="w-5 h-5" /> Save Assessment
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-10">
                <Stethoscope className="w-24 h-24 mb-4" />
                <p className="text-lg font-bold text-center">Select a patient to begin assessment</p>
              </div>
            )}
          </div>
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
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-hospital-600" /> Weekly Advanced Scheduler
                </h3>
                <p className="text-slate-400 text-xs">Set daily working hours, unlimited customizable breaks, status, and holidays.</p>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">Saved in Database</p>
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

            {/* Daily Schedule Planner Grid */}
            <div className="space-y-4">
              <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Detail Schedules by Day</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {daySchedules.map((ds) => (
                  <div key={ds.day} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3 shadow-sm hover:border-slate-200 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">{ds.day}</span>
                      <select
                        value={ds.status}
                        onChange={(e) => updateDayScheduleField(ds.day, "status", e.target.value)}
                        className="text-[11px] font-bold border border-slate-200 bg-white rounded-lg p-1 px-1.5 text-slate-600 outline-none focus:border-hospital-500"
                      >
                        <option value="Available">Available</option>
                        <option value="Unavailable">Unavailable</option>
                        <option value="Holiday">Holiday</option>
                        <option value="Leave">Leave</option>
                      </select>
                    </div>

                    {ds.status === "Available" ? (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        {/* Start and end times */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Start Time</label>
                            <input
                              type="time"
                              value={ds.startTime || "09:00"}
                              onChange={(e) => updateDayScheduleField(ds.day, "startTime", e.target.value)}
                              className="w-full bg-white border border-slate-200 p-1 rounded-md text-[11px] font-bold text-slate-700"
                            />
                          </div>
                          <div>
                            <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">End Time</label>
                            <input
                              type="time"
                              value={ds.endTime || "17:00"}
                              onChange={(e) => updateDayScheduleField(ds.day, "endTime", e.target.value)}
                              className="w-full bg-white border border-slate-200 p-1 rounded-md text-[11px] font-bold text-slate-700"
                            />
                          </div>
                        </div>

                        {/* Breaks list */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Breaks</span>
                            <button
                              type="button"
                              onClick={() => addBreakToDay(ds.day)}
                              className="text-[9px] font-extrabold text-hospital-600 hover:text-hospital-800"
                            >
                              + Add Break
                            </button>
                          </div>

                          <div className="space-y-1">
                            {(ds.breaks || []).map((b: any, bIdx: number) => (
                              <div key={bIdx} className="flex items-center gap-1 bg-white border border-slate-200 pl-1.5 pr-1 py-1 rounded-lg">
                                <input
                                  type="time"
                                  value={b.startTime}
                                  onChange={(e) => updateBreakTime(ds.day, bIdx, "startTime", e.target.value)}
                                  className="bg-transparent text-[10px] font-semibold text-slate-600 max-w-[55px] border-b border-dashed border-slate-200"
                                />
                                <span className="text-slate-400 text-[10px]">-</span>
                                <input
                                  type="time"
                                  value={b.endTime}
                                  onChange={(e) => updateBreakTime(ds.day, bIdx, "endTime", e.target.value)}
                                  className="bg-transparent text-[10px] font-semibold text-slate-600 max-w-[55px] border-b border-dashed border-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeBreakFromDay(ds.day, bIdx)}
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
                      <div className="bg-slate-100 text-slate-500 text-center py-4 rounded-lg text-xs font-mono font-bold">
                        {ds.status === "Holiday" ? "🎉 Public Holiday" : ds.status === "Leave" ? "📴 Leave Period" : "❌ Closed"}
                      </div>
                    )}
                  </div>
                ))}
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
              onClick={handleSaveAvailability}
              className="w-full py-3 bg-hospital-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-hospital-700 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Advanced Schedule Setting
            </button>
          </div>
        </div>
      )}
    </div>
  );
};