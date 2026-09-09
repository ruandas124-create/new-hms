import React, { useState } from 'react';
import { useHospital } from '../context/HospitalContext';
import { 
  Crown, Shield, Calendar, Clock, FileText, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { MasterAccessManagement } from '../components/master/MasterAccessManagement';
import { MasterScheduling } from '../components/master/MasterScheduling';
import { MasterAvailability } from '../components/master/MasterAvailability';
import { MasterReportAccess } from '../components/master/MasterReportAccess';

export const MasterDashboard: React.FC = () => {
  const { systemName, refreshData, activeDashboard } = useHospital();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await refreshData();
    } finally {
      setIsSyncing(false);
    }
  };

  let content = null;
  let sectionTitle = '';
  switch (activeDashboard) {
    case 'master':
    case 'master_access':
      content = <MasterAccessManagement />;
      sectionTitle = 'Access Management';
      break;
    case 'master_scheduling':
      content = <MasterScheduling />;
      sectionTitle = 'Scheduling';
      break;
    case 'master_availability':
      content = <MasterAvailability />;
      sectionTitle = 'Availability';
      break;
    case 'master_reports':
      content = <MasterReportAccess />;
      sectionTitle = 'Report Access Management';
      break;
    default:
      content = <MasterAccessManagement />;
      sectionTitle = 'Access Management';
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Master Authority Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 w-80 h-80 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-widest max-w-full">
              <Crown className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Highest Authority • System Root</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight uppercase break-words">
              Master Admin • {sectionTitle}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Governance console for <span className="font-bold text-white">{systemName || 'HMS'}</span>. 
              Manage dashboard access, scheduling permissions, doctor availability rosters, and analytical report privileges.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Master Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Render Active Section */}
      <div>
        {content}
      </div>
    </div>
  );
};
