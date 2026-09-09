import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, LogOut } from 'lucide-react';
import { DashboardKey, Role } from '../types';
import { useHospital } from '../context/HospitalContext';

interface AccessDeniedProps {
  requestedDashboard: DashboardKey;
}

const DASHBOARD_NAMES: Record<DashboardKey, string> = {
  master: 'Master Dashboard',
  master_access: 'Access Management',
  master_scheduling: 'Scheduling',
  master_availability: 'Availability',
  master_reports: 'Report Access Management',
  analytics_hub: 'Analytics Hub Dashboard',
  front_office: 'Front Office Dashboard',
  doctor: 'Doctor Dashboard',
  package: 'Package Counselor Dashboard',
  sales: 'Sales Dashboard',
};

export const AccessDenied: React.FC<AccessDeniedProps> = ({ requestedDashboard }) => {
  const { currentUserRole, setCurrentUserRole, activeDashboard, setActiveDashboard, getAccessibleDashboards } = useHospital();

  const accessible = getAccessibleDashboards();
  const targetName = DASHBOARD_NAMES[requestedDashboard] || requestedDashboard;

  const handleReturn = () => {
    if (accessible.length > 0) {
      setActiveDashboard(accessible[0]);
    } else {
      // Fallback
      setCurrentUserRole(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hms_hospital_role');
    localStorage.removeItem('hms_hospital_email');
    localStorage.removeItem('hms_hospital_name');
    localStorage.removeItem('hms_hospital_id');
    setCurrentUserRole(null);
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-400">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-2xl shadow-slate-200 space-y-6 relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-500/10 blur-3xl rounded-full -z-0"></div>

        {/* Security Shield Badge */}
        <div className="relative z-10 flex justify-center">
          <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center border border-rose-100 shadow-inner">
            <ShieldAlert className="w-10 h-10 text-rose-600" />
          </div>
        </div>

        {/* Heading & Details */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest">
            <Lock className="w-3 h-3" /> Access Restricted
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Permission Denied</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            You do not have permission to access <strong className="text-slate-800 font-bold">{targetName}</strong>. 
            Access to this dashboard is currently revoked or not granted for your role (<span className="font-mono text-rose-600 font-bold">{currentUserRole || 'UNKNOWN'}</span>).
          </p>
        </div>

        {/* Route / Security Info Banner */}
        <div className="relative z-10 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 text-[11px] text-left space-y-1">
          <div className="flex justify-between items-center text-slate-400 font-mono text-[10px] uppercase">
            <span>Target Route</span>
            <span className="font-bold text-slate-600">/{requestedDashboard.replace('_', '-')}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 font-mono text-[10px] uppercase">
            <span>Access Status</span>
            <span className="font-bold text-rose-600">DENIED / REVOKED</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="relative z-10 pt-2 space-y-3">
          {accessible.length > 0 && (
            <button
              onClick={handleReturn}
              className="w-full py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Return to {DASHBOARD_NAMES[accessible[0]] || 'Dashboard'}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full py-3 px-5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign In with Another Account
          </button>
        </div>

        <p className="relative z-10 text-[10px] text-slate-400">
          If you believe this is an error, request permission from your Master Administrator or Analytics Hub manager.
        </p>
      </div>
    </div>
  );
};
