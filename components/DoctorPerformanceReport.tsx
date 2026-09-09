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
}

export const DoctorPerformanceReport: React.FC<DoctorPerformanceReportProps> = ({
  doctorPerformanceStats,
  selectedDocId,
  onSelectDocId,
  timeframe,
  onSelectTimeframe,
  onExportCsv,
  onPrint
}) => {
  const { filteredDoctors, totals } = doctorPerformanceStats;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-100">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-indigo-600" />
            Doctor Clinical & Conversion Performance
          </h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
            Consultations, surgical indications (S1), completed surgeries, and financial realization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Doctor Dropdown */}
          <select
            value={selectedDocId}
            onChange={(e) => onSelectDocId(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-hospital-500 shadow-sm"
          >
            <option value="all">All Doctors ({filteredDoctors.length})</option>
            {filteredDoctors.map((doc: any) => (
              <option key={doc.id} value={doc.id}>
                Dr. {doc.name} ({doc.specialization || 'Consultant'})
              </option>
            ))}
          </select>

          {/* Timeframe Filter */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onSelectTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  timeframe === tf
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Export & Print */}
          <button
            onClick={onExportCsv}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Download CSV report"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={onPrint}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Print performance directive"
          >
            <Printer className="w-4 h-4" /> Print Directive
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="text-[10px] font-black uppercase text-slate-400">Consultations</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totals.totalConsultations}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">OPD visits in period</div>
        </div>
        <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
          <div className="text-[10px] font-black uppercase text-indigo-600">S1 Packages</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{totals.totalPackagesDiscussed}</div>
          <div className="text-[10px] text-indigo-500 mt-0.5">Surgery proposed</div>
        </div>
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
          <div className="text-[10px] font-black uppercase text-emerald-600">Surgeries Done</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{totals.totalSurgeriesCompleted}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Operated</div>
        </div>
        <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100">
          <div className="text-[10px] font-black uppercase text-rose-600">Surgeries Lost</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{totals.totalSurgeriesLost}</div>
          <div className="text-[10px] text-rose-500 mt-0.5">Dropped / deferred</div>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
          <div className="text-[10px] font-black uppercase text-blue-600">Conversion Rate</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{totals.overallConversionRate}%</div>
          <div className="text-[10px] text-blue-500 mt-0.5">Surg / Consultation</div>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
          <div className="text-[10px] font-black uppercase text-amber-700">Total Revenue</div>
          <div className="text-2xl font-black text-amber-800 mt-1">₹{totals.totalRevenueGenerated.toLocaleString()}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Realized package value</div>
        </div>
      </div>

      {/* Doctor Performance Table */}
      <div className="overflow-x-auto table-container w-full rounded-2xl border border-slate-100">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-5 py-3.5">Doctor</th>
              <th className="px-5 py-3.5">Specialization</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-center">Consultations</th>
              <th className="px-5 py-3.5 text-center">S1 Packages</th>
              <th className="px-5 py-3.5 text-center text-emerald-600">Surgeries Done</th>
              <th className="px-5 py-3.5 text-center text-rose-600">Lost</th>
              <th className="px-5 py-3.5 text-center">Conv. Rate</th>
              <th className="px-5 py-3.5 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredDoctors.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-400 font-bold">
                  No doctor records found matching the selected timeframe.
                </td>
              </tr>
            ) : (
              filteredDoctors.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4 font-black text-slate-900">
                    Dr. {d.name}
                    <div className="text-[10px] font-mono font-medium text-slate-400">
                      Reg: {d.registrationNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-bold">{d.specialization || 'Consultant'}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      d.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center font-black text-slate-700">{d.totalConsultations}</td>
                  <td className="px-5 py-4 text-center font-bold text-indigo-600">{d.totalPackagesDiscussed}</td>
                  <td className="px-5 py-4 text-center font-black text-emerald-600">{d.totalSurgeriesCompleted}</td>
                  <td className="px-5 py-4 text-center font-bold text-rose-500">{d.totalSurgeriesLost}</td>
                  <td className="px-5 py-4 text-center font-black text-blue-600">{d.surgeryConversionRate}%</td>
                  <td className="px-5 py-4 text-right font-black text-slate-900">
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
