import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { StaffUser } from '../types';
import { 
  Building2, Activity, Plus, X, Search, Shield, Lock, Eye, EyeOff, User, 
  MapPin, CheckCircle2, XCircle, Briefcase, Users, Loader2
} from 'lucide-react';

type AccessFormType = 'Doctor' | 'Package' | 'FrontOffice' | null;

export const AnalyticsAccessManagement: React.FC = () => {
  const { staffUsers, registerStaff, updateStaff, currentUserRole } = useHospital();
  
  const [formType, setFormType] = useState<AccessFormType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: ''
  });

  // Filter users who have access given by Analytics Hub
  const accessUsers = useMemo(() => {
    return staffUsers.filter(u => 
      u.grantedBy === 'Analytics Hub' &&
      (u.accessStatus === 'Active' || u.accessStatus === 'Revoked')
    );
  }, [staffUsers]);

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formType) return;
    setIsSubmitting(true);
    
    let role: any = 'DOCTOR';
    let dashboard = 'Doctor Dashboard';
    if (formType === 'Package') {
      role = 'PACKAGE';
      dashboard = 'Package Dashboard';
    } else if (formType === 'FrontOffice') {
      role = 'FRONT_OFFICE';
      dashboard = 'Front Office Dashboard';
    }

    try {
      await registerStaff({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        role: role,
        password: formData.password,
        accessStatus: 'Active',
        grantedBy: 'Analytics Hub',
        department: dashboard // Using department to store the dashboard name
      });
      setFormType(null);
      setFormData({
        name: '', mobile: '', email: '', password: ''
      });
    } catch (err) {
      console.error(err);
      alert('Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAccess = async (user: StaffUser) => {
    const newStatus = user.accessStatus === 'Active' ? 'Revoked' : 'Active';
    try {
      await updateStaff(user.id, { accessStatus: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Downstream Access Management</h2>
          <p className="text-sm text-slate-500">Manage dashboard access for Doctors, Package Team, and Front Office.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFormType('Doctor')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-semibold shadow-sm transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" /> Doctor Access
          </button>
          <button
            onClick={() => setFormType('Package')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl font-semibold shadow-sm transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" /> Package Access
          </button>
          <button
            onClick={() => setFormType('FrontOffice')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl font-semibold shadow-sm transition-colors text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" /> Front Office Access
          </button>
        </div>
      </div>

      {formType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[94dvh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Grant {formType === 'FrontOffice' ? 'Front Office' : formType} Access
              </h3>
              <button onClick={() => setFormType(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccess} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Name <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Full Name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Mobile Number <span className="text-red-500">*</span></label>
                <input
                  required
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="10-digit number"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Email Address <span className="text-red-500">*</span></label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Password <span className="text-red-500">*</span></label>
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Secure password"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormType(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Account & Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-bold text-slate-800">Granted Access List</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search accounts..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Access Given To</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Name</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Contact</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Dashboard</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Given By</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Status</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accessUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm">No downstream access has been granted yet.</p>
                  </td>
                </tr>
              ) : (
                accessUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'DOCTOR' ? 'bg-emerald-50 text-emerald-700' :
                        user.role === 'PACKAGE' ? 'bg-purple-50 text-purple-700' :
                        'bg-blue-50 text-blue-700'
                      }`}>
                        {user.role === 'DOCTOR' ? 'Doctor / Surgeon' : 
                         user.role === 'PACKAGE' ? 'Package Team' : 'Front Office'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-900 font-medium">{user.mobile}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-700">
                      {user.department || 'Dashboard'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {user.grantedBy}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        user.accessStatus === 'Active' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                      }`}>
                        {user.accessStatus === 'Active' ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleAccess(user)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                          user.accessStatus === 'Active' 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {user.accessStatus === 'Active' ? 'Revoke' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
