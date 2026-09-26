import React from 'react';
import { useHospital } from '../context/HospitalContext';
import { MasterAccessManagement } from '../components/master/MasterAccessManagement';
import { MasterScheduling } from '../components/master/MasterScheduling';
import { MasterAvailability } from '../components/master/MasterAvailability';
import { MasterReportAccess } from '../components/master/MasterReportAccess';

export const MasterDashboard: React.FC = () => {
  const { activeDashboard } = useHospital();

  let content = null;
  switch (activeDashboard) {
    case 'master':
    case 'master_access':
      content = <MasterAccessManagement />;
      break;
    case 'master_scheduling':
      content = <MasterScheduling />;
      break;
    case 'master_availability':
      content = <MasterAvailability />;
      break;
    case 'master_reports':
      content = <MasterReportAccess />;
      break;
    default:
      content = <MasterAccessManagement />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Render Active Section */}
      <div>
        {content}
      </div>
    </div>
  );
};
