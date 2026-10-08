import React, { useState, useMemo } from 'react';
import { useHospital } from '../context/HospitalContext';
import { StaffUser } from '../types';
import { 
  Building2, Activity, Plus, X, Search, Shield, Lock, Eye, EyeOff, User, 
  MapPin, CheckCircle2, XCircle, Briefcase, Users, Loader2, AlertCircle,
  Stethoscope, ShieldCheck, Check, AlertTriangle, Key, Calendar, Clock,
  ChevronRight, ArrowUpRight, Pencil
} from 'lucide-react';

type AccessFormType = 'Doctor' | 'Package' | 'FrontOffice' | null;

const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '---';
  }
};

export const GiveAccessView: React.FC = () => {
  const { 
    staffUsers, 
    registerStaff, 
    updateStaff, 
    currentTenantId, 
    currentUserStaff,
    refreshData,
    saveStatus
  } = useHospital();
  
  const [formType, setFormType] = useState<AccessFormType>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [viewingUser, setViewingUser] = useState<StaffUser | null>(null);
  const [showViewingPassword, setShowViewingPassword] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);

  // Edit State
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    specialization: 'General Surgeon'
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  
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
      const matchesTenant = u.hospital_id === tenantHospitalId ||
        (u.hospitalName && tenantHospitalName && u.hospitalName.toLowerCase().includes(tenantHospitalName.toLowerCase())) ||
        (tenantHospitalName && u.name && tenantHospitalName.toLowerCase().includes(u.name.toLowerCase()));
      const isDownstreamRole = u.role === 'DOCTOR' || u.role === 'FRONT_OFFICE' || u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM';
      return (matchesTenant && isDownstreamRole) || (u.grantedBy === 'Analytics Hub' && isDownstreamRole) || (matchesTenant && u.id !== tenantHospitalId);
    });
  }, [staffUsers, tenantHospitalId, tenantHospitalName]);

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
    const s = searchTerm.toLowerCase().trim();
    return hospitalUsers.filter(u => 
      u.name.toLowerCase().includes(s) ||
      (u.email && u.email.toLowerCase().includes(s)) ||
      (u.mobile && u.mobile.includes(s)) ||
      (u.role && u.role.toLowerCase().includes(s))
    );
  }, [hospitalUsers, searchTerm]);

  const handleOpenForm = (type: AccessFormType) => {
    setErrorMessage('');
    setShowModalPassword(false);
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
        email: formData.email.trim().toLowerCase(),
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
    if (togglingUserId) return;
    setTogglingUserId(user.id);
    const newStatus = user.accessStatus === 'Active' ? 'Revoked' : 'Active';
    try {
      await updateStaff(user.id, { accessStatus: newStatus });
      if (viewingUser && viewingUser.id === user.id) {
        setViewingUser({ ...viewingUser, accessStatus: newStatus });
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update access status. Please try again.');
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleStartEdit = (user: StaffUser) => {
    setEditError('');
    setShowEditPassword(false);
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      mobile: user.mobile && user.mobile !== 'N/A' ? user.mobile : '',
      email: user.email && user.email !== 'N/A' ? user.email : '',
      specialization: user.specialization || 'General Surgeon',
      password: user.password || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    if (!editFormData.name.trim()) {
      setEditError('Staff Name is required.');
      return;
    }

    setIsSavingEdit(true);
    setEditError('');

    try {
      const trimmedName = editFormData.name.trim();
      const payload: Partial<StaffUser> = {
        name: trimmedName,
        mobile: editFormData.mobile.trim() || 'N/A',
        email: editFormData.email.trim().toLowerCase() || 'N/A',
        specialization: editingUser.role === 'DOCTOR' ? (editFormData.specialization.trim() || 'General Surgeon') : editingUser.specialization,
      };

      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }

      await updateStaff(editingUser.id, payload);

      if (viewingUser && viewingUser.id === editingUser.id) {
        setViewingUser({
          ...viewingUser,
          ...payload
        });
      }

      setSuccessMessage(`Account for "${trimmedName}" updated successfully.`);
      setEditingUser(null);
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err) {
      console.error('Failed to update staff user:', err);
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Top Banner Alert / Success Notice */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="p-1 text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner Alert / Error Notice */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="p-1 text-rose-500 hover:text-rose-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Role Provision Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Doctors Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Multiple Allowed
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Doctor Dashboard</h3>
            <p className="text-xs text-slate-500 mt-1">Connect multiple consulting surgeons to your hospital patient directory.</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{activeDoctors.length}</span>
              <span className="text-xs font-bold text-slate-400">Active Doctors</span>
            </div>
          </div>
          <button
            onClick={() => handleOpenForm('Doctor')}
            className="mt-5 w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Doctor Access
          </button>
        </div>

        {/* Front Office Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
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
                {activeFrontOffice ? '1 / 1 Configured' : '0 / 1 Pending'}
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
            className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-2 ${
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
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
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
                {activePackage ? '1 / 1 Configured' : '0 / 1 Pending'}
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
            className={`mt-5 w-full py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-2 ${
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

      {/* 2. ACCESS DETAILS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Access Details</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time authorized users and operational dashboard accounts for {tenantHospitalName}</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, role, email..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-hospital-500 outline-none"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-5">User / Staff Name</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Mobile Number</th>
                <th className="py-3.5 px-5">Email</th>
                <th className="py-3.5 px-5">Access Type</th>
                <th className="py-3.5 px-5">Access Status</th>
                <th className="py-3.5 px-5">Access Given Date</th>
                <th className="py-3.5 px-5">Last Active</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <Shield className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700">No access records found</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Click the "GIVE ACCESS" button above to grant credentials to your Doctors, Front Office desk, and Package team.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const accessType = user.role === 'DOCTOR' 
                    ? 'Doctor Dashboard' 
                    : user.role === 'FRONT_OFFICE' 
                    ? 'Front Office Dashboard' 
                    : 'Package Dashboard';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. User / Staff Name */}
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5 group">
                          <span className="font-extrabold text-slate-900">{user.name}</span>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(user)}
                            className="p-1 text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Name"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {user.specialization && (
                          <div className="text-[10px] font-medium text-slate-400">{user.specialization}</div>
                        )}
                      </td>

                      {/* 2. Role */}
                      <td className="py-3.5 px-5">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          user.role === 'DOCTOR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          user.role === 'PACKAGE' || user.role === 'PACKAGE_TEAM' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {user.role === 'DOCTOR' ? 'Doctor' : 
                           user.role === 'PACKAGE' || user.role === 'PACKAGE_TEAM' ? 'Package Team' : 'Front Office'}
                        </div>
                      </td>

                      {/* 3. Mobile Number */}
                      <td className="py-3.5 px-5 font-mono text-slate-700">
                        {user.mobile || 'N/A'}
                      </td>

                      {/* 4. Email */}
                      <td className="py-3.5 px-5 text-slate-600">
                        {user.email || 'N/A'}
                      </td>

                      {/* 5. Access Type */}
                      <td className="py-3.5 px-5 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          {user.role === 'DOCTOR' && <Stethoscope className="w-3.5 h-3.5 text-emerald-500" />}
                          {user.role === 'FRONT_OFFICE' && <User className="w-3.5 h-3.5 text-blue-500" />}
                          {(user.role === 'PACKAGE' || user.role === 'PACKAGE_TEAM') && <Briefcase className="w-3.5 h-3.5 text-purple-500" />}
                          <span>{accessType}</span>
                        </div>
                      </td>

                      {/* 6. Access Status */}
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          user.accessStatus === 'Active' 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                            : 'text-rose-700 bg-rose-50 border border-rose-200'
                        }`}>
                          {user.accessStatus === 'Active' ? 'Active' : 'Revoked'}
                        </span>
                      </td>

                      {/* 7. Access Given Date */}
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {formatDate(user.registeredAt)}
                      </td>

                      {/* 8. Last Active */}
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active Today</span>
                        </div>
                      </td>

                      {/* 9. Action */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(user)}
                            className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:text-hospital-700 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            title="Edit Name & Details"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setViewingUser(user);
                              setShowViewingPassword(false);
                            }}
                            className="text-xs font-extrabold text-hospital-700 bg-hospital-50 hover:bg-hospital-100 border border-hospital-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            View / Manage
                          </button>
                          <button
                            type="button"
                            disabled={togglingUserId === user.id}
                            onClick={() => handleToggleAccess(user)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 ${
                              user.accessStatus === 'Active' 
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {togglingUserId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {togglingUserId === user.id ? 'Updating...' : (user.accessStatus === 'Active' ? 'Revoke' : 'Restore')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: CREATE ACCESS DIALOG */}
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
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAccess} className="p-6 space-y-4">
              {/* Role switcher inside modal */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl mb-2">
                <button
                  type="button"
                  onClick={() => handleOpenForm('Doctor')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    formType === 'Doctor' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5" /> Doctor
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenForm('FrontOffice')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    formType === 'FrontOffice' ? 'bg-white text-blue-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> Front Office
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenForm('Package')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    formType === 'Package' ? 'bg-white text-purple-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" /> Package
                </button>
              </div>

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
                <div className="relative">
                  <input
                    required
                    type={showModalPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                    placeholder="Set account password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormType(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer ${
                    formType === 'Doctor' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    formType === 'FrontOffice' ? 'bg-blue-600 hover:bg-blue-700' :
                    'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Granting Access...' : 'Create & Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW / MANAGE USER DETAILS */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-hospital-50 text-hospital-700 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Access Account Details</h3>
                  <p className="text-[10px] text-slate-400">Credentials & Operational Role</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingUser(null)} 
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Staff Name</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-slate-900">{viewingUser.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingUser;
                        setViewingUser(null);
                        handleStartEdit(target);
                      }}
                      className="p-1 text-slate-400 hover:text-hospital-600 hover:bg-hospital-50 rounded transition-colors cursor-pointer"
                      title="Edit Name & Details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Assigned Role</span>
                  <span className="font-bold text-hospital-700">{viewingUser.role}</span>
                </div>
                {viewingUser.specialization && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Specialization</span>
                    <span className="font-medium text-slate-700">{viewingUser.specialization}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Email</span>
                  <span className="font-mono text-slate-700">{viewingUser.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Mobile</span>
                  <span className="font-mono text-slate-700">{viewingUser.mobile || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Password</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">
                      {showViewingPassword ? (viewingUser.password || '••••••••') : '••••••••'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setShowViewingPassword(prev => !prev)}
                      className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showViewingPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Access Status</span>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${
                    viewingUser.accessStatus === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {viewingUser.accessStatus || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = viewingUser;
                  setViewingUser(null);
                  handleStartEdit(target);
                }}
                className="px-3.5 py-2 text-xs font-extrabold bg-hospital-50 text-hospital-700 hover:bg-hospital-100 border border-hospital-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Name</span>
              </button>
              <button
                type="button"
                disabled={togglingUserId === viewingUser.id}
                onClick={() => handleToggleAccess(viewingUser)}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 ${
                  viewingUser.accessStatus === 'Active' 
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                {togglingUserId === viewingUser.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {togglingUserId === viewingUser.id ? 'Updating...' : (viewingUser.accessStatus === 'Active' ? 'Revoke Access' : 'Restore Access')}
              </button>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ACCESS USER DETAILS */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[94dvh] overflow-y-auto border border-slate-100">
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-hospital-100 text-hospital-700">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Edit {editingUser.role === 'DOCTOR' ? 'Doctor' : editingUser.role === 'FRONT_OFFICE' ? 'Front Office' : 'Package Team'} Account
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Update name and access details for {tenantHospitalName}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditingUser(null)} 
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {/* Full Name field with prominent edit indicator */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Doctor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                  placeholder={editingUser.role === 'DOCTOR' ? 'Dr. Full Name' : 'Staff Full Name'}
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Editing the name will update this staff member across the hospital directory, queue, and reports.
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                  placeholder="user@hospital.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={editFormData.mobile}
                  onChange={(e) => setEditFormData({...editFormData, mobile: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                  placeholder="10-digit mobile number"
                />
              </div>

              {editingUser.role === 'DOCTOR' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData({...editFormData, specialization: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                    placeholder="e.g. General Surgeon, Proctologist"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold font-mono focus:bg-white focus:ring-2 focus:ring-hospital-500 outline-none transition-all"
                    placeholder="Leave unchanged or enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 text-xs font-extrabold text-white bg-hospital-600 hover:bg-hospital-700 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isSavingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
