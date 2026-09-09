import React, { useState } from 'react';
import { useHospital } from '../../context/HospitalContext';
import { ReportPermissionKey } from '../../types';
import { 
  FileText, CheckCircle2, XCircle, BarChart3, Activity, 
  TrendingUp, Layers, Check, Loader2, Info, Lock, Unlock, 
  Stethoscope, Calendar, DollarSign, PieChart
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
  const { reportPermissions, updateReportPermission } = useHospital();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Information */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-hospital-600 mb-1">
              <FileText className="w-4 h-4" /> 4. Report Access Management
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              Hospital Intelligence & Report Governance
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Independently grant or restrict access to strategic hospital reports. Revoked reports are automatically masked across all user sessions.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 w-fit">
            <Info className="w-4 h-4 text-hospital-600 shrink-0" />
            Independent Report Permissions
          </div>
        </div>

        {/* Reports Grid with Independent Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {reports.map((rep) => {
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
      </div>

      {/* 2. Audit Summary Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          <Layers className="w-4 h-4" /> Report Access Control Audit
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Report Name</th>
                <th className="pb-3">Permission Key</th>
                <th className="pb-3">Current Status</th>
                <th className="pb-3">Access Tier</th>
                <th className="pb-3 pr-2 text-right">Master Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {reports.map(rep => {
                const isGranted = !!reportPermissions[rep.key];
                return (
                  <tr key={rep.key} className="hover:bg-slate-50/60">
                    <td className="py-3.5 pl-2 font-bold text-slate-800 flex items-center gap-2">
                      <rep.icon className="w-4 h-4 text-slate-500" />
                      {rep.title}
                    </td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-500">report_{rep.key}</td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isGranted ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isGranted ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 text-[11px]">Independent Granular Rule</td>
                    <td className="py-3.5 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggle(rep.key)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold uppercase transition-all ${
                          isGranted 
                            ? 'text-rose-600 hover:bg-rose-50 border border-rose-200' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isGranted ? 'Turn OFF' : 'Turn ON'}
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
