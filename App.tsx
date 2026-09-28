
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { HospitalProvider, useHospital } from './context/HospitalContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { MasterDashboard } from './views/MasterDashboard';
import { AnalyticsDashboard } from './views/AnalyticsDashboard';
import { FrontOfficeDashboard } from './views/FrontOfficeDashboard';
import { DoctorDashboard } from './views/DoctorDashboard';
import { PackageTeamDashboard } from './views/PackageTeamDashboard';
import { SalesDashboard } from './views/SalesDashboard';
import { AccessDenied } from './components/AccessDenied';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Application Session Refreshed</h1>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            A temporary synchronization state occurred. Please click below to reload your session cleanly.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-3 bg-hospital-600 hover:bg-hospital-700 text-white font-extrabold rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Reload System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const MainApp: React.FC = () => {
  const { currentUserRole, activeDashboard, hasPermission } = useHospital();

  if (!currentUserRole) {
    return <Login />;
  }

  // Permission check at the route/component level:
  // If access is DENIED: Show Access Denied message and prevent loading dashboard data.
  // If access is GRANTED: Render the authorized dashboard.
  const isAllowed = hasPermission(currentUserRole, activeDashboard);

  const renderDashboardContent = () => {
    if (!isAllowed) {
      return <AccessDenied requestedDashboard={activeDashboard} />;
    }

    switch (activeDashboard) {
      case 'master':
      case 'master_access':
      case 'master_scheduling':
      case 'master_availability':
      case 'master_reports':
        return <MasterDashboard />;
      case 'analytics_hub':
        return <AnalyticsDashboard />;
      case 'front_office':
        return <FrontOfficeDashboard />;
      case 'doctor':
        return <DoctorDashboard />;
      case 'package':
        return <PackageTeamDashboard />;
      case 'sales':
        return <SalesDashboard />;
      default:
        return <AccessDenied requestedDashboard={activeDashboard} />;
    }
  };

  return (
    <Layout>
      {renderDashboardContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HospitalProvider>
        <MainApp />
      </HospitalProvider>
    </ErrorBoundary>
  );
};

export default App;

