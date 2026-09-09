import React, { useState, useMemo, useEffect } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { SchedulingTarget, Appointment, Condition } from '../../types';
import { 
  Calendar, Clock, User, CheckCircle2, XCircle, Search, Filter, 
  Plus, AlertCircle, RefreshCw, BarChart3, Activity, Target, Check, 
  ChevronRight, Phone, Stethoscope, FileText, UserCheck, Shield,
  Building2, ArrowLeft, X, CheckCircle, ChevronDown, Sparkles, Lock,
  Eye, Pencil, Trash2
} from 'lucide-react';

const STATUS_OPTIONS: { label: string; dotClass: string }[] = [
  { label: 'Scheduled', dotClass: 'bg-blue-500' },
  { label: 'Confirmed', dotClass: 'bg-teal-500' },
  { label: 'Completed', dotClass: 'bg-emerald-500' },
  { label: 'Cancelled', dotClass: 'bg-rose-500' },
  { label: 'No Show', dotClass: 'bg-slate-400' },
  { label: 'Arrived', dotClass: 'bg-emerald-600' },
  { label: 'Follow Up', dotClass: 'bg-amber-500' },
];

const isDoctorAvailableOnDate = (doctor: any, dateString: string | undefined): boolean => {
  if (!dateString || !doctor) return true;
  const availability = doctor.availability;
  if (!availability) return true;

  const dateObj = new Date(dateString + 'T00:00:00');
  const formattedDate = dateObj.toISOString().split('T')[0];

  if (availability.blockedDates && Array.isArray(availability.blockedDates)) {
    const isBlocked = availability.blockedDates.some((b: any) => {
      const from = b.startDate || b.from;
      const to = b.endDate || b.to;
      return formattedDate >= from && formattedDate <= to;
    });
    if (isBlocked) return false;
  }
  if (availability.unavailableDates && availability.unavailableDates.includes(formattedDate)) {
    return false;
  }

  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  if (availability.daySchedules) {
    const dayConfig = (availability.daySchedules || []).find((ds: any) => ds.day === weekday);
    if (dayConfig) {
      if (dayConfig.status !== "Available") return false;
    }
  } else if (availability.availableDays && availability.availableDays.length > 0) {
    if (!availability.availableDays.includes(weekday)) return false;
  }

  return true;
};

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
  const [apptTime, setApptTime] = useState('10:00');
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
    return doctorsWithAccess.find(d => d.id === selectedDoctorId);
  }, [doctorsWithAccess, selectedDoctorId]);

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

  // Time slots calculation based on selected doctor and date
  const availableTimeSlots = useMemo(() => {
    return getAvailableSlotsForDoctorAndDate(activeSelectedDoctor, apptDate);
  }, [activeSelectedDoctor, apptDate]);

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
      setFormError('Appointment Time is required.');
      return;
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
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Hospital Appointments Roster
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live schedule feed with explicit provenance (<span className="font-black text-slate-800">"Scheduled by: &lt;username&gt;"</span>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-auto flex-1 sm:flex-initial min-w-[180px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search patient, hospital, doctor..."
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-hospital-500"
              />
            </div>

            {/* Filter by Doctor */}
            <select
              value={selectedDoctorFilter}
              onChange={e => setSelectedDoctorFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-full sm:w-auto flex-1 sm:flex-initial"
            >
              <option value="all">All Doctors</option>
              {doctorsWithAccess.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.name}</option>
              ))}
            </select>

            {/* Filter by Hospital */}
            <select
              value={selectedHospitalFilter}
              onChange={e => setSelectedHospitalFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-full sm:w-auto flex-1 sm:flex-initial"
            >
              <option value="all">All Hospitals</option>
              {hospitalsWithAccess.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-full sm:w-auto flex-1 sm:flex-initial"
            >
              <option value="all">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Arrived">Arrived</option>
              <option value="Follow Up">Follow Up</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Appointments List Table */}
        {filteredAppointments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-50/60 border border-slate-100">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">No Appointments Match Criteria</p>
            <p className="text-[11px] text-slate-400 mt-1">Adjust search filters or use "Book Master Appointment" to schedule one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto table-container w-full">
            <table className="w-full text-left text-xs min-w-[1000px]">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pl-2">Patient Details</th>
                  <th className="pb-3">Slot & Date</th>
                  <th className="pb-3">Assigned To (Doctor / Facility)</th>
                  <th className="pb-3">Source</th>
                  <th className="pb-3">Provenance (Scheduled By)</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAppointments.map(app => {
                  const creator = app.username || 'Master Admin';
                  const isHospitalOnly = app.assignment_type === 'hospital' && !app.assignedDoctorName && !app.doctor_id;

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pl-2">
                        <div className="font-extrabold text-slate-900 text-sm">{app.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {app.mobile}</span>
                          {app.visit_type && (
                            <span className="px-1.5 py-0.2 bg-slate-100 rounded text-[9px] font-black uppercase text-slate-600">
                              {app.visit_type}
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold">
                            {app.condition}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <div className="font-bold text-slate-800">{app.date}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-hospital-600" /> {app.time}
                        </div>
                      </td>

                      {/* Doctor / Hospital Assignment Column */}
                      <td className="py-3.5">
                        {isHospitalOnly ? (
                          <div className="space-y-1">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{app.hospitalName || 'Assigned Facility'}</span>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-black uppercase tracking-wider">
                              Hospital Only
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{app.assignedDoctorName || 'Assigned Doctor'}</span>
                            </div>
                            {app.hospitalName && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{app.hospitalName}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Source Column (Master Admin Only) */}
                      <td className="py-3.5">
                        {app.source ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {app.source}
                            </span>
                            {app.source === 'Referral' && app.referral_person && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                Ref: <span className="font-bold text-slate-800">{app.referral_person}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Scheduled By Provenance Banner */}
                      <td className="py-3.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[11px] font-bold">
                            Scheduled by: <span className="font-black text-indigo-700">{creator}</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          app.status === 'Arrived' || app.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : app.status === 'Confirmed'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : app.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : app.status === 'No Show'
                            ? 'bg-slate-100 text-slate-600 border border-slate-300'
                            : app.status === 'Follow Up'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {app.status}
                        </span>
                      </td>

                      <td className="py-3.5 pr-4 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            data-actions-btn={app.id}
                            onClick={(e) => toggleDropdown(e, app)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs ${
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
                        required
                        className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500"
                        value={selectedDoctorId}
                        onChange={e => {
                          setSelectedDoctorId(e.target.value);
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
                          className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500"
                          value={selectedDoctorId}
                          onChange={e => setSelectedDoctorId(e.target.value)}
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
                        onChange={e => setApptDate(e.target.value)} 
                      />
                    </div>

                    {/* Appointment Time */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">
                        Appt Time <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full border-b-2 border-slate-100 p-2 text-sm font-bold bg-white outline-none focus:border-hospital-500"
                        value={apptTime}
                        onChange={e => setApptTime(e.target.value)}
                      >
                        <option value="">Select Time Slot...</option>
                        {availableTimeSlots.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
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
            {/* View */}
            <button
              type="button"
              onClick={() => {
                setViewModalApp(activeDropdownApp);
                setActiveDropdownApp(null);
                setStatusSubmenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-hospital-700 rounded-xl flex items-center gap-2.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-400" />
              <span>View</span>
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
          <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-hospital-50 border border-hospital-100 text-hospital-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Appointment Details</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {viewModalApp.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewModalApp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Patient Name</span>
                  <div className="font-extrabold text-slate-900 text-sm">{viewModalApp.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {viewModalApp.mobile}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Slot & Time</span>
                  <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-hospital-600" /> {viewModalApp.date}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-hospital-600" /> {viewModalApp.time}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Assignment</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <span>{viewModalApp.assignedDoctorName || 'No Specific Doctor Assigned'}</span>
                </div>
                {viewModalApp.hospitalName && (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{viewModalApp.hospitalName}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Condition</span>
                  <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                    {viewModalApp.condition}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Visit Type</span>
                  <span className="font-bold text-slate-800">
                    {viewModalApp.visit_type || viewModalApp.bookingType || 'OPD'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Source</span>
                  <span className="font-bold text-slate-800">
                    {viewModalApp.source || 'Direct / Walk-in'}
                  </span>
                  {viewModalApp.referral_person && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Ref: <span className="font-bold text-slate-700">{viewModalApp.referral_person}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/40">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Scheduled By</span>
                  <span className="font-bold text-indigo-700 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    {viewModalApp.username || 'Master Admin'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-end gap-2">
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
    </div>
  );
};
