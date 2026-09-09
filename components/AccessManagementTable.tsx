import React from 'react';
import { 
  Users, Activity, Briefcase, CheckCircle2, XCircle, 
  ExternalLink, RefreshCw, ShieldCheck, Lock, AlertCircle, Sparkles
} from 'lucide-react';
import { DashboardKey, Role } from '../types';

interface ManagedDashboardItem {
  key: 'front_office' | 'doctor' | 'package';
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
}

const MANAGED_DASHBOARDS: ManagedDashboardItem[] = [
  {
    key: 'front_office',
    name: 'Front Office Dashboard',
    description: 'Front desk patient registration, appointment scheduling',
    icon: Users,
    color: 'blue',
    badge: 'Front Desk'
  },
  {
    key: 'doctor',
    name: 'Doctor Dashboard',
    description: 'Doctor consultations, surgery indication (M1/S1), clinical assessments',
    icon: Activity,
    color: 'emerald',
    badge: 'Clinical'
  },
  {
    key: 'package',
    name: 'Package Dashboard',
    description: 'Financial counseling, package estimation, surgical conversions',
    icon: Briefcase,
    color: 'purple',
    badge: 'Financial'
  }
];

interface AccessManagementTableProps {
  dashboardPermissions: Record<DashboardKey, boolean>;
  onTogglePermission: (key: 'front_office' | 'doctor' | 'package', grant: boolean) => Promise<void>;
  onLaunchDashboard: (key: DashboardKey) => void;
  updatingKey: string | null;
  onRefresh?: () => void;
  currentUserRole?: Role | null;
}

export const AccessManagementTable: React.FC<AccessManagementTableProps> = ({
  dashboardPermissions,
  onTogglePermission,
  onLaunchDashboard,
  updatingKey,
  onRefresh,
  currentUserRole
}) => {
  const grantedCount = [
    dashboardPermissions.front_office,
    dashboardPermissions.doctor,
    dashboardPermissions.package
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Governance & Hierarchy Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> Access Governance • Hierarchy Tier 3
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">
              Dashboard Access Management
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              The Analytics Hub delegates operational access. Configure independent permissions for Front Office, Doctor, and Package dashboards with real-time Supabase persistence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700/80 text-center shadow-inner">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Database Sync</div>
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Supabase Live
              </div>
            </div>
          </div>
        </div>

        {/* Hierarchy Overview Cards */}
        <div className="relative z-10 mt-6 pt-6 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-black text-amber-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Master Dashboard</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Root authority with permanent unrestricted access to all dashboards and permission management.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-black text-indigo-400 mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Direct access to Analytics Hub. Does not automatically inherit operational access.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 font-black text-emerald-400 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Independent Isolation</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-normal">
              Each dashboard has an isolated permission key. Granting or revoking one never affects another.
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Permissions Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h4 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-600" />
              Dashboard Permissions Table
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Live records from <code className="font-mono text-slate-700 bg-slate-200/70 px-1.5 py-0.5 rounded">dashboard_permissions</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>Status:</span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-black text-xs">
                {grantedCount} / 3 Granted
              </span>
            </div>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                title="Refresh from Supabase"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Dashboard</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Permission</th>
                <th className="px-6 py-4">Access</th>
                <th className="px-6 py-4 text-center">Action</th>
                <th className="px-6 py-4 text-right">Launch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MANAGED_DASHBOARDS.map((row) => {
                const isGranted = Boolean(dashboardPermissions[row.key]);
                const isUpdating = updatingKey === row.key;
                const Icon = row.icon;

                return (
                  <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                    {/* Dashboard */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3.5">
                        <div className={`p-3 rounded-2xl bg-${row.color}-50 text-${row.color}-600 border border-${row.color}-100 shadow-sm`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900">{row.name}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500">
                            {row.badge}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-6 py-5 text-xs text-slate-600 max-w-xs font-medium leading-relaxed">
                      {row.description}
                    </td>

                    {/* Permission */}
                    <td className="px-6 py-5">
                      <code className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700">
                        {row.key}
                      </code>
                    </td>

                    {/* Access */}
                    <td className="px-6 py-5">
                      {isGranted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Granted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200 shadow-sm">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Denied
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-5 text-center">
                      {isGranted ? (
                        <button
                          onClick={() => onTogglePermission(row.key, false)}
                          disabled={isUpdating}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm hover:shadow"
                          title="Revoke dashboard access"
                        >
                          {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Revoke
                        </button>
                      ) : (
                        <button
                          onClick={() => onTogglePermission(row.key, true)}
                          disabled={isUpdating}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30"
                          title="Grant dashboard access"
                        >
                          {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Grant
                        </button>
                      )}
                    </td>

                    {/* Launch */}
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => onLaunchDashboard(row.key)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 inline-flex items-center gap-1.5 shadow-sm hover:shadow"
                        title={`Open ${row.name}`}
                      >
                        <span>Open Dashboard</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Notice */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Permission changes take effect immediately across all client sessions via Supabase Realtime subscriptions.
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Signed as: <strong className="text-slate-700">{currentUserRole || 'ANALYTICS'}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
