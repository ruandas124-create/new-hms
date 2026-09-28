import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { StaffUser, DaySchedule, BlockedDate } from '../../types';
import { 
  Clock, Calendar, CheckCircle2, XCircle, User, Plus, 
  Trash2, Save, AlertCircle, RefreshCw, Stethoscope, Shield, 
  ChevronRight, Coffee, Sun, Moon, Info, Check, Loader2,
  Search, ChevronDown, ChevronUp, Building2, UserCheck, Filter, X, Sparkles
} from 'lucide-react';

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type DoctorTypeFilter = 'ALL' | 'HOSPITAL_DOCTOR' | 'DOCTOR';

export const isHospitalDoctor = (u: StaffUser): boolean => {
  const hId = (u.hospital_id || '').trim();
  const hName = (u.hospitalName || '').trim();
  if (!hId && !hName) return false;
  if (hName.toLowerCase().includes('independent') || hName.toLowerCase() === 'none') {
    return false;
  }
  return true;
};

export const getDoctorTypeLabel = (u: StaffUser): 'Hospital Doctor' | 'Doctor' => {
  return isHospitalDoctor(u) ? 'Hospital Doctor' : 'Doctor';
};

export const MasterAvailability: React.FC = () => {
  const { staffUsers, updateStaff } = useHospital();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Type Filter State for Doctor Dropdown
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorTypeFilter, setDoctorTypeFilter] = useState<DoctorTypeFilter>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isDropdownOpen]);

  // All doctors available under Master Admin (Hospital Doctors + Independent Doctors)
  const allDoctors = useMemo(() => {
    return staffUsers.filter(u => {
      const roleUpper = (u.role || '').toUpperCase();
      return roleUpper === 'DOCTOR' || roleUpper === 'DEACTIVATED_DOCTOR';
    });
  }, [staffUsers]);

  // Counts by type
  const totalDoctorCount = allDoctors.length;
  const hospitalDoctorCount = useMemo(() => allDoctors.filter(isHospitalDoctor).length, [allDoctors]);
  const independentDoctorCount = useMemo(() => allDoctors.filter(d => !isHospitalDoctor(d)).length, [allDoctors]);

  // Filtered doctors based on search query and selected doctor type
  const filteredDoctors = useMemo(() => {
    return allDoctors.filter(doc => {
      // 1. Doctor type filter
      if (doctorTypeFilter === 'HOSPITAL_DOCTOR' && !isHospitalDoctor(doc)) return false;
      if (doctorTypeFilter === 'DOCTOR' && isHospitalDoctor(doc)) return false;

      // 2. Search query filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const docName = (doc.name || '').toLowerCase();
      const hospital = (doc.hospitalName || '').toLowerCase();
      const specialty = (doc.specialization || '').toLowerCase();
      const dept = (doc.department || '').toLowerCase();
      const docType = getDoctorTypeLabel(doc).toLowerCase();

      return (
        docName.includes(term) ||
        hospital.includes(term) ||
        specialty.includes(term) ||
        dept.includes(term) ||
        docType.includes(term)
      );
    });
  }, [allDoctors, doctorTypeFilter, searchTerm]);

  // Selected doctor state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(allDoctors[0]?.id || '');

  // Keep selected doctor in sync if list loads
  useEffect(() => {
    if (!selectedDoctorId && allDoctors.length > 0) {
      setSelectedDoctorId(allDoctors[0].id);
    }
  }, [allDoctors, selectedDoctorId]);

  const selectedDoctor = useMemo(() => {
    return allDoctors.find(d => d.id === selectedDoctorId) || allDoctors[0];
  }, [allDoctors, selectedDoctorId]);

  // Local form state for selected doctor availability
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('17:00');
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([]);

  // New blocked date input states
  const [newBlockedDate, setNewBlockedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newBlockedReason, setNewBlockedReason] = useState<string>('Vacation');

  // Load doctor's existing availability when selection changes
  useEffect(() => {
    if (selectedDoctor) {
      const avail = selectedDoctor.availability;
      setAvailableDays(avail?.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
      setStartTime(avail?.startTime || '09:00');
      setEndTime(avail?.endTime || '17:00');
      setBlockedDates(avail?.blockedDates || (avail?.unavailableDates || []).map(d => ({ date: d, reason: 'Leave' })));
      
      // Initialize or load daySchedules
      const defaultSchedules: DaySchedule[] = WEEKDAYS.map(day => {
        const existing = avail?.daySchedules?.find(s => s.day === day);
        if (existing) return existing;
        const isAvail = (avail?.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]).includes(day);
        return {
          day,
          status: isAvail ? 'Available' : 'Unavailable',
          startTime: avail?.startTime || '09:00',
          endTime: avail?.endTime || '17:00',
          breaks: [{ startTime: '13:00', endTime: '14:00' }]
        };
      });
      setDaySchedules(defaultSchedules);
    }
  }, [selectedDoctor?.id]);

  // Day toggle handler
  const handleToggleDay = (day: string) => {
    setAvailableDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day];
      // Sync daySchedules status
      setDaySchedules(curr => curr.map(s => s.day === day ? { ...s, status: next.includes(day) ? 'Available' : 'Unavailable' } : s));
      return next;
    });
  };

  // Day schedule time updater
  const handleUpdateDayTime = (day: string, field: 'startTime' | 'endTime', value: string) => {
    setDaySchedules(curr => curr.map(s => s.day === day ? { ...s, [field]: value } : s));
  };

  // Add break slot for a day
  const handleAddBreak = (day: string) => {
    setDaySchedules(curr => curr.map(s => {
      if (s.day !== day) return s;
      return {
        ...s,
        breaks: [...(s.breaks || []), { startTime: '13:00', endTime: '14:00' }]
      };
    }));
  };

  // Remove break slot for a day
  const handleRemoveBreak = (day: string, index: number) => {
    setDaySchedules(curr => curr.map(s => {
      if (s.day !== day) return s;
      const nextBreaks = [...(s.breaks || [])];
      nextBreaks.splice(index, 1);
      return { ...s, breaks: nextBreaks };
    }));
  };

  // Add blocked date
  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    if (blockedDates.some(b => b.date === newBlockedDate)) {
      alert('This date is already in the blocked dates list.');
      return;
    }

    setBlockedDates(prev => [...prev, { date: newBlockedDate, reason: newBlockedReason }]);
    setToastMessage(`Blocked date added: ${newBlockedDate} (${newBlockedReason})`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Remove blocked date
  const handleRemoveBlockedDate = (dateToRemove: string) => {
    setBlockedDates(prev => prev.filter(b => b.date !== dateToRemove));
  };

  // Save changes to database (isolated strictly to the selected doctor)
  const handleSaveAvailability = async () => {
    if (!selectedDoctor) return;
    setIsSaving(true);
    try {
      const updatedAvailability = {
        availableDays,
        startTime,
        endTime,
        unavailableDates: blockedDates.map(b => b.date),
        blockedDates,
        daySchedules
      };

      await updateStaff(selectedDoctor.id, {
        availability: updatedAvailability
      });

      setToastMessage(`Availability saved for ${selectedDoctor.name}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save doctor availability:', err);
      alert('Failed to save availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedDoctor) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
        <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-black uppercase text-slate-700">No Doctors Registered in System</h3>
        <p className="text-xs text-slate-400 mt-1">Register staff members with the role DOCTOR to configure availability.</p>
      </div>
    );
  }

  const selectedDoctorIsHospital = isHospitalDoctor(selectedDoctor);
  const selectedDoctorTypeLabel = getDoctorTypeLabel(selectedDoctor);
  const selectedDoctorDaysCount = selectedDoctor.availability?.availableDays?.length ?? availableDays.length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Doctor Selector */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-hospital-600 mb-1">
              <Clock className="w-4 h-4" /> 3. Availability & Duty Management
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Doctor Schedules & Working Hours
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Master Admin manages consultation schedules, shift hours, break slots, and blocked leaves for both Hospital and Independent Doctors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAvailability}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Availability
                </>
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Doctor Selection Section */}
        <div className="space-y-3" ref={dropdownRef}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-700">
                Select Attending Doctor to Configure
              </label>
              <p className="text-[11px] text-slate-400">
                Search and select across all registered Hospital Doctors & Independent Doctors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {totalDoctorCount} Total Doctors
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {hospitalDoctorCount} Hospital
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                {independentDoctorCount} Doctor
              </span>
            </div>
          </div>

          {/* Interactive Trigger Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className={`w-full p-4 rounded-2xl sm:rounded-3xl border-2 text-left transition-all flex items-center justify-between gap-4 bg-white shadow-sm hover:border-hospital-400 ${
                isDropdownOpen ? 'border-hospital-600 ring-4 ring-hospital-100' : 'border-slate-200/90'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-sm ${
                  selectedDoctorIsHospital 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-emerald-600 text-white'
                }`}>
                  {selectedDoctor.name.charAt(0)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                      {selectedDoctor.name}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                      selectedDoctorIsHospital
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {selectedDoctorTypeLabel}
                    </span>
                  </div>

                  {/* Doctor Info Format: Specialty • Hospital Name • Doctor Type */}
                  <div className="text-xs text-slate-500 flex items-center flex-wrap gap-1.5 mt-0.5">
                    <span className="font-bold text-slate-700">
                      {selectedDoctor.specialization || 'General Surgeon'}
                    </span>
                    {selectedDoctor.hospitalName && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium">{selectedDoctor.hospitalName}</span>
                      </>
                    )}
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-500">{selectedDoctorTypeLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden md:block">
                  <div className="text-xs font-black text-slate-800">
                    {selectedDoctorDaysCount} Days Active
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {startTime} - {endTime}
                  </div>
                </div>
                <div className={`w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 transition-transform ${
                  isDropdownOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50'
                }`}>
                  {isDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {/* Searchable Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Search Box Header */}
                <div className="p-3.5 sm:p-4 bg-slate-50/90 border-b border-slate-200/80 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search by doctor name, hospital, specialty..."
                      className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 transition-all shadow-sm"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Doctor Type Filter Options */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                      <Filter className="w-3 h-3" /> Doctor Type:
                    </span>
                    <button
                      type="button"
                      onClick={() => setDoctorTypeFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        doctorTypeFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      All Types ({totalDoctorCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDoctorTypeFilter('HOSPITAL_DOCTOR')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        doctorTypeFilter === 'HOSPITAL_DOCTOR'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <Building2 className="w-3 h-3" /> Hospital Doctor ({hospitalDoctorCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDoctorTypeFilter('DOCTOR')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        doctorTypeFilter === 'DOCTOR'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" /> Doctor ({independentDoctorCount})
                    </button>
                  </div>
                </div>

                {/* Scrollable Doctor List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {filteredDoctors.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-xs font-black uppercase tracking-wide text-slate-700">No doctors found</div>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        {searchTerm ? `No doctor matches "${searchTerm}"` : 'No doctors match the selected type filter.'}
                      </p>
                      {(searchTerm || doctorTypeFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => { setSearchTerm(''); setDoctorTypeFilter('ALL'); }}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          Clear Search & Filters
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredDoctors.map(doc => {
                      const isSelected = doc.id === selectedDoctor.id;
                      const isHosp = isHospitalDoctor(doc);
                      const docDays = doc.availability?.availableDays?.length ?? 5;
                      const sTime = doc.availability?.startTime || '09:00';
                      const eTime = doc.availability?.endTime || '17:00';
                      const docType = getDoctorTypeLabel(doc);

                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full p-3.5 sm:p-4 text-left transition-all flex items-center justify-between gap-3 hover:bg-slate-50/80 ${
                            isSelected ? 'bg-hospital-50/70 border-l-4 border-hospital-600' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                              isSelected
                                ? 'bg-hospital-600 text-white'
                                : isHosp
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {doc.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                  {doc.name}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                                  isHosp
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {docType}
                                </span>
                              </div>
                              {/* Display: Specialty • Hospital Name • Doctor Type */}
                              <div className="text-[11px] text-slate-500 flex items-center flex-wrap gap-1.5 mt-0.5">
                                <span className="font-semibold text-slate-700">{doc.specialization || 'General Surgeon'}</span>
                                {doc.hospitalName && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-600 font-medium">{doc.hospitalName}</span>
                                  </>
                                )}
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-slate-500">{docType}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="text-[11px] font-bold text-slate-700">{docDays} days/wk</div>
                              <div className="text-[10px] text-slate-400 font-mono">{sTime} - {eTime}</div>
                            </div>
                            {isSelected ? (
                              <div className="w-7 h-7 rounded-xl bg-hospital-600 text-white flex items-center justify-center shadow-sm">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-300">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer Status */}
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Showing {filteredDoctors.length} of {totalDoctorCount} doctors</span>
                  <span className="text-slate-400">Master Admin Doctor Availability</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Doctor Selection Pills Bar */}
          <div className="pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
              Quick Doctor Switch:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {allDoctors.map(doc => {
                const isSelected = doc.id === selectedDoctor.id;
                const isHosp = isHospitalDoctor(doc);
                const docType = getDoctorTypeLabel(doc);

                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDoctorId(doc.id)}
                    className={`px-3 py-2 rounded-xl border text-left transition-all flex items-center gap-2.5 shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${
                      isSelected 
                        ? 'bg-hospital-600 text-white' 
                        : isHosp 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {doc.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[11px] font-extrabold whitespace-nowrap">{doc.name}</div>
                      <div className={`text-[9px] ${isSelected ? 'text-slate-300' : 'text-slate-400'} whitespace-nowrap`}>
                        {doc.specialization || 'Consultant'} • {docType}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Working Days & Shifts Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Weekly Working Days and Hours */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 uppercase">Weekly Consultation Schedule</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                  selectedDoctorIsHospital
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {selectedDoctorTypeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure consultation days and working hours for <strong className="text-slate-800">{selectedDoctor.name}</strong>
                {selectedDoctor.hospitalName ? ` (${selectedDoctor.hospitalName})` : ''}.
              </p>
            </div>
            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase">
              {availableDays.length} Days Active
            </div>
          </div>

          {/* Quick Default Hours */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-4">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" /> Default Working Hours:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          {/* Detailed Day-by-Day Roster */}
          <div className="space-y-3">
            {WEEKDAYS.map(day => {
              const isDayAvailable = availableDays.includes(day);
              const sched = daySchedules.find(s => s.day === day);

              return (
                <div
                  key={day}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDayAvailable ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleDay(day)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                          isDayAvailable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDayAvailable ? <Check className="w-4 h-4" /> : null}
                      </button>

                      <div>
                        <div className="text-sm font-extrabold text-slate-900">{day}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {isDayAvailable ? 'Available for OPD' : 'Day Off'}
                        </div>
                      </div>
                    </div>

                    {isDayAvailable && (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="time"
                            value={sched?.startTime || startTime}
                            onChange={e => handleUpdateDayTime(day, 'startTime', e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                          />
                          <span className="text-slate-400 text-xs">-</span>
                          <input
                            type="time"
                            value={sched?.endTime || endTime}
                            onChange={e => handleUpdateDayTime(day, 'endTime', e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                          />
                        </div>

                        {/* Breaks count */}
                        <div className="flex items-center gap-2">
                          {(sched?.breaks || []).map((brk, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-bold">
                              <Coffee className="w-3 h-3 text-amber-600" /> {brk.startTime}-{brk.endTime}
                              <button
                                type="button"
                                onClick={() => handleRemoveBreak(day, idx)}
                                className="text-amber-600 hover:text-amber-900 ml-1"
                              >
                                &times;
                              </button>
                            </span>
                          ))}

                          <button
                            type="button"
                            onClick={() => handleAddBreak(day)}
                            className="text-[10px] font-black uppercase text-hospital-600 hover:text-hospital-700 bg-hospital-50 px-2 py-1 rounded-lg"
                          >
                            + Break
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Blocked Dates & Leave Management */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-black text-slate-900 uppercase">Blocked Dates / Leaves</h3>
            <p className="text-xs text-slate-500">Block specific dates for vacation, leave, or emergency off.</p>
          </div>

          {/* Add Blocked Date Form */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Add Blocked Date
            </span>

            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Select Date</label>
              <input
                type="date"
                value={newBlockedDate}
                onChange={e => setNewBlockedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Leave Reason</label>
              <select
                value={newBlockedReason}
                onChange={e => setNewBlockedReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                <option value="Vacation">Vacation</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Conference / Training">Conference / Training</option>
                <option value="Public Holiday">Public Holiday</option>
                <option value="Personal Leave">Personal Leave</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddBlockedDate}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Blocked List
            </button>
          </div>

          {/* Blocked Dates List */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Current Blocked Dates ({blockedDates.length})
            </span>

            {blockedDates.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 text-xs font-medium">
                No blocked dates scheduled for this doctor.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {blockedDates.map(b => (
                  <div
                    key={b.date}
                    className="p-3 bg-rose-50/60 border border-rose-100 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-rose-950">{b.date}</div>
                      <div className="text-[10px] text-rose-600 font-semibold">{b.reason}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveBlockedDate(b.date)}
                      className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                      title="Remove blocked date"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Hospital-Wide Doctor Availability Overview */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">
            <Stethoscope className="w-4 h-4 text-hospital-600" /> Master Admin Doctor Duty Roster
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {allDoctors.length} Registered Doctors
          </span>
        </div>

        <div className="overflow-x-auto table-container w-full">
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Doctor Name</th>
                <th className="pb-3">Doctor Type</th>
                <th className="pb-3">Specialty & Facility</th>
                <th className="pb-3">Working Days</th>
                <th className="pb-3">Shift Hours</th>
                <th className="pb-3">Blocked Leaves</th>
                <th className="pb-3 pr-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allDoctors.map(doc => {
                const avail = doc.availability;
                const days = avail?.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                const sTime = avail?.startTime || '09:00';
                const eTime = avail?.endTime || '17:00';
                const blocksCount = avail?.blockedDates?.length || (avail?.unavailableDates?.length || 0);
                const isHosp = isHospitalDoctor(doc);
                const docType = getDoctorTypeLabel(doc);
                const isSelected = doc.id === selectedDoctor.id;

                return (
                  <tr key={doc.id} className={`hover:bg-slate-50/60 ${isSelected ? 'bg-hospital-50/40' : ''}`}>
                    <td className="py-3.5 pl-2 font-extrabold text-slate-800 text-sm flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isHosp ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {doc.name.charAt(0)}
                      </div>
                      <div>
                        <div>{doc.name}</div>
                        {isSelected && (
                          <span className="text-[9px] font-black text-hospital-600 uppercase tracking-wider">
                            Currently Editing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        isHosp 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {docType}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-600 font-semibold">
                      <div>{doc.specialization || 'General Surgeon'}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {doc.hospitalName || 'Independent Practice'}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {days.map(d => (
                          <span key={d} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold uppercase">
                            {d.slice(0, 3)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-700">
                      {sTime} - {eTime}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        blocksCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {blocksCount} Blocked
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId(doc.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-colors ${
                          isSelected 
                            ? 'bg-hospital-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {isSelected ? 'Editing Now' : 'Configure'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
