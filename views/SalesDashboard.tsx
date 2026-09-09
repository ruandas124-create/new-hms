import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { Appointment, Patient, SurgeonCode, Condition } from '../types';
import { 
  TrendingUp, Calendar, Users, Phone, Search, Plus, CheckCircle2, 
  Clock, Lock, ArrowRight, AlertCircle, ShieldAlert, Sparkles, Filter,
  UserCheck, DollarSign
} from 'lucide-react';

export const SalesDashboard: React.FC = () => {
  const { 
    patients, 
    appointments, 
    addAppointment, 
    updateAppointment, 
    staffUsers, 
    schedulingPermissions,
    systemName 
  } = useHospital();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    name: '',
    mobile: '',
    source: '',
    referralPerson: '',
    condition: Condition.Other,
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    assignedDoctorId: '',
    assignedDoctorName: '',
    visitType: 'OPD'
  });

  const doctors = useMemo(() => {
    return (staffUsers || []).filter(u => u.role === 'DOCTOR');
  }, [staffUsers]);

  // Lead tracking (S1 and high potential surgical consultations)
  const leads = useMemo(() => {
    return patients.filter(p => {
      const isS1 = p.doctorAssessment?.quickCode === SurgeonCode.S1;
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.mobile.includes(searchTerm);
      return isS1 && matchesSearch;
    });
  }, [patients, searchTerm]);

  // Sales appointments
  const salesAppointments = useMemo(() => {
    return appointments.filter(a => {
      const matchesSearch = !searchTerm || 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.mobile.includes(searchTerm);
      const matchesDoc = selectedDoctorId === 'all' || a.assignedDoctorId === selectedDoctorId;
      return matchesSearch && matchesDoc;
    });
  }, [appointments, searchTerm, selectedDoctorId]);

  const hasSchedulingAccess = schedulingPermissions.sales;

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSchedulingAccess) {
      alert("Scheduling access has been disabled by Master Admin.");
      return;
    }
    if (!bookingFormData.name || !bookingFormData.mobile || !bookingFormData.date) {
      alert("Please fill in patient name, mobile, and appointment date.");
      return;
    }
    if (!bookingFormData.source) {
      alert("Please select a Source.");
      return;
    }
    if (bookingFormData.source === 'Referral' && !bookingFormData.referralPerson?.trim()) {
      alert("Referral Person is required when Source is Referral.");
      return;
    }

    const doc = doctors.find(d => d.id === bookingFormData.assignedDoctorId);
    const activeUsername = localStorage.getItem('hms_hospital_name') || 
      localStorage.getItem('username') || 
      'Sales Executive';

    await addAppointment({
      name: bookingFormData.name,
      mobile: bookingFormData.mobile,
      source: bookingFormData.source,
      referral_person: bookingFormData.source === 'Referral' ? bookingFormData.referralPerson.trim() : null,
      condition: bookingFormData.condition,
      date: bookingFormData.date,
      time: bookingFormData.time,
      assignedDoctorId: doc?.id,
      assignedDoctorName: doc?.name,
      bookingType: 'Scheduled',
      visit_type: 'OPD',
      username: activeUsername
    });

    setShowBookingModal(false);
    setBookingFormData({
      name: '',
      mobile: '',
      source: '',
      referralPerson: '',
      condition: Condition.Other,
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      assignedDoctorId: '',
      assignedDoctorName: '',
      visitType: 'OPD'
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-8 text-white border border-rose-900/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" /> Sales & Conversion Operations
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Sales Dashboard</h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              Track surgical conversion leads, coordinate patient packages, and schedule consultations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasSchedulingAccess ? (
              <button
                onClick={() => setShowBookingModal(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-rose-900/40 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Book Appointment
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Scheduling Locked by Master
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active S1 Leads</span>
            <Users className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{leads.length}</div>
          <p className="text-xs text-slate-500">Surgery recommended candidates</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Scheduled Appts</span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{appointments.length}</div>
          <p className="text-xs text-slate-500">Hospital-wide booked consultations</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Scheduling Privilege</span>
            <Lock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black">
            {hasSchedulingAccess ? (
              <span className="text-emerald-600 flex items-center gap-1.5 text-xl">
                <CheckCircle2 className="w-5 h-5" /> Enabled (Active)
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1.5 text-xl">
                <Lock className="w-5 h-5" /> Disabled by Master
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">Governed by Master Admin</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Doctors</span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{doctors.length}</div>
          <p className="text-xs text-slate-500">Consultants available for booking</p>
        </div>
      </div>

      {/* Scheduling Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-600 mb-1">
              <Calendar className="w-4 h-4" /> Consultation Scheduling System
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              Patient Appointments
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {hasSchedulingAccess 
                ? 'Create and manage consultation bookings. All booked appointments log your user identity.' 
                : 'Scheduling capabilities are currently disabled by Master Admin.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search patient or phone..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <select
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Doctors</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!hasSchedulingAccess && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-xs font-bold">
            <Lock className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              <strong>Master Scheduling Access Notice:</strong> Master Admin has turned off scheduling access for the Sales Dashboard. Booking new appointments is locked.
            </span>
          </div>
        )}

        {/* Appointments Table */}
        <div className="overflow-x-auto table-container w-full">
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Patient</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">Source</th>
                <th className="pb-3">Condition</th>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Assigned Doctor</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Scheduled By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesAppointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    No appointments found matching your search.
                  </td>
                </tr>
              ) : (
                salesAppointments.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pl-2 font-black text-slate-900 text-sm">
                      {appt.name}
                    </td>
                    <td className="py-4 font-mono text-slate-600 font-semibold">{appt.mobile}</td>
                    <td className="py-4">
                      {appt.source ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-bold text-[10px]">
                            {appt.source}
                          </span>
                          {appt.source === 'Referral' && appt.referral_person && (
                            <div className="text-[10px] text-slate-500 font-medium">
                              Ref: <span className="font-bold text-slate-700">{appt.referral_person}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-slate-100 rounded-lg text-slate-700 font-bold text-[11px]">
                        {appt.condition}
                      </span>
                    </td>
                    <td className="py-4 font-semibold text-slate-700">
                      <div className="font-bold">{appt.date}</div>
                      <div className="text-[10px] text-slate-400">{appt.time}</div>
                    </td>
                    <td className="py-4 font-bold text-slate-800">
                      {appt.assignedDoctorName || 'General / Unassigned'}
                    </td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {appt.bookingType || appt.status || 'Scheduled'}
                      </span>
                    </td>
                    <td className="py-4 pr-2 text-right font-mono text-xs font-bold text-rose-600">
                      {appt.username || 'System'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-6 max-h-[94dvh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black text-slate-900 uppercase">Book Patient Consultation</h3>
              <button onClick={() => setShowBookingModal(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">
                Close
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={bookingFormData.name}
                  onChange={e => setBookingFormData({ ...bookingFormData, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={bookingFormData.mobile}
                  onChange={e => setBookingFormData({ ...bookingFormData, mobile: e.target.value })}
                  placeholder="10 digit mobile"
                  className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Date *</label>
                  <input
                    type="date"
                    required
                    value={bookingFormData.date}
                    onChange={e => setBookingFormData({ ...bookingFormData, date: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Time *</label>
                  <input
                    type="time"
                    required
                    value={bookingFormData.time}
                    onChange={e => setBookingFormData({ ...bookingFormData, time: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Acqure OPD - Read-only / Locked */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Acqure OPD</span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-400">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    value="OPD"
                    className="w-full mt-1 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-not-allowed select-none"
                    title="Acqure OPD is read-only and unchangeable"
                  />
                </div>

                {/* Source */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Source *
                  </label>
                  <select
                    required
                    value={bookingFormData.source}
                    onChange={e => {
                      const val = e.target.value;
                      setBookingFormData({
                        ...bookingFormData,
                        source: val,
                        referralPerson: val === 'Referral' ? bookingFormData.referralPerson : ''
                      });
                    }}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
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
              </div>

              {/* Dynamic Referral Person when Source = Referral */}
              {bookingFormData.source === 'Referral' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase text-rose-600 tracking-wider">
                    Referral Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingFormData.referralPerson}
                    onChange={e => setBookingFormData({ ...bookingFormData, referralPerson: e.target.value })}
                    placeholder="Enter referral person name"
                    className="w-full mt-1 p-2.5 bg-white border-2 border-rose-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Consulting Doctor</label>
                <select
                  value={bookingFormData.assignedDoctorId}
                  onChange={e => setBookingFormData({ ...bookingFormData, assignedDoctorId: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 font-medium">
                Appointment will be marked with: <strong className="text-slate-900">Scheduled by: {localStorage.getItem('hms_hospital_name') || 'Sales Executive'}</strong>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-xl hover:bg-rose-500 shadow-md shadow-rose-900/30"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
