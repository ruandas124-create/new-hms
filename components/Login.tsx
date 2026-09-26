import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import { Role, HOSPITAL_LOGO_URL } from "../types";
import { 
  Building2, Mail, Lock, Loader2, Stethoscope, 
  Users, Briefcase, ChevronRight, ShieldCheck, 
  Sparkles, Fingerprint, Crown, Eye, EyeOff, Target, BarChart3
} from 'lucide-react';

export const Login: React.FC = () => {
  const { setCurrentUserRole, staffUsers, systemName } = useHospital();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const roleMap: Record<string, Role> = {
    'master@hms.com': 'MASTER',
    'office@hms.com': 'FRONT_OFFICE',
    'doctor@hms.com': 'DOCTOR',
    'team@hms.com': 'PACKAGE_TEAM',
    'report@hms.com': 'ANALYTICS',
    'sales@hms.com': 'SALES',
  };

  const demoPasswords: Record<string, string> = {
    'master@hms.com': 'Master@123',
    'office@hms.com': 'Hms1984@',
    'doctor@hms.com': 'Doctor@123',
    'team@hms.com': 'Team8131@',
    'report@hms.com': 'Report@123',
    'sales@hms.com': 'Sales@123'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const emailTrimmed = email.toLowerCase().trim();

    // 0. Support static Master login
    if (emailTrimmed === "master@hms.com" || emailTrimmed === "master") {
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

    // 1. Support static Admin login
    if (emailTrimmed === "admin@hms.com" || emailTrimmed === "admin") {
      if (password === "Admin@123") {
        setCurrentUserRole("ADMIN");
        localStorage.setItem("hms_hospital_email", "admin@hms.com");
        localStorage.setItem("hms_hospital_name", "Administrator");
        localStorage.setItem("hms_hospital_id", "static_admin");
        setIsLoading(false);
        return;
      } else {
        setError("Invalid password for Admin account.");
        setIsLoading(false);
        return;
      }
    }

    // 2. Check dynamic accounts from staffUsers list
    const foundStaff = staffUsers?.find(
      (s) => s.email?.toLowerCase().trim() === emailTrimmed
    );

    if (foundStaff) {
      if (foundStaff.role === "DEACTIVATED_DOCTOR") {
        setError("This doctor account has been deactivated by the Admin.");
        setIsLoading(false);
        return;
      }

      if (foundStaff.password === password) {
        setCurrentUserRole(foundStaff.role);
        localStorage.setItem("hms_hospital_email", foundStaff.email);
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

    // 3. Static role accounts
    const targetRole = roleMap[emailTrimmed];
    if (targetRole) {
      if (password === demoPasswords[emailTrimmed]) {
        setCurrentUserRole(targetRole);
        localStorage.setItem("hms_hospital_email", emailTrimmed);
        localStorage.setItem("hms_hospital_name", emailTrimmed.split("@")[0].toUpperCase());
        localStorage.setItem("hms_hospital_id", "static_" + targetRole.toLowerCase());
        setIsLoading(false);
        return;
      } else {
        setError("Invalid password for this account.");
        setIsLoading(false);
        return;
      }
    }

    setError("This email is not recognized as an authorized staff account.");
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 md:p-8 relative overflow-hidden text-slate-100">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-hospital-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Hospital Brand Header */}
      <div className="mb-6 sm:mb-8 text-center relative z-10 w-full max-w-md animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="bg-white/95 p-3 px-5 rounded-2xl shadow-xl border border-white/20 flex items-center justify-center">
            <img 
              src={HOSPITAL_LOGO_URL} 
              alt={systemName || "HMS"} 
              className="h-12 sm:h-14 w-auto object-contain max-w-[200px]"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }} 
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {systemName || "HMS Hospital Management"}
            </h1>
            <p className="text-hospital-400 font-bold text-[11px] uppercase tracking-widest mt-1">
              Clinical & Surgical Operations
            </p>
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
              Staff Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-hospital-600 transition-colors pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-hospital-500 focus:ring-2 focus:ring-hospital-500/20 focus:outline-none transition-all text-sm font-semibold text-slate-800 placeholder-slate-400"
                placeholder="staff@hms.com"
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

      {/* Quick Demo Access Credentials Card */}
      <div className="mt-5 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 relative z-10 shadow-lg text-slate-200">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Quick Role Access
          </span>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Demo Accounts</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-left">
          {/* Master */}
          <button 
            type="button" 
            onClick={() => { setEmail("master@hms.com"); setPassword("Master@123"); }} 
            className="p-2.5 bg-slate-950/80 hover:bg-slate-950 rounded-xl border border-amber-500/30 hover:border-amber-400 transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-400" /> Master
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate">master@hms.com</div>
          </button>

          {/* Front Office */}
          <button 
            type="button" 
            onClick={() => { setEmail("office@hms.com"); setPassword("Hms1984@"); }} 
            className="p-2.5 bg-slate-950/80 hover:bg-slate-950 rounded-xl border border-slate-800 hover:border-hospital-500/50 transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-400" /> Front Office
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate">office@hms.com</div>
          </button>

          {/* Doctor */}
          <button 
            type="button" 
            onClick={() => { setEmail("doctor@hms.com"); setPassword("Doctor@123"); }} 
            className="p-2.5 bg-slate-950/80 hover:bg-slate-950 rounded-xl border border-slate-800 hover:border-hospital-500/50 transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Stethoscope className="w-3 h-3 text-emerald-400" /> Doctor
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate">doctor@hms.com</div>
          </button>

          {/* Package Team */}
          <button 
            type="button" 
            onClick={() => { setEmail("team@hms.com"); setPassword("Team8131@"); }} 
            className="p-2.5 bg-slate-950/80 hover:bg-slate-950 rounded-xl border border-slate-800 hover:border-hospital-500/50 transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-purple-400" /> Package
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate">team@hms.com</div>
          </button>

          {/* Analytics Hub */}
          <button 
            type="button" 
            onClick={() => { setEmail("report@hms.com"); setPassword("Report@123"); }} 
            className="p-2.5 bg-slate-950/80 hover:bg-slate-950 rounded-xl border border-slate-800 hover:border-hospital-500/50 transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <BarChart3 className="w-3 h-3 text-indigo-400" /> Analytics
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate">report@hms.com</div>
          </button>

          {/* Sales Leads */}
          <button 
            type="button" 
            onClick={() => { setEmail("sales@hms.com"); setPassword("Sales@123"); }} 
            className="p-2.5 bg-slate-950/80 hover:bg-slate-950 rounded-xl border border-slate-800 hover:border-rose-500/50 transition-all group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3 text-rose-400" /> Sales
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-200 truncate">sales@hms.com</div>
          </button>
        </div>
      </div>
      
      <div className="mt-5 text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-hospital-500" />
        Role-Based Secure Healthcare Session
      </div>
    </div>
  );
};