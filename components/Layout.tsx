import React from 'react';
import { useHospital } from '../context/HospitalContext';
import { 
  LogOut, Activity, User, Briefcase, FileText, Menu, X, Cloud, 
  Check, Loader2, AlertCircle, RefreshCw, BarChart3, AlertTriangle, 
  Clock, Calendar, Shield, Crown, ChevronRight, ChevronLeft, Lock, Target
} from 'lucide-react';
import { SurgeonCode, DashboardKey } from '../types';

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
      default: return '';
    }
  };

  const getRoleIcon = () => {
    switch (currentUserRole) {
      case 'MASTER': return <Crown className="w-6 h-6 text-amber-400" />;
      case 'ADMIN': return <Shield className="w-6 h-6 text-amber-500" />;
      case 'FRONT_OFFICE': return <User className="w-6 h-6" />;
      case 'DOCTOR': return <Activity className="w-6 h-6" />;
      case 'PACKAGE_TEAM': return <Briefcase className="w-6 h-6" />;
      case 'ANALYTICS': return <BarChart3 className="w-6 h-6" />;
      default: return <FileText className="w-6 h-6" />;
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
      { key: 'sales', label: 'Sales', icon: Target, colorClass: 'text-rose-400' },
    ];

    if (currentUserRole === 'MASTER') {
      return [
        { key: 'master_access' as DashboardKey, label: 'Access Management', icon: Shield, colorClass: 'text-amber-400' },
        { key: 'master_scheduling' as DashboardKey, label: 'Scheduling', icon: Calendar, colorClass: 'text-amber-400' },
        { key: 'master_availability' as DashboardKey, label: 'Availability', icon: Clock, colorClass: 'text-amber-400' },
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

  const CloudStatus = () => {
    if (saveStatus === 'saving') return <span className="flex items-center gap-1 text-blue-400 text-xs animate-pulse"><Loader2 className="w-3 h-3 animate-spin"/> Syncing...</span>;
    if (saveStatus === 'saved') return <span className="flex items-center gap-1 text-green-400 text-xs"><Check className="w-3 h-3"/> Saved</span>;
    if (saveStatus === 'error') return <span onClick={() => refreshData()} className="flex items-center gap-1 text-red-400 text-xs cursor-pointer"><AlertCircle className="w-3 h-3"/> Failed (Retry)</span>;
    return <span className="flex items-center gap-1 text-gray-500 text-xs"><Cloud className="w-3 h-3"/> Offline</span>;
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

  const LOGO_URL_DARK = `https://placehold.co/400x120/0f172a/ffffff?text=${encodeURIComponent(systemName || "HMS")}`; 
  const LOGO_URL_LIGHT = `https://placehold.co/400x120/ffffff/0284c7?text=${encodeURIComponent(systemName || "HMS")}`; 
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 space-y-4">
        <Loader2 className="w-12 h-12 text-hospital-600 animate-spin" />
        <div className="text-hospital-800 font-bold text-lg animate-pulse">Synchronizing Database...</div>
        <div className="text-gray-500 text-sm">Please wait while we fetch the latest patient records.</div>
      </div>
    );
  }

  const isCollapsed = isDesktopSidebarCollapsed && !isMobile;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden font-sans">
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

      {/* Mobile Header / Navbar */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-3 sm:px-4 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={() => setIsMobileSidebarOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
            className="p-2 -ml-1 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
          >
            {isMobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <img src={LOGO_URL_LIGHT} alt="HMS Hospital" className="h-7 sm:h-8 max-w-[140px] sm:max-w-[200px] w-auto object-contain"/>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md hidden xs:block sm:block uppercase tracking-wider truncate max-w-[110px]">
            {getRoleLabel()}
          </div>
          <div className="p-1 rounded-full bg-slate-100 shrink-0" title={getRoleLabel()}>{getRoleIcon()}</div>
        </div>
      </div>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 bg-slate-900 text-white flex flex-col
          transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
          lg:relative lg:translate-x-0
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-[280px] max-w-[85vw] lg:w-20' : 'w-[280px] max-w-[85vw] lg:w-64'}
        `}
      >
        <div className={`p-4 lg:p-6 flex flex-col h-full ${isCollapsed ? 'items-center' : ''}`}>
          {/* Mobile Close Button */}
          <div className="lg:hidden absolute top-4 right-4">
            <button 
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop Collapse Toggle */}
          <div className="hidden lg:flex justify-end mb-4 w-full">
            <button
              onClick={() => setIsDesktopSidebarCollapsed(prev => !prev)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Logo Section */}
          <div className={`mb-8 ${isCollapsed ? 'px-0 text-center mt-2' : 'px-2 mt-2'}`}>
            <img 
              src={LOGO_URL_DARK} 
              alt="HMS Hospital" 
              className={`${isCollapsed ? 'h-8 w-auto mx-auto object-contain hidden' : 'h-10 lg:h-12 w-auto'}`}
            />
            {isCollapsed && (
              <div className="h-10 w-10 bg-hospital-600 rounded-xl flex items-center justify-center font-black text-xl text-white mx-auto shadow-lg shadow-hospital-900/50">
                H
              </div>
            )}
            {!isCollapsed && (
              <div className="text-[0.6rem] text-slate-400 mt-2 uppercase tracking-widest font-semibold truncate">
                21st Century Surgical Hospital
              </div>
            )}
          </div>

          {/* User Session Info */}
          <div className="mb-6 w-full">
            {!isCollapsed && <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-2 px-1">Current Session</div>}
            <div className={`flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="shrink-0 group relative">
                {getRoleIcon()}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {getRoleLabel()}
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-200 text-sm truncate">{getRoleLabel()}</div>
                  <div className="mt-0.5"><CloudStatus /></div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide w-full pb-20">
            {!isCollapsed && (
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-3 px-1 mt-2">
                Dashboards & Access
              </div>
            )}
            
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
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-bold transition-all group relative ${
                    isActive
                      ? 'bg-hospital-600 text-white shadow-lg shadow-hospital-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : item.colorClass}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse ml-2" />
                  )}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}

            <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-1.5 w-full">
              <button 
                onClick={() => { refreshData(); setIsMobileSidebarOpen(false); }} 
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 gap-3'} text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors group relative`}
              >
                <RefreshCw className="w-5 h-5 shrink-0" /> 
                {!isCollapsed && <span>Sync Data</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    Sync Data
                  </div>
                )}
              </button>
            </div>
            
            {/* Notification Card for Package Team */}
            {!isCollapsed && currentUserRole === 'PACKAGE_TEAM' && pendingWork.length > 0 && (
              <div className="mt-8 animate-in slide-in-from-left-4 duration-500 w-full">
                <div className="px-1 mb-3 flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 flex items-center gap-1.5">
                     <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" /> 
                     <span className="truncate">Pending Work</span>
                   </span>
                   <span className="text-[9px] font-black bg-rose-600 px-1.5 py-0.5 rounded text-white shrink-0">{pendingWork.length}</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner w-full">
                  <div className="h-48 overflow-hidden relative group">
                    <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-slate-950/80 to-transparent z-10"></div>
                    <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-slate-950/80 to-transparent z-10"></div>
                    
                    <div className="p-2 space-y-2 animate-vertical-scroll">
                      {[...pendingWork, ...pendingWork].map((p, idx) => {
                        const outcome = p.packageProposal?.outcome;
                        const movedDate = outcome === 'Scheduled' ? (p.surgery_date || p.packageProposal?.surgeryDate) : 
                                          outcome === 'Follow-Up' ? (p.followup_date || p.packageProposal?.followUpDate) : null;
                        
                        return (
                          <div key={idx} className={`p-2.5 rounded-xl border transition-all w-full ${!outcome ? 'bg-indigo-950/30 border-indigo-900/40' : 'bg-rose-950/30 border-rose-900/50'}`}>
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <span className="text-[10px] font-black text-slate-200 truncate uppercase min-w-0">{p.name}</span>
                              <span className={`text-[7px] font-black px-1 py-0.5 rounded uppercase shrink-0 ${!outcome ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white animate-pulse'}`}>
                                {!outcome ? 'Leads' : outcome === 'Scheduled' ? 'Scheduled' : 'Follow-up'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500">
                               {outcome === 'Scheduled' ? <Calendar className="w-2.5 h-2.5 shrink-0" /> : <Clock className="w-2.5 h-2.5 shrink-0" />}
                               <span className="truncate">{movedDate ? movedDate.split('-').reverse().join('-') : 'No Date Set'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <p className="text-[8px] font-bold text-slate-600 text-center mt-3 uppercase tracking-tighter italic">Auto-refreshing daily tasks...</p>
              </div>
            )}
          </nav>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-slate-800/80 w-full space-y-2 shrink-0">
            <button 
              onClick={handleLogout} 
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'} text-sm font-bold text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors group relative`}
            >
              <LogOut className="w-5 h-5 shrink-0" /> 
              {!isCollapsed && <span>Logout</span>}
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-800 text-white text-xs font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  Logout
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto h-[100dvh] relative flex flex-col pt-16 lg:pt-0 w-full min-w-0 max-w-full box-border">
        {/* Error Banner */}
        {saveStatus === 'error' && (
          <div className="bg-rose-500 text-white text-xs font-bold text-center py-2.5 px-4 shadow-md flex items-center justify-center gap-2 shrink-0 z-40 relative">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">CONNECTION ERROR: Data is not syncing. Check internet.</span>
            <button onClick={() => refreshData()} className="ml-2 bg-rose-600 hover:bg-rose-700 px-2 py-1 rounded text-[10px] uppercase shrink-0 font-black tracking-widest">Retry</button>
          </div>
        )}

        <div className="p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full flex-1 min-w-0 box-border">
          {children}
        </div>
      </main>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsMobileSidebarOpen(false)} 
        />
      )}
    </div>
  );
};
