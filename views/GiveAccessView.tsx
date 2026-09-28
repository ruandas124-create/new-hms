import React from 'react';
import { useHospital } from '../context/HospitalContext';
import { AnalyticsAccessManagement } from '../components/AnalyticsAccessManagement';
import { ShieldCheck, BarChart3, ArrowLeft, Building2 } from 'lucide-react';

export const GiveAccessView: React.FC = () => {
  const { setActiveDashboard, currentUserStaff } = useHospital();
  const hospitalName = currentUserStaff?.hospitalName || currentUserStaff?.name || 'Hospital';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            <button
              onClick={() => setActiveDashboard('analytics_hub')}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Analytics Hub</span>
            </button>
            <span>/</span>
            <span className="text-slate-700">Give Access</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
                Give Access
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Configuring Access & Roles for <strong className="text-slate-700">{hospitalName}</strong></span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveDashboard('analytics_hub')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Analytics Hub</span>
          </button>
        </div>
      </div>

      {/* Access Management Core Interface */}
      <AnalyticsAccessManagement />
    </div>
  );
};
