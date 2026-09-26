import React, { useState } from 'react';
import { 
  Shield, Building2, Activity, User, Eye, EyeOff, 
  Search, CheckCircle2, XCircle, MoreVertical, Key,
  X, AlertTriangle, Loader2, ArrowRight, Target, Lock, Check
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { StaffUser } from '../../types';

export const MasterAccessManagement = () => {
  const { 
    staffUsers, 
    registerStaff, 
    updateStaff,
    dashboardPermissions,
    updateDashboardPermission,
    schedulingPermissions,
    updateSchedulingPermission
  } = useHospital();
  
  const [formType, setFormType] = useState<'Hospital' | 'Doctor' | 'Sales' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'HOSPITAL' | 'DOCTOR' | 'SALES'>('ALL');

  const [formData, setFormData] = useState({
    name: '', mobile: '', email: '', address: '', 
    city: '', state: '', pincode: '', password: '', fullAddress: '',
    hospital_id: '', hospitalName: '', department: 'Sales & Patient Coordination'
  });
  
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Users in Access Management (Hospitals, Doctors, and Sales)
  const accessUsers = staffUsers.filter(u => u.role === 'HOSPITAL' || u.role === 'DOCTOR' || u.role === 'SALES');

  // Granted active hospitals for linking doctors
  const grantedHospitals = accessUsers.filter(u => u.role === 'HOSPITAL' && u.accessStatus !== 'Revoked');

  // Filtered accounts for display
  const filteredUsers = accessUsers.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.mobile.includes(term) ||
      (u.city && u.city.toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  });

  const hospCount = accessUsers.filter(u => u.role === 'HOSPITAL').length;
  const docCount = accessUsers.filter(u => u.role === 'DOCTOR').length;
  const salesCount = accessUsers.filter(u => u.role === 'SALES').length;

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    let roleToAssign: 'HOSPITAL' | 'DOCTOR' | 'SALES' = 'HOSPITAL';
    if (formType === 'Doctor') roleToAssign = 'DOCTOR';
    if (formType === 'Sales') roleToAssign = 'SALES';

    await registerStaff({
      name: formData.name,
      role: roleToAssign,
      mobile: formData.mobile,
      email: formData.email,
      password: formData.password,
      city: formData.city,
      state: formData.state,
      address: formData.address,
      fullAddress: formData.fullAddress,
      pincode: formData.pincode,
      department: formType === 'Sales' ? (formData.department || 'Sales & Patient Scheduling') : undefined,
      accessStatus: 'Active',
      grantedBy: 'Master Admin',
      hospital_id: formType === 'Doctor' ? (formData.hospital_id || undefined) : undefined,
      hospitalName: formType === 'Doctor' ? (formData.hospitalName || undefined) : undefined,
    });
    
    setFormType(null);
    setFormData({
      name: '', mobile: '', email: '', address: '', 
      city: '', state: '', pincode: '', password: '', fullAddress: '',
      hospital_id: '', hospitalName: '', department: 'Sales & Patient Coordination'
    });
    setIsSubmitting(false);
  };

  const handleToggleAccess = async (user: StaffUser) => {
    await updateStaff(user.id, { 
      accessStatus: user.accessStatus === 'Active' ? 'Revoked' : 'Active' 
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">Access Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Control CRM access and permissions for hospitals, doctors, and sales teams</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Sales Access Button requested by user */}
          <button 
            id="sales-access-btn"
            onClick={() => setFormType('Sales')}
            className="w-full sm:w-auto justify-center bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Target className="w-4 h-4" />
            Sales Access
          </button>

          <button 
            id="crm-access-btn"
            onClick={() => setFormType('Hospital')}
            className="w-full sm:w-auto justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Shield className="w-4 h-4" />
            Access to CRM
          </button>
        </div>
      </div>



      {formType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[94dvh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            {/* Header (Sticky) */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                {formType === 'Sales' ? (
                  <>
                    <Target className="w-5 h-5 text-rose-600 shrink-0" />
                    Grant Sales Access
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 text-indigo-600 shrink-0" />
                    Grant Access to CRM
                  </>
                )}
              </h3>
              <button onClick={() => setFormType(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body (Scrollable) */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <form id="access-form" onSubmit={handleCreateAccess} className="space-y-6">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormType('Hospital')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      formType === 'Hospital' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Hospital
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('Doctor')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      formType === 'Doctor' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Activity className="w-4 h-4" /> Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('Sales')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      formType === 'Sales' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Target className="w-4 h-4" /> Sales Access
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                      {formType === 'Hospital' ? 'Hospital Name' : formType === 'Doctor' ? 'Doctor Name' : 'Sales Representative / Executive Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Enter ${formType === 'Sales' ? 'sales executive' : formType.toLowerCase()} name`}
                    />
                  </div>

                  {formType === 'Doctor' && (
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                        Associated Hospital (Granted Access)
                      </label>
                      <select
                        value={formData.hospital_id}
                        onChange={(e) => {
                          const selectedHosp = grantedHospitals.find(h => h.id === e.target.value);
                          setFormData({
                            ...formData,
                            hospital_id: e.target.value,
                            hospitalName: selectedHosp ? selectedHosp.name : ''
                          });
                        }}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="">Unaffiliated / Select Hospital...</option>
                        {grantedHospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.name} {h.city ? `(${h.city})` : ''}</option>
                        ))}
                      </select>
                      {grantedHospitals.length === 0 && (
                        <p className="text-[10px] text-amber-600 mt-1 font-medium">Tip: Grant access to a Hospital first to link doctors directly.</p>
                      )}
                    </div>
                  )}

                  {formType === 'Sales' && (
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                        Sales Designation & Role Scope
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500"
                        placeholder="e.g. Patient Counselor / Surgical Conversion Lead"
                      />
                    </div>
                  )}
                  
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

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Short Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                      placeholder="Locality / Area"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Pincode</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
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

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Full Address</label>
                    <textarea
                      rows={2}
                      value={formData.fullAddress}
                      onChange={(e) => setFormData({...formData, fullAddress: e.target.value})}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Complete detailed address"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer (Sticky) */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormType(null)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="access-form"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 ${
                    formType === 'Sales' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formType === 'Sales' ? 'Grant Sales Access' : 'Create Account & Grant Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-800 mr-2">Granted Access Accounts</h3>
            
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({accessUsers.length})
              </button>
              <button
                onClick={() => setRoleFilter('HOSPITAL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  roleFilter === 'HOSPITAL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3" /> Hospitals ({hospCount})
              </button>
              <button
                onClick={() => setRoleFilter('DOCTOR')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  roleFilter === 'DOCTOR' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3 h-3" /> Doctors ({docCount})
              </button>
              <button
                onClick={() => setRoleFilter('SALES')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  roleFilter === 'SALES' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Target className="w-3 h-3" /> Sales ({salesCount})
              </button>
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search accounts or location..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto overflow-y-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Type / Role</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Name & Designation</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Contact</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Location</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Operational Scope</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Status</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider">Password</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-500 tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Shield className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-bold">No accounts found matching filter.</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Sales Access" or "Access to CRM" to grant new user access.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'HOSPITAL' 
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                          : user.role === 'DOCTOR'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {user.role === 'HOSPITAL' && <Building2 className="w-3 h-3" />}
                        {user.role === 'DOCTOR' && <Activity className="w-3 h-3" />}
                        {user.role === 'SALES' && <Target className="w-3 h-3" />}
                        {user.role}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-sm">{user.name}</div>
                      {user.role === 'DOCTOR' && user.hospitalName && (
                        <div className="text-[11px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{user.hospitalName}</span>
                        </div>
                      )}
                      {user.role === 'SALES' && user.department && (
                        <div className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                          <Target className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>{user.department}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs text-slate-900 font-medium">{user.mobile}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {user.city ? `${user.city}${user.state ? `, ${user.state}` : ''}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      {user.role === 'SALES' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <Target className="w-3 h-3" /> Leads Directory
                          </span>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {schedulingPermissions.sales ? 'Can Schedule Appts' : 'Scheduling Disabled'}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Analytics Hub
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        user.accessStatus === 'Active' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                      }`}>
                        {user.accessStatus === 'Active' ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {showPasswordFor === user.id ? (
                          <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded">
                            <span className="text-xs font-mono">{user.password || '••••••••'}</span>
                            <button onClick={() => setShowPasswordFor(null)} className="text-slate-500 hover:text-slate-700">
                              <EyeOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowPasswordFor(user.id)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        )}
                      </div>
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
