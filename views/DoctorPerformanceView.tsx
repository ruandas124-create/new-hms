import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { SurgeonCode, Patient, StaffUser } from '../types';
import { 
  Stethoscope, Calendar, Users, TrendingUp, Banknote, Clock, 
  Search, Filter, RotateCcw, Download, Printer, ChevronRight, 
  X, CheckCircle2, AlertCircle, Building2, User, Award, 
  BarChart3, Activity, ArrowUpRight, FileText, ChevronDown, 
  CalendarDays, Briefcase, Tag, Layers, Check
} from 'lucide-react';

const parseAmount = (val: any): number => {
  if (!val) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = val.toString().replace(/[^0-9.-]+/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (val: number): string => {
  return '₹' + Math.round(val).toLocaleString('en-IN');
};

const getMonthRange = (year: number, monthZeroIndexed: number): { from: string; to: string } => {
  const startDate = new Date(year, monthZeroIndexed, 1);
  const endDate = new Date(year, monthZeroIndexed + 1, 0);
  const from = startDate.toISOString().split('T')[0];
  const to = endDate.toISOString().split('T')[0];
  return { from, to };
};

const getCurrentMonthRange = () => {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth());
};

const getLastMonthRange = () => {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth() - 1);
};

export const DoctorPerformanceView: React.FC = () => {
  const { 
    patients = [], 
    appointments = [], 
    staffUsers = [], 
    analyticsAccounts = [],
    currentUserRole,
    currentTenantId,
    currentUserStaff,
    isLoading 
  } = useHospital();

  // Determine authorized tenant for filtering if scoped to an analytics account
  const activeTenantId = currentTenantId || currentUserStaff?.hospital_id || currentUserStaff?.id;

  // Filter available doctors
  const doctorsList = useMemo(() => {
    return staffUsers.filter(u => {
      if (u.role !== 'DOCTOR' && u.role !== 'DEACTIVATED_DOCTOR') return false;
      if (u.accessStatus === 'Revoked') return false;
      if (currentUserRole === 'HOSPITAL' || currentUserRole === 'ANALYTICS' || currentUserRole === 'ANALYTICS_HUB') {
        if (activeTenantId && u.hospital_id && u.hospital_id !== activeTenantId && u.grantedBy !== 'Analytics Hub') {
          return false;
        }
      }
      return true;
    });
  }, [staffUsers, currentUserRole, activeTenantId]);

  // Filter available hospitals
  const hospitalsList = useMemo(() => {
    const fromAccounts = analyticsAccounts.map(a => ({ id: a.id, name: a.hospitalName || a.name || 'Hospital Facility' }));
    const fromStaff = staffUsers
      .filter(s => s.role === 'HOSPITAL' || s.role === 'ANALYTICS_HUB' || s.role === 'ANALYTICS')
      .map(s => ({ id: s.id, name: s.hospitalName || s.name }));
    
    const map = new Map<string, string>();
    [...fromAccounts, ...fromStaff].forEach(h => {
      if (h.id && h.name) map.set(h.id, h.name);
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [analyticsAccounts, staffUsers]);

  // Filter States
  const currentMonthPreset = getCurrentMonthRange();
  const [fromDate, setFromDate] = useState<string>(currentMonthPreset.from);
  const [toDate, setToDate] = useState<string>(currentMonthPreset.to);
  const [selectedMonthPreset, setSelectedMonthPreset] = useState<string>('THIS_MONTH');
  const [selectedHospital, setSelectedHospital] = useState<string>('ALL');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeDrillDownDoctor, setActiveDrillDownDoctor] = useState<any | null>(null);

  // Quick Month Presets Handler
  const handleMonthPresetChange = (preset: string) => {
    setSelectedMonthPreset(preset);
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const r = getCurrentMonthRange();
      setFromDate(r.from);
      setToDate(r.to);
    } else if (preset === 'LAST_MONTH') {
      const r = getLastMonthRange();
      setFromDate(r.from);
      setToDate(r.to);
    } else if (preset === 'LAST_3_MONTHS') {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(end.toISOString().split('T')[0]);
    } else if (preset === 'YEAR_TO_DATE') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFromDate(start.toISOString().split('T')[0]);
      setToDate(end.toISOString().split('T')[0]);
    }
  };

  const handleResetFilters = () => {
    const r = getCurrentMonthRange();
    setFromDate(r.from);
    setToDate(r.to);
    setSelectedMonthPreset('THIS_MONTH');
    setSelectedHospital('ALL');
    setSelectedDoctorId('ALL');
    setSearchTerm('');
  };

  // Check if a date falls within the selected date range
  const isDateInRange = (dateStr: string | undefined | null): boolean => {
    if (!dateStr) return false;
    const cleanDate = dateStr.split('T')[0];
    return cleanDate >= fromDate && cleanDate <= toDate;
  };

  // Calculate Doctor Metrics
  const doctorMetrics = useMemo(() => {
    // Generate an array of all calendar days within the fromDate to toDate range
    const allDaysInRange: string[] = [];
    if (fromDate && toDate && fromDate <= toDate) {
      let curr = new Date(fromDate + 'T00:00:00');
      const end = new Date(toDate + 'T00:00:00');
      while (curr <= end) {
        allDaysInRange.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
      }
    }

    return doctorsList.map((doc) => {
      const docHospital = hospitalsList.find(h => h.id === doc.hospital_id)?.name || doc.hospitalName || 'Main Hospital';

      // 1. Gather all consultations handled by this doctor in date range
      const docConsultations = patients.filter(p => {
        const pDate = p.entry_date || p.registeredAt?.split('T')[0];
        if (!isDateInRange(pDate)) return false;
        
        // Exclude pure scheduled if not arrived/consulted
        const pStatus = (p.status || '').trim().toLowerCase();
        if (pStatus === 'scheduled') return false;

        const assignedId = p.doctorAssessment?.assignedDoctorId || (p as any).assignedDoctorId;
        const assignedName = p.doctorAssessment?.assignedDoctorName || (p as any).assignedDoctorName;

        if (assignedId && assignedId === doc.id) return true;
        if (assignedName && doc.name && assignedName.toLowerCase().trim() === doc.name.toLowerCase().trim()) return true;

        return false;
      });

      const totalConsultations = docConsultations.length;

      // 2. Surgery Conversions (Patients recommended for S1 surgery or completed surgery)
      const surgeryConversionsList = docConsultations.filter(p => {
        const hasS1 = p.doctorAssessment?.quickCode === SurgeonCode.S1;
        const isCompleted = p.packageProposal?.outcome === 'Completed';
        const isDoctorDoneS1 = p.status === 'Doctor Done' && hasS1;
        return hasS1 || isCompleted || isDoctorDoneS1;
      });

      const surgeryConversions = surgeryConversionsList.length;

      // 3. Surgery Conversion Rate (%)
      const surgeryConversionRate = totalConsultations > 0 
        ? Number(((surgeryConversions / totalConsultations) * 100).toFixed(1)) 
        : 0;

      // 4. Total Surgery Cost
      const totalSurgeryCost = surgeryConversionsList.reduce((sum, p) => {
        return sum + parseAmount(p.packageProposal?.packageAmount);
      }, 0);

      // 5. Working Days & Working Hours Calculation
      // Unique days the doctor had patient consultations
      const consultationDatesSet = new Set<string>();
      docConsultations.forEach(p => {
        const d = (p.entry_date || p.registeredAt || '').split('T')[0];
        if (d) consultationDatesSet.add(d);
      });

      // Also calculate scheduled working days based on doctor's availability configuration
      const availability: any = (doc as any).availability || {};
      const daySchedules = availability.daySchedules || [];
      const availableDays = availability.availableDays || [];
      const blockedDates = (availability.blockedDates || []).map((b: any) => typeof b === 'string' ? b : (b?.date || b?.startDate));
      const unavailableDates = availability.unavailableDates || [];

      let totalWorkingHours = 0;
      let workingDaysCount = 0;
      const workingDaysDetails: { date: string; weekday: string; hours: number; consultationCount: number }[] = [];

      allDaysInRange.forEach(dayStr => {
        const dObj = new Date(dayStr + 'T00:00:00');
        const weekday = dObj.toLocaleDateString('en-US', { weekday: 'long' });
        const hasConsultations = consultationDatesSet.has(dayStr);
        const isBlocked = blockedDates.includes(dayStr) || unavailableDates.includes(dayStr);

        let isWorkingDay = false;
        let dayHours = 0;

        if (!isBlocked) {
          // Check daySchedules
          const dayConfig = daySchedules.find((ds: any) => ds.day?.toLowerCase() === weekday.toLowerCase());
          if (dayConfig) {
            if (dayConfig.status === 'Available') {
              isWorkingDay = true;
              const startHour = parseInt((dayConfig.startTime || availability.startTime || '09:00').split(':')[0], 10);
              const endHour = parseInt((dayConfig.endTime || availability.endTime || '17:00').split(':')[0], 10);
              dayHours = Math.max(0, endHour - startHour);
            }
          } else if (availableDays.length > 0) {
            if (availableDays.some((ad: string) => ad.toLowerCase() === weekday.toLowerCase())) {
              isWorkingDay = true;
              const startHour = parseInt((availability.startTime || '09:00').split(':')[0], 10);
              const endHour = parseInt((availability.endTime || '17:00').split(':')[0], 10);
              dayHours = Math.max(0, endHour - startHour);
            }
          } else {
            // Default to Monday-Saturday 8 hours if no schedule is set
            if (weekday !== 'Sunday') {
              isWorkingDay = true;
              dayHours = 8;
            }
          }
        }

        // If doctor had patient visits on this day, ensure it is recognized as working
        if (hasConsultations && !isWorkingDay) {
          isWorkingDay = true;
          dayHours = dayHours || 8;
        }

        if (isWorkingDay) {
          workingDaysCount++;
          totalWorkingHours += dayHours || 8;
          const dayPatientCount = docConsultations.filter(p => (p.entry_date || p.registeredAt || '').split('T')[0] === dayStr).length;
          workingDaysDetails.push({
            date: dayStr,
            weekday,
            hours: dayHours || 8,
            consultationCount: dayPatientCount
          });
        }
      });

      // 6. Average Consultations per Working Day
      const avgConsultationsPerDay = workingDaysCount > 0 
        ? Number((totalConsultations / workingDaysCount).toFixed(1)) 
        : totalConsultations;

      // 7. Average Working Hours per Day
      const avgWorkingHoursPerDay = workingDaysCount > 0 
        ? Number((totalWorkingHours / workingDaysCount).toFixed(1)) 
        : 0;

      // 8. Monthly breakdown for this doctor across the last 6 months
      const monthlyBreakdown: { monthLabel: string; yearMonth: string; consultations: number; conversions: number; cost: number; rate: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = mDate.toISOString().slice(0, 7); // e.g. "2026-10"
        const mLabel = mDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const mConsults = patients.filter(p => {
          const d = (p.entry_date || p.registeredAt || '').slice(0, 7);
          if (d !== ym) return false;
          const assignedId = p.doctorAssessment?.assignedDoctorId || (p as any).assignedDoctorId;
          const assignedName = p.doctorAssessment?.assignedDoctorName || (p as any).assignedDoctorName;
          return assignedId === doc.id || (assignedName && doc.name && assignedName.toLowerCase().trim() === doc.name.toLowerCase().trim());
        });

        const mConversions = mConsults.filter(p => p.doctorAssessment?.quickCode === SurgeonCode.S1 || p.packageProposal?.outcome === 'Completed').length;
        const mCost = mConsults.filter(p => p.doctorAssessment?.quickCode === SurgeonCode.S1 || p.packageProposal?.outcome === 'Completed')
          .reduce((sum, p) => sum + parseAmount(p.packageProposal?.packageAmount), 0);
        const mRate = mConsults.length > 0 ? Number(((mConversions / mConsults.length) * 100).toFixed(1)) : 0;

        monthlyBreakdown.push({
          monthLabel: mLabel,
          yearMonth: ym,
          consultations: mConsults.length,
          conversions: mConversions,
          cost: mCost,
          rate: mRate
        });
      }

      return {
        id: doc.id,
        name: doc.name,
        email: doc.email,
        mobile: doc.mobile,
        specialization: doc.specialization || 'Consultant Specialist',
        department: doc.department || 'General Surgery & Medicine',
        registrationNumber: doc.registrationNumber || 'DOC-' + doc.id.substring(0, 5).toUpperCase(),
        hospitalId: doc.hospital_id,
        hospitalName: docHospital,
        photoUrl: doc.photoUrl,
        status: doc.role === 'DEACTIVATED_DOCTOR' ? 'DEACTIVATED' : (doc.accessStatus || 'ACTIVE'),
        totalConsultations,
        surgeryConversions,
        surgeryConversionRate,
        totalSurgeryCost,
        workingDays: workingDaysCount,
        totalWorkingHours,
        avgConsultationsPerDay,
        avgWorkingHoursPerDay,
        consultationsList: docConsultations,
        surgeryConversionsList,
        workingDaysDetails,
        monthlyBreakdown
      };
    });
  }, [doctorsList, patients, fromDate, toDate, hospitalsList]);

  // Apply UI Filters to the calculated doctor list
  const filteredDoctors = useMemo(() => {
    return doctorMetrics.filter(d => {
      if (selectedDoctorId !== 'ALL' && d.id !== selectedDoctorId) return false;
      if (selectedHospital !== 'ALL' && d.hospitalId !== selectedHospital) return false;

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase().trim();
        const matchName = d.name.toLowerCase().includes(s);
        const matchSpec = d.specialization.toLowerCase().includes(s);
        const matchHosp = d.hospitalName.toLowerCase().includes(s);
        const matchReg = d.registrationNumber.toLowerCase().includes(s);
        if (!matchName && !matchSpec && !matchHosp && !matchReg) return false;
      }

      return true;
    }).sort((a, b) => b.totalConsultations - a.totalConsultations || b.totalSurgeryCost - a.totalSurgeryCost);
  }, [doctorMetrics, selectedDoctorId, selectedHospital, searchTerm]);

  // High-level aggregate totals across filtered doctors
  const totals = useMemo(() => {
    const totalConsultations = filteredDoctors.reduce((s, d) => s + d.totalConsultations, 0);
    const totalConversions = filteredDoctors.reduce((s, d) => s + d.surgeryConversions, 0);
    const totalCost = filteredDoctors.reduce((s, d) => s + d.totalSurgeryCost, 0);
    const totalDays = filteredDoctors.reduce((s, d) => s + d.workingDays, 0);
    const totalHours = filteredDoctors.reduce((s, d) => s + d.totalWorkingHours, 0);
    const overallConversionRate = totalConsultations > 0 ? Number(((totalConversions / totalConsultations) * 100).toFixed(1)) : 0;
    const avgConsultationsPerDay = totalDays > 0 ? Number((totalConsultations / totalDays).toFixed(1)) : 0;

    return {
      totalDoctors: filteredDoctors.length,
      totalConsultations,
      totalConversions,
      overallConversionRate,
      totalCost,
      totalDays,
      totalHours,
      avgConsultationsPerDay
    };
  }, [filteredDoctors]);

  // Export Complete CSV Report
  const handleExportCSV = () => {
    const headers = [
      "Doctor Name",
      "Specialization",
      "Hospital / Facility",
      "Status",
      "Total Consultations",
      "Surgery Conversions",
      "Surgery Conversion Rate (%)",
      "Total Surgery Cost (INR)",
      "Working Days",
      "Total Working Hours",
      "Avg Consultations / Day",
      "Avg Working Hours / Day"
    ];

    const rows = filteredDoctors.map(d => [
      `Dr. ${d.name}`,
      d.specialization,
      d.hospitalName,
      d.status,
      d.totalConsultations,
      d.surgeryConversions,
      `${d.surgeryConversionRate}%`,
      d.totalSurgeryCost,
      d.workingDays,
      d.totalWorkingHours,
      d.avgConsultationsPerDay,
      d.avgWorkingHoursPerDay
    ].map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `doctor_performance_report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeFilterCount = (selectedMonthPreset !== 'THIS_MONTH' ? 1 : 0) + 
    (selectedHospital !== 'ALL' ? 1 : 0) + 
    (selectedDoctorId !== 'ALL' ? 1 : 0) + 
    (searchTerm ? 1 : 0);

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300 pb-12">
      
      {/* 1. Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-hospital-600">
            <Stethoscope className="w-3.5 h-3.5" /> Doctor Clinical Intelligence & Analytics
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Doctor Performance Report
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Clinical consultations, surgical conversion efficiency, realized surgery revenue, and doctor working hours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
            title="Download CSV Report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
            title="Print performance directive"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Filter Section */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Left: Quick Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search doctor, specialization, hospital, reg no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-hospital-500 focus:border-hospital-500 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Preset Month, Filter Button & Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Month Selector */}
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1.5 hidden sm:inline">
                Period:
              </span>
              <select
                value={selectedMonthPreset}
                onChange={(e) => handleMonthPresetChange(e.target.value)}
                className="bg-white border border-slate-200 text-xs font-semibold text-slate-800 px-2.5 py-1 rounded-md outline-none cursor-pointer focus:ring-1 focus:ring-hospital-500"
              >
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="LAST_3_MONTHS">Last 3 Months</option>
                <option value="YEAR_TO_DATE">Year to Date</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                showFilters || activeFilterCount > 0
                  ? 'bg-hospital-50 border-hospital-300 text-hospital-700 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-hospital-600" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-hospital-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Reset Filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-200">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setSelectedMonthPreset('CUSTOM');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-hospital-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setSelectedMonthPreset('CUSTOM');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-hospital-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">
                Hospital / Facility
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-hospital-500 cursor-pointer"
              >
                <option value="ALL">All Facilities ({hospitalsList.length})</option>
                {hospitalsList.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">
                Select Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-hospital-500 cursor-pointer"
              >
                <option value="ALL">All Doctors ({doctorsList.length})</option>
                {doctorsList.map(d => (
                  <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization || 'General'})</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        
        {/* Total Consultations */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Consultations
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {totals.totalConsultations}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">OPD consultations</span>
          </div>
        </div>

        {/* Surgery Conversions */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Conversions
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 font-mono tabular-nums">
              {totals.totalConversions}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Surgery (S1)</span>
          </div>
        </div>

        {/* Overall Conversion Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Conv. Rate
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 font-mono tabular-nums">
              {totals.overallConversionRate}%
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Conversion ratio</span>
          </div>
        </div>

        {/* Total Surgery Revenue / Cost */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Surgery Value
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Banknote className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono tabular-nums truncate">
              {formatCurrency(totals.totalCost)}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Converted value</span>
          </div>
        </div>

        {/* Working Days */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Working Days
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-700 font-mono tabular-nums">
              {totals.totalDays}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Working shifts</span>
          </div>
        </div>

        {/* Total Working Hours */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Working Hours
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-purple-700 font-mono tabular-nums">
              {totals.totalHours} <span className="text-xs font-medium text-purple-400">hrs</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Avg {totals.avgConsultationsPerDay} / day</span>
          </div>
        </div>

      </div>

      {/* 4. Comparative Visualizations & Analytics Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Visualizer 1: Top Doctor Conversion Ranking */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-hospital-600" />
                Doctor Consultations & Conversions Comparison
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Volume of patient consultations vs converted surgeries per practitioner
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
              {filteredDoctors.length} Doctors
            </span>
          </div>

          <div className="space-y-2.5 py-0.5">
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                No doctors matching current filter criteria.
              </div>
            ) : (
              filteredDoctors.slice(0, 5).map((d) => {
                const maxConsults = Math.max(...filteredDoctors.map(x => x.totalConsultations), 1);
                const consultPct = Math.round((d.totalConsultations / maxConsults) * 100);
                const convPct = d.totalConsultations > 0 ? Math.round((d.surgeryConversions / d.totalConsultations) * 100) : 0;

                return (
                  <div key={d.id} className="space-y-1 group cursor-pointer" onClick={() => setActiveDrillDownDoctor(d)}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-900 group-hover:text-hospital-600 transition-colors truncate">
                          Dr. {d.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                          ({d.specialization})
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 font-mono text-[11px]">
                        <span className="text-slate-600 font-semibold">{d.totalConsultations} Consults</span>
                        <span className="text-emerald-600 font-bold">{d.surgeryConversions} Converted</span>
                        <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {d.surgeryConversionRate}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Multi-layer */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200/60">
                      <div 
                        style={{ width: `${Math.max(consultPct, 6)}%` }} 
                        className="bg-sky-500 h-full rounded-l-full relative group-hover:bg-sky-600 transition-all flex items-center justify-end pr-1 text-[8px] font-bold text-white"
                      >
                        {d.totalConsultations > 0 ? d.totalConsultations : ''}
                      </div>
                      <div 
                        style={{ width: `${Math.max(convPct, 4)}%` }} 
                        className="bg-emerald-500 h-full rounded-r-full -ml-1 border-l border-white relative group-hover:bg-emerald-600 transition-all flex items-center justify-end pr-1 text-[8px] font-bold text-white"
                      >
                        {d.surgeryConversions > 0 ? d.surgeryConversions : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> Consultations
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Conversions
              </span>
            </div>
            <span>Click doctor for details</span>
          </div>
        </div>

        {/* Visualizer 2: Conversion Leaderboard / Surgery Value Share */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Conversion Leaderboard
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Ranked by conversion efficiency & revenue
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-medium">
                No doctor data.
              </div>
            ) : (
              [...filteredDoctors]
                .sort((a, b) => b.surgeryConversionRate - a.surgeryConversionRate || b.totalSurgeryCost - a.totalSurgeryCost)
                .slice(0, 4)
                .map((doc, idx) => (
                  <div 
                    key={doc.id}
                    onClick={() => setActiveDrillDownDoctor(doc)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-hospital-600 transition-colors truncate">
                          Dr. {doc.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium truncate">
                          {doc.specialization}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-emerald-600 font-mono">
                        {doc.surgeryConversionRate}%
                      </div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        {formatCurrency(doc.totalSurgeryCost)}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="pt-1.5 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total Converted Revenue: <strong className="text-slate-800">{formatCurrency(totals.totalCost)}</strong>
            </span>
          </div>
        </div>

      </div>

      {/* 5. Doctor-wise Comprehensive Performance Report Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-hospital-600" />
              Doctor Performance Master Ledger
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Detailed doctor clinical census, working days, working hours, and conversion breakdown
            </p>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Showing <strong className="text-slate-900">{filteredDoctors.length}</strong> of {doctorsList.length} Doctors
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 sm:px-4">Doctor Profile</th>
                <th className="py-2.5 px-3">Hospital / Facility</th>
                <th className="py-2.5 px-2.5 text-center">Consultations</th>
                <th className="py-2.5 px-2.5 text-center">Conversions</th>
                <th className="py-2.5 px-2.5 text-center">Conversion Rate</th>
                <th className="py-2.5 px-3 text-right">Total Surgery Cost</th>
                <th className="py-2.5 px-2.5 text-center">Working Days</th>
                <th className="py-2.5 px-2.5 text-center">Working Hours</th>
                <th className="py-2.5 px-2.5 text-center">Avg Consult / Day</th>
                <th className="py-2.5 px-2.5 text-center">Avg Hours / Day</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-hospital-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Compiling Doctor Performance Metrics...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <div className="font-bold text-slate-700 text-xs">No Doctor Performance Records Found</div>
                      <div className="text-[11px] text-slate-400">
                        Try adjusting your date range, month preset, or doctor filter.
                      </div>
                      <button
                        onClick={handleResetFilters}
                        className="mt-1 px-3 py-1.5 bg-hospital-50 text-hospital-700 rounded-lg text-xs font-semibold hover:bg-hospital-100 transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => (
                  <tr 
                    key={doc.id} 
                    onClick={() => setActiveDrillDownDoctor(doc)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Doctor Profile */}
                    <td className="py-2.5 px-3 sm:px-4">
                      <div className="flex items-center gap-2.5">
                        {doc.photoUrl ? (
                          <img 
                            src={doc.photoUrl} 
                            alt={doc.name} 
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-hospital-50 border border-hospital-200 text-hospital-700 font-bold flex items-center justify-center text-xs shrink-0 font-sans">
                            {doc.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-hospital-600 transition-colors flex items-center gap-1.5">
                            <span>Dr. {doc.name}</span>
                            {doc.status === 'DEACTIVATED' && (
                              <span className="text-[8px] bg-rose-100 text-rose-700 font-bold px-1 py-0.2 rounded">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal truncate">
                            {doc.specialization}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            {doc.registrationNumber}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Hospital Name */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 text-slate-700 font-medium text-xs">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{doc.hospitalName}</span>
                      </div>
                    </td>

                    {/* Total Consultations */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {doc.totalConsultations}
                      </span>
                    </td>

                    {/* Surgery Conversions */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="font-mono font-bold text-emerald-600 text-xs">
                        {doc.surgeryConversions}
                      </span>
                    </td>

                    {/* Surgery Conversion Rate */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-bold font-mono border ${
                        doc.surgeryConversionRate >= 30 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : doc.surgeryConversionRate >= 15 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {doc.surgeryConversionRate}%
                      </span>
                    </td>

                    {/* Total Surgery Cost */}
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(doc.totalSurgeryCost)}
                      </span>
                    </td>

                    {/* Working Days */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="font-mono font-bold text-indigo-700 text-xs">
                        {doc.workingDays} <span className="text-[10px] text-slate-400 font-normal">days</span>
                      </span>
                    </td>

                    {/* Total Working Hours */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="font-mono font-bold text-purple-700 text-xs">
                        {doc.totalWorkingHours} <span className="text-[10px] text-slate-400 font-normal">hrs</span>
                      </span>
                    </td>

                    {/* Avg Consultations / Day */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                        {doc.avgConsultationsPerDay}
                      </span>
                    </td>

                    {/* Avg Working Hours / Day */}
                    <td className="py-2.5 px-2.5 text-center">
                      <span className="font-mono font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                        {doc.avgWorkingHoursPerDay}h
                      </span>
                    </td>

                    {/* Details Action */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDrillDownDoctor(doc);
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-hospital-600 hover:text-white rounded-lg text-slate-600 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                        title="View Detailed Performance Breakdown"
                      >
                        <span>Breakdown</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary Row */}
        {filteredDoctors.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="font-bold uppercase text-slate-500 tracking-wider text-[11px]">
              Aggregate Summary ({filteredDoctors.length} Doctors)
            </div>
            <div className="flex flex-wrap items-center gap-3 font-mono font-bold text-xs">
              <span className="text-slate-700">Total Consultations: <strong>{totals.totalConsultations}</strong></span>
              <span className="text-emerald-700">Conversions: <strong>{totals.totalConversions}</strong></span>
              <span className="text-blue-700">Avg Rate: <strong>{totals.overallConversionRate}%</strong></span>
              <span className="text-amber-800">Revenue: <strong>{formatCurrency(totals.totalCost)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 6. Detailed Doctor Performance Drill-down Modal */}
      {activeDrillDownDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-hospital-600 text-white font-bold text-base flex items-center justify-center shrink-0 border border-white/20">
                  {activeDrillDownDoctor.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Dr. {activeDrillDownDoctor.name}
                    </h2>
                    <span className="text-[10px] font-semibold bg-white/10 px-2 py-0.5 rounded text-slate-200 uppercase">
                      {activeDrillDownDoctor.specialization}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>{activeDrillDownDoctor.hospitalName}</span>
                    <span>•</span>
                    <span>Reg: {activeDrillDownDoctor.registrationNumber}</span>
                    {activeDrillDownDoctor.mobile && <span>• Phone: {activeDrillDownDoctor.mobile}</span>}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveDrillDownDoctor(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                title="Close Breakdown"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800">
              
              {/* Doctor Quick Snapshot Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Period Consultations</div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{activeDrillDownDoctor.totalConsultations}</div>
                  <div className="text-[10px] text-slate-500">OPD Arrivals</div>
                </div>
                
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                  <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Surgeries Converted</div>
                  <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{activeDrillDownDoctor.surgeryConversions}</div>
                  <div className="text-[10px] text-emerald-600">{activeDrillDownDoctor.surgeryConversionRate}% Rate</div>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                  <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Total Surgery Value</div>
                  <div className="text-base sm:text-lg font-bold text-amber-800 font-mono mt-0.5 truncate">{formatCurrency(activeDrillDownDoctor.totalSurgeryCost)}</div>
                  <div className="text-[10px] text-amber-600">Realized Volume</div>
                </div>

                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                  <div className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider">Working Days & Hours</div>
                  <div className="text-lg font-bold text-purple-700 font-mono mt-0.5">
                    {activeDrillDownDoctor.workingDays}d <span className="text-xs text-purple-400">({activeDrillDownDoctor.totalWorkingHours}h)</span>
                  </div>
                  <div className="text-[10px] text-purple-600">Avg {activeDrillDownDoctor.avgConsultationsPerDay} / day</div>
                </div>
              </div>

              {/* Monthly Performance Trend Table */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-hospital-600" />
                  Monthly Performance Breakdown (Last 6 Months)
                </h4>
                
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Month</th>
                        <th className="py-2 px-3 text-center">Consultations</th>
                        <th className="py-2 px-3 text-center">Conversions</th>
                        <th className="py-2 px-3 text-center">Conversion Rate</th>
                        <th className="py-2 px-3 text-right">Surgery Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeDrillDownDoctor.monthlyBreakdown.map((m: any) => (
                        <tr key={m.yearMonth} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-800">{m.monthLabel}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">{m.consultations}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600">{m.conversions}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-blue-600">{m.rate}%</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(m.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Converted Surgeries Detailed List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Converted Surgeries in Selected Period ({activeDrillDownDoctor.surgeryConversionsList.length})
                  </h4>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Total: {formatCurrency(activeDrillDownDoctor.totalSurgeryCost)}
                  </span>
                </div>

                {activeDrillDownDoctor.surgeryConversionsList.length === 0 ? (
                  <div className="p-3.5 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-medium">
                    No surgery conversions recorded in this date range.
                  </div>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {activeDrillDownDoctor.surgeryConversionsList.map((p: Patient) => (
                      <div key={p.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2.5 text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{p.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">#{p.id?.split('_V')[0]}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>Condition: <strong className="text-slate-700">{p.condition}</strong></span>
                            {p.doctorAssessment?.surgeryProcedure && (
                              <span>• Procedure: <strong className="text-hospital-600">{p.doctorAssessment.surgeryProcedure}</strong></span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-emerald-700 text-xs">
                            {formatCurrency(parseAmount(p.packageProposal?.packageAmount))}
                          </div>
                          <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            {p.packageProposal?.outcome || 'S1 Indicated'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">
                Period: <strong className="text-slate-800">{fromDate} to {toDate}</strong>
              </span>
              <button
                onClick={() => setActiveDrillDownDoctor(null)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Directive
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
