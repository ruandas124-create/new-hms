import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { ReportPermissionKey } from '../../types';
import { AnalyticsDashboard } from '../../views/AnalyticsDashboard';
import { 
  FileText, CheckCircle2, XCircle, BarChart3, Activity, 
  TrendingUp, Layers, Check, Loader2, Info, Lock, Unlock, 
  Stethoscope, Calendar, DollarSign, PieChart, Building2, ChevronDown
} from 'lucide-react';

interface ReportItem {
  key: ReportPermissionKey;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  metricsIncluded: string[];
  audience: string;
  badgeColor: string;
}

export const MasterReportAccess: React.FC = () => {
  const { 
    reportPermissions, 
    updateReportPermission, 
    analyticsAccounts, 
    selectedTenantFilter, 
    setSelectedTenantFilter 
  } = useHospital();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Specified report cards to hide from the visible card grid
  const HIDDEN_REPORT_CARD_KEYS: ReportPermissionKey[] = [
    'doctor_performance',
    'period_activity',
    'financial_analytics',
    'procedure_trends'
  ];

  const reports: ReportItem[] = [
    {
      key: 'doctor_performance',
      title: 'Doctor Performance Report',
      subtitle: 'Clinical Conversions & Doctor Activity',
      description: 'Breakdown of OPD volume, conversion rates from consultation to surgery (S1), total realized revenue, and timeframes.',
      icon: Stethoscope,
      metricsIncluded: ['OPD Footfalls', 'S1 Surgery Recommendations', 'Conversion Rate %', 'Realized Revenue by Doctor', 'Avg Ticket Size'],
      audience: 'Chief of Medicine, Hospital Board, Management',
      badgeColor: 'emerald'
    },
    {
      key: 'period_activity',
      title: 'Period Activity Report',
      subtitle: 'Daily & Periodic Operational Census',
      description: 'Day-by-day logs of OPD registrations, conversion milestones, Excel/CSV export capabilities, and period comparisons.',
      icon: Calendar,
      metricsIncluded: ['Daily Patient Registrations', 'New vs Revisit Split', 'Day-level Revenue Intake', 'Detailed Activity Audit Logs'],
      audience: 'Operations Lead, Quality Compliance, Billing',
      badgeColor: 'blue'
    },
    {
      key: 'financial_analytics',
      title: 'Financial Analytics & Conversion Report',
      subtitle: 'Revenue, CAC, ROI & Decision Patterns',
      description: 'Ad spend tracking, Cost Per OPD, Cost Per Surgery, Marketing ROI multiples, and counseling decision pattern analysis.',
      icon: DollarSign,
      metricsIncluded: ['Marketing Budget vs Spend', 'Cost Per Acquisition (CAC)', 'Marketing ROI Multiple', 'Proposal Stages & Objections'],
      audience: 'Chief Financial Officer, Marketing Director, Owners',
      badgeColor: 'indigo'
    },
    {
      key: 'procedure_trends',
      title: 'Procedure Trends Report',
      subtitle: 'Surgical Case Distribution & Modalities',
      description: 'Volume frequency of surgical procedures (Lap Chole, Hernia, Laser Proctology, Varicose Veins) and clinical demand patterns.',
      icon: PieChart,
      metricsIncluded: ['Surgical Modality Counts', 'Top Recommended Surgeries', 'Specialty Growth Rates', 'Procedure Mix Percentages'],
      audience: 'OT Director, Clinical Governance, Inventory Heads',
      badgeColor: 'purple'
    }
  ];

  const visibleReportCards = reports.filter(rep => !HIDDEN_REPORT_CARD_KEYS.includes(rep.key));

  const handleToggle = async (key: ReportPermissionKey) => {
    const current = !!reportPermissions[key];
    const nextState = !current;
    setUpdatingKey(key);
    try {
      await updateReportPermission(key, nextState);
      setToastMessage(`${key.replace('_', ' ').toUpperCase()} report access set to ${nextState ? 'ON' : 'OFF'}`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update report permission:', err);
    } finally {
      setUpdatingKey(null);
    }
  };

  const selectedHospital = analyticsAccounts.find(h => h.id === selectedTenantFilter || h.hospital_id === selectedTenantFilter);
  const isViewingSpecificHospitalHub = selectedTenantFilter && selectedTenantFilter !== 'ALL';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* Centered Hospital Dropdown Selector */}
      {!isViewingSpecificHospitalHub && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-hospital-50 text-hospital-600 flex items-center justify-center shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Select Hospital Facility</h3>
            <p className="text-xs text-slate-400 mt-0.5">Choose a hospital to view its complete Analytic Hub</p>
          </div>
          <div className="relative w-full max-w-md mt-2">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedTenantFilter && selectedTenantFilter !== 'ALL' ? selectedTenantFilter : 'ALL'}
              onChange={(e) => setSelectedTenantFilter(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500 cursor-pointer appearance-none text-center"
            >
              <option value="ALL" className="text-center">-- Select Hospital Facility --</option>
              {analyticsAccounts.map(h => (
                <option key={h.id} value={h.id} className="text-left">
                  {h.name} {h.city ? `(${h.city})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Conditional Display: If specific hospital is selected, render its Analytic Hub with Full Access */}
      {isViewingSpecificHospitalHub ? (
        <div className="space-y-4">
          <div className="bg-hospital-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-hospital-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black tracking-tight">
                    Analytic Hub: {selectedHospital?.name || 'Selected Hospital'}
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Full Viewing & Reporting Access
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Displaying all reports, analytics, dashboards, performance metrics, and data specific to this hospital facility.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTenantFilter('ALL')}
              className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
            >
              ← Back to Report Governance
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-6 shadow-sm">
            <AnalyticsDashboard />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Reports Grid with Independent Toggles (hidden when all specified cards are removed) */}
            {visibleReportCards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6 pt-6 border-t border-slate-100">
                {visibleReportCards.map((rep) => {
                  const isGranted = !!reportPermissions[rep.key];
                  const isUpdating = updatingKey === rep.key;
                  const Icon = rep.icon;

                  return (
                    <div
                      key={rep.key}
                      id={`report-card-${rep.key}`}
                      className={`bg-white rounded-2xl border transition-all p-6 flex flex-col justify-between space-y-5 ${
                        isGranted 
                          ? 'border-emerald-200 shadow-sm hover:shadow-md' 
                          : 'border-slate-200 bg-slate-50/40 opacity-90'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className={`p-3 rounded-2xl ${
                            isGranted ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                          } transition-colors`}>
                            <Icon className="w-6 h-6" />
                          </div>

                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            isGranted 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {isGranted ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isGranted ? 'ACCESS ON' : 'ACCESS OFF'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-extrabold text-slate-900 text-base">{rep.title}</h3>
                          <p className="text-xs font-semibold text-slate-500">{rep.subtitle}</p>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{rep.description}</p>
                        </div>

                        {/* Metrics Included Tags */}
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                            Exposed Metrics & Analytics
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {rep.metricsIncluded.map((m, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-600">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 text-[10px] text-slate-400 font-bold uppercase">
                          Audience: <span className="text-slate-700">{rep.audience}</span>
                        </div>
                      </div>

                      {/* Switch Toggle */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                          Report State: <span className={isGranted ? 'text-emerald-600' : 'text-rose-600'}>{isGranted ? 'Visible (ON)' : 'Restricted (OFF)'}</span>
                        </span>

                        <button
                          id={`toggle-report-${rep.key}`}
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggle(rep.key)}
                          className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-hospital-500 focus:ring-offset-2 ${
                            isGranted ? 'bg-emerald-600' : 'bg-slate-300'
                          } ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                          aria-label={`Toggle ${rep.title}`}
                        >
                          <span className="sr-only">Toggle {rep.title}</span>
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                              isGranted ? 'translate-x-8' : 'translate-x-0'
                            }`}
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                            ) : isGranted ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}
    </div>
  );
};
