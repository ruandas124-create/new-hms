import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { Appointment, Patient, SurgeonCode, Condition, Gender } from '../types';
import { 
  TrendingUp, Calendar, Users, Phone, Search, Plus, CheckCircle2, 
  Clock, Lock, ArrowRight, AlertCircle, ShieldAlert, Sparkles, Filter,
  UserCheck, DollarSign, Building2, Stethoscope, Eye, RefreshCw, 
  ChevronRight, FileText, MapPin, Tag, Check, X, UserPlus, HelpCircle
} from 'lucide-react';

export interface LeadItem {
  id: string;
  patientId?: string;
  appointmentId?: string;
  name: string;
  mobile: string;
  age?: number;
  gender?: Gender | string;
  city?: string;
  condition: Condition | string;
  source: string;
  referralPerson?: string | null;
  appointmentStatus: string;
  assignedHospitalId?: string;
  assignedHospitalName?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  scheduledBy?: string;
  quickCode?: SurgeonCode;
  notes?: string;
  leadStage: 'New' | 'Pending Scheduling' | 'Scheduled' | 'In Consultation' | 'Converted' | 'Follow-Up' | 'Dropped';
}

export const SalesDashboard: React.FC = () => {
  const { 
    patients, 
    appointments, 
    addAppointment, 
    updateAppointment, 
    updatePatient,
    staffUsers, 
    schedulingPermissions,
    systemName 
  } = useHospital();

  const [activeTab, setActiveTab] = useState<'leads_directory' | 'appointments' | 's1_leads'>('leads_directory');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('ALL');
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('ALL');

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<LeadItem | null>(null);
  const [leadToSchedule, setLeadToSchedule] = useState<LeadItem | null>(null);

  // Doctors & Hospitals lists
  const doctors = useMemo(() => {
    return (staffUsers || []).filter(u => u.role === 'DOCTOR' && u.accessStatus !== 'Revoked');
  }, [staffUsers]);

  const hospitals = useMemo(() => {
    return (staffUsers || []).filter(u => u.role === 'HOSPITAL' && u.accessStatus !== 'Revoked');
  }, [staffUsers]);

  // Unified Leads Directory aggregation
  const unifiedLeads: LeadItem[] = useMemo(() => {
    const list: LeadItem[] = [];
    const processedMobiles = new Set<string>();

    // 1. Process from registered Patients
    patients.forEach(p => {
      const matchingAppts = appointments.filter(a => 
        (a.patient_id && a.patient_id === p.id) || 
        (a.mobile && a.mobile === p.mobile) ||
        (a.name && p.name && a.name.toLowerCase().trim() === p.name.toLowerCase().trim())
      );

      // Sort by newest date
      matchingAppts.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
      const latestAppt = matchingAppts[0];

      let leadStage: LeadItem['leadStage'] = 'New';
      let apptStatus = 'Pending Scheduling';

      if (latestAppt) {
        apptStatus = latestAppt.status || latestAppt.bookingType || 'Scheduled';
        if (apptStatus === 'Scheduled' || apptStatus === 'Confirmed') {
          leadStage = 'Scheduled';
        } else if (apptStatus === 'Arrived' || apptStatus === 'In-Consultation') {
          leadStage = 'In Consultation';
        } else if (apptStatus === 'Completed' || p.packageProposal?.outcome === 'Completed') {
          leadStage = 'Converted';
        } else if (apptStatus === 'Follow Up' || p.packageProposal?.outcome === 'Follow-Up') {
          leadStage = 'Follow-Up';
        } else if (apptStatus === 'Cancelled' || p.packageProposal?.outcome === 'Lost') {
          leadStage = 'Dropped';
        }
      } else if (p.doctorAssessment?.quickCode === SurgeonCode.S1) {
        leadStage = 'Pending Scheduling';
      }

      const assignedDoc = doctors.find(d => d.id === latestAppt?.assignedDoctorId || d.id === p.doctorAssessment?.assignedDoctorId);
      const assignedHosp = hospitals.find(h => h.id === latestAppt?.hospital_id || (assignedDoc && assignedDoc.hospital_id === h.id));

      list.push({
        id: `lead_p_${p.id}`,
        patientId: p.id,
        appointmentId: latestAppt?.id,
        name: p.name,
        mobile: p.mobile,
        age: p.age,
        gender: p.gender,
        city: (p as any).city || (p as any).address || '',
        condition: p.condition || Condition.Other,
        source: p.source || latestAppt?.source || 'Other',
        referralPerson: latestAppt?.referral_person || (p as any).sourceDoctorName || null,
        appointmentStatus: apptStatus,
        assignedHospitalId: assignedHosp?.id || latestAppt?.hospital_id,
        assignedHospitalName: assignedHosp?.name || latestAppt?.hospitalName || (assignedDoc?.hospitalName),
        assignedDoctorId: assignedDoc?.id || latestAppt?.assignedDoctorId,
        assignedDoctorName: assignedDoc?.name || latestAppt?.assignedDoctorName || p.doctorAssessment?.assignedDoctorName,
        appointmentDate: latestAppt?.date,
        appointmentTime: latestAppt?.time,
        scheduledBy: latestAppt?.username || 'Front Office / Clinical',
        quickCode: p.doctorAssessment?.quickCode,
        notes: p.doctorAssessment?.notes || p.packageProposal?.remarks || '',
        leadStage: leadStage
      });

      if (p.mobile) processedMobiles.add(p.mobile);
    });

    // 2. Include appointments that might not be in patients table yet
    appointments.forEach(a => {
      if (a.mobile && processedMobiles.has(a.mobile)) return;

      const assignedDoc = doctors.find(d => d.id === a.assignedDoctorId);
      const assignedHosp = hospitals.find(h => h.id === a.hospital_id || (assignedDoc && assignedDoc.hospital_id === h.id));

      list.push({
        id: `lead_a_${a.id}`,
        appointmentId: a.id,
        name: a.name,
        mobile: a.mobile,
        condition: a.condition || Condition.Other,
        source: a.source || 'Other',
        referralPerson: a.referral_person,
        appointmentStatus: a.status || a.bookingType || 'Scheduled',
        assignedHospitalId: assignedHosp?.id || a.hospital_id,
        assignedHospitalName: assignedHosp?.name || a.hospitalName || assignedDoc?.hospitalName,
        assignedDoctorId: assignedDoc?.id || a.assignedDoctorId,
        assignedDoctorName: assignedDoc?.name || a.assignedDoctorName,
        appointmentDate: a.date,
        appointmentTime: a.time,
        scheduledBy: a.username || 'Sales Executive',
        leadStage: (a.status === 'Completed' ? 'Converted' : a.status === 'Cancelled' ? 'Dropped' : 'Scheduled'),
      });

      if (a.mobile) processedMobiles.add(a.mobile);
    });

    return list;
  }, [patients, appointments, doctors, hospitals]);

  // Filtered Leads Directory
  const filteredLeads = useMemo(() => {
    return unifiedLeads.filter(lead => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        lead.name.toLowerCase().includes(q) ||
        lead.mobile.includes(q) ||
        (lead.assignedDoctorName && lead.assignedDoctorName.toLowerCase().includes(q)) ||
        (lead.assignedHospitalName && lead.assignedHospitalName.toLowerCase().includes(q)) ||
        (lead.city && lead.city.toLowerCase().includes(q)) ||
        (lead.source && lead.source.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'PENDING' && (lead.appointmentStatus === 'Pending Scheduling' || !lead.appointmentDate)) ||
        (statusFilter === 'SCHEDULED' && lead.appointmentStatus === 'Scheduled') ||
        (statusFilter === 'CONVERTED' && (lead.leadStage === 'Converted' || lead.appointmentStatus === 'Completed')) ||
        (statusFilter === 'FOLLOW_UP' && lead.leadStage === 'Follow-Up');

      const matchesHospital = selectedHospitalFilter === 'ALL' || lead.assignedHospitalId === selectedHospitalFilter;
      const matchesDoctor = selectedDoctorFilter === 'ALL' || lead.assignedDoctorId === selectedDoctorFilter;

      return matchesSearch && matchesStatus && matchesHospital && matchesDoctor;
    });
  }, [unifiedLeads, searchTerm, statusFilter, selectedHospitalFilter, selectedDoctorFilter]);

  // Lead metrics
  const totalLeadsCount = unifiedLeads.length;
  const pendingSchedulingCount = unifiedLeads.filter(l => l.appointmentStatus === 'Pending Scheduling' || !l.appointmentDate).length;
  const scheduledCount = unifiedLeads.filter(l => l.appointmentStatus === 'Scheduled').length;
  const convertedCount = unifiedLeads.filter(l => l.leadStage === 'Converted' || l.appointmentStatus === 'Completed').length;

  const hasSchedulingAccess = schedulingPermissions.sales;

  // Form state for Scheduling/Assigning modal
  const [scheduleForm, setScheduleForm] = useState({
    assignmentTarget: 'both' as 'both' | 'doctor' | 'hospital',
    hospitalId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    source: 'Google',
    referralPerson: '',
    condition: Condition.Other,
    visitType: 'OPD',
    remarks: ''
  });

  // Form state for creating a brand new lead
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    mobile: '',
    age: '',
    gender: Gender.Male,
    city: '',
    condition: Condition.Other,
    source: 'Google',
    referralPerson: '',
    hospitalId: '',
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:30',
    scheduleImmediately: true,
    notes: ''
  });

  // Initiate scheduling for a lead
  const handleOpenScheduleModal = (lead: LeadItem) => {
    setLeadToSchedule(lead);
    setScheduleForm({
      assignmentTarget: 'both',
      hospitalId: lead.assignedHospitalId || (hospitals[0]?.id || ''),
      doctorId: lead.assignedDoctorId || (doctors[0]?.id || ''),
      date: lead.appointmentDate || new Date().toISOString().split('T')[0],
      time: lead.appointmentTime || '10:00',
      source: lead.source || 'Google',
      referralPerson: lead.referralPerson || '',
      condition: (lead.condition as Condition) || Condition.Other,
      visitType: 'OPD',
      remarks: lead.notes || ''
    });
    setShowScheduleModal(true);
  };

  // Submit appointment scheduling for patient/lead
  const handleSaveScheduling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSchedulingAccess) {
      alert('Scheduling access is currently disabled by Master Admin.');
      return;
    }
    if (!leadToSchedule) return;

    const selectedDoc = doctors.find(d => d.id === scheduleForm.doctorId);
    const selectedHosp = hospitals.find(h => h.id === scheduleForm.hospitalId);
    const activeUsername = localStorage.getItem('hms_hospital_name') || 
      localStorage.getItem('username') || 
      'Sales Executive';

    const hospitalName = selectedHosp ? selectedHosp.name : (selectedDoc?.hospitalName || 'Main Hospital Facility');
    const doctorName = selectedDoc ? selectedDoc.name : undefined;

    if (leadToSchedule.appointmentId) {
      // Update existing appointment
      const existingAppt = appointments.find(a => a.id === leadToSchedule.appointmentId);
      if (existingAppt) {
        await updateAppointment({
          ...existingAppt,
          date: scheduleForm.date,
          time: scheduleForm.time,
          assignedDoctorId: selectedDoc?.id,
          assignedDoctorName: doctorName,
          hospital_id: selectedHosp?.id || existingAppt.hospital_id,
          hospitalName: hospitalName,
          status: 'Scheduled',
          bookingType: 'Scheduled',
          source: scheduleForm.source,
          referral_person: scheduleForm.source === 'Referral' ? scheduleForm.referralPerson : null,
          username: activeUsername
        });
      }
    } else {
      // Create new scheduled appointment
      await addAppointment({
        name: leadToSchedule.name,
        mobile: leadToSchedule.mobile,
        source: scheduleForm.source,
        referral_person: scheduleForm.source === 'Referral' ? scheduleForm.referralPerson : null,
        condition: scheduleForm.condition,
        date: scheduleForm.date,
        time: scheduleForm.time,
        assignedDoctorId: selectedDoc?.id,
        assignedDoctorName: doctorName,
        hospital_id: selectedHosp?.id,
        hospitalName: hospitalName,
        assignment_type: scheduleForm.assignmentTarget === 'hospital' ? 'hospital' : 'doctor',
        patient_id: leadToSchedule.patientId || null,
        bookingType: 'Scheduled',
        visit_type: 'OPD',
        username: activeUsername
      });
    }

    setShowScheduleModal(false);
    setLeadToSchedule(null);
  };

  // Submit Brand New Lead
  const handleCreateNewLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.mobile) {
      alert('Please provide patient name and mobile number.');
      return;
    }

    const activeUsername = localStorage.getItem('hms_hospital_name') || 
      localStorage.getItem('username') || 
      'Sales Executive';

    const selectedDoc = doctors.find(d => d.id === newLeadForm.doctorId);
    const selectedHosp = hospitals.find(h => h.id === newLeadForm.hospitalId);
    const hospitalName = selectedHosp ? selectedHosp.name : (selectedDoc?.hospitalName || 'Main Hospital Facility');

    if (newLeadForm.scheduleImmediately && hasSchedulingAccess) {
      await addAppointment({
        name: newLeadForm.name,
        mobile: newLeadForm.mobile,
        source: newLeadForm.source,
        referral_person: newLeadForm.source === 'Referral' ? newLeadForm.referralPerson : null,
        condition: newLeadForm.condition,
        date: newLeadForm.date,
        time: newLeadForm.time,
        assignedDoctorId: selectedDoc?.id,
        assignedDoctorName: selectedDoc?.name,
        hospital_id: selectedHosp?.id,
        hospitalName: hospitalName,
        assignment_type: selectedDoc ? 'doctor' : 'hospital',
        bookingType: 'Scheduled',
        visit_type: 'OPD',
        username: activeUsername
      });
    } else {
      // Add lead as appointment marked Pending
      await addAppointment({
        name: newLeadForm.name,
        mobile: newLeadForm.mobile,
        source: newLeadForm.source,
        referral_person: newLeadForm.source === 'Referral' ? newLeadForm.referralPerson : null,
        condition: newLeadForm.condition,
        date: newLeadForm.date || new Date().toISOString().split('T')[0],
        time: '10:00',
        assignedDoctorId: selectedDoc?.id,
        assignedDoctorName: selectedDoc?.name,
        hospital_id: selectedHosp?.id,
        hospitalName: hospitalName,
        assignment_type: selectedDoc ? 'doctor' : 'hospital',
        bookingType: 'Scheduled',
        visit_type: 'OPD',
        username: activeUsername
      });
    }

    setShowAddLeadModal(false);
    setNewLeadForm({
      name: '',
      mobile: '',
      age: '',
      gender: Gender.Male,
      city: '',
      condition: Condition.Other,
      source: 'Google',
      referralPerson: '',
      hospitalId: '',
      doctorId: '',
      date: new Date().toISOString().split('T')[0],
      time: '10:30',
      scheduleImmediately: true,
      notes: ''
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-rose-900/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5" /> Sales & Patient Coordination
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">Sales Operations & Leads Directory</h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Empowered with scheduling patients with appropriate hospitals or consulting doctors, managing incoming lead pipelines, and coordinating medical consultations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="add-lead-btn"
              onClick={() => setShowAddLeadModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-rose-950 text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-rose-600" /> New Lead
            </button>

            {hasSchedulingAccess ? (
              <button
                id="book-appointment-btn"
                onClick={() => {
                  setLeadToSchedule({
                    id: 'new_manual',
                    name: '',
                    mobile: '',
                    condition: Condition.Other,
                    source: 'Google',
                    appointmentStatus: 'Pending Scheduling',
                    leadStage: 'New'
                  });
                  setScheduleForm({
                    assignmentTarget: 'both',
                    hospitalId: hospitals[0]?.id || '',
                    doctorId: doctors[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    time: '10:00',
                    source: 'Google',
                    referralPerson: '',
                    condition: Condition.Other,
                    visitType: 'OPD',
                    remarks: ''
                  });
                  setShowScheduleModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-900/40 active:scale-95"
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Total Leads Directory</span>
            <Users className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{totalLeadsCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Active inquiries & assigned patient leads</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Pending Scheduling</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">{pendingSchedulingCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Leads requiring hospital or doctor assignment</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Scheduled Appts</span>
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{scheduledCount}</div>
          <p className="text-[11px] text-slate-500 font-medium">Assigned to consulting doctor / facility</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Scheduling Authority</span>
            <Lock className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xl font-black mt-1">
            {hasSchedulingAccess ? (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" /> Enabled (Active)
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1.5 text-base">
                <Lock className="w-4 h-4" /> Locked by Master Admin
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Distinct permission managed in Access Mgmt</p>
        </div>
      </div>

      {/* Main Container with Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 px-6 pt-4 gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2 overflow-x-auto pb-3 sm:pb-0">
            <button
              id="tab-leads-directory"
              onClick={() => setActiveTab('leads_directory')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'leads_directory' 
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-4 h-4" /> Leads Directory ({filteredLeads.length})
            </button>
            <button
              id="tab-appointments-roster"
              onClick={() => setActiveTab('appointments')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                activeTab === 'appointments' 
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Calendar className="w-4 h-4" /> Booked Appointments ({appointments.length})
            </button>
          </div>

          <div className="flex items-center gap-2 pb-3 sm:pb-0">
            <span className="text-xs text-slate-400 font-bold hidden md:inline">
              Available Doctors: <strong className="text-slate-700">{doctors.length}</strong> | Hospitals: <strong className="text-slate-700">{hospitals.length}</strong>
            </span>
          </div>
        </div>

        {/* Tab 1: LEADS DIRECTORY TABLE */}
        {activeTab === 'leads_directory' && (
          <div className="p-6 space-y-6">
            {/* Filter Controls Row */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </div>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({unifiedLeads.length})
                </button>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'PENDING' ? 'bg-amber-500 text-white shadow-xs' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3 h-3" /> Need Scheduling ({pendingSchedulingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('SCHEDULED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'SCHEDULED' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" /> Scheduled ({scheduledCount})
                </button>
                <button
                  onClick={() => setStatusFilter('CONVERTED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'CONVERTED' ? 'bg-purple-600 text-white shadow-xs' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" /> Converted ({convertedCount})
                </button>
              </div>

              {/* Search and Facility Dropdowns */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search patient, phone, doctor..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <select
                  value={selectedHospitalFilter}
                  onChange={e => setSelectedHospitalFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="ALL">All Hospitals</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>

                <select
                  value={selectedDoctorFilter}
                  onChange={e => setSelectedDoctorFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="ALL">All Doctors</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Permission Alert if scheduling disabled */}
            {!hasSchedulingAccess && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 text-xs font-bold">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Master Admin Governance:</strong> Scheduling authority has been paused for the Sales team. You can view lead directories and profiles, but scheduling patients is locked until re-enabled in Master Access Management.
                </span>
              </div>
            )}

            {/* Leads Directory Table */}
            <div className="overflow-x-auto table-container w-full border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs min-w-[1100px]">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Lead & Patient Details</th>
                    <th className="py-3.5 px-4">Condition & Source</th>
                    <th className="py-3.5 px-4">Appointment Status</th>
                    <th className="py-3.5 px-4">Assigned Hospital / Doctor</th>
                    <th className="py-3.5 px-4">Scheduling Information</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <div className="font-bold text-slate-600">No leads found matching current filter</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Click "New Lead" or adjust your search filters above</div>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map(lead => {
                      const isPending = lead.appointmentStatus === 'Pending Scheduling' || !lead.appointmentDate;
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Patient Details */}
                          <td className="py-4 px-4">
                            <div className="flex items-start gap-2">
                              <div>
                                <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                                  {lead.name}
                                  {lead.quickCode === SurgeonCode.S1 && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[9px] font-black border border-rose-200">
                                      S1 Surgery
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1 font-mono">
                                  <Phone className="w-3 h-3 text-slate-400" /> {lead.mobile}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                                  {lead.age ? <span>{lead.age} Yrs</span> : null}
                                  {lead.gender ? <span>• {lead.gender}</span> : null}
                                  {lead.city ? <span>• {lead.city}</span> : null}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Condition & Source */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 font-bold rounded-md text-[11px]">
                                {lead.condition}
                              </span>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                <Tag className="w-3 h-3 text-slate-400" />
                                <span>{lead.source}</span>
                                {lead.referralPerson && (
                                  <span className="text-rose-600 font-bold">({lead.referralPerson})</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Appointment Status */}
                          <td className="py-4 px-4">
                            {isPending ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" /> Pending Scheduling
                                </span>
                                <div className="text-[10px] text-amber-600 font-bold">Needs Doctor/Hospital</div>
                              </div>
                            ) : lead.appointmentStatus === 'Scheduled' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Scheduled
                              </span>
                            ) : lead.appointmentStatus === 'Completed' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                <Sparkles className="w-3 h-3" /> Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                {lead.appointmentStatus}
                              </span>
                            )}
                          </td>

                          {/* Assigned Hospital / Doctor */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              {/* Hospital Assignment */}
                              {lead.assignedHospitalName ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span className="truncate max-w-[170px]">{lead.assignedHospitalName}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 italic">Facility: Unassigned</div>
                              )}

                              {/* Doctor Assignment */}
                              {lead.assignedDoctorName ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate max-w-[170px]">{lead.assignedDoctorName}</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> No Doctor Assigned
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Scheduling Information */}
                          <td className="py-4 px-4">
                            {lead.appointmentDate ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {lead.appointmentDate}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  Slot: <strong className="text-slate-700">{lead.appointmentTime || '10:00 AM'}</strong>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  By: <span className="font-mono">{lead.scheduledBy || 'Sales'}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400 font-medium italic">
                                Not yet scheduled
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedLeadForDetail(lead)}
                                className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1"
                                title="View Lead Profile & Details"
                              >
                                <Eye className="w-3.5 h-3.5" /> Details
                              </button>

                              {hasSchedulingAccess ? (
                                <button
                                  onClick={() => handleOpenScheduleModal(lead)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 shadow-xs ${
                                    isPending 
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' 
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                  }`}
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  {isPending ? 'Schedule' : 'Reschedule'}
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed flex items-center gap-1"
                                  title="Scheduling disabled by Master Admin"
                                >
                                  <Lock className="w-3 h-3" /> Locked
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
        )}

        {/* Tab 2: APPOINTMENTS ROSTER */}
        {activeTab === 'appointments' && (
          <div className="p-6 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Hospital Appointments Roster</h3>
                <p className="text-xs text-slate-500 mt-0.5">All scheduled consultations and hospital visits booked across teams</p>
              </div>
            </div>

            <div className="overflow-x-auto table-container w-full border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs min-w-[1000px]">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Patient Details</th>
                    <th className="py-3.5 px-4">Slot & Date</th>
                    <th className="py-3.5 px-4">Assigned Doctor / Hospital</th>
                    <th className="py-3.5 px-4">Source & Condition</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Scheduled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                        No appointments currently scheduled.
                      </td>
                    </tr>
                  ) : (
                    appointments.map(appt => (
                      <tr key={appt.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-black text-slate-900 text-sm">{appt.name}</div>
                          <div className="text-xs font-mono text-slate-600">{appt.mobile}</div>
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-700">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {appt.date}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Time: {appt.time}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-800">{appt.assignedDoctorName || 'General Doctor'}</div>
                          <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>{appt.hospitalName || 'Main Hospital Facility'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold text-[11px]">
                            {appt.condition}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1">{appt.source}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {appt.bookingType || appt.status || 'Scheduled'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-xs font-bold text-rose-600">
                          {appt.username || 'Staff'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SCHEDULING MODAL FOR SALES TEAM */}
      {showScheduleModal && leadToSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-6 max-h-[94dvh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Sales Scheduling Desk</span>
                <h3 className="text-xl font-black text-slate-900 uppercase">
                  Schedule Patient with Hospital / Doctor
                </h3>
              </div>
              <button 
                onClick={() => { setShowScheduleModal(false); setLeadToSchedule(null); }} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduling} className="space-y-4">
              {/* Patient Basic Info Banner */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Patient</div>
                  <div className="text-sm font-black text-slate-900">{leadToSchedule.name || 'New Patient'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</div>
                  <div className="text-sm font-mono font-bold text-slate-800">{leadToSchedule.mobile || '—'}</div>
                </div>
              </div>

              {!leadToSchedule.name && (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Patient Name *</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.remarks}
                    onChange={e => setLeadToSchedule({ ...leadToSchedule, name: e.target.value })}
                    placeholder="Enter patient full name"
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Assignment Target: Hospital Selection */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" /> Assign Hospital Facility *
                </label>
                <select
                  required
                  value={scheduleForm.hospitalId}
                  onChange={e => setScheduleForm({ ...scheduleForm, hospitalId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select Hospital Facility...</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name} {h.city ? `(${h.city})` : ''}</option>
                  ))}
                  {hospitals.length === 0 && (
                    <option value="main_hospital">Main Hospital Facility</option>
                  )}
                </select>
              </div>

              {/* Assignment Target: Doctor Selection */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5 mb-1">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600" /> Assign Consulting Doctor *
                </label>
                <select
                  required
                  value={scheduleForm.doctorId}
                  onChange={e => setScheduleForm({ ...scheduleForm, doctorId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.hospitalName ? `(${d.hospitalName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.date}
                    onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Slot Time *</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.time}
                    onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Source & Referral */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Source *</label>
                  <select
                    required
                    value={scheduleForm.source}
                    onChange={e => setScheduleForm({ ...scheduleForm, source: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Walking">Walking</option>
                    <option value="Relatives / Friend">Relatives / Friend</option>
                    <option value="Billboard">Billboard</option>
                    <option value="Referral">Referral</option>
                  </select>
                </div>

                {scheduleForm.source === 'Referral' ? (
                  <div>
                    <label className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Referral Person *</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.referralPerson}
                      onChange={e => setScheduleForm({ ...scheduleForm, referralPerson: e.target.value })}
                      placeholder="Doctor / Partner name"
                      className="w-full mt-1 p-2.5 bg-white border-2 border-rose-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Condition</label>
                    <select
                      value={scheduleForm.condition}
                      onChange={e => setScheduleForm({ ...scheduleForm, condition: e.target.value as Condition })}
                      className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {Object.values(Condition).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Sales Rep Attribution Notice */}
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-medium">
                Scheduled by Sales Rep: <strong>{localStorage.getItem('hms_hospital_name') || 'Sales Executive'}</strong>. The appointment will reflect in the Hospital Roster with full attribution.
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => { setShowScheduleModal(false); setLeadToSchedule(null); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-xl hover:bg-rose-500 shadow-md shadow-rose-900/30 active:scale-95"
                >
                  Confirm & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW LEAD CREATION MODAL */}
      {showAddLeadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5 max-h-[94dvh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Leads Pipeline</span>
                <h3 className="text-xl font-black text-slate-900 uppercase">Register New Patient Lead</h3>
              </div>
              <button onClick={() => setShowAddLeadModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewLead} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.name}
                    onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={newLeadForm.mobile}
                    onChange={e => setNewLeadForm({ ...newLeadForm, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">City / Location</label>
                  <input
                    type="text"
                    value={newLeadForm.city}
                    onChange={e => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                    placeholder="City / Region"
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Condition</label>
                  <select
                    value={newLeadForm.condition}
                    onChange={e => setNewLeadForm({ ...newLeadForm, condition: e.target.value as Condition })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {Object.values(Condition).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Lead Source *</label>
                  <select
                    value={newLeadForm.source}
                    onChange={e => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Walking">Walking</option>
                    <option value="Relatives / Friend">Relatives / Friend</option>
                    <option value="Billboard">Billboard</option>
                    <option value="Referral">Referral</option>
                  </select>
                </div>
              </div>

              {newLeadForm.source === 'Referral' && (
                <div>
                  <label className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Referral Person *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.referralPerson}
                    onChange={e => setNewLeadForm({ ...newLeadForm, referralPerson: e.target.value })}
                    placeholder="Referring doctor or contact"
                    className="w-full mt-1 p-2.5 bg-white border-2 border-rose-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              {/* Schedule Immediately Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-black text-slate-800">Schedule Consultation Immediately</div>
                    <div className="text-[10px] text-slate-400">Assign to hospital facility or doctor right away</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newLeadForm.scheduleImmediately}
                    onChange={e => setNewLeadForm({ ...newLeadForm, scheduleImmediately: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                </div>
              </div>

              {newLeadForm.scheduleImmediately && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Assign Hospital</label>
                    <select
                      value={newLeadForm.hospitalId}
                      onChange={e => setNewLeadForm({ ...newLeadForm, hospitalId: e.target.value })}
                      className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="">Select Hospital Facility...</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                      {hospitals.length === 0 && <option value="main">Main Hospital</option>}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Assign Doctor</label>
                    <select
                      value={newLeadForm.doctorId}
                      onChange={e => setNewLeadForm({ ...newLeadForm, doctorId: e.target.value })}
                      className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="">Select Doctor...</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Date</label>
                      <input
                        type="date"
                        value={newLeadForm.date}
                        onChange={e => setNewLeadForm({ ...newLeadForm, date: e.target.value })}
                        className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Time</label>
                      <input
                        type="time"
                        value={newLeadForm.time}
                        onChange={e => setNewLeadForm({ ...newLeadForm, time: e.target.value })}
                        className="w-full mt-1 p-2 bg-white border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-xl hover:bg-rose-500 shadow-md shadow-rose-900/30"
                >
                  Save Lead to Directory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW LEAD DETAILS MODAL */}
      {selectedLeadForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-6 max-h-[94dvh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Lead Profile & History</span>
                <h3 className="text-xl font-black text-slate-900">{selectedLeadForDetail.name}</h3>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">{selectedLeadForDetail.mobile}</div>
              </div>
              <button 
                onClick={() => setSelectedLeadForDetail(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Status Pill & Stage */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Appointment Status</div>
                  <div className="text-sm font-black text-slate-800 mt-0.5">{selectedLeadForDetail.appointmentStatus}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Lead Category</div>
                  <div className="text-xs font-black text-rose-700 text-right mt-0.5">
                    {selectedLeadForDetail.quickCode || selectedLeadForDetail.condition}
                  </div>
                </div>
              </div>

              {/* Clinical & Ingestion Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Condition</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedLeadForDetail.condition}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Source Channel</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedLeadForDetail.source}
                    {selectedLeadForDetail.referralPerson && ` (${selectedLeadForDetail.referralPerson})`}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Location</div>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedLeadForDetail.city || 'Not specified'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Age / Gender</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {selectedLeadForDetail.age ? `${selectedLeadForDetail.age} Yrs` : '—'} / {selectedLeadForDetail.gender || '—'}
                  </div>
                </div>
              </div>

              {/* Assignment & Scheduling Info */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Scheduling & Facility Assignment
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Hospital</div>
                    <div className="font-bold text-indigo-900 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{selectedLeadForDetail.assignedHospitalName || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned Doctor</div>
                    <div className="font-bold text-emerald-900 mt-0.5 flex items-center gap-1">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{selectedLeadForDetail.assignedDoctorName || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Appointment Date</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedLeadForDetail.appointmentDate || 'Pending'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Slot Time</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedLeadForDetail.appointmentTime || 'Pending'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Scheduled By</div>
                    <div className="font-mono text-slate-700 mt-0.5 font-semibold">
                      {selectedLeadForDetail.scheduledBy || 'Sales Operations'}
                    </div>
                  </div>
                </div>
              </div>

              {selectedLeadForDetail.notes && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Counseling / Clinical Notes</div>
                  <p className="text-slate-700 mt-1 leading-relaxed text-xs">{selectedLeadForDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <button
                type="button"
                onClick={() => setSelectedLeadForDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              {hasSchedulingAccess && (
                <button
                  type="button"
                  onClick={() => {
                    const l = selectedLeadForDetail;
                    setSelectedLeadForDetail(null);
                    handleOpenScheduleModal(l);
                  }}
                  className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-rose-600 text-white rounded-xl hover:bg-rose-500 shadow-md shadow-rose-900/30 flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" /> Schedule / Reassign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
