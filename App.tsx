
import React from 'react';
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
    <HospitalProvider>
      <MainApp />
    </HospitalProvider>
  );
};

export default App;
