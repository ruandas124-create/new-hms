import React from 'react';
import { 
  Award, Download, Printer, Users, Target, CheckCircle2, 
  XCircle, TrendingUp, Banknote, Calendar
} from 'lucide-react';

interface DoctorPerformanceReportProps {
  doctorPerformanceStats: {
    filteredDoctors: any[];
    totals: {
      totalConsultations: number;
      totalPackagesDiscussed: number;
      totalSurgeriesCompleted: number;
      totalSurgeriesLost: number;
      totalRevenueGenerated: number;
      overallConversionRate: number;
    };
  };
  selectedDocId: string;
  onSelectDocId: (id: string) => void;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly';
  onSelectTimeframe: (tf: 'daily' | 'weekly' | 'monthly' | 'yearly') => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onConsultationsClick?: () => void;
  onConversionsClick?: () => void;
  onConvRateClick?: () => void;
  onSurgeryValueClick?: () => void;
}

export const DoctorPerformanceReport: React.FC<DoctorPerformanceReportProps> = ({
  doctorPerformanceStats,
  selectedDocId,
  onSelectDocId,
  timeframe,
  onSelectTimeframe,
  onExportCsv,
  onPrint,
  onConsultationsClick,
  onConversionsClick,
  onConvRateClick,
  onSurgeryValueClick
}) => {
  const { filteredDoctors, totals } = doctorPerformanceStats;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            Doctor Clinical & Conversion Performance
          </h3>
          <p className="text-slate-400 text-[11px] font-medium mt-0.5">
            Consultations, surgical indications (S1), completed surgeries, and financial realization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Doctor Dropdown */}
          <select
            value={selectedDocId}
            onChange={(e) => onSelectDocId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-hospital-500 cursor-pointer"
          >
            <option value="all">All Doctors ({filteredDoctors.length})</option>
            {filteredDoctors.map((doc: any) => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.name} ({doc.specialization || 'Consultant'})
              </option>
            ))}
          </select>

          {/* Timeframe Filter */}
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/70">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onSelectTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div 
          onClick={onConsultationsClick}
          className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="text-[10px] font-semibold uppercase text-slate-500 tracking-wider group-hover:text-slate-900 transition-colors">Consultations</div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">{totals.totalConsultations}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">OPD visits in period</div>
        </div>
        <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
          <div className="text-[10px] font-semibold uppercase text-indigo-700 tracking-wider">S1 Packages</div>
          <div className="text-xl font-bold text-indigo-700 font-mono tabular-nums mt-0.5">{totals.totalPackagesDiscussed}</div>
          <div className="text-[10px] text-indigo-500 mt-0.5">Surgery proposed</div>
        </div>
        <div 
          onClick={onConversionsClick}
          className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 hover:shadow-sm hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="text-[10px] font-semibold uppercase text-emerald-700 tracking-wider group-hover:text-emerald-900 transition-colors">Surgeries Done</div>
          <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5">{totals.totalSurgeriesCompleted}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Operated</div>
        </div>
        <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
          <div className="text-[10px] font-semibold uppercase text-rose-700 tracking-wider">Surgeries Lost</div>
          <div className="text-xl font-bold text-rose-700 font-mono tabular-nums mt-0.5">{totals.totalSurgeriesLost}</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Dropped / deferred</div>
        </div>
        <div 
          onClick={onConvRateClick}
          className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 hover:shadow-sm hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="text-[10px] font-semibold uppercase text-blue-700 tracking-wider group-hover:text-blue-900 transition-colors">Conversion Rate</div>
          <div className="text-xl font-bold text-blue-700 font-mono tabular-nums mt-0.5">{totals.overallConversionRate}%</div>
          <div className="text-[10px] text-blue-500 mt-0.5">Surg / Consultation</div>
        </div>
        <div 
          onClick={onSurgeryValueClick}
          className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 hover:shadow-sm hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="text-[10px] font-semibold uppercase text-amber-700 tracking-wider group-hover:text-amber-900 transition-colors">Surgery Value</div>
          <div className="text-lg sm:text-xl font-bold text-amber-800 font-mono tabular-nums mt-0.5 truncate">₹{totals.totalRevenueGenerated.toLocaleString()}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Realized package value</div>
        </div>
      </div>

      {/* Doctor Performance Table */}
      <div className="overflow-x-auto table-container w-full rounded-xl border border-slate-200/80">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-2.5">Doctor</th>
              <th className="px-3.5 py-2.5">Specialization</th>
              <th className="px-3.5 py-2.5">Status</th>
              <th className="px-3.5 py-2.5 text-center">Consultations</th>
              <th className="px-3.5 py-2.5 text-center">S1 Packages</th>
              <th className="px-3.5 py-2.5 text-center text-emerald-600">Surgeries Done</th>
              <th className="px-3.5 py-2.5 text-center text-rose-600">Lost</th>
              <th className="px-3.5 py-2.5 text-center">Conv. Rate</th>
              <th className="px-3.5 py-2.5 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400 font-medium">
                  No doctor records found matching the selected timeframe.
                </td>
              </tr>
            ) : (
              filteredDoctors.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900">
                    Dr. {d.name}
                    <div className="text-[10px] font-mono font-normal text-slate-400">
                      Reg: {d.registrationNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">{d.specialization || 'Consultant'}</td>
                  <td className="px-3.5 py-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      d.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 text-center font-bold text-slate-700 font-mono">{d.totalConsultations}</td>
                  <td className="px-3.5 py-2.5 text-center font-bold text-indigo-600 font-mono">{d.totalPackagesDiscussed}</td>
                  <td className="px-3.5 py-2.5 text-center font-bold text-emerald-600 font-mono">{d.totalSurgeriesCompleted}</td>
                  <td className="px-3.5 py-2.5 text-center font-medium text-rose-500 font-mono">{d.totalSurgeriesLost}</td>
                  <td className="px-3.5 py-2.5 text-center font-bold text-blue-600 font-mono">{d.surgeryConversionRate}%</td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 font-mono">
                    ₹{d.totalRevenueGenerated.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
