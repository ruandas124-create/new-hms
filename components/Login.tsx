import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import { HOSPITAL_LOGO_URL } from "../types";
import { 
  Mail, Lock, Loader2, ChevronRight, ShieldCheck, 
  Fingerprint, Eye, EyeOff
} from 'lucide-react';

export const Login: React.FC = () => {
  const { setCurrentUserRole, staffUsers, systemName } = useHospital();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
        setError("Invalid password for Master account.");
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
        setError("This doctor account has been deactivated by the Admin.");
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
        setError("Invalid password.");
        setIsLoading(false);
        return;
      }
    }

    setError("This email or mobile number is not recognized as an authorized staff account.");
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden text-slate-100">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-hospital-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 sm:mb-8 text-center relative z-10 w-full max-w-md animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center">
            <img 
              src={HOSPITAL_LOGO_URL} 
              alt="Patient Scheduling Software" 
              className="h-16 sm:h-20 w-auto object-contain max-w-[260px] sm:max-w-[300px]"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }} 
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Patient Scheduling Software
            </h1>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 text-slate-800 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Staff Sign In</h2>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Enter authorized credentials to continue</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-hospital-50 border border-hospital-100 flex items-center justify-center text-hospital-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
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
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-hospital-500 focus:ring-2 focus:ring-hospital-500/20 focus:outline-none transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                placeholder="Enter email or mobile number"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Account Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-hospital-600 transition-colors pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-hospital-500 focus:ring-2 focus:ring-hospital-500/20 focus:outline-none transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-2 animate-in fade-in duration-200">
              <Fingerprint className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-2 bg-hospital-600 hover:bg-hospital-700 active:scale-[0.98] text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
              </span>
            ) : (
              <>Sign In to HMS <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>

      <div className="mt-5 text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-hospital-500" />
        Role-Based Secure Healthcare Session
      </div>
    </div>
  );
};