import React from 'react';
import { Download, Calendar, Activity } from 'lucide-react';
import { SurgeonCode, Patient } from '../types';

interface PeriodActivityReportProps {
  stats: {
    arrivedDataset: Patient[];
    completedDataset: Patient[];
  };
  formatDate: (dateString: string | undefined | null) => string;
  parseAmount: (amt: any) => number;
  onExportDaily: () => void;
}

export const PeriodActivityReport: React.FC<PeriodActivityReportProps> = ({
  stats,
  formatDate,
  parseAmount,
  onExportDaily
}) => {
  const allDates = Array.from(new Set([
    ...stats.arrivedDataset.map(p => (p.entry_date || p.registeredAt.split('T')[0]) as string),
    ...stats.completedDataset.map(p => (p.completed_surgery || p.packageProposal?.outcomeDate?.split('T')[0]) as string)
  ]))
    .filter(Boolean)
    .sort((a: string, b: string) => b.localeCompare(a))
    .slice(0, 15);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/40">
          <div>
            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Period Activity & Daily Conversion Report
            </h4>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Day-by-day arrivals, new vs revisits, surgical leads, and realized revenue
            </p>
          </div>
          <button 
            onClick={onExportDaily} 
            className="w-full sm:w-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95" 
            title="Download Report as CSV"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto table-container w-full flex-1">
          <table className="w-full text-left min-w-[800px]">
            <thead className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b bg-slate-50/60">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Arrivals</th>
                <th className="px-6 py-4 text-teal-600">New</th>
                <th className="px-6 py-4 text-orange-600">Revisit</th>
                <th className="px-6 py-4">S1 Leads</th>
                <th className="px-6 py-4 text-emerald-600">Surgeries</th>
                <th className="px-6 py-4 text-right">Opp. Revenue</th>
                <th className="px-6 py-4 text-right">Actual Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {allDates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400 font-bold">
                    No activity recorded in this period.
                  </td>
                </tr>
              ) : (
                allDates.map((date: string, i: number) => {
                  const flowDay = stats.arrivedDataset.filter(p => (p.entry_date || p.registeredAt.split('T')[0]) === date);
                  const completedDay = stats.completedDataset.filter(p => (p.completed_surgery || p.packageProposal?.outcomeDate?.split('T')[0]) === date);
                  const actualRev = completedDay.reduce((sum, p) => sum + parseAmount(p.packageProposal?.packageAmount), 0);
                  const combinedOppRev = flowDay.reduce((sum, p) => sum + parseAmount(p.packageProposal?.packageAmount), 0);
                  
                  const dayNew = flowDay.filter(p => (p.visit_type || '').trim().toLowerCase() === 'new').length;
                  const dayRevisits = flowDay.filter(p => (p.visit_type || '').trim().toLowerCase() === 'revisit').length;
                  const dayArrivals = dayNew + dayRevisits;

                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 text-[11px] font-black text-slate-900">{formatDate(date)}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{dayArrivals}</td>
                      <td className="px-6 py-4 text-xs font-bold text-teal-600">{dayNew}</td>
                      <td className="px-6 py-4 text-xs font-bold text-orange-600">{dayRevisits}</td>
                      <td className="px-6 py-4 text-xs font-bold text-indigo-500">
                        {flowDay.filter(p => p.doctorAssessment?.quickCode === SurgeonCode.S1).length}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-emerald-600">{completedDay.length}</td>
                      <td className="px-6 py-4 text-right text-xs font-black text-slate-900">
                        ₹{combinedOppRev.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-black text-emerald-600">
                        ₹{actualRev.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
