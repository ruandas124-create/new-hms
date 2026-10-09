import React, { useState, useEffect } from 'react';
import { useHospital } from '../context/HospitalContext';
import { ExportButtons } from '../components/ExportButtons';
import { Patient, PackageProposal, Role, SurgeonCode, ProposalOutcome } from '../types';
import { formatDateToDDMMMYYYY, formatDateTimeToDDMMMYYYY } from '../utils/dateFormatter';
import { 
  Briefcase, Calendar, Users, BadgeCheck, User, Activity, ShieldCheck, 
  Banknote, Trash2, Clock, X, Share2, Stethoscope, LayoutList, Columns, 
  Search, Phone, Filter, Tag, CalendarClock, Ban, ChevronLeft, ChevronRight, 
  LayoutPanelLeft, MessageSquareQuote, FileText, ChevronDown, AlertCircle, 
  RefreshCcw, Database, Gauge, AlertTriangle, RotateCcw, Loader2
} from 'lucide-react';

const lostReasons = [
  "Not Accepting for Surgery",
  "Got Treatment at Another Place",
  "Cost / Financial Constraints",
  "Cashless Insurance Required",
  "Decision Makers Not Agreeing",
  "Seeing Another Doctor",
  "Hospital Facilities Reasons",
  "No Communication / Response"
];

const PROPOSAL_STAGES: Record<string, number> = {
  "Surgery Recommended": 10,
  "Surgery Acceptance": 30,
  "Doctor Acceptance": 50,
  "Hospital Acceptance": 70,
  "Package Acceptance": 90,
  "Pre-Ops Fixed": 100
};

const formatToDDMMYYYY = (dateString: string | undefined | null): string => {
  return formatDateToDDMMMYYYY(dateString);
};

const formatToDateTime = (dateString: string | undefined | null): string => {
  return formatDateTimeToDDMMMYYYY(dateString);
};

export const PackageTeamDashboard: React.FC = () => {
  const { patients, updatePackageProposal, staffUsers, registerStaff } = useHospital();
  
  const [listCategory, setListCategory] = useState<'PENDING' | 'SCHEDULED' | 'FOLLOWUP' | 'COMPLETED' | 'LOST'>('PENDING');
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter dates
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [probabilityFilter, setProbabilityFilter] = useState<string>('ALL');
  const [doctorFilter, setDoctorFilter] = useState<string>('ALL');
  
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const [outcomeModal, setOutcomeModal] = useState<{
    show: boolean;
    type: ProposalOutcome | null;
    date: string;
    reason: string;
  }>({
    show: false,
    type: null,
    date: new Date().toISOString().split('T')[0],
    reason: lostReasons[0]
  });

  const initialProposalState: Partial<PackageProposal> = {
    decisionPattern: 'Standard',
    objectionIdentified: '',
    counselingStrategy: '',
    followUpDate: '',
    modeOfPayment: undefined,
    packageAmount: '',
    preOpInvestigation: undefined,
    surgeryMedicines: undefined,
    equipment: undefined,
    icuCharges: undefined,
    roomType: undefined,
    stayDays: undefined,
    postFollowUp: undefined,
    postFollowUpCount: undefined,
    surgeryDate: '',
    remarks: '',
    outcome: undefined,
    outcomeDate: '',
    lostReason: '',
    proposalStage: ''
  };

  const [proposal, setProposal] = useState<Partial<PackageProposal>>(initialProposalState);
  const [isSavingProposal, setIsSavingProposal] = useState(false);
  const [isSavingOutcome, setIsSavingOutcome] = useState(false);

  useEffect(() => {
    if (selectedPatient?.id) {
      const freshPatient = patients.find(p => p.id === selectedPatient.id);
      if (freshPatient) {
        if (JSON.stringify(freshPatient) !== JSON.stringify(selectedPatient)) {
          setSelectedPatient(freshPatient);
        }
      } else {
        setSelectedPatient(null);
      }
    }
  }, [patients, selectedPatient?.id]);

  useEffect(() => {
    if (selectedPatient) {
      setProposal(selectedPatient.packageProposal || initialProposalState);
    }
  }, [selectedPatient]);

  const allPatients = [...patients].filter(p => {
    if (p.doctorAssessment?.quickCode !== SurgeonCode.S1) return false;
    
    const outcome = p.packageProposal?.outcome;

    if (listCategory === 'PENDING') {
      // Pending directory logic
    } else if (listCategory === 'SCHEDULED') {
      if (outcome !== 'Scheduled') return false;
    } else if (listCategory === 'FOLLOWUP') {
      if (outcome !== 'Follow-Up') return false;
    } else if (listCategory === 'COMPLETED') {
      if (outcome !== 'Completed') return false;
    } else if (listCategory === 'LOST') {
      if (outcome !== 'Lost') return false;
    }

    // Category-specific filtering as requested
    if (startDate || endDate) {
      let filterDate = '';
      if (listCategory === 'PENDING') {
        filterDate = p.entry_date || ''; // Leads: Arrived Date
      } else if (listCategory === 'SCHEDULED') {
        filterDate = p.surgery_date || p.packageProposal?.surgeryDate || ''; // Scheduled: Surgery Date
      } else if (listCategory === 'FOLLOWUP') {
        filterDate = p.followup_date || p.packageProposal?.followUpDate || ''; // Follow-up: Follow-up Date
      } else if (listCategory === 'COMPLETED') {
        filterDate = p.completed_surgery || p.packageProposal?.outcomeDate || ''; // Completed: Completed Date
      } else if (listCategory === 'LOST') {
        filterDate = p.surgery_lost_date || p.packageProposal?.outcomeDate || ''; // Lost: Lost Date
      }

      if (startDate && filterDate < startDate) return false;
      if (endDate && filterDate > endDate) return false;
    }

    if (probabilityFilter !== 'ALL') {
      const stage = p.packageProposal?.proposalStage;
      if (!stage) return false;
      const prob = PROPOSAL_STAGES[stage];
      if (prob?.toString() !== probabilityFilter) return false;
    }

    if (doctorFilter !== 'ALL') {
      if (p.doctorAssessment?.assignedDoctorId !== doctorFilter) return false;
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const match = p.name.toLowerCase().includes(s) || 
                    p.id.toLowerCase().includes(s) || 
                    p.mobile.includes(s) ||
                    (p.doctorAssessment?.assignedDoctorName && p.doctorAssessment.assignedDoctorName.toLowerCase().includes(s));
      if (!match) return false;
    }

    return true;
  }).sort((a, b) => {
    // Prioritize Overdue records (Date crossed) for Scheduled and Follow-up sections
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = (p: Patient) => {
      if (listCategory === 'SCHEDULED') {
        const d = p.surgery_date || p.packageProposal?.surgeryDate;
        return d && d < todayStr;
      }
      if (listCategory === 'FOLLOWUP') {
        const d = p.followup_date || p.packageProposal?.followUpDate;
        return d && d < todayStr;
      }
      return false;
    };

    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Default sort by update time
    const timeA = new Date(a.updated_at || a.registeredAt || 0).getTime();
    const timeB = new Date(b.updated_at || b.registeredAt || 0).getTime();
    return timeB - timeA;
  });

  const handlePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
    setProposal(p.packageProposal || initialProposalState);
  };

  const handleOpenOutcomeModal = (type: ProposalOutcome) => {
    setOutcomeModal({
      show: true,
      type,
      date: new Date().toISOString().split('T')[0],
      reason: lostReasons[0]
    });
  };

  const handleConfirmOutcome = async () => {
    if (!selectedPatient || isSavingOutcome) return;
    setIsSavingOutcome(true);
    try {
      const newOutcomeDate = outcomeModal.type !== 'Lost' ? outcomeModal.date : new Date().toISOString().split('T')[0];
      const updatedProposal: PackageProposal = {
        ...(proposal as PackageProposal),
        outcome: outcomeModal.type!,
        outcomeDate: newOutcomeDate,
        surgeryDate: outcomeModal.type === 'Scheduled' ? newOutcomeDate : (proposal.surgeryDate || ''),
        lostReason: outcomeModal.type === 'Lost' ? outcomeModal.reason : undefined,
        proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString(),
        followUpDate: (outcomeModal.type === 'Follow-Up' ? outcomeModal.date : proposal.followUpDate) || ''
      };
      await updatePackageProposal(selectedPatient.id, updatedProposal);
      setOutcomeModal({ ...outcomeModal, show: false });
    } catch (err) {
      console.error("Failed to update proposal outcome:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsSavingOutcome(false);
    }
  };

  const handleSaveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatient && !isSavingProposal) {
      setIsSavingProposal(true);
      try {
        await updatePackageProposal(selectedPatient.id, {
          ...(proposal as PackageProposal),
          proposalCreatedAt: proposal.proposalCreatedAt || new Date().toISOString()
        });
        alert("Proposal details saved successfully.");
      } catch (err) {
        console.error("Failed to save proposal:", err);
        alert("Failed to save proposal details. Please try again.");
      } finally {
        setIsSavingProposal(false);
      }
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setProbabilityFilter('ALL');
    setDoctorFilter('ALL');
  };

  const activeFilterCount = (startDate ? 1 : 0) + 
                            (endDate ? 1 : 0) + 
                            (probabilityFilter !== 'ALL' ? 1 : 0) + 
                            (doctorFilter !== 'ALL' ? 1 : 0);

  const selectClasses = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-hospital-500 transition-all appearance-none cursor-pointer pr-9";
  const filterInputClasses = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-hospital-500 focus:bg-white";

  const renderActionButtons = (currentOutcome: ProposalOutcome | undefined) => {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button 
          type="button" 
          onClick={() => handleOpenOutcomeModal('Scheduled')} 
          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Calendar className="w-4 h-4 shrink-0" /> 
          <span>Schedule</span>
        </button>
        <button 
          type="button" 
          onClick={() => handleOpenOutcomeModal('Follow-Up')} 
          className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Clock className="w-4 h-4 shrink-0" /> 
          <span>Follow-Up</span>
        </button>
        <button 
          type="button" 
          onClick={() => handleOpenOutcomeModal('Completed')} 
          className="py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <BadgeCheck className="w-4 h-4 shrink-0" /> 
          <span>Completed</span>
        </button>
        <button 
          type="button" 
          onClick={() => handleOpenOutcomeModal('Lost')} 
          className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Trash2 className="w-4 h-4 shrink-0" /> 
          <span>Lost</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Package & Counseling Dashboard</h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">Patient Counseling, Financial Structuring & Conversion Operations</p>
        </div>
      </div>

      <div className="space-y-5">
          {/* Main Controls Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
            {/* Category Sub-Tabs */}
            <div className="flex bg-slate-100/90 p-1 rounded-xl w-full overflow-x-auto scrollbar-none gap-1">
              {[
                { key: 'PENDING', label: 'Leads' },
                { key: 'SCHEDULED', label: 'Scheduled' },
                { key: 'FOLLOWUP', label: 'Follow-Up' },
                { key: 'COMPLETED', label: 'Completed' },
                { key: 'LOST', label: 'Lost' }
              ].map((tab) => (
                <button 
                  key={tab.key} 
                  onClick={() => setListCategory(tab.key as any)} 
                  className={`flex-1 min-w-[90px] px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    listCategory === tab.key 
                      ? 'bg-white text-hospital-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search, Filter Button, View Mode & Export */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
              <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search Input */}
                <div className="relative flex-1 max-w-full sm:max-w-xs">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Search candidate, phone, ID..." 
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-hospital-500/20 focus:border-hospital-500 outline-none transition-all" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>

                {/* Unified Filter Button */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                    showFilters || activeFilterCount > 0 
                      ? 'bg-hospital-50 border-hospital-300 text-hospital-700 shadow-2xs' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5 text-hospital-600" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-hospital-600 text-white text-[10px] font-black flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* View Toggle and Export */}
              <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
                <div className="bg-slate-100 border border-slate-200 p-0.5 rounded-xl flex shadow-2xs">
                  <button 
                    onClick={() => { setViewMode('split'); setIsSidebarMinimized(false); }} 
                    title="Split View"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'split' 
                        ? 'bg-white text-hospital-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setViewMode('table'); setIsSidebarMinimized(false); }} 
                    title="Table View"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'table' 
                        ? 'bg-white text-hospital-700 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                </div>
                <ExportButtons patients={patients} role="package_team" selectedPatient={selectedPatient} />
              </div>
            </div>

            {/* Expandable Unified Filter Panel */}
            {showFilters && (
              <div className="pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Filter From</label>
                    <input 
                      type="date" 
                      className={filterInputClasses} 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">To</label>
                    <input 
                      type="date" 
                      className={filterInputClasses} 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Prob. %</label>
                    <div className="relative">
                      <select 
                        className={filterInputClasses} 
                        value={probabilityFilter} 
                        onChange={e => setProbabilityFilter(e.target.value)}
                      >
                        <option value="ALL">ALL PROB.</option>
                        {Array.from(new Set(Object.values(PROPOSAL_STAGES))).sort((a, b) => a - b).map(prob => (
                          <option key={prob} value={prob.toString()}>{prob}%</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Doctor</label>
                    <div className="relative">
                      <select 
                        className={filterInputClasses} 
                        value={doctorFilter} 
                        onChange={e => setDoctorFilter(e.target.value)}
                      >
                        <option value="ALL">ALL DOCTORS</option>
                        {staffUsers?.filter(u => u.role === 'DOCTOR').map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="w-full py-2 px-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Views Rendering */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden min-h-[450px]">
              <div className="overflow-x-auto table-container w-full">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5 sm:p-4 whitespace-nowrap">PATIENT NAME</th>
                      <th className="p-3.5 sm:p-4 whitespace-nowrap">FILE ID</th>
                      <th className="p-3.5 sm:p-4 whitespace-nowrap">SOURCE</th>
                      <th className="p-3.5 sm:p-4 whitespace-nowrap">DATE ARRIVED</th>
                      <th className="p-3.5 sm:p-4 whitespace-nowrap">CONSULTING DOCTOR</th>
                      <th className="p-3.5 sm:p-4 whitespace-nowrap">OUTCOME STATUS</th>
                      <th className="p-3.5 sm:p-4 whitespace-nowrap">PROPOSAL STAGE</th>
                      <th className="p-3.5 sm:p-4 text-right whitespace-nowrap">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {allPatients.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 sm:p-4 font-bold text-slate-900">{p.name}</td>
                        <td className="p-3.5 sm:p-4 font-mono text-xs text-slate-500">{p.id.split('_V')[0]}</td>
                        <td className="p-3.5 sm:p-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-slate-100 text-slate-700">
                            {p.source || 'Other'}
                          </span>
                        </td>
                        <td className="p-3.5 sm:p-4 text-[11px] text-slate-500 font-bold font-mono uppercase">{formatToDDMMYYYY(p.entry_date)}</td>
                        <td className="p-3.5 sm:p-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${p.doctorAssessment?.assignedDoctorName ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            <span className="font-semibold text-xs text-slate-700">{p.doctorAssessment?.assignedDoctorName || 'Not Assigned'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 sm:p-4 whitespace-nowrap">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md shadow-2xs border border-transparent whitespace-nowrap ${
                            p.packageProposal?.outcome === 'Scheduled' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                            p.packageProposal?.outcome === 'Completed' ? 'bg-teal-50 text-teal-700 border-teal-100' : 
                            p.packageProposal?.outcome === 'Follow-Up' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                            p.packageProposal?.outcome === 'Lost' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {p.packageProposal?.outcome || 'Pending Lead'}
                          </span>
                        </td>
                        <td className="p-3.5 sm:p-4 whitespace-nowrap">
                          {p.packageProposal?.proposalStage ? (
                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {p.packageProposal.proposalStage} ({PROPOSAL_STAGES[p.packageProposal.proposalStage]}%)
                            </span>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>
                        <td className="p-3.5 sm:p-4 text-right whitespace-nowrap">
                          <button 
                            onClick={() => { handlePatientSelect(p); setViewMode('split'); setIsSidebarMinimized(false); }}
                            className="px-3 py-1.5 bg-hospital-600 hover:bg-hospital-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Proposal
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allPatients.length === 0 && (
                  <div className="p-16 text-center space-y-2">
                    <Database className="w-10 h-10 text-slate-200 mx-auto" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No matching records found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${isSidebarMinimized ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-5 transition-all duration-300`}>
              {/* Directory Sidebar */}
              {!isSidebarMinimized && (
                <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden h-[450px] lg:h-[750px] flex flex-col animate-in slide-in-from-left-4">
                  <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <button 
                        onClick={() => setIsSidebarMinimized(true)} 
                        title="Minimize Directory"
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">{listCategory} Directory</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-hospital-50 text-hospital-700 border border-hospital-100">{allPatients.length}</span>
                  </div>

                  <div className="overflow-y-auto flex-1 p-3 space-y-2">
                    {allPatients.map((p) => {
                      const outcome = p.packageProposal?.outcome;
                      const movedDate = outcome === 'Scheduled' ? p.surgery_date : outcome === 'Follow-Up' ? p.followup_date : outcome === 'Completed' ? p.completed_surgery : outcome === 'Lost' ? p.surgery_lost_date : null;
                      
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isOverdue = (listCategory === 'SCHEDULED' || listCategory === 'FOLLOWUP') && movedDate && movedDate < todayStr;

                      return (
                        <div 
                          key={p.id}
                          onClick={() => handlePatientSelect(p)} 
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                            selectedPatient?.id === p.id 
                              ? 'border-hospital-500 bg-hospital-50/70 shadow-xs' 
                              : isOverdue
                                ? 'border-rose-200 bg-rose-50/60 hover:border-rose-300'
                                : 'border-slate-100 hover:border-slate-200 bg-white'
                          }`}
                        >
                          {isOverdue && (
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[8px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse shadow-2xs z-10">
                              <AlertTriangle className="w-2.5 h-2.5" /> OVERDUE
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="font-bold text-slate-800 text-xs truncate pr-2">{p.name}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md shadow-2xs border border-transparent whitespace-nowrap ${
                              p.packageProposal?.outcome === 'Scheduled' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                              p.packageProposal?.outcome === 'Completed' ? 'bg-teal-50 text-teal-700 border-teal-100' : 
                              p.packageProposal?.outcome === 'Follow-Up' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                              p.packageProposal?.outcome === 'Lost' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {p.packageProposal?.outcome || 'Pending Lead'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider space-y-1">
                            <div className="flex items-center gap-1">Arrived: {formatToDDMMYYYY(p.entry_date)}</div>
                            <div className="flex items-center gap-1 text-slate-600 font-semibold">
                              <Stethoscope className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> {p.doctorAssessment?.assignedDoctorName || 'Not Assigned'}
                            </div>
                            {movedDate && (
                              <div className={`text-[10px] font-bold flex items-center gap-1 ${isOverdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {outcome === 'Follow-Up' ? 'Follow-up' : outcome}: {formatToDDMMYYYY(movedDate)}
                              </div>
                            )}
                            {p.updated_at && (
                              <div className="text-[10px] font-medium flex items-center gap-1 mt-1.5 text-slate-500 pt-1.5 border-t border-slate-100">
                                <RefreshCcw className="w-3 h-3 text-hospital-500 shrink-0" />
                                <span className="opacity-60 text-[9px] uppercase font-bold">Updated:</span>
                                <span className="text-slate-800 font-mono text-[10px]">{formatToDateTime(p.updated_at)}</span>
                              </div>
                            )}
                          </div>
                          {p.packageProposal?.proposalStage && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
                                <Gauge className="w-2.5 h-2.5" /> {PROPOSAL_STAGES[p.packageProposal.proposalStage]}%
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {allPatients.length === 0 && (
                      <div className="p-8 text-center space-y-2">
                        <Database className="w-8 h-8 text-slate-200 mx-auto" />
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No matching records</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proposal Detail Pane */}
              <div className={`bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden ${isSidebarMinimized ? 'lg:col-span-1' : 'lg:col-span-2'} flex flex-col min-h-[450px] lg:h-[750px] transition-all duration-300`}>
                {selectedPatient ? (
                  <div className="flex flex-col h-full relative">
                    {isSidebarMinimized && (
                      <button 
                        onClick={() => setIsSidebarMinimized(false)} 
                        title="Show Directory"
                        className="absolute left-4 top-4 z-10 p-2 bg-white border border-slate-200 rounded-xl shadow-md text-hospital-600 hover:text-hospital-700 transition-all cursor-pointer active:scale-95"
                      >
                        <LayoutPanelLeft className="w-4 h-4" />
                      </button>
                    )}

                    {/* Patient Meta Info Strip */}
                    <div className={`p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 ${isSidebarMinimized ? 'pl-16' : ''}`}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
                        <div className="bg-white border border-indigo-100 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><User className="w-3 h-3 text-indigo-500" /><span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider">Name</span></div>
                          <div className="text-xs font-bold text-indigo-950 truncate">{selectedPatient.name}</div>
                        </div>
                        <div className="bg-white border border-blue-100 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><Activity className="w-3 h-3 text-blue-500" /><span className="text-[8px] font-bold text-blue-400 uppercase tracking-wider">Age/Gender</span></div>
                          <div className="text-xs font-bold text-blue-950 truncate">{selectedPatient.age}Y | {selectedPatient.gender}</div>
                        </div>
                        <div className="bg-white border border-teal-100 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><Share2 className="w-3 h-3 text-teal-500" /><span className="text-[8px] font-bold text-teal-400 uppercase tracking-wider">Source</span></div>
                          <div className="text-xs font-bold text-teal-950 truncate uppercase">{selectedPatient.source}</div>
                        </div>
                        <div className="bg-white border border-rose-100 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><ShieldCheck className="w-3 h-3 text-rose-500" /><span className="text-[8px] font-bold text-rose-400 uppercase tracking-wider">Insurance</span></div>
                          <div className="text-xs font-bold text-rose-950 truncate">{selectedPatient.insuranceName || 'No'}</div>
                        </div>
                        <div className="bg-white border border-amber-100 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><Briefcase className="w-3 h-3 text-amber-500" /><span className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">Occupation</span></div>
                          <div className="text-xs font-bold text-amber-950 truncate">{selectedPatient.occupation || '---'}</div>
                        </div>
                        <div className="bg-white border border-purple-100 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><Tag className="w-3 h-3 text-purple-500" /><span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">Condition</span></div>
                          <div className="text-xs font-bold text-purple-950 truncate">{selectedPatient.condition}</div>
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><Stethoscope className="w-3 h-3 text-indigo-500" /><span className="text-[8px] font-bold text-indigo-400 uppercase tracking-wider">Doctor</span></div>
                          <div className="text-xs font-bold text-indigo-950 truncate">{selectedPatient.doctorAssessment?.assignedDoctorName || 'Not Assigned'}</div>
                        </div>
                        <div className="bg-white border border-emerald-100 p-2.5 rounded-xl shadow-2xs">
                          <div className="flex items-center gap-1 mb-0.5"><Clock className="w-3 h-3 text-emerald-500" /><span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Status Date</span></div>
                          <div className="text-xs font-bold text-emerald-950 truncate">
                            {(() => {
                              const outcome = selectedPatient.packageProposal?.outcome;
                              const movedDate = outcome === 'Scheduled' ? selectedPatient.surgery_date : outcome === 'Follow-Up' ? selectedPatient.followup_date : outcome === 'Completed' ? selectedPatient.completed_surgery : outcome === 'Lost' ? selectedPatient.surgery_lost_date : null;
                              return movedDate ? formatToDDMMYYYY(movedDate) : '---';
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveProposal} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                      {/* Doctor Recommendation Summary */}
                      <div className="bg-blue-50/60 border border-blue-100 p-4 sm:p-5 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-blue-700 tracking-wider">
                          <Stethoscope className="w-4 h-4 text-blue-600" /> Clinical Recommendation
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Recommended Procedure</div>
                          <div className="text-xs font-bold text-blue-800 uppercase">
                            {selectedPatient.doctorAssessment?.surgeryProcedure === 'Other' 
                              ? (selectedPatient.doctorAssessment?.otherSurgeryName || 'OTHER PROCEDURE') 
                              : (selectedPatient.doctorAssessment?.surgeryProcedure || 'NOT SPECIFIED')}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {['Evaluator', 'Pain', 'Affordability', 'Readiness'].map((label, idx) => (
                            <div key={idx} className="bg-white p-2.5 rounded-xl border border-blue-50 shadow-2xs">
                              <div className="text-[7px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                              <div className="text-xs font-bold text-blue-800 truncate">
                                {idx === 0 ? selectedPatient.doctorAssessment?.doctorSignature || '---' : 
                                 idx === 1 ? selectedPatient.doctorAssessment?.painSeverity || '---' :
                                 idx === 2 ? selectedPatient.doctorAssessment?.affordability || '---' :
                                 selectedPatient.doctorAssessment?.conversionReadiness || '---'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial Options Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-hospital-700 tracking-wider">
                          <Banknote className="w-4 h-4 text-hospital-600" /> Package & Financials
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                          <div className="sm:col-span-2 xl:col-span-1">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Mode of Payment</label>
                            <div className="relative">
                              <select 
                                className={selectClasses} 
                                value={proposal.modeOfPayment || ''} 
                                onChange={e => setProposal({...proposal, modeOfPayment: e.target.value as any})}
                              >
                                <option value="" disabled>Select Payment Mode</option>
                                {['Cash', 'Insurance', 'Partly', 'Insurance Approved'].map(mode => (
                                  <option key={mode} value={mode}>{mode}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Package Amount (₹)</label>
                            <input 
                              type="text" 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-hospital-500 outline-none" 
                              value={proposal.packageAmount || ''} 
                              onChange={e => setProposal({...proposal, packageAmount: e.target.value})} 
                              placeholder="e.g. 50,000" 
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Stay (Days)</label>
                            <input 
                              type="number" 
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-hospital-500 outline-none" 
                              value={proposal.stayDays || ''} 
                              onChange={e => setProposal({...proposal, stayDays: e.target.value ? parseInt(e.target.value, 10) : undefined})} 
                              placeholder="0" 
                            />
                          </div>
                          <div className="sm:col-span-2 xl:col-span-3">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Room Type</label>
                            <div className="relative">
                              <select 
                                className={selectClasses} 
                                value={proposal.roomType || ''} 
                                onChange={v => setProposal({...proposal, roomType: v.target.value as any})}
                              >
                                <option value="" disabled>Select Room Category</option>
                                {['Private', 'Deluxe', 'Semi', 'Economy'].map(room => (
                                  <option key={room} value={room}>{room}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          
                          {/* Options Grid */}
                          <div className="sm:col-span-2 xl:col-span-3 pt-3 border-t border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Medicines</label>
                                <div className="relative">
                                  <select 
                                    className={selectClasses} 
                                    value={proposal.surgeryMedicines || ''} 
                                    onChange={v => setProposal({...proposal, surgeryMedicines: v.target.value as any})}
                                  >
                                    <option value="" disabled>Select</option>
                                    {['Included', 'Excluded'].map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">ICU Charges</label>
                                <div className="relative">
                                  <select 
                                    className={selectClasses} 
                                    value={proposal.icuCharges || ''} 
                                    onChange={v => setProposal({...proposal, icuCharges: v.target.value as any})}
                                  >
                                    <option value="" disabled>Select</option>
                                    {['Included', 'Excluded'].map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Pre-Op Invest.</label>
                                <div className="relative">
                                  <select 
                                    className={selectClasses} 
                                    value={proposal.preOpInvestigation || ''} 
                                    onChange={v => setProposal({...proposal, preOpInvestigation: v.target.value as any})}
                                  >
                                    <option value="" disabled>Select</option>
                                    {['Included', 'Excluded'].map(opt => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="sm:col-span-2 xl:col-span-3 pt-3 border-t border-slate-100 space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Post-Op Follow-Up</label>
                              <div className="relative">
                                <select 
                                  className={selectClasses} 
                                  value={proposal.postFollowUp || ''} 
                                  onChange={v => setProposal({...proposal, postFollowUp: v.target.value as any})}
                                >
                                  <option value="" disabled>Select Option</option>
                                  {['Included', 'Excluded'].map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                            {proposal.postFollowUp === 'Included' && (
                              <div className="animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-[10px] font-bold uppercase text-hospital-700 mb-1.5">Number of Follow-Up Days</label>
                                <input 
                                  type="number" 
                                  className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-hospital-500 outline-none" 
                                  value={proposal.postFollowUpCount || ''} 
                                  onChange={e => setProposal({...proposal, postFollowUpCount: e.target.value ? parseInt(e.target.value, 10) : undefined})} 
                                  placeholder="e.g. 5"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Counseling Insights Section */}
                      <div className="pt-4 border-t border-slate-100 space-y-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-indigo-700 tracking-wider">
                          <MessageSquareQuote className="w-4 h-4 text-indigo-600" /> Counseling Insights
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Proposal Stage</label>
                              <div className="relative">
                                <select 
                                  className={selectClasses} 
                                  value={proposal.proposalStage || ''} 
                                  onChange={v => setProposal({...proposal, proposalStage: v.target.value})}
                                >
                                  <option value="" disabled>Select Stage</option>
                                  {Object.keys(PROPOSAL_STAGES).map(stage => (
                                    <option key={stage} value={stage}>{stage} – {PROPOSAL_STAGES[stage]}%</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                            {proposal.proposalStage && (
                              <div className="bg-hospital-50 border border-hospital-100 px-4 py-2 rounded-xl flex items-center justify-between animate-in zoom-in-95">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-hospital-100 rounded-lg text-hospital-700">
                                    <Gauge className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Probability</span>
                                </div>
                                <span className="text-base font-black text-hospital-700">{PROPOSAL_STAGES[proposal.proposalStage]}%</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Decision Pattern</label>
                            <div className="relative">
                              <select 
                                className={selectClasses} 
                                value={proposal.decisionPattern || ''} 
                                onChange={v => setProposal({...proposal, decisionPattern: v.target.value})}
                              >
                                <option value="" disabled>Select Decision Pattern</option>
                                {['Trust', 'PDC', 'Package Not Proposed', 'Standard', 'General Procedure', 'Management Discount'].map(pattern => (
                                  <option key={pattern} value={pattern}>{pattern}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Objection Identified</label>
                            <div className="relative">
                              <select 
                                className={selectClasses} 
                                value={proposal.objectionIdentified || ''} 
                                onChange={v => setProposal({...proposal, objectionIdentified: v.target.value})}
                              >
                                <option value="" disabled>Select Objection If Any</option>
                                {[
                                  'None / General Hesitation',
                                  'Cost / Financial Constraints',
                                  'Wants Cashless Insurance Approval First',
                                  'Family member decision pending',
                                  'Fear of surgery / anesthesia',
                                  'Wants to manage with medications only',
                                  'Seeking a second opinion',
                                  'Distance / Transportation issues',
                                  'Other'
                                ].map(obj => (
                                  <option key={obj} value={obj}>{obj}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5" /> Counseling Notes / Remarks
                            </label>
                            <textarea 
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-hospital-500 outline-none min-h-[100px] transition-all" 
                              value={proposal.remarks || ''} 
                              onChange={e => setProposal({...proposal, remarks: e.target.value})} 
                              placeholder="Enter specific notes, observations, or remarks here..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons & Save */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        {renderActionButtons(selectedPatient.packageProposal?.outcome)}
                        <button 
                          type="submit" 
                          disabled={isSavingProposal}
                          className="w-full py-2.5 px-4 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                        >
                          {isSavingProposal ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Saving Proposal...</span>
                            </>
                          ) : (
                            <>
                              <BadgeCheck className="w-4 h-4" />
                              <span>Save / Update Proposal Details</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8 relative">
                    {isSidebarMinimized && (
                      <button 
                        onClick={() => setIsSidebarMinimized(false)} 
                        title="Show Directory"
                        className="absolute left-4 top-4 z-10 p-2 bg-white border border-slate-200 rounded-xl shadow-md text-hospital-600 hover:text-hospital-700 transition-all cursor-pointer active:scale-95"
                      >
                        <LayoutPanelLeft className="w-4 h-4" />
                      </button>
                    )}
                    <Briefcase className="w-16 h-16 mb-3 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center">Select a candidate from the directory</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Outcome Confirmation Modal */}
      {outcomeModal.show && (
        <div className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <header className={`p-4 border-b flex justify-between items-center ${
              outcomeModal.type === 'Lost' ? 'bg-rose-50 text-rose-900 border-rose-100' : 
              outcomeModal.type === 'Completed' ? 'bg-teal-50 text-teal-900 border-teal-100' : 
              'bg-emerald-50 text-emerald-900 border-emerald-100'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-tight">Finalizing: {outcomeModal.type}</h3>
              <button 
                onClick={() => setOutcomeModal({ ...outcomeModal, show: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="p-5 space-y-4">
              {outcomeModal.type !== 'Lost' ? (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    Select {outcomeModal.type === 'Follow-Up' ? 'Follow-Up' : outcomeModal.type === 'Completed' ? 'Completion' : 'Surgery'} Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-hospital-500 transition-all" 
                    value={outcomeModal.date} 
                    onChange={e => setOutcomeModal({ ...outcomeModal, date: e.target.value })} 
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">Reason</label>
                  <select 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-hospital-500 transition-all cursor-pointer" 
                    value={outcomeModal.reason} 
                    onChange={e => setOutcomeModal({ ...outcomeModal, reason: e.target.value })}
                  >
                    {lostReasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
            </div>
            <footer className="p-4 border-t border-slate-100 flex flex-row gap-2.5 bg-slate-50/50 justify-end">
              <button 
                onClick={() => setOutcomeModal({ ...outcomeModal, show: false })} 
                className="py-2 px-3.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isSavingOutcome}
                onClick={handleConfirmOutcome} 
                className={`py-2 px-4 text-xs font-bold text-white rounded-xl shadow-xs transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 ${
                  outcomeModal.type === 'Lost' ? 'bg-rose-600 hover:bg-rose-700' : 
                  outcomeModal.type === 'Completed' ? 'bg-teal-600 hover:bg-teal-700' : 
                  'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSavingOutcome && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSavingOutcome ? 'Processing...' : 'Confirm'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
