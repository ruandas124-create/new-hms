import React, { useState } from "react";
import { useHospital } from "../context/HospitalContext";
import { StaffUser } from "../types";
import {
  Shield,
  Settings,
  Users,
  UserPlus,
  Edit2,
  Lock,
  Power,
  PowerOff,
  UserCheck,
  UserX,
  Smartphone,
  Mail,
  Building,
  CheckCircle,
  AlertCircle,
  Plus,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  Calendar,
  Trash2,
  Clock,
  Upload,
  User,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

export const AdminDashboard: React.FC = () => {
  const {
    staffUsers,
    registerStaff,
    updateStaff,
    systemName,
    updateSystemName,
    saveStatus
  } = useHospital();

  const [activeTab, setActiveTab ] = useState<"doctors" | "settings" | "availability" | "analytics">("doctors");

  // System settings state
  const [tempSystemName, setTempSystemName] = useState(systemName);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Doctor Management form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  // Form input fields
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docMobile, setDocMobile] = useState("");
  const [docPassword, setDocPassword] = useState("");
  const [docRegNumber, setDocRegNumber] = useState("");
  const [docSpec, setDocSpec] = useState("");
  const [docPhotoUrl, setDocPhotoUrl] = useState("");
  const [docUsername, setDocUsername] = useState("");
  const [docDept, setDocDept] = useState("");
  const [docStatus, setDocStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Get only Doctor level roles ('DOCTOR' and 'DEACTIVATED_DOCTOR')
  const doctors = staffUsers.filter(
    (u) => u.role === "DOCTOR" || u.role === "DEACTIVATED_DOCTOR"
  );

  // Admin Schedule Overrides state
  const [selectedAdminDoctorId, setSelectedAdminDoctorId] = useState<string>("");
  const [adminAvailableDays, setAdminAvailableDays] = useState<string[]>([]);
  const [adminStartTime, setAdminStartTime] = useState<string>("09:00");
  const [adminEndTime, setAdminEndTime] = useState<string>("17:00");
  const [adminUnavailableDates, setAdminUnavailableDates] = useState<string[]>([]);
  const [adminNewLeaveDate, setAdminNewLeaveDate] = useState<string>("");

  const DEFAULT_DAY_SCHEDULES: any[] = [
    { day: "Monday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Tuesday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Wednesday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Thursday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Friday", status: "Available", startTime: "09:00", endTime: "17:00", breaks: [{ startTime: "13:00", endTime: "14:00" }] },
    { day: "Saturday", status: "Available", startTime: "09:00", endTime: "12:00", breaks: [] },
    { day: "Sunday", status: "Holiday", startTime: "09:00", endTime: "17:00", breaks: [] },
  ];

  const [adminDaySchedules, setAdminDaySchedules] = useState<any[]>(DEFAULT_DAY_SCHEDULES);
  const [adminBlockedDates, setAdminBlockedDates] = useState<any[]>([]);
  const [adminBlockedDateInput, setAdminBlockedDateInput] = useState("");
  const [adminBlockedReasonInput, setAdminBlockedReasonInput] = useState("Vacation");

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  React.useEffect(() => {
    if (selectedAdminDoctorId) {
      const doc = staffUsers.find(u => u.id === selectedAdminDoctorId);
      if (doc) {
        const av = doc.availability || {
          availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          startTime: "09:00",
          endTime: "17:00",
          unavailableDates: []
        };
        setAdminAvailableDays(av.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
        setAdminStartTime(av.startTime || "09:00");
        setAdminEndTime(av.endTime || "17:00");
        setAdminUnavailableDates(av.unavailableDates || []);
        setAdminDaySchedules(av.daySchedules || DEFAULT_DAY_SCHEDULES);
        setAdminBlockedDates(av.blockedDates || []);
      }
    } else {
      setAdminAvailableDays([]);
      setAdminStartTime("09:00");
      setAdminEndTime("17:00");
      setAdminUnavailableDates([]);
      setAdminDaySchedules(DEFAULT_DAY_SCHEDULES);
      setAdminBlockedDates([]);
    }
  }, [selectedAdminDoctorId, staffUsers]);

  const updateAdminDayScheduleField = (dayName: string, field: string, value: any) => {
    setAdminDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        return { ...ds, [field]: value };
      }
      return ds;
    }));
  };

  const addAdminBreakToDay = (dayName: string) => {
    setAdminDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        const currentBreaks = ds.breaks || [];
        return {
          ...ds,
          breaks: [...currentBreaks, { startTime: "13:00", endTime: "14:00" }]
        };
      }
      return ds;
    }));
  };

  const updateAdminBreakTime = (dayName: string, breakIdx: number, field: "startTime" | "endTime", val: string) => {
    setAdminDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        const currentBreaks = [...(ds.breaks || [])];
        if (currentBreaks[breakIdx]) {
          currentBreaks[breakIdx] = { ...currentBreaks[breakIdx], [field]: val };
        }
        return { ...ds, breaks: currentBreaks };
      }
      return ds;
    }));
  };

  const removeAdminBreakFromDay = (dayName: string, breakIdx: number) => {
    setAdminDaySchedules(prev => prev.map(ds => {
      if (ds.day === dayName) {
        const currentBreaks = (ds.breaks || []).filter((_: any, idx: number) => idx !== breakIdx);
        return { ...ds, breaks: currentBreaks };
      }
      return ds;
    }));
  };

  const addAdminBlockedDateItem = () => {
    if (!adminBlockedDateInput) return;
    const dateExists = adminBlockedDates.some(b => b.date === adminBlockedDateInput);
    if (dateExists) {
      alert("This date is already blocked.");
      return;
    }
    const newItem = {
      date: adminBlockedDateInput,
      category: adminBlockedReasonInput as any,
      reason: adminBlockedReasonInput
    };
    const updated = [...adminBlockedDates, newItem].sort((a, b) => a.date.localeCompare(b.date));
    setAdminBlockedDates(updated);
    if (!adminUnavailableDates.includes(adminBlockedDateInput)) {
      setAdminUnavailableDates([...adminUnavailableDates, adminBlockedDateInput].sort());
    }
    setAdminBlockedDateInput("");
  };

  const removeAdminBlockedDateItem = (dateStr: string) => {
    setAdminBlockedDates(prev => prev.filter(b => b.date !== dateStr));
    setAdminUnavailableDates(prev => prev.filter(d => d !== dateStr));
  };

  const activeDocCount = doctors.filter((u) => u.role === "DOCTOR").length;
  const inactiveDocCount = doctors.filter(
    (u) => u.role === "DEACTIVATED_DOCTOR"
  ).length;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSystemName.trim()) {
      return;
    }
    updateSystemName(tempSystemName.trim().toUpperCase());
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingDoctorId(null);
    setDocName("");
    setDocEmail("");
    setDocMobile("");
    setDocPassword("");
    setDocRegNumber("");
    setDocSpec("");
    setDocPhotoUrl("");
    setDocUsername("");
    setDocDept("");
    setDocStatus("ACTIVE");
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const openEditModal = (doctor: StaffUser) => {
    setModalMode("edit");
    setEditingDoctorId(doctor.id);
    setDocName(doctor.name);
    setDocEmail(doctor.email);
    setDocMobile(doctor.mobile);
    setDocPassword(doctor.password || "");
    setDocRegNumber(doctor.registrationNumber || "");
    setDocSpec(doctor.specialization || "");
    setDocPhotoUrl(doctor.photoUrl || "");
    setDocUsername(doctor.username || "");
    setDocDept(doctor.department || "");
    setDocStatus(doctor.role === "DOCTOR" ? "ACTIVE" : "INACTIVE");
    setFormError("");
    setFormSuccess("");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!docName.trim() || !docEmail.trim() || !docPassword.trim()) {
      setFormError("Name, Email/Username, and Password are required.");
      return;
    }

    try {
      if (modalMode === "create") {
        // Check if username/email already exists
        const exists = staffUsers.some(
          (u) => u.email.toLowerCase().trim() === docEmail.toLowerCase().trim()
        );
        if (exists) {
          setFormError("A staff account with this email/username already exists.");
          return;
        }

        await registerStaff({
          name: docName.trim(),
          email: docEmail.trim(),
          mobile: docMobile.trim() || "N/A",
          role: docStatus === "ACTIVE" ? "DOCTOR" : "DEACTIVATED_DOCTOR",
          password: docPassword,
          registrationNumber: docRegNumber.trim(),
          specialization: docSpec.trim(),
          username: docUsername.trim() || docEmail.trim(),
          department: docDept.trim(),
          photoUrl: docPhotoUrl,
        });

        setFormSuccess("Doctor account successfully registered!");
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      } else if (modalMode === "edit" && editingDoctorId) {
        // Editing profile
        await updateStaff(editingDoctorId, {
          name: docName.trim(),
          email: docEmail.trim(),
          mobile: docMobile.trim() || "N/A",
          password: docPassword,
          role: docStatus === "ACTIVE" ? "DOCTOR" : "DEACTIVATED_DOCTOR",
          registrationNumber: docRegNumber.trim(),
          specialization: docSpec.trim(),
          username: docUsername.trim() || docEmail.trim(),
          department: docDept.trim(),
          photoUrl: docPhotoUrl,
        });

        setFormSuccess("Doctor profile successfully updated!");
        setTimeout(() => {
          setIsModalOpen(false);
        }, 1500);
      }
    } catch (err) {
      setFormError("Failed to save changes. Please try again.");
    }
  };

  const toggleDoctorStatus = async (doctor: StaffUser) => {
    const newRole = doctor.role === "DOCTOR" ? "DEACTIVATED_DOCTOR" : "DOCTOR";
    try {
      await updateStaff(doctor.id, { role: newRole as any });
    } catch (err) {
      console.error("Status toggle failed:", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Statistics Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full"></div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase text-amber-600 tracking-widest">
              Administrative Command Center
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            System Administration
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Configure system configurations, manage medical personnel profiles, and track login active states.
          </p>
        </div>

        {/* Dynamic mini-stats */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 px-4 min-w-[120px]">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              System Branding
            </span>
            <span className="font-mono text-base font-black text-slate-700">
              {systemName}
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 px-4 min-w-[120px]">
            <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
              Active Doctors
            </span>
            <span className="font-mono text-lg font-black text-emerald-600">
              {activeDocCount}
            </span>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 px-4 min-w-[120px]">
            <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-widest">
              Deactivated
            </span>
            <span className="font-mono text-lg font-black text-rose-600">
              {inactiveDocCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Layout navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("doctors")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === "doctors"
              ? "border-hospital-500 text-hospital-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Users className="w-4 h-4" />
          Doctor Accounts Management
        </button>

        <button
          onClick={() => setActiveTab("availability")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === "availability"
              ? "border-hospital-500 text-hospital-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Doctor Schedules Control
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === "settings"
              ? "border-hospital-500 text-hospital-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <Settings className="w-4 h-4" />
          System Customization
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === "analytics"
              ? "border-hospital-500 text-hospital-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Performance Analytics
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === "analytics" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full animate-in duration-300"
          >
            <AnalyticsDashboard />
          </motion.div>
        )}
        {activeTab === "settings" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in duration-300"
          >
            {/* System config form card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-hospital-500" />
                <h2 className="text-xl font-bold text-slate-800">
                  Branding Configuration
                </h2>
              </div>
              <p className="text-slate-500 text-sm">
                Modify the primary tool/system identifier displayed on the login page, sidebar, page banners, and reports. This update takes effect immediately globally.
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                    System/Tool Name branding
                  </label>
                  <input
                    type="text"
                    required
                    value={tempSystemName}
                    onChange={(e) => setTempSystemName(e.target.value)}
                    placeholder="e.g. HMS, MEDILINK, CLINIC"
                    className="w-full border p-3 rounded-xl font-black text-slate-700 font-sans tracking-tight focus:outline-none focus:border-hospital-500 focus:ring-1 focus:ring-hospital-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-hospital-600 hover:bg-hospital-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    Save Brand Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempSystemName(systemName)}
                    className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-sm px-4 py-3 rounded-xl transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </form>

              {settingsSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl flex items-center gap-2 text-sm mt-4 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  System Brand successfully updated to{" "}
                  <strong className="font-mono">{systemName}</strong>!
                </div>
              )}
            </div>

            {/* Live mockup brand preview card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-400 mb-3">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Live Interface Preview
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight mb-1">
                  How it appears
                </h3>
                <p className="text-xs text-slate-400">
                  See how your dynamic branding renders on the system gateway.
                </p>

                {/* Simulated Login gateway branding box */}
                <div className="mt-8 p-6 bg-slate-950 border border-white/5 rounded-xl text-center space-y-3">
                  <div className="bg-slate-900 border border-white/10 p-3 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                    <Building className="w-6 h-6 text-hospital-400" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-white tracking-widest uppercase">
                      {tempSystemName || "HMS"}
                    </h4>
                    <p className="text-[8px] uppercase tracking-widest text-hospital-500 font-bold">
                      Hospital Management System
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-xl text-[10px] text-slate-400 flex gap-2 items-start mt-6">
                <Info className="w-4 h-4 text-slate-300 shrink-0" />
                <span>
                  Branding changes are written directly to local preferences, ensuring persistency dynamically across reboots.
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "doctors" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6"
          >
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Registered Doctors
                </h2>
                <p className="text-slate-500 text-xs">
                  Create fresh medical credentials, edit doctor metadata, or set active status.
                </p>
              </div>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-hospital-600 hover:bg-hospital-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Register New Doctor
              </button>
            </div>

            {/* Doctor Accounts List */}
            {doctors.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-xl">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h4 className="font-bold text-slate-700">No Doctors Configured</h4>
                <p className="text-slate-400 text-xs mt-1">
                  Configure dynamic Doctor logins using the registration portal button above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="py-3 px-4">Doctor user / Name</th>
                      <th className="py-3 px-4">Account credentials</th>
                      <th className="py-3 px-4">Mobile contact</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {doctors.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-sans">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-hospital-150 text-hospital-600 font-bold flex items-center justify-center overflow-hidden shrink-0 border border-slate-100">
                              {doctor.photoUrl ? (
                                <img src={doctor.photoUrl} alt={doctor.name} className="w-full h-full object-cover" />
                              ) : (
                                doctor.name.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-1.5 leading-tight">
                                {doctor.name}
                                {doctor.department && (
                                  <span className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-md">
                                    {doctor.department}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {doctor.specialization && (
                                  <span className="text-[10px] font-medium text-slate-500">
                                    {doctor.specialization}
                                  </span>
                                )}
                                {doctor.registrationNumber && (
                                  <span className="text-[9px] font-mono text-slate-400">
                                    Reg: {doctor.registrationNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs">
                          <div className="flex flex-col space-y-0.5">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Mail className="w-3 h-3 text-slate-400" />{" "}
                              {doctor.email}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Lock className="w-3 h-3" /> {doctor.password || "••••••••"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-500 font-sans">
                          {doctor.mobile ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Smartphone className="w-3 h-3 text-slate-400" />{" "}
                              {doctor.mobile}
                            </span>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {doctor.role === "DOCTOR" ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                              <UserCheck className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-100">
                              <UserX className="w-3 h-3" /> Deactivated
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle active/deact */}
                            <button
                              onClick={() => toggleDoctorStatus(doctor)}
                              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                                doctor.role === "DOCTOR"
                                  ? "border-rose-100 text-rose-600 hover:bg-rose-50"
                                  : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={
                                doctor.role === "DOCTOR"
                                  ? "Deactivate Account"
                                  : "Activate Account"
                              }
                            >
                              {doctor.role === "DOCTOR" ? (
                                <>
                                  <PowerOff className="w-3.5 h-3.5" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power className="w-3.5 h-3.5" />
                                  Activate
                                </>
                              )}
                            </button>

                            {/* Edit details */}
                            <button
                              onClick={() => openEditModal(doctor)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                              title="Edit Credentials"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Edit Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "availability" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 animate-in duration-300"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Doctor Schedules & Capacity Overrides
                </h2>
                <p className="text-slate-500 text-xs">
                  View all registered doctors' schedules, and override, alter, or adjust availability values directly with Administrative Privilege.
                </p>
              </div>

              <div className="w-full md:w-64">
                <label className="block text-[8px] uppercase font-black tracking-widest text-slate-400 mb-1.5 font-mono">
                  Select Target Doctor
                </label>
                <select
                  value={selectedAdminDoctorId}
                  onChange={(e) => setSelectedAdminDoctorId(e.target.value)}
                  className="w-full text-xs font-black uppercase tracking-wider p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-1 focus:ring-hospital-500"
                >
                  <option value="">-- Choose a Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.role === "DEACTIVATED_DOCTOR" ? "(Deactivated)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedAdminDoctorId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left doctor summary card */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest leading-none mb-6">Doctor Details</span>
                  {(() => {
                    const doc = staffUsers.find(u => u.id === selectedAdminDoctorId);
                    if (!doc) return null;
                    return (
                      <>
                        <div className="mb-4">
                          {doc.photoUrl ? (
                            <img 
                              src={doc.photoUrl} 
                              alt="Doctor Profile" 
                              className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-2xl bg-hospital-150 text-hospital-700 flex items-center justify-center border border-hospital-200 text-sm font-black uppercase">
                              {doc.name.substring(0, 2)}
                            </div>
                          )}
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-base mb-1">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-4">{doc.email}</p>
                        <div className="w-full text-left space-y-2 mt-4 text-[11px] font-medium bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <div className="flex justify-between border-b pb-2 border-slate-100">
                            <span className="text-slate-400">Mobile:</span>
                            <span className="text-slate-700 font-mono font-bold">{doc.mobile || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2 border-slate-100">
                            <span className="text-slate-400">Credential Status:</span>
                            <span className={`font-black uppercase tracking-wide text-[9px] px-2 py-0.5 rounded-full ${doc.role === "DOCTOR" ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                              {doc.role === "DOCTOR" ? "Active" : "Deactivated"}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Right overrides editor card */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex justify-between items-center bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 mb-4 sm:mb-6">
                    <div className="flex gap-2.5 items-center">
                      <Shield className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest font-mono">Admin Schedule Override Mode</h4>
                        <p className="text-[10px] text-amber-600 font-medium">As Admin, you have master controls to edit any schedules and issue leaves.</p>
                      </div>
                    </div>
                  </div>

                  {/* Weekday Picker */}
                  <div>
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest mb-3">Available Working Days (Admin Override)</span>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map(day => {
                        const isSelected = adminAvailableDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setAdminAvailableDays(adminAvailableDays.filter(d => d !== day));
                              } else {
                                setAdminAvailableDays([...adminAvailableDays, day]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isSelected 
                                ? 'bg-hospital-600 text-white border-hospital-600 shadow-sm' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Daily Schedule Override Editor */}
                  <div className="space-y-4">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Detail Schedules (Admin Override)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {adminDaySchedules.map((ds) => (
                        <div key={ds.day} className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">{ds.day}</span>
                            <select
                              value={ds.status}
                              onChange={(e) => updateAdminDayScheduleField(ds.day, "status", e.target.value)}
                              className="text-[11px] font-bold border border-slate-200 bg-white rounded-lg p-1 px-1.5 text-slate-600 outline-none focus:border-hospital-500"
                            >
                              <option value="Available">Available</option>
                              <option value="Unavailable">Unavailable</option>
                              <option value="Holiday">Holiday</option>
                              <option value="Leave">Leave</option>
                            </select>
                          </div>

                          {ds.status === "Available" ? (
                            <div className="space-y-3 pt-2 border-t border-slate-200/50">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Start Time</label>
                                  <input
                                    type="time"
                                    value={ds.startTime || "09:00"}
                                    onChange={(e) => updateAdminDayScheduleField(ds.day, "startTime", e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-1 rounded-md text-[11px] font-bold text-slate-700"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">End Time</label>
                                  <input
                                    type="time"
                                    value={ds.endTime || "17:00"}
                                    onChange={(e) => updateAdminDayScheduleField(ds.day, "endTime", e.target.value)}
                                    className="w-full bg-white border border-slate-200 p-1 rounded-md text-[11px] font-bold text-slate-700"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] uppercase font-bold text-slate-400">Breaks</span>
                                  <button
                                    type="button"
                                    onClick={() => addAdminBreakToDay(ds.day)}
                                    className="text-[9px] font-extrabold text-hospital-600 hover:text-hospital-800"
                                  >
                                    + Add Break
                                  </button>
                                </div>

                                <div className="space-y-1">
                                  {(ds.breaks || []).map((b: any, bIdx: number) => (
                                    <div key={bIdx} className="flex items-center gap-1 bg-white border border-slate-200 pl-1.5 pr-1 py-1 rounded-lg">
                                      <input
                                        type="time"
                                        value={b.startTime}
                                        onChange={(e) => updateAdminBreakTime(ds.day, bIdx, "startTime", e.target.value)}
                                        className="bg-transparent text-[10px] font-semibold text-slate-600 max-w-[55px] border-b border-dashed border-slate-150"
                                      />
                                      <span className="text-slate-400 text-[10px]">-</span>
                                      <input
                                        type="time"
                                        value={b.endTime}
                                        onChange={(e) => updateAdminBreakTime(ds.day, bIdx, "endTime", e.target.value)}
                                        className="bg-transparent text-[10px] font-semibold text-slate-600 max-w-[55px] border-b border-dashed border-slate-150"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeAdminBreakFromDay(ds.day, bIdx)}
                                        className="text-rose-500 hover:text-rose-700 ml-auto p-0.5"
                                      >
                                        <Trash2 className="w-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {(ds.breaks || []).length === 0 && (
                                    <p className="text-[10px] text-slate-404 italic">No scheduled breaks.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-100 text-slate-500 text-center py-4 rounded-lg text-xs font-mono font-bold">
                              {ds.status === "Holiday" ? "🎉 Public Holiday" : ds.status === "Leave" ? "📴 Leave Period" : "❌ Closed"}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-150"></div>

                  {/* Block dates overrides */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-widest">Block Vacation / Emergency / Holiday Dates (Admin)</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Select Date</label>
                        <input 
                          type="date" 
                          value={adminBlockedDateInput} 
                          onChange={e => setAdminBlockedDateInput(e.target.value)} 
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs font-bold font-mono outline-none text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase font-bold text-slate-400 mb-0.5">Block Category</label>
                        <select
                          value={adminBlockedReasonInput}
                          onChange={e => setAdminBlockedReasonInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-1.5 rounded-lg text-xs font-bold outline-none text-slate-700"
                        >
                          <option value="Vacation">Vacation Leave</option>
                          <option value="Emergency Leave">Emergency Leave</option>
                          <option value="Public Holiday">Public Holiday</option>
                        </select>
                      </div>
                      <div className="flex items-end font-sans">
                        <button 
                          type="button" 
                          onClick={addAdminBlockedDateItem}
                          className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          Block Date
                        </button>
                      </div>
                    </div>

                    {/* Blocked list chips */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {adminBlockedDates.map(b => (
                        <span 
                          key={b.date} 
                          className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-xs"
                        >
                          <span className="font-mono">{b.date}</span>
                          <span className="bg-rose-100 text-[8px] px-1.5 py-0.5 rounded font-black tracking-wide text-rose-800 uppercase shrink-0">
                            {b.category || "Blocked"}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => removeAdminBlockedDateItem(b.date)}
                            className="text-rose-400 hover:text-rose-900 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                      {adminBlockedDates.length === 0 && (
                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">No custom blocked dates added</p>
                      )}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={async () => {
                      try {
                        await updateStaff(selectedAdminDoctorId, {
                          availability: {
                            availableDays: adminAvailableDays,
                            startTime: adminStartTime,
                            endTime: adminEndTime,
                            unavailableDates: adminUnavailableDates,
                            daySchedules: adminDaySchedules,
                            blockedDates: adminBlockedDates
                          }
                        });
                        alert('Schedule overridden and saved successfully!');
                      } catch (err) {
                        alert('Failed to override doctor schedule.');
                      }
                    }}
                    className="w-full py-3 bg-hospital-600 hover:bg-hospital-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save Schedule Overrides
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-300 py-12 border border-dashed border-slate-100 bg-slate-50/50 rounded-2xl">
                <Calendar className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-400 mb-1">No doctor loaded</h3>
                <p className="text-xs text-slate-400 max-w-sm text-center">Please choose a target physician from the top dropdown selector to manage their shift calendars, scheduled leaves, and session overrides.</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Account Registration / Profile Editor modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-xl font-bold text-slate-800">
                  {modalMode === "create"
                    ? "Register New Doctor Account"
                    : "Edit Doctor Credentials"}
                </h3>
                <p className="text-slate-400 text-xs">
                  Create credentials and contact profiles for active hospital personnel.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {formError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {formSuccess}
                  </div>
                )}

                {/* Profile Picture Upload Thumbnail */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-hospital-100 border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
                    {docPhotoUrl ? (
                      <img src={docPhotoUrl} alt="Doctor avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-hospital-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1">
                      Doctor Profile Picture
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 shadow-sm transition-all flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-slate-400" />
                        Upload Photo
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert("Image is too large. Max size is 2MB.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setDocPhotoUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {docPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setDocPhotoUrl("")}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1 transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="e.g. Dr. John Watson"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Medical Registration No.
                    </label>
                    <input
                      type="text"
                      value={docRegNumber}
                      onChange={(e) => setDocRegNumber(e.target.value)}
                      placeholder="e.g. REG-12345"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Specialization / Spec
                    </label>
                    <input
                      type="text"
                      value={docSpec}
                      onChange={(e) => setDocSpec(e.target.value)}
                      placeholder="e.g. Laparoscopic Surgeon"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      value={docDept}
                      onChange={(e) => setDocDept(e.target.value)}
                      placeholder="e.g. Surgery"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={docEmail}
                      onChange={(e) => setDocEmail(e.target.value)}
                      placeholder="e.g. watson@hms.com"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Username (Login ID)
                    </label>
                    <input
                      type="text"
                      value={docUsername}
                      onChange={(e) => setDocUsername(e.target.value)}
                      placeholder="e.g. drwatson"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={docMobile}
                      onChange={(e) => setDocMobile(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={docPassword}
                      onChange={(e) => setDocPassword(e.target.value)}
                      placeholder="Enter login password"
                      className="w-full border p-2.5 rounded-xl text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-2">
                      Account Status
                    </label>
                    <select
                      value={docStatus}
                      onChange={(e) => setDocStatus(e.target.value as any)}
                      className="w-full border p-2.5 rounded-xl bg-white text-slate-700 tracking-tight text-sm focus:outline-none focus:border-hospital-500 font-bold"
                    >
                      <option value="ACTIVE">Active (Can log in & accept bookings)</option>
                      <option value="INACTIVE">Inactive (Deactivated)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 text-sm font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 hover:bg-hospital-700 bg-hospital-600 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                  >
                    {modalMode === "create" ? "Save Doctor" : "Update Profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
