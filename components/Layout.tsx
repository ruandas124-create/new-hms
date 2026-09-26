import React from 'react';
import { useHospital } from '../context/HospitalContext';
import { 
  LogOut, Activity, User, Briefcase, FileText, Menu, X, Cloud, 
  Check, Loader2, AlertCircle, RefreshCw, BarChart3, AlertTriangle, 
  Clock, Calendar, Shield, Crown, ChevronRight, ChevronLeft, Lock, Target
} from 'lucide-react';
import { SurgeonCode, DashboardKey, HOSPITAL_LOGO_URL } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    currentUserRole, 
    setCurrentUserRole, 
    saveStatus, 
    refreshData, 
    isLoading, 
    patients, 
    systemName,
    activeDashboard,
    setActiveDashboard,
    dashboardPermissions,
    hasPermission
  } = useHospital();
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  React.useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isDesktopSidebarCollapsed.toString());
  }, [isDesktopSidebarCollapsed]);

  const handleLogout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("hms_hospital_email");
    localStorage.removeItem("hms_hospital_name");
    localStorage.removeItem("hms_hospital_id");
    setCurrentUserRole(null);
  };

  const getRoleLabel = () => {
    switch (currentUserRole) {
      case 'MASTER': return 'Master Authority';
      case 'ADMIN': return 'System Admin';
      case 'FRONT_OFFICE': return 'Front Office';
      case 'DOCTOR': return 'Doctor Panel';
      case 'PACKAGE_TEAM': return 'Counseling Packages';
      case 'ANALYTICS': return 'Analytics Hub';
      case 'SALES': return 'Sales & Scheduling';
      default: return currentUserRole || 'Staff';
    }
  };

  const getRoleIcon = () => {
    switch (currentUserRole) {
      case 'MASTER': return <Crown className="w-5 h-5 text-amber-400" />;
      case 'ADMIN': return <Shield className="w-5 h-5 text-amber-500" />;
      case 'FRONT_OFFICE': return <User className="w-5 h-5 text-blue-400" />;
      case 'DOCTOR': return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'PACKAGE_TEAM': return <Briefcase className="w-5 h-5 text-purple-400" />;
      case 'ANALYTICS': return <BarChart3 className="w-5 h-5 text-indigo-400" />;
      case 'SALES': return <Target className="w-5 h-5 text-rose-400" />;
      default: return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  // Build the dynamic navigation list strictly per the required hierarchy & permissions
  const navItems = React.useMemo(() => {
    if (!currentUserRole) return [];
    
    const allDashboards: {
      key: DashboardKey;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      colorClass: string;
    }[] = [
      { key: 'master', label: 'Master Admin', icon: Crown, colorClass: 'text-amber-400' },
      { key: 'analytics_hub', label: 'Analytics Hub', icon: BarChart3, colorClass: 'text-indigo-400' },
      { key: 'front_office', label: 'Front Office', icon: User, colorClass: 'text-blue-400' },
      { key: 'doctor', label: 'Doctor', icon: Activity, colorClass: 'text-emerald-400' },
      { key: 'package', label: 'Package', icon: Briefcase, colorClass: 'text-purple-400' },
      { key: 'sales', label: 'Sales Leads', icon: Target, colorClass: 'text-rose-400' },
    ];

    if (currentUserRole === 'MASTER') {
      return [
        { key: 'master_access' as DashboardKey, label: 'Access Management', icon: Shield, colorClass: 'text-amber-400' },
        { key: 'master_scheduling' as DashboardKey, label: 'Scheduling & Leads', icon: Calendar, colorClass: 'text-amber-400' },
        { key: 'master_availability' as DashboardKey, label: 'Doctor Availability', icon: Clock, colorClass: 'text-amber-400' },
        { key: 'master_reports' as DashboardKey, label: 'Report Access', icon: FileText, colorClass: 'text-amber-400' }
      ];
    }

    if (currentUserRole === 'ADMIN' || currentUserRole === 'ANALYTICS' || currentUserRole === 'ANALYTICS_HUB') {
      return allDashboards.filter(d => {
        if (d.key === 'analytics_hub') return true;
        if (d.key === 'front_office') return dashboardPermissions.front_office;
        if (d.key === 'doctor') return dashboardPermissions.doctor;
        if (d.key === 'package') return dashboardPermissions.package;
        if (d.key === 'sales') return dashboardPermissions.sales;
        return false;
      });
    }

    return allDashboards.filter(d => hasPermission(currentUserRole, d.key));
  }, [currentUserRole, dashboardPermissions, hasPermission]);

  const activeItemLabel = navItems.find(item => item.key === activeDashboard)?.label || getRoleLabel();

  const CloudStatus = () => {
    if (saveStatus === 'saving') {
      return (
        <span className="inline-flex items-center gap-1.5 text-sky-400 text-xs font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin"/> Syncing...
        </span>
      );
    }
    if (saveStatus === 'saved') {
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
          <Check className="w-3.5 h-3.5"/> Synced
        </span>
      );
    }
    if (saveStatus === 'error') {
      return (
        <button 
          onClick={() => refreshData()} 
          className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-semibold hover:underline cursor-pointer"
        >
          <AlertCircle className="w-3.5 h-3.5"/> Sync Error (Retry)
        </button>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
        <Cloud className="w-3.5 h-3.5"/> Offline
      </span>
    );
  };

  const pendingWork = React.useMemo(() => {
    if (currentUserRole !== 'PACKAGE_TEAM') return [];
    const today = new Date().toISOString().split('T')[0];
    return patients.filter(p => {
      if (p.doctorAssessment?.quickCode !== SurgeonCode.S1) return false;
      const outcome = p.packageProposal?.outcome;
      
      // Case 1: Pending Lead (No outcome yet)
      if (!outcome) return true;
      
      // Case 2: Scheduled or Follow-up that is Today or Past
      const movedDate = outcome === 'Scheduled' ? (p.surgery_date || p.packageProposal?.surgeryDate) : 
                         outcome === 'Follow-Up' ? (p.followup_date || p.packageProposal?.followUpDate) : null;
      
      if (movedDate && movedDate <= today) return true;
      
      return false;
    }).sort((a, b) => {
        const aOutcome = a.packageProposal?.outcome;
        const bOutcome = b.packageProposal?.outcome;
        if (!aOutcome && bOutcome) return -1;
        if (aOutcome && !bOutcome) return 1;
        return 0;
    });
  }, [patients, currentUserRole]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-hospital-600 animate-spin" />
        </div>
        <div className="text-slate-800 font-bold text-base tracking-tight">Synchronizing System Data</div>
        <div className="text-slate-500 text-xs">Fetching current patient records and schedules...</div>
      </div>
    );
  }

  const isCollapsed = isDesktopSidebarCollapsed && !isMobile;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans text-slate-800">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes verticalScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .animate-vertical-scroll {
          animation: verticalScroll 25s linear infinite;
        }
        .animate-vertical-scroll:hover {
          animation-play-state: paused;
        }
      `}} />

      {/* Mobile Top Navigation Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-30 flex items-center justify-between px-3 sm:px-4 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button 
            onClick={() => setIsMobileSidebarOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            className="p-2 -ml-1 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95"
          >
            {isMobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className="flex items-center gap-2 truncate">
            <img 
              src={HOSPITAL_LOGO_URL} 
              alt="Hospital Logo" 
              className="h-8 max-w-[140px] sm:max-w-[170px] w-auto object-contain"
              onError={(e) => {
                // If remote logo fails, hide and show clean text mark
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="font-extrabold text-sm text-slate-900 tracking-tight truncate hidden xs:inline">
              {systemName || 'HMS'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider truncate max-w-[120px]">
            {getRoleLabel()}
          </div>
          <button 
            onClick={() => refreshData()}
            title="Refresh Data"
            aria-label="Refresh Data"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${saveStatus === 'saving' ? 'animate-spin text-hospital-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 bg-slate-950 text-white flex flex-col
          transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
          lg:relative lg:translate-x-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed 
            ? 'w-[280px] max-w-[85vw] lg:w-0 lg:min-w-0 lg:max-w-0 lg:overflow-hidden lg:opacity-0 lg:pointer-events-none lg:border-none' 
            : 'w-[280px] max-w-[85vw] lg:w-64 lg:min-w-[16rem] lg:opacity-100 border-r border-slate-900'
          }
        `}
      >
        <div className="p-4 sm:p-5 flex flex-col h-full w-[280px] lg:w-64 min-w-[16rem] shrink-0">
          {/* Header Row: Logo & Collapse Button */}
          <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-white/95 rounded-xl p-1.5 shadow-sm shrink-0 flex items-center justify-center">
                <img 
                  src={HOSPITAL_LOGO_URL} 
                  alt="Hospital Logo" 
                  className="h-7 w-auto object-contain max-w-[120px]"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white tracking-wide uppercase truncate">
                  {systemName || 'HMS'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium truncate">
                  Surgical Management
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <div className="lg:hidden">
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Desktop collapse toggle */}
            <div className="hidden lg:block">
              <button
                id="sidebar-collapse-btn"
                onClick={() => setIsDesktopSidebarCollapsed(true)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* User Session Info Card */}
          <div className="mb-5 w-full bg-slate-900/90 rounded-2xl p-3 border border-slate-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0">
                {getRoleIcon()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-100 text-xs truncate">{getRoleLabel()}</div>
                <div className="mt-0.5"><CloudStatus /></div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-none w-full pr-1 pb-4">
            <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-2 px-2">
              Navigation
            </div>
            
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeDashboard === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveDashboard(item.key);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                    isActive
                      ? 'bg-hospital-600 text-white shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : item.colorClass}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 ml-2" />
                  )}
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-800/80 mt-3 space-y-1 w-full">
              <button 
                onClick={() => { refreshData(); setIsMobileSidebarOpen(false); }} 
                className="w-full flex items-center px-3 py-2.5 gap-3 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900/70 rounded-xl transition-colors"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${saveStatus === 'saving' ? 'animate-spin text-hospital-400' : ''}`} /> 
                <span>Sync Realtime Data</span>
              </button>
            </div>
            
            {/* Notification Card for Package Team */}
            {currentUserRole === 'PACKAGE_TEAM' && pendingWork.length > 0 && (
              <div className="mt-6 w-full animate-in slide-in-from-left-4 duration-300">
                <div className="px-1 mb-2 flex items-center justify-between">
                   <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                     <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> 
                     <span className="truncate">Pending Action</span>
                   </span>
                   <span className="text-[9px] font-extrabold bg-rose-500 px-1.5 py-0.5 rounded text-white shrink-0">{pendingWork.length}</span>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-inner w-full">
                  <div className="h-44 overflow-hidden relative group">
                    <div className="p-2 space-y-2 animate-vertical-scroll">
                      {[...pendingWork, ...pendingWork].map((p, idx) => {
                        const outcome = p.packageProposal?.outcome;
                        const movedDate = outcome === 'Scheduled' ? (p.surgery_date || p.packageProposal?.surgeryDate) : 
                                          outcome === 'Follow-Up' ? (p.followup_date || p.packageProposal?.followUpDate) : null;
                        
                        return (
                          <div key={idx} className={`p-2 rounded-lg border transition-all w-full ${!outcome ? 'bg-slate-800/50 border-slate-700/60' : 'bg-rose-950/20 border-rose-900/40'}`}>
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <span className="text-[11px] font-bold text-slate-200 truncate uppercase min-w-0">{p.name}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase shrink-0 ${!outcome ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>
                                {!outcome ? 'Leads' : outcome === 'Scheduled' ? 'Scheduled' : 'Follow-up'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                               {outcome === 'Scheduled' ? <Calendar className="w-3 h-3 shrink-0" /> : <Clock className="w-3 h-3 shrink-0" />}
                               <span className="truncate">{movedDate ? movedDate.split('-').reverse().join('-') : 'No Date'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* Logout Action */}
          <div className="pt-3 border-t border-slate-800/80 w-full shrink-0">
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center px-3 py-2.5 gap-3 text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-900/70 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" /> 
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto h-[100dvh] relative flex flex-col pt-16 lg:pt-0 w-full min-w-0 max-w-full box-border transition-all duration-300 ease-in-out">
        {/* Desktop Top Header Bar */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            {isCollapsed && (
              <button
                id="sidebar-expand-btn"
                onClick={() => setIsDesktopSidebarCollapsed(false)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Expand Navigation"
                aria-label="Expand Navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>{systemName || 'HMS'}</span>
                <span>/</span>
                <span className="text-hospital-600 font-extrabold">{activeItemLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-[11px] font-semibold text-slate-500">Live Status:</span>
              <CloudStatus />
            </div>

            <button 
              onClick={() => refreshData()}
              className="p-2 rounded-xl text-slate-600 hover:text-hospital-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Refresh and synchronize latest records"
            >
              <RefreshCw className={`w-4 h-4 ${saveStatus === 'saving' ? 'animate-spin text-hospital-600' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                {getRoleIcon()}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">{getRoleLabel()}</div>
                <div className="text-[10px] text-slate-400 font-medium">Authorized Account</div>
              </div>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {saveStatus === 'error' && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-semibold py-2.5 px-4 flex items-center justify-between gap-2 shrink-0 z-30 relative">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="truncate">Synchronization issue encountered. Please verify your connection.</span>
            </div>
            <button 
              onClick={() => refreshData()} 
              className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Page Content Container */}
        <div className="p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex-1 min-w-0 box-border">
          {children}
        </div>
      </main>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}
    </div>
  );
};
