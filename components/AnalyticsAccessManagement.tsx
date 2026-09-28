import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { StaffUser } from '../types';
import { 
  Building2, Activity, Plus, X, Search, Shield, Lock, Eye, EyeOff, User, 
  MapPin, CheckCircle2, XCircle, Briefcase, Users, Loader2, AlertCircle,
  Stethoscope, ShieldCheck, Check, AlertTriangle
} from 'lucide-react';

type AccessFormType = 'Doctor' | 'Package' | 'FrontOffice' | null;

export const AnalyticsAccessManagement: React.FC = () => {
  const { staffUsers, registerStaff, updateStaff, currentTenantId, currentUserStaff } = useHospital();
  
  const [formType, setFormType] = useState<AccessFormType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    specialization: 'General Surgeon'
  });

  const tenantHospitalId = currentTenantId || currentUserStaff?.hospital_id || currentUserStaff?.id || 'hospital_root';
  const tenantHospitalName = currentUserStaff?.hospitalName || currentUserStaff?.name || 'Hospital';

  // Filter users who belong to this hospital's downstream accounts
  const hospitalUsers = useMemo(() => {
    return staffUsers.filter(u => {
      const matchesTenant = u.hospital_id === tenantHospitalId;
      const isDownstreamRole = u.role === 'DOCTOR' || u.role === 'FRONT_OFFICE' || u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM';
      return matchesTenant || (u.grantedBy === 'Analytics Hub' && isDownstreamRole);
    });
  }, [staffUsers, tenantHospitalId]);

  // Existing counts
  const activeDoctors = useMemo(() => {
    return hospitalUsers.filter(u => u.role === 'DOCTOR' && u.accessStatus !== 'Revoked');
  }, [hospitalUsers]);

  const activeFrontOffice = useMemo(() => {
    return hospitalUsers.find(u => u.role === 'FRONT_OFFICE' && u.accessStatus !== 'Revoked');
  }, [hospitalUsers]);

  const activePackage = useMemo(() => {
    return hospitalUsers.find(u => (u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM') && u.accessStatus !== 'Revoked');
  }, [hospitalUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return hospitalUsers;
    const s = searchTerm.toLowerCase();
    return hospitalUsers.filter(u => 
      u.name.toLowerCase().includes(s) ||
      (u.email && u.email.toLowerCase().includes(s)) ||
      (u.mobile && u.mobile.includes(s)) ||
      (u.role && u.role.toLowerCase().includes(s))
    );
  }, [hospitalUsers, searchTerm]);

  const handleOpenForm = (type: AccessFormType) => {
    setErrorMessage('');
    if (type === 'FrontOffice' && activeFrontOffice) {
      setErrorMessage(`Policy Limit Reached: Exactly 1 Front Office Dashboard is permitted per Hospital. "${activeFrontOffice.name}" is currently active.`);
      return;
    }
    if (type === 'Package' && activePackage) {
      setErrorMessage(`Policy Limit Reached: Exactly 1 Package Dashboard is permitted per Hospital. "${activePackage.name}" is currently active.`);
      return;
    }
    setFormType(type);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      password: '',
      specialization: 'General Surgeon'
    });
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formType) return;
    setErrorMessage('');

    // Strict validation
    if (formType === 'FrontOffice' && activeFrontOffice) {
      setErrorMessage('Policy Constraint: Only 1 Front Office Dashboard is permitted for this Hospital.');
      return;
    }
    if (formType === 'Package' && activePackage) {
      setErrorMessage('Policy Constraint: Only 1 Package Dashboard is permitted for this Hospital.');
      return;
    }

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
        name: formData.name.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim() || 'N/A',
        role: role,
        password: formData.password || (role === 'DOCTOR' ? 'Doctor@123' : role === 'PACKAGE' ? 'Package@123' : 'Office@123'),
        accessStatus: 'Active',
        grantedBy: 'Analytics Hub',
        hospital_id: tenantHospitalId,
        hospitalName: tenantHospitalName,
        department: dashboard,
        specialization: formType === 'Doctor' ? formData.specialization : undefined
      });
      setFormType(null);
      setFormData({
        name: '', mobile: '', email: '', password: '', specialization: 'General Surgeon'
      });
    } catch (err) {
      console.error('Failed to create account:', err);
      setErrorMessage('Failed to create account. Please check user details and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAccess = async (user: StaffUser) => {
    const newStatus = user.accessStatus === 'Active' ? 'Revoked' : 'Active';
    try {
      await updateStaff(user.id, { accessStatus: newStatus });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner Alert / Error Notice */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hospital Connected Dashboards Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Doctors Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Multiple Allowed
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Doctor Dashboards</h3>
            <p className="text-xs text-slate-500 mt-1">Connect multiple surgeons and consulting doctors to your hospital.</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{activeDoctors.length}</span>
              <span className="text-xs font-bold text-slate-400">Active Doctors</span>
            </div>
          </div>
          <button
            onClick={() => handleOpenForm('Doctor')}
            className="mt-5 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Doctor Access
          </button>
        </div>

        {/* Front Office Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                activeFrontOffice 
                  ? 'bg-blue-50 text-blue-700 border-blue-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {activeFrontOffice ? '1 / 1 Configured' : '0 / 1 Max'}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Front Office Dashboard</h3>
            <p className="text-xs text-slate-500 mt-1">Hospital reception and patient intake desk (Exactly 1 allowed).</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{activeFrontOffice ? 1 : 0}</span>
              <span className="text-xs font-bold text-slate-400">of 1 Maximum</span>
              {activeFrontOffice && (
                <span className="text-[10px] font-bold text-blue-600 truncate ml-2">({activeFrontOffice.name})</span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleOpenForm('FrontOffice')}
            disabled={!!activeFrontOffice}
            className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 ${
              activeFrontOffice 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 cursor-pointer'
            }`}
          >
            {activeFrontOffice ? (
              <>
                <Check className="w-4 h-4 text-blue-500" /> Front Office Configured
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Front Office Access
              </>
            )}
          </button>
        </div>

        {/* Package Dashboard Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                activePackage 
                  ? 'bg-purple-50 text-purple-700 border-purple-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-100'
              }`}>
                {activePackage ? '1 / 1 Configured' : '0 / 1 Max'}
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Package Dashboard</h3>
            <p className="text-xs text-slate-500 mt-1">Surgical package counseling and financial desk (Exactly 1 allowed).</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{activePackage ? 1 : 0}</span>
              <span className="text-xs font-bold text-slate-400">of 1 Maximum</span>
              {activePackage && (
                <span className="text-[10px] font-bold text-purple-600 truncate ml-2">({activePackage.name})</span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleOpenForm('Package')}
            disabled={!!activePackage}
            className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2 ${
              activePackage 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95 cursor-pointer'
            }`}
          >
            {activePackage ? (
              <>
                <Check className="w-4 h-4 text-purple-500" /> Package Dashboard Configured
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Package Access
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Dialog for Access Creation */}
      {formType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[94dvh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${
                  formType === 'Doctor' ? 'bg-emerald-100 text-emerald-700' :
                  formType === 'FrontOffice' ? 'bg-blue-100 text-blue-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Grant {formType === 'FrontOffice' ? 'Front Office' : formType} Access
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Provision login credentials for {tenantHospitalName}</p>
                </div>
              </div>
              <button 
                onClick={() => setFormType(null)} 
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccess} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                  placeholder={formType === 'Doctor' ? 'Dr. Full Name' : 'Staff Full Name'}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                  placeholder="user@hospital.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                  placeholder="10-digit mobile number"
                />
              </div>

              {formType === 'Doctor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                    placeholder="e.g. General Surgeon, Proctologist"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Login Password <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                  placeholder="Set account password"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormType(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 ${
                    formType === 'Doctor' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    formType === 'FrontOffice' ? 'bg-blue-600 hover:bg-blue-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create & Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connected Dashboards / Staff Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Granted Connected Dashboards</h3>
            <p className="text-[11px] text-slate-400">Authorized staff members and operational dashboard logins for {tenantHospitalName}</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, role, contact..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-hospital-500 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-5">Connected Dashboard</th>
                <th className="py-3.5 px-5">Staff Name</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Credentials</th>
                <th className="py-3.5 px-5">Access Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <Shield className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700">No connected dashboards granted yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Use the cards above to grant access to your Doctors, 1 Front Office Desk, and 1 Package Dashboard.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'DOCTOR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        user.role === 'PACKAGE' || user.role === 'PACKAGE_TEAM' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {user.role === 'DOCTOR' ? 'Doctor Dashboard' : 
                         user.role === 'PACKAGE' || user.role === 'PACKAGE_TEAM' ? 'Package Dashboard' : 'Front Office Dashboard'}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      <div>{user.name}</div>
                      {user.specialization && (
                        <div className="text-[10px] font-medium text-slate-400">{user.specialization}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-mono text-slate-700 text-xs">{user.mobile}</div>
                      <div className="text-[11px] text-slate-400">{user.email}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[11px] text-slate-600">
                      {user.password || '••••••••'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        user.accessStatus === 'Active' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'
                      }`}>
                        {user.accessStatus === 'Active' ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleToggleAccess(user)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                          user.accessStatus === 'Active' 
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {user.accessStatus === 'Active' ? 'Revoke Access' : 'Restore Access'}
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
