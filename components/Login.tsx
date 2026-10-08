import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import { supabase } from "../services/supabaseClient";
import { HOSPITAL_LOGO_URL } from "../types";
import { 
  Mail, Lock, Loader2, ChevronRight, ShieldCheck, 
  Eye, EyeOff, AlertCircle
} from 'lucide-react';

export const Login: React.FC = () => {
  const { setCurrentUserRole, staffUsers } = useHospital();

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
    let foundStaff = staffUsers?.find((s) => {
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

    // Fallback: Query Supabase staff_users table directly if not yet in local state
    if (!foundStaff) {
      try {
        const { data: dbStaff } = await supabase
          .from('staff_users')
          .select('*')
          .or(`email.ilike.${inputLower},mobile.eq.${inputCleaned}`);
        if (dbStaff && dbStaff.length > 0) {
          const u = dbStaff[0];
          foundStaff = {
            id: u.id,
            name: u.name,
            email: u.email,
            mobile: u.mobile,
            role: u.role,
            password: u.password,
            hospital_id: u.hospital_id,
            hospitalName: u.hospital_name || u.hospitalName,
            accessStatus: u.access_status || 'Active',
            registeredAt: u.registered_at || new Date().toISOString()
          } as any;
        }
      } catch (err) {
        console.warn('Direct DB lookup fallback error:', err);
      }
    }

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
        if (foundStaff.hospital_id) {
          localStorage.setItem("hms_hospital_tenant_id", foundStaff.hospital_id);
        } else if (foundStaff.role === 'HOSPITAL' || foundStaff.role === 'ANALYTICS' || foundStaff.role === 'ANALYTICS_HUB') {
          localStorage.setItem("hms_hospital_tenant_id", foundStaff.id);
        }
        setIsLoading(false);
        return;
      } else {
        setError("Invalid password. Please check your credentials and try again.");
        setIsLoading(false);
        return;
      }
    }

    // 3. Fallback demo support if staff accounts not yet provisioned in DB
    if ((inputLower === "doctor@hms.com" || inputLower === "doctor") && (password === "Doctor@123" || password === "Welcome@123")) {
      setCurrentUserRole("DOCTOR");
      localStorage.setItem("hms_hospital_email", "test123@gmail.com");
      localStorage.setItem("hms_hospital_name", "Dr. Rupan Das");
      localStorage.setItem("hms_hospital_id", "jxje5p9d3");
      localStorage.setItem("hms_hospital_tenant_id", "vrdenfb7k");
      setIsLoading(false);
      return;
    }

    if ((inputLower === "frontoffice@hms.com" || inputLower === "frontoffice" || inputLower === "frontoffice@gmail.com") && (password === "Front@123" || password === "frontoffice@gmail.com" || password === "Welcome@123")) {
      setCurrentUserRole("FRONT_OFFICE");
      localStorage.setItem("hms_hospital_email", "frontoffice@gmail.com");
      localStorage.setItem("hms_hospital_name", "Front Office Reception");
      localStorage.setItem("hms_hospital_id", "h73fp51wx");
      localStorage.setItem("hms_hospital_tenant_id", "vrdenfb7k");
      setIsLoading(false);
      return;
    }

    setError("This email or mobile number is not recognized as an authorized staff account.");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-center py-10 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden font-sans selection:bg-hospital-500 selection:text-white">
      {/* Background Decorative Ambient Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-hospital-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden="true" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 mb-6">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-inner mb-3">
          <img 
            src={HOSPITAL_LOGO_URL} 
            alt="Patient Scheduling Software" 
            className="h-12 sm:h-14 w-auto object-contain filter drop-shadow-md"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Patient Scheduling Software
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400 font-medium">
          Staff Sign In &amp; Clinical Operations Portal
        </p>
      </div>

      {/* Single Centered Login Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Staff Sign In</h2>
              <p className="text-xs text-slate-400 mt-0.5">Enter your authorized credentials to continue</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-hospital-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Email / Mobile Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Staff Email or Mobile Number
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-hospital-400 transition-colors pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. master@hms.com or mobile"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-hospital-500/40 focus:border-hospital-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Password
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-hospital-400 transition-colors pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-hospital-500/40 focus:border-hospital-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-hospital-600 hover:bg-hospital-500 active:bg-hospital-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-hospital-600/30 hover:shadow-hospital-600/50 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider disabled:opacity-50 cursor-pointer min-h-[44px]"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Role-Based Secure Access &amp; Session Isolation</span>
          </div>
        </div>
      </div>

      {/* Outside Footer */}
      <div className="mt-8 text-center text-slate-500 text-[11px] font-medium relative z-10">
        © {new Date().getFullYear()} Patient Scheduling Software · Acquire OPD Systems
      </div>
    </div>
  );
};
