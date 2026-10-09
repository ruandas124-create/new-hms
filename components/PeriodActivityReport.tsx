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
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-hospital-600" />
              Period Activity & Daily Conversion Ledger
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Day-by-day arrivals, new vs revisits, surgical leads, and realized revenue
            </p>
          </div>
        </div>

        <div className="overflow-x-auto table-container w-full flex-1">
          <table className="w-full text-left min-w-[800px] border-collapse">
            <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-center">Arrivals</th>
                <th className="px-5 py-3.5 text-center text-teal-700">New</th>
                <th className="px-5 py-3.5 text-center text-orange-700">Revisit</th>
                <th className="px-5 py-3.5 text-center">S1 Leads</th>
                <th className="px-5 py-3.5 text-center text-emerald-700">Surgeries</th>
                <th className="px-5 py-3.5 text-right">Opp. Revenue</th>
                <th className="px-5 py-3.5 text-right">Actual Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {allDates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 font-bold">
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
                    <tr key={i} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-900 font-mono">{formatDate(date)}</td>
                      <td className="px-5 py-3.5 text-xs font-black text-slate-800 text-center font-mono tabular-nums">{dayArrivals}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-teal-700 text-center font-mono tabular-nums">{dayNew}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-orange-700 text-center font-mono tabular-nums">{dayRevisits}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-indigo-600 text-center font-mono tabular-nums">
                        {flowDay.filter(p => p.doctorAssessment?.quickCode === SurgeonCode.S1).length}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-black text-emerald-600 text-center font-mono tabular-nums">{completedDay.length}</td>
                      <td className="px-5 py-3.5 text-right text-xs font-bold text-slate-700 font-mono tabular-nums">
                        ₹{combinedOppRev.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs font-black text-emerald-700 font-mono tabular-nums">
                        ₹{actualRev.toLocaleString('en-IN')}
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
