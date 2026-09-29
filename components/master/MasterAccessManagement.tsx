import React, { useState, useMemo } from 'react';
import { 
  Shield, Building2, Activity, User, Eye, EyeOff, 
  Search, CheckCircle2, XCircle, Key, X, AlertTriangle, 
  Loader2, ArrowRight, Target, Lock, Check, Stethoscope, 
  Plus, Briefcase, ChevronRight, Settings, AlertCircle
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { StaffUser } from '../../types';

export const MasterAccessManagement: React.FC = () => {
  const { 
    staffUsers, 
    registerStaff, 
    updateStaff,
  } = useHospital();
  
  // Hospital Creation Modal State
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  
  // Selected Hospital for "Configure Access" Modal
  const [configuringHospital, setConfiguringHospital] = useState<StaffUser | null>(null);
  
  // Form inside "Configure Access" Modal: 'Doctor' | 'FrontOffice' | 'Package' | null
  const [internalFormType, setInternalFormType] = useState<'Doctor' | 'FrontOffice' | 'Package' | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'HOSPITAL' | 'SALES'>('ALL');

  // Hospital form state
  const [hospitalFormData, setHospitalFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '', 
    city: '',
    state: '',
    pincode: '',
    password: '',
    fullAddress: '',
  });

  // Internal team form state (Doctor, Front Office, Package)
  const [teamFormData, setTeamFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    password: '',
    specialization: 'General Surgeon'
  });

  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [showTeamModalPassword, setShowTeamModalPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Main list accounts (Hospitals and Sales)
  const accessUsers = useMemo(() => {
    return staffUsers.filter(u => 
      u.role === 'HOSPITAL' || 
      u.role === 'ANALYTICS' || 
      u.role === 'ANALYTICS_HUB' || 
      u.role === 'SALES'
    );
  }, [staffUsers]);

  // Filtered accounts for display
  const filteredUsers = useMemo(() => {
    return accessUsers.filter(u => {
      const matchesRole = roleFilter === 'ALL' || 
        (roleFilter === 'HOSPITAL' && (u.role === 'HOSPITAL' || u.role === 'ANALYTICS' || u.role === 'ANALYTICS_HUB')) ||
        (roleFilter === 'SALES' && u.role === 'SALES');
      
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        u.name.toLowerCase().includes(term) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.mobile && u.mobile.includes(term)) ||
        (u.city && u.city.toLowerCase().includes(term));
      return matchesRole && matchesSearch;
    });
  }, [accessUsers, roleFilter, searchTerm]);

  const hospCount = accessUsers.filter(u => u.role === 'HOSPITAL' || u.role === 'ANALYTICS' || u.role === 'ANALYTICS_HUB').length;
  const salesCount = accessUsers.filter(u => u.role === 'SALES').length;

  // Helper to get downstream team for a specific hospital
  const getHospitalTeam = (hospitalId: string) => {
    return staffUsers.filter(u => 
      u.hospital_id === hospitalId && 
      (u.role === 'DOCTOR' || u.role === 'FRONT_OFFICE' || u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM')
    );
  };

  const handleOpenHospitalForm = () => {
    setIsHospitalModalOpen(true);
    setShowModalPassword(false);
    setHospitalFormData({
      name: '',
      mobile: '',
      email: '',
      address: '', 
      city: '',
      state: '',
      pincode: '',
      password: '',
      fullAddress: '',
    });
  };

  const handleCreateHospitalAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const hospId = `hosp_${Math.random().toString(36).substring(2, 9)}`;
      await registerStaff({
        name: hospitalFormData.name.trim(),
        role: 'HOSPITAL',
        mobile: hospitalFormData.mobile.trim(),
        email: hospitalFormData.email.trim().toLowerCase(),
        password: hospitalFormData.password || 'Hospital@123',
        city: hospitalFormData.city.trim() || undefined,
        state: hospitalFormData.state.trim() || undefined,
        address: hospitalFormData.address.trim() || undefined,
        fullAddress: hospitalFormData.fullAddress.trim() || undefined,
        pincode: hospitalFormData.pincode.trim() || undefined,
        accessStatus: 'Active',
        grantedBy: 'Master Admin',
        hospital_id: hospId,
        hospitalName: hospitalFormData.name.trim()
      });
      
      setIsHospitalModalOpen(false);
      setHospitalFormData({
        name: '', mobile: '', email: '', address: '', 
        city: '', state: '', pincode: '', password: '', fullAddress: '',
      });
    } catch (err) {
      console.error('Failed to create hospital account:', err);
      alert('Failed to grant hospital access. Please review details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Internal team creation for selected hospital
  const handleOpenInternalForm = (type: 'Doctor' | 'FrontOffice' | 'Package') => {
    if (!configuringHospital) return;
    setErrorMessage('');
    setShowTeamModalPassword(false);
    
    const hospId = configuringHospital.hospital_id || configuringHospital.id;
    const team = getHospitalTeam(hospId);
    
    const activeFrontOffice = team.find(u => u.role === 'FRONT_OFFICE' && u.accessStatus !== 'Revoked');
    const activePackage = team.find(u => (u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM') && u.accessStatus !== 'Revoked');

    if (type === 'FrontOffice' && activeFrontOffice) {
      setErrorMessage(`Policy Constraint: Exactly 1 Front Office Dashboard is permitted per Hospital. "${activeFrontOffice.name}" is already active.`);
      return;
    }

    if (type === 'Package' && activePackage) {
      setErrorMessage(`Policy Constraint: Exactly 1 Package Dashboard is permitted per Hospital. "${activePackage.name}" is already active.`);
      return;
    }

    setInternalFormType(type);
    setTeamFormData({
      name: '',
      mobile: '',
      email: '',
      password: '',
      specialization: 'General Surgeon'
    });
  };

  const handleCreateInternalAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringHospital || !internalFormType) return;
    setErrorMessage('');

    const hospId = configuringHospital.hospital_id || configuringHospital.id;
    const hospName = configuringHospital.hospitalName || configuringHospital.name;
    const team = getHospitalTeam(hospId);

    const activeFrontOffice = team.find(u => u.role === 'FRONT_OFFICE' && u.accessStatus !== 'Revoked');
    const activePackage = team.find(u => (u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM') && u.accessStatus !== 'Revoked');

    if (internalFormType === 'FrontOffice' && activeFrontOffice) {
      setErrorMessage('Policy Constraint: Only 1 Front Office Dashboard is permitted for this Hospital.');
      return;
    }
    if (internalFormType === 'Package' && activePackage) {
      setErrorMessage('Policy Constraint: Only 1 Package Dashboard is permitted for this Hospital.');
      return;
    }

    setIsSubmitting(true);
    let role: any = 'DOCTOR';
    let department = 'Doctor Dashboard';
    if (internalFormType === 'FrontOffice') {
      role = 'FRONT_OFFICE';
      department = 'Front Office Dashboard';
    } else if (internalFormType === 'Package') {
      role = 'PACKAGE';
      department = 'Package Dashboard';
    }

    try {
      await registerStaff({
        name: teamFormData.name.trim(),
        email: teamFormData.email.trim().toLowerCase(),
        mobile: teamFormData.mobile.trim() || 'N/A',
        role: role,
        password: teamFormData.password || (role === 'DOCTOR' ? 'Doctor@123' : role === 'PACKAGE' ? 'Package@123' : 'Office@123'),
        accessStatus: 'Active',
        grantedBy: 'Analytics Hub',
        hospital_id: hospId,
        hospitalName: hospName,
        department: department,
        specialization: internalFormType === 'Doctor' ? teamFormData.specialization : undefined
      });
      setInternalFormType(null);
      setTeamFormData({
        name: '', mobile: '', email: '', password: '', specialization: 'General Surgeon'
      });
    } catch (err) {
      console.error('Failed to create team account:', err);
      setErrorMessage('Failed to create account. Please check details.');
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
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
            Grant access to Hospitals (Analytic Hubs) and configure internal team structures (Multiple Doctors, One Front Office, One Package Dashboard)
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          {/* Master Admin ONLY gives access to Hospital */}
          <button 
            id="grant-hospital-access-btn"
            onClick={handleOpenHospitalForm}
            className="w-full sm:w-auto justify-center bg-hospital-600 hover:bg-hospital-700 text-white px-5 py-2.5 rounded-xl font-extrabold shadow-md shadow-hospital-600/20 transition-all flex items-center gap-2 active:scale-95 text-xs sm:text-sm cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            Give Access to Hospital
          </button>
        </div>
      </div>

      {/* 1. Modal Dialog for Granting HOSPITAL Access (Master Admin → Hospital) */}
      {isHospitalModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[94dvh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Give Access to Hospital
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Create a new Hospital Analytic Hub account with full team delegation capabilities
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsHospitalModalOpen(false)} 
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body (Scrollable) */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <form id="hospital-access-form" onSubmit={handleCreateHospitalAccess} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Hospital Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={hospitalFormData.name}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, name: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Enter full hospital name (e.g. Apex Multi-Specialty Hospital)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Mobile Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      value={hospitalFormData.mobile}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, mobile: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="10-digit primary mobile"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      value={hospitalFormData.email}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, email: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="hospital@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">City</label>
                    <input
                      type="text"
                      value={hospitalFormData.city}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, city: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="City"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">State</label>
                    <input
                      type="text"
                      value={hospitalFormData.state}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, state: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Pincode</label>
                    <input
                      type="text"
                      value={hospitalFormData.pincode}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, pincode: e.target.value})}
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
                        value={hospitalFormData.password}
                        onChange={(e) => setHospitalFormData({...hospitalFormData, password: e.target.value})}
                        className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Set account password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowModalPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        aria-label={showModalPassword ? "Hide password" : "Show password"}
                      >
                        {showModalPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Full Address</label>
                    <textarea
                      rows={2}
                      value={hospitalFormData.fullAddress}
                      onChange={(e) => setHospitalFormData({...hospitalFormData, fullAddress: e.target.value})}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Complete hospital address"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsHospitalModalOpen(false)}
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="hospital-access-form"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs sm:text-sm font-extrabold text-white rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Grant Hospital Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIGURE ACCESS MODAL (Master Admin → Hospital (Analytic Hub) → Configure Access) */}
      {configuringHospital && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 border border-indigo-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Configure Access: {configuringHospital.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Analytic Hub
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Manage internal team credentials: Multiple Doctors, One Front Office, One Package Dashboard
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setConfiguringHospital(null);
                  setInternalFormType(null);
                  setErrorMessage('');
                }} 
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
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

              {/* Structure Cards for this Hospital */}
              {(() => {
                const hospId = configuringHospital.hospital_id || configuringHospital.id;
                const team = getHospitalTeam(hospId);
                const activeDocs = team.filter(u => u.role === 'DOCTOR' && u.accessStatus !== 'Revoked');
                const activeFO = team.find(u => u.role === 'FRONT_OFFICE' && u.accessStatus !== 'Revoked');
                const activePkg = team.find(u => (u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM') && u.accessStatus !== 'Revoked');

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Multiple Doctors Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100/70 text-emerald-800">
                            Multiple Allowed
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">Doctor Dashboard</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Multiple consulting surgeons under this hospital</p>
                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-slate-900">{activeDocs.length}</span>
                          <span className="text-xs font-bold text-slate-400">Active Doctors</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenInternalForm('Doctor')}
                        className="mt-4 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Doctor
                      </button>
                    </div>

                    {/* One Front Office Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <User className="w-4 h-4" />
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            activeFO ? 'bg-blue-100/70 text-blue-800' : 'bg-amber-100/70 text-amber-800'
                          }`}>
                            {activeFO ? '1 / 1 Configured' : '0 / 1 Pending'}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">Front Office Dashboard</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Hospital intake desk (Exactly 1 allowed)</p>
                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-slate-900">{activeFO ? 1 : 0}</span>
                          <span className="text-xs font-bold text-slate-400">of 1 Maximum</span>
                          {activeFO && <span className="text-[10px] font-bold text-blue-600 truncate ml-1">({activeFO.name})</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenInternalForm('FrontOffice')}
                        disabled={!!activeFO}
                        className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                          activeFO 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        }`}
                      >
                        {activeFO ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {activeFO ? 'Configured' : 'Add Front Office'}
                      </button>
                    </div>

                    {/* One Package Dashboard Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            activePkg ? 'bg-purple-100/70 text-purple-800' : 'bg-amber-100/70 text-amber-800'
                          }`}>
                            {activePkg ? '1 / 1 Configured' : '0 / 1 Pending'}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900">Package Dashboard</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Surgical package desk (Exactly 1 allowed)</p>
                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-slate-900">{activePkg ? 1 : 0}</span>
                          <span className="text-xs font-bold text-slate-400">of 1 Maximum</span>
                          {activePkg && <span className="text-[10px] font-bold text-purple-600 truncate ml-1">({activePkg.name})</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenInternalForm('Package')}
                        disabled={!!activePkg}
                        className={`mt-4 w-full py-2 px-3 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                          activePkg 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer'
                        }`}
                      >
                        {activePkg ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {activePkg ? 'Configured' : 'Add Package'}
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Inline Form to Add Doctor / Front Office / Package for this Hospital */}
              {internalFormType && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        internalFormType === 'Doctor' ? 'bg-emerald-100 text-emerald-700' :
                        internalFormType === 'FrontOffice' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {internalFormType === 'Doctor' && <Stethoscope className="w-4 h-4" />}
                        {internalFormType === 'FrontOffice' && <User className="w-4 h-4" />}
                        {internalFormType === 'Package' && <Briefcase className="w-4 h-4" />}
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Create {internalFormType === 'Doctor' ? 'Doctor' : internalFormType === 'FrontOffice' ? 'Front Office' : 'Package'} Access for {configuringHospital.name}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInternalFormType(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateInternalAccess} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                          {internalFormType === 'Doctor' ? 'Doctor Full Name' : 'Staff Full Name'} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          type="text"
                          value={teamFormData.name}
                          onChange={(e) => setTeamFormData({...teamFormData, name: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder={internalFormType === 'Doctor' ? 'Dr. Full Name' : 'Staff Name'}
                        />
                      </div>

                      {internalFormType === 'Doctor' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                            Specialization <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            value={teamFormData.specialization}
                            onChange={(e) => setTeamFormData({...teamFormData, specialization: e.target.value})}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="e.g. General Surgeon, Orthopedic"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                          Mobile Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          type="tel"
                          value={teamFormData.mobile}
                          onChange={(e) => setTeamFormData({...teamFormData, mobile: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="10-digit mobile"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                          Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          required
                          type="email"
                          value={teamFormData.email}
                          onChange={(e) => setTeamFormData({...teamFormData, email: e.target.value})}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="user@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">
                          Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            required
                            type={showTeamModalPassword ? "text" : "password"}
                            value={teamFormData.password}
                            onChange={(e) => setTeamFormData({...teamFormData, password: e.target.value})}
                            className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Set password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTeamModalPassword(prev => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          >
                            {showTeamModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setInternalFormType(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          internalFormType === 'Doctor' ? 'bg-emerald-600 hover:bg-emerald-700' :
                          internalFormType === 'FrontOffice' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Grant {internalFormType === 'Doctor' ? 'Doctor' : internalFormType === 'FrontOffice' ? 'Front Office' : 'Package'} Access
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table of Accounts under this Hospital */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Internal Accounts for {configuringHospital.name}
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    {getHospitalTeam(configuringHospital.hospital_id || configuringHospital.id).length} configured
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/70 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Role</th>
                        <th className="py-2.5 px-4">Name</th>
                        <th className="py-2.5 px-4">Contact</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Password</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const team = getHospitalTeam(configuringHospital.hospital_id || configuringHospital.id);
                        if (team.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                No internal team accounts configured yet. Use the buttons above to add Doctors, Front Office, or Package access.
                              </td>
                            </tr>
                          );
                        }
                        return team.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                member.role === 'DOCTOR' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                member.role === 'FRONT_OFFICE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {member.role === 'DOCTOR' && <Stethoscope className="w-3 h-3" />}
                                {member.role === 'FRONT_OFFICE' && <User className="w-3 h-3" />}
                                {(member.role === 'PACKAGE' || member.role === 'PACKAGE_TEAM') && <Briefcase className="w-3 h-3" />}
                                {member.role === 'DOCTOR' ? 'Doctor' : member.role === 'FRONT_OFFICE' ? 'Front Office' : 'Package'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-900">
                              {member.name}
                              {member.specialization && (
                                <div className="text-[10px] text-slate-400 font-normal">{member.specialization}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-600">
                              <div>{member.mobile}</div>
                              <div className="text-[10px] text-slate-400">{member.email}</div>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                member.accessStatus === 'Active' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'
                              }`}>
                                {member.accessStatus === 'Active' ? 'Active' : 'Revoked'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-1.5">
                                {showPasswordFor === member.id ? (
                                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    <span className="font-mono text-xs">{member.password || '••••••••'}</span>
                                    <button onClick={() => setShowPasswordFor(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                                      <EyeOff className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setShowPasswordFor(member.id)}
                                    className="text-xs font-bold text-hospital-600 hover:text-hospital-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" /> View
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => handleToggleAccess(member)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                  member.accessStatus === 'Active' 
                                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {member.accessStatus === 'Active' ? 'Revoke' : 'Restore'}
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setConfiguringHospital(null);
                  setInternalFormType(null);
                  setErrorMessage('');
                }}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Granted Access Accounts Table */}
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
              placeholder="Search hospitals or location..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-hospital-500 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-x-auto overflow-y-auto table-container w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-5">Type / Role</th>
                <th className="py-3.5 px-5">Hospital Name</th>
                <th className="py-3.5 px-5">Internal Structure</th>
                <th className="py-3.5 px-5">Contact Details</th>
                <th className="py-3.5 px-5">Location</th>
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
                    <p className="text-xs text-slate-400 mt-1">Use the "Give Access to Hospital" button above to grant new hospital access.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isHosp = user.role === 'HOSPITAL' || user.role === 'ANALYTICS' || user.role === 'ANALYTICS_HUB';
                  const hospId = user.hospital_id || user.id;
                  const team = isHosp ? getHospitalTeam(hospId) : [];
                  const activeDocs = team.filter(u => u.role === 'DOCTOR' && u.accessStatus !== 'Revoked');
                  const activeFO = team.find(u => u.role === 'FRONT_OFFICE' && u.accessStatus !== 'Revoked');
                  const activePkg = team.find(u => (u.role === 'PACKAGE' || u.role === 'PACKAGE_TEAM') && u.accessStatus !== 'Revoked');

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          isHosp
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isHosp && <Building2 className="w-3 h-3" />}
                          {!isHosp && <Target className="w-3 h-3" />}
                          {isHosp ? 'HOSPITAL' : user.role}
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{user.name}</div>
                        {isHosp ? (
                          <div className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>Analytic Hub (Central Node)</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-0.5">
                            <Target className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>Sales Lead & Booking</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        {isHosp ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              <Stethoscope className="w-3 h-3" /> {activeDocs.length} {activeDocs.length === 1 ? 'Doctor' : 'Doctors'}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              activeFO ? 'text-blue-700 bg-blue-50 border-blue-100' : 'text-slate-400 bg-slate-50 border-slate-200'
                            }`}>
                              <User className="w-3 h-3" /> {activeFO ? 'Front Office (1/1)' : 'No FO'}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              activePkg ? 'text-purple-700 bg-purple-50 border-purple-100' : 'text-slate-400 bg-slate-50 border-slate-200'
                            }`}>
                              <Briefcase className="w-3 h-3" /> {activePkg ? 'Package (1/1)' : 'No Package'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Direct Sales Access</span>
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
                              <button onClick={() => setShowPasswordFor(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
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
                        <div className="flex items-center justify-end gap-2">
                          {isHosp && (
                            <button
                              onClick={() => setConfiguringHospital(user)}
                              className="text-xs font-extrabold px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Settings className="w-3.5 h-3.5" /> Configure Access
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleAccess(user)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                              user.accessStatus === 'Active' 
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {user.accessStatus === 'Active' ? 'Revoke' : 'Restore'}
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
    </div>
  );
};
