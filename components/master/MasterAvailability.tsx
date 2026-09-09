import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { StaffUser, DaySchedule, BlockedDate } from '../../types';
import { 
  Clock, Calendar, CheckCircle2, XCircle, User, Plus, 
  Trash2, Save, AlertCircle, RefreshCw, Stethoscope, Shield, 
  ChevronRight, Coffee, Sun, Moon, Info, Check, Loader2
} from 'lucide-react';

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const MasterAvailability: React.FC = () => {
  const { staffUsers, updateStaff } = useHospital();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Doctors list
  const doctorsList = useMemo(() => {
    return staffUsers.filter(u => u.role === 'DOCTOR');
  }, [staffUsers]);

  // Selected doctor state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctorsList[0]?.id || '');

  // Keep selected doctor in sync if list loads
  useEffect(() => {
    if (!selectedDoctorId && doctorsList.length > 0) {
      setSelectedDoctorId(doctorsList[0].id);
    }
  }, [doctorsList, selectedDoctorId]);

  const selectedDoctor = useMemo(() => {
    return doctorsList.find(d => d.id === selectedDoctorId) || doctorsList[0];
  }, [doctorsList, selectedDoctorId]);

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
  }, [selectedDoctor]);

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

  // Save changes to database
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
              Master Admin manages doctor consultation availability, shift hours, break slots, and blocked leaves.
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

        {/* Doctor Selection Pill Cards */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            Select Attending Doctor to Configure
          </label>
          <div className="flex flex-wrap gap-3">
            {doctorsList.map(doc => {
              const isSelected = doc.id === selectedDoctor.id;
              const docDaysCount = doc.availability?.availableDays?.length ?? 5;

              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`px-4 py-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                    isSelected ? 'bg-hospital-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {doc.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-extrabold">{doc.name}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {doc.specialization || 'General Surgeon'} • {docDaysCount} days/wk
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Working Days & Shifts Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Weekly Working Days and Hours */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase">Weekly Consultation Schedule</h3>
              <p className="text-xs text-slate-500">Configure consultation days and working hours for {selectedDoctor.name}.</p>
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
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          <Stethoscope className="w-4 h-4" /> Hospital-Wide Doctor Duty Roster
        </div>

        <div className="overflow-x-auto table-container w-full">
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Doctor Name</th>
                <th className="pb-3">Specialization</th>
                <th className="pb-3">Working Days</th>
                <th className="pb-3">Shift Hours</th>
                <th className="pb-3">Blocked Leaves</th>
                <th className="pb-3 pr-2 text-right">Quick Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {doctorsList.map(doc => {
                const avail = doc.availability;
                const days = avail?.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
                const sTime = avail?.startTime || '09:00';
                const eTime = avail?.endTime || '17:00';
                const blocksCount = avail?.blockedDates?.length || (avail?.unavailableDates?.length || 0);

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 pl-2 font-extrabold text-slate-800 text-sm flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-hospital-50 text-hospital-700 flex items-center justify-center font-bold text-xs">
                        {doc.name.charAt(0)}
                      </div>
                      {doc.name}
                    </td>
                    <td className="py-3.5 text-slate-600 font-semibold">{doc.specialization || 'General Surgeon'}</td>
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
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold uppercase transition-colors"
                      >
                        Configure
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
