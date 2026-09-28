import React, { useState } from 'react';
import { 
  Shield, Building2, Activity, User, Eye, EyeOff, 
  Search, CheckCircle2, XCircle, MoreVertical, Key,
  X, AlertTriangle, Loader2, ArrowRight, Target, Lock, Check,
  Stethoscope, Plus
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { StaffUser } from '../../types';

export const MasterAccessManagement = () => {
  const { 
    staffUsers, 
    registerStaff, 
    updateStaff,
    createDoctorOnlyAccount,
    schedulingPermissions,
    updateSchedulingPermission
  } = useHospital();
  
  const [formType, setFormType] = useState<'Hospital' | 'Doctor' | 'Sales' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'HOSPITAL' | 'DOCTOR' | 'SALES'>('ALL');

  const [formData, setFormData] = useState({
    name: '', mobile: '', email: '', address: '', 
    city: '', state: '', pincode: '', password: '', fullAddress: '',
    department: 'Sales & Patient Coordination'
  });
  
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Users in Access Management (Hospitals, Doctors, and Sales)
  const accessUsers = staffUsers.filter(u => u.role === 'HOSPITAL' || u.role === 'DOCTOR' || u.role === 'SALES' || u.role === 'ANALYTICS_HUB' || u.role === 'ANALYTICS');

  // Filtered accounts for display
  const filteredUsers = accessUsers.filter(u => {
    const matchesRole = roleFilter === 'ALL' || 
      (roleFilter === 'HOSPITAL' && (u.role === 'HOSPITAL' || u.role === 'ANALYTICS' || u.role === 'ANALYTICS_HUB')) ||
      (roleFilter === 'DOCTOR' && u.role === 'DOCTOR') ||
      (roleFilter === 'SALES' && u.role === 'SALES');
    
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      u.name.toLowerCase().includes(term) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.mobile && u.mobile.includes(term)) ||
      (u.city && u.city.toLowerCase().includes(term));
    return matchesRole && matchesSearch;
  });

  const hospCount = accessUsers.filter(u => u.role === 'HOSPITAL' || u.role === 'ANALYTICS' || u.role === 'ANALYTICS_HUB').length;
  const docCount = accessUsers.filter(u => u.role === 'DOCTOR').length;
  const salesCount = accessUsers.filter(u => u.role === 'SALES').length;

  const handleOpenForm = (type: 'Hospital' | 'Doctor' | 'Sales') => {
    setFormType(type);
    setShowModalPassword(false);
    setFormData({
      name: '', mobile: '', email: '', address: '', 
      city: '', state: '', pincode: '', password: '', fullAddress: '',
      department: 'Sales & Patient Coordination'
    });
  };

  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (formType === 'Doctor') {
        // DOCTOR ACCESS: Completely independent of Hospital selection
        if (createDoctorOnlyAccount) {
          await createDoctorOnlyAccount({
            name: formData.name.trim(),
            mobile: formData.mobile.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password || 'Doctor@123'
          });
        } else {
          const docId = `doc_${Math.random().toString(36).substring(2, 9)}`;
          await registerStaff({
            name: formData.name.trim(),
            role: 'DOCTOR',
            mobile: formData.mobile.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password || 'Doctor@123',
            accessStatus: 'Active',
            grantedBy: 'Master Admin',
            hospital_id: docId,
            hospitalName: `${formData.name.trim()} (Doctor Only)`
          });
        }
      } else if (formType === 'Hospital') {
        // HOSPITAL ACCESS: Creates Hospital Analytic Hub account
        const hospId = `hosp_${Math.random().toString(36).substring(2, 9)}`;
        await registerStaff({
          name: formData.name.trim(),
          role: 'HOSPITAL',
          mobile: formData.mobile.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password || 'Hospital@123',
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          address: formData.address.trim() || undefined,
          fullAddress: formData.fullAddress.trim() || undefined,
          pincode: formData.pincode.trim() || undefined,
          accessStatus: 'Active',
          grantedBy: 'Master Admin',
          hospital_id: hospId,
          hospitalName: formData.name.trim()
        });
      } else if (formType === 'Sales') {
        // SALES ACCESS: Direct sales account
        await registerStaff({
          name: formData.name.trim(),
          role: 'SALES',
          mobile: formData.mobile.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password || 'Sales@123',
          department: 'Sales',
          accessStatus: 'Active',
          grantedBy: 'Master Admin'
        });
      }
      
      setFormType(null);
      setFormData({
        name: '', mobile: '', email: '', address: '', 
        city: '', state: '', pincode: '', password: '', fullAddress: '',
        department: 'Sales & Patient Coordination'
      });
    } catch (err) {
      console.error('Failed to create account:', err);
      alert('Failed to grant access. Please review user details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAccess = async (user: StaffUser) => {
    await updateStaff(user.id, { 
      accessStatus: user.accessStatus === 'Active' ? 'Revoked' : 'Active' 
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-hospital-600 mb-0.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-hospital-600" /> Master Admin Governance
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Access Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">Control independent access credentials for Hospitals, Doctors, and Sales teams</p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          {/* Single Unified Access Button */}
          <button 
            id="grant-access-btn"
            onClick={() => handleOpenForm('Doctor')}
            className="w-full sm:w-auto justify-center bg-hospital-600 hover:bg-hospital-700 text-white px-5 py-2.5 rounded-xl font-extrabold shadow-md shadow-hospital-600/20 transition-all flex items-center gap-2 active:scale-95 text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Grant Access
          </button>
        </div>
      </div>

      {/* Modal Dialog for Access Granting */}
      {formType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`bg-white rounded-3xl w-full ${formType === 'Hospital' ? 'max-w-2xl' : 'max-w-lg'} max-h-[94dvh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  formType === 'Doctor' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                  formType === 'Hospital' ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' :
                  'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {formType === 'Doctor' && <Stethoscope className="w-5 h-5" />}
                  {formType === 'Hospital' && <Building2 className="w-5 h-5" />}
                  {formType === 'Sales' && <Target className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {formType === 'Doctor' ? 'Doctor Access' : formType === 'Hospital' ? 'Hospital Access' : 'Sales Access'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {formType === 'Doctor' && 'Provision direct Doctor login (Analytic Hub & Doctor Dashboard)'}
                    {formType === 'Hospital' && 'Create a standalone Hospital Analytic Hub account'}
                    {formType === 'Sales' && 'Create a Sales team login with scheduling access'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setFormType(null)} 
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body (Scrollable) */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <form id="access-form" onSubmit={handleCreateAccess} className="space-y-4">
                {/* Switcher tabs inside modal */}
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-2xl mb-4">
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
                    onClick={() => handleOpenForm('Hospital')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      formType === 'Hospital' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Hospital
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenForm('Sales')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      formType === 'Sales' ? 'bg-white text-rose-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" /> Sales
                  </button>
                </div>

                {/* DOCTOR ACCESS FORM: EXACTLY 4 FIELDS (Full Name, Mobile Number, Email, Password) - NO HOSPITAL FIELD */}
                {formType === 'Doctor' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Doctor Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Dr. Full Name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="10-digit mobile number"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="doctor@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          required
                          type={showModalPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                          placeholder="Set account password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowModalPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          aria-label={showModalPassword ? "Hide password" : "Show password"}
                        >
                          {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SALES ACCESS FORM: EXACTLY 4 FIELDS */}
                {formType === 'Sales' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Staff Full Name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="10-digit mobile number"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400"
                        placeholder="sales@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          required
                          type={showModalPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold font-mono text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400"
                          placeholder="Set account password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowModalPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          aria-label={showModalPassword ? "Hide password" : "Show password"}
                        >
                          {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* HOSPITAL ACCESS FORM */}
                {formType === 'Hospital' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Hospital Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Enter full hospital name"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="10-digit number"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="hospital@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="City"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="State"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Pincode</label>
                      <input
                        type="text"
                        value={formData.pincode}
                        onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Postal Code"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Password <span className="text-rose-500">*</span></label>
                      <div className="relative">
                        <input
                          required
                          type={showModalPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="Set account password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowModalPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Full Address</label>
                      <textarea
                        rows={2}
                        value={formData.fullAddress}
                        onChange={(e) => setFormData({...formData, fullAddress: e.target.value})}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        placeholder="Complete hospital address"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormType(null)}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="access-form"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 text-xs sm:text-sm font-extrabold text-white rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 ${
                    formType === 'Doctor' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    formType === 'Hospital' ? 'bg-indigo-600 hover:bg-indigo-700' :
                    'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formType === 'Doctor' ? 'Grant Doctor Access' : formType === 'Hospital' ? 'Grant Hospital Access' : 'Grant Sales Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-sm mr-2">Granted Access Accounts</h3>
            
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-200/70 p-1 rounded-2xl">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({accessUsers.length})
              </button>
              <button
                onClick={() => setRoleFilter('HOSPITAL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  roleFilter === 'HOSPITAL' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3" /> Hospitals ({hospCount})
              </button>
              <button
                onClick={() => setRoleFilter('DOCTOR')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  roleFilter === 'DOCTOR' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3 h-3" /> Doctors ({docCount})
              </button>
              <button
                onClick={() => setRoleFilter('SALES')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  roleFilter === 'SALES' ? 'bg-white text-rose-700 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
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
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-hospital-500 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto overflow-y-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-5">Type / Role</th>
                <th className="py-3.5 px-5">Name & Scope</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Location</th>
                <th className="py-3.5 px-5">Dashboard Access</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Password</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Shield className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="font-bold text-sm text-slate-700">No accounts found matching filter.</p>
                    <p className="text-xs text-slate-400 mt-1">Use the buttons above to grant Doctor, Hospital, or Sales access.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'HOSPITAL' || user.role === 'ANALYTICS' || user.role === 'ANALYTICS_HUB'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                          : user.role === 'DOCTOR'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {(user.role === 'HOSPITAL' || user.role === 'ANALYTICS' || user.role === 'ANALYTICS_HUB') && <Building2 className="w-3 h-3" />}
                        {user.role === 'DOCTOR' && <Stethoscope className="w-3 h-3" />}
                        {user.role === 'SALES' && <Target className="w-3 h-3" />}
                        {user.role === 'ANALYTICS_HUB' || user.role === 'ANALYTICS' ? 'HOSPITAL' : user.role}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{user.name}</div>
                      {user.role === 'DOCTOR' && (
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                          <Stethoscope className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>Independent Doctor Dashboard</span>
                        </div>
                      )}
                      {user.role === 'SALES' && (
                        <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                          <Target className="w-3 h-3 text-rose-500 shrink-0" />
                          <span>Sales Lead & Booking</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-mono text-slate-700 text-xs">{user.mobile}</div>
                      <div className="text-[11px] text-slate-400">{user.email}</div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-slate-600">
                      {user.city ? `${user.city}${user.state ? `, ${user.state}` : ''}` : '---'}
                    </td>
                    <td className="py-3.5 px-5">
                      {user.role === 'SALES' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          <Target className="w-3 h-3" /> Sales Bookings
                        </span>
                      ) : user.role === 'DOCTOR' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Doctor Dashboard
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                          <CheckCircle2 className="w-3 h-3" /> Analytic Hub
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        user.accessStatus === 'Active' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'
                      }`}>
                        {user.accessStatus === 'Active' ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        {showPasswordFor === user.id ? (
                          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            <span className="text-xs font-mono">{user.password || '••••••••'}</span>
                            <button onClick={() => setShowPasswordFor(null)} className="text-slate-400 hover:text-slate-700">
                              <EyeOff className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setShowPasswordFor(user.id)}
                            className="text-xs font-bold text-hospital-600 hover:text-hospital-800 flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleToggleAccess(user)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
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
