import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import { HOSPITAL_LOGO_URL } from "../types";
import { 
  Mail, Lock, Loader2, ChevronRight, ShieldCheck, 
  Fingerprint, Eye, EyeOff, Stethoscope, Building2, 
  Users, Activity, CheckCircle2, Shield, Sparkles,
  ArrowRight, KeyRound, UserCheck, HeartPulse
} from 'lucide-react';

interface QuickRolePreset {
  label: string;
  roleTitle: string;
  email: string;
  pass: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const Login: React.FC = () => {
  const { setCurrentUserRole, staffUsers } = useHospital();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Quick-fill presets for easy staff login and testing
  const rolePresets: QuickRolePreset[] = [
    {
      label: "Master Admin",
      roleTitle: "Global Governance",
      email: "master@hms.com",
      pass: "Master@123",
      icon: Shield,
      color: "from-amber-500/20 to-amber-600/10 border-amber-300/40 text-amber-700"
    },
    {
      label: "Hospital Admin",
      roleTitle: "Facility Manager",
      email: "admin@hms.com",
      pass: "Admin@123",
      icon: Building2,
      color: "from-indigo-500/20 to-indigo-600/10 border-indigo-300/40 text-indigo-700"
    },
    {
      label: "Doctor",
      roleTitle: "Clinical OPD",
      email: "doctor@hms.com",
      pass: "Doctor@123",
      icon: Stethoscope,
      color: "from-emerald-500/20 to-emerald-600/10 border-emerald-300/40 text-emerald-700"
    },
    {
      label: "Front Office",
      roleTitle: "Reception & Triage",
      email: "frontoffice@hms.com",
      pass: "Front@123",
      icon: Users,
      color: "from-sky-500/20 to-sky-600/10 border-sky-300/40 text-sky-700"
    }
  ];

  const handleApplyPreset = (preset: QuickRolePreset) => {
    setEmail(preset.email);
    setPassword(preset.pass);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const inputCleaned = email.trim();
    const inputLower = inputCleaned.toLowerCase();
    const inputDigits = inputCleaned.replace(/\D/g, '');

    // 0. Support system Master Administrator login
    if (inputLower === "master@hms.com" || inputLower === "master") {
      if (password === "Master@123") {
        setCurrentUserRole("MASTER");
        localStorage.setItem("hms_hospital_email", "master@hms.com");
        localStorage.setItem("hms_hospital_name", "Master Administrator");
        localStorage.setItem("hms_hospital_id", "staff_master_01");
        setIsLoading(false);
        return;
      } else {
        setError("Invalid password for Master Administrator account.");
        setIsLoading(false);
        return;
      }
    }

    // 1. Support system Administrator login
    if (inputLower === "admin@hms.com" || inputLower === "admin") {
      if (password === "Admin@123") {
        setCurrentUserRole("ADMIN");
        localStorage.setItem("hms_hospital_email", "admin@hms.com");
        localStorage.setItem("hms_hospital_name", "Administrator");
        localStorage.setItem("hms_hospital_id", "admin_root_01");
        setIsLoading(false);
        return;
      } else {
        setError("Invalid password for Admin account.");
        setIsLoading(false);
        return;
      }
    }

    // 2. Check dynamic accounts from staffUsers list by Email OR Mobile Number
    const foundStaff = staffUsers?.find((s) => {
      const sEmail = s.email?.toLowerCase().trim();
      const sMobile = (s.mobile || '').trim();
      const sMobileDigits = sMobile.replace(/\D/g, '');

      // Match Email
      if (sEmail && sEmail === inputLower) return true;

      // Match Mobile (exact string or digits comparison)
      if (sMobile && sMobile === inputCleaned) return true;
      if (inputDigits.length >= 7 && sMobileDigits) {
        if (sMobileDigits === inputDigits) return true;
        if (sMobileDigits.endsWith(inputDigits) || inputDigits.endsWith(sMobileDigits)) return true;
      }

      return false;
    });

    if (foundStaff) {
      if (foundStaff.role === "DEACTIVATED_DOCTOR") {
        setError("This doctor account has been deactivated by the Hospital Administrator.");
        setIsLoading(false);
        return;
      }

      if (foundStaff.password === password) {
        setCurrentUserRole(foundStaff.role);
        localStorage.setItem("hms_hospital_email", foundStaff.email || foundStaff.mobile);
        localStorage.setItem("hms_hospital_name", foundStaff.name);
        localStorage.setItem("hms_hospital_id", foundStaff.id);
        setIsLoading(false);
        return;
      } else {
        setError("Invalid password. Please check your credentials and try again.");
        setIsLoading(false);
        return;
      }
    }

    setError("This email or mobile number is not recognized as an authorized staff account.");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans selection:bg-hospital-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-hospital-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-slate-900/40 blur-[120px] rounded-full pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" 
        aria-hidden="true" 
      />

      {/* Main Unified Portal Container */}
      <div className="w-full max-w-5xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800/80 rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* LEFT COLUMN: Healthcare Brand & Clinical Intelligence Showcase */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative overflow-hidden">
          {/* Subtle Accent Highlights */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-hospital-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top: Logo & Platform Identity */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner flex items-center justify-center">
                <img 
                  src={HOSPITAL_LOGO_URL} 
                  alt="Acquire OPD Patient Scheduling" 
                  className="h-9 sm:h-11 w-auto object-contain filter drop-shadow-md"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }} 
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-hospital-400 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5" /> HMS Clinical Hub
                </div>
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Patient Scheduling System
                </h1>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                Enterprise Clinical Scheduling & Operational Governance
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                Seamless synchronization across Front Office triage, Doctor OPD assessments, surgical conversion tracking, and multi-facility performance analytics.
              </p>
            </div>
          </div>

          {/* Middle: Key Capabilities List */}
          <div className="my-6 space-y-3 relative z-10">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-xl bg-hospital-500/10 border border-hospital-500/20 text-hospital-400 flex items-center justify-center shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-200">Real-Time OPD Queue & Triage</div>
                <div className="text-slate-400 text-[11px] font-medium">Instant patient registration, doctor assignment & priority routing.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-200">Surgical Conversion Pipeline</div>
                <div className="text-slate-400 text-[11px] font-medium">Doctor clinical indication (S1) to transparent package closure.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40 backdrop-blur-xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-200">Role-Scoped Data Isolation</div>
                <div className="text-slate-400 text-[11px] font-medium">Master Admin, Doctor, Front Office, Package & Sales security.</div>
              </div>
            </div>
          </div>

          {/* Bottom: Trust Badges */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400 relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online · v2.4</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-hospital-400" />
              <span>256-Bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Modern White Authentication Panel */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 lg:p-12 flex flex-col justify-between text-slate-800 relative">
          
          <div className="space-y-6">
            {/* Header with Security Badge */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-hospital-50 border border-hospital-100 text-hospital-700 text-[10px] font-black uppercase tracking-wider mb-1.5">
                  <UserCheck className="w-3 h-3" /> Authorized Personnel Portal
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Staff Sign In
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                  Enter your hospital credentials to access your authorized department.
                </p>
              </div>

              <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-hospital-600 shrink-0 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Quick Demo Role Selector (Convenient one-click fill for testing) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1 uppercase tracking-wider text-[10px] text-slate-400">
                  <KeyRound className="w-3 h-3 text-hospital-600" /> Quick Account Demo
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Click to fill credentials</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {rolePresets.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = email.toLowerCase() === preset.email.toLowerCase();
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1 group ${
                        isSelected 
                          ? 'bg-hospital-50/80 border-hospital-400 ring-2 ring-hospital-500/20 shadow-xs' 
                          : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-hospital-600' : 'text-slate-500 group-hover:text-hospital-600'} transition-colors`} />
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-hospital-600" />}
                      </div>
                      <div>
                        <div className="text-[11px] font-black text-slate-900 leading-tight">
                          {preset.label}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium truncate">
                          {preset.roleTitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              
              {/* Email or Mobile Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Staff Email or Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-hospital-600 transition-colors pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-hospital-500 focus:ring-3 focus:ring-hospital-500/15 focus:outline-none transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                    placeholder="e.g. master@hms.com or mobile number"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Account Password <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-hospital-600 font-bold hover:underline cursor-pointer">
                    Forgot Password?
                  </span>
                </div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-hospital-600 transition-colors pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-hospital-500 focus:ring-3 focus:ring-hospital-500/15 focus:outline-none transition-all text-sm font-semibold text-slate-900 placeholder:text-slate-400 font-mono tracking-wider"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message Banner */}
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  <Fingerprint className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-2 bg-hospital-600 hover:bg-hospital-700 active:scale-[0.99] text-white font-black py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer min-h-[46px]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Authenticating Session...
                  </span>
                ) : (
                  <>
                    Sign In to HMS Portal <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Form Footer */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px] font-medium">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-hospital-500" />
              <span>Role-Based Access Governance</span>
            </div>
            <div className="text-slate-400 text-center sm:text-right">
              Need technical assistance? <span className="font-bold text-slate-600">Contact IT Support</span>
            </div>
          </div>

        </div>

      </div>

      {/* Floating Bottom Copyright */}
      <div className="absolute bottom-3 text-center text-slate-500 text-[11px] font-medium">
        &copy; {new Date().getFullYear()} Patient Scheduling Software · Acquire OPD Systems
      </div>
    </div>
  );
};