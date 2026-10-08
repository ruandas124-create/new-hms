import { StaffUser, DaySchedule } from '../types';

export interface DoctorDateScheduleResult {
  isConfigured: boolean;
  isAvailable: boolean;
  reason?: string;
  weekday: string;
  formattedDate: string;
  shiftStart?: string;
  shiftEnd?: string;
  breaks: { startTime: string; endTime: string }[];
  slots: string[];
}

export const formatSlotTimeDisplay = (time24?: string): string => {
  if (!time24) return '';
  const clean = time24.substring(0, 5);
  const [hStr, mStr] = clean.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minute = String(m).padStart(2, '0');
  return `${hour12}:${minute} ${ampm}`;
};

export const getDoctorScheduleForDate = (
  doctor: StaffUser | any,
  dateString: string | undefined | null
): DoctorDateScheduleResult => {
  if (!doctor || !doctor.id || !dateString) {
    return {
      isConfigured: false,
      isAvailable: false,
      reason: 'Select Doctor and Date first',
      weekday: '',
      formattedDate: '',
      breaks: [],
      slots: []
    };
  }

  if (doctor.role === 'DEACTIVATED_DOCTOR') {
    return {
      isConfigured: true,
      isAvailable: false,
      reason: 'Doctor account has been deactivated',
      weekday: '',
      formattedDate: dateString.split('T')[0],
      breaks: [],
      slots: []
    };
  }

  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return {
      isConfigured: false,
      isAvailable: false,
      reason: 'Invalid date format',
      weekday: '',
      formattedDate: cleanDate,
      breaks: [],
      slots: []
    };
  }

  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

  const availability = doctor.availability || {};

  // 1. Check custom blocked dates / leave
  if (availability.blockedDates && Array.isArray(availability.blockedDates)) {
    const isBlocked = availability.blockedDates.some((b: any) => {
      if (!b) return false;
      if (typeof b === 'string') return b === cleanDate;
      if (b.date) return b.date === cleanDate;
      const from = b.startDate || b.from;
      const to = b.endDate || b.to;
      if (from && to) return cleanDate >= from && cleanDate <= to;
      return false;
    });
    if (isBlocked) {
      return {
        isConfigured: true,
        isAvailable: false,
        reason: `Doctor is on leave on ${cleanDate}`,
        weekday,
        formattedDate: cleanDate,
        breaks: [],
        slots: []
      };
    }
  }

  // 2. Check unavailableDates array
  if (Array.isArray(availability.unavailableDates) && availability.unavailableDates.includes(cleanDate)) {
    return {
      isConfigured: true,
      isAvailable: false,
      reason: `Doctor is unavailable on ${cleanDate}`,
      weekday,
      formattedDate: cleanDate,
      breaks: [],
      slots: []
    };
  }

  let shiftStart = '09:00';
  let shiftEnd = '17:00';
  let breaksList: { startTime: string; endTime: string }[] = [];
  let isConfigured = false;

  // 3. Weekly Advanced Schedule (daySchedules takes absolute priority)
  if (Array.isArray(availability.daySchedules) && availability.daySchedules.length > 0) {
    isConfigured = true;
    const dayConfig = availability.daySchedules.find(
      (ds: any) => ds.day?.toLowerCase() === weekday.toLowerCase()
    );

    if (!dayConfig) {
      return {
        isConfigured: true,
        isAvailable: false,
        reason: `No schedule configured for ${weekday}s`,
        weekday,
        formattedDate: cleanDate,
        breaks: [],
        slots: []
      };
    }

    if (dayConfig.status !== 'Available') {
      const statusLabel = dayConfig.status || 'Unavailable';
      return {
        isConfigured: true,
        isAvailable: false,
        reason: `Doctor is marked ${statusLabel} on ${weekday}s`,
        weekday,
        formattedDate: cleanDate,
        breaks: [],
        slots: []
      };
    }

    shiftStart = dayConfig.startTime || availability.startTime || '09:00';
    shiftEnd = dayConfig.endTime || availability.endTime || '17:00';
    breaksList = Array.isArray(dayConfig.breaks) ? dayConfig.breaks : [];
  } else if (Array.isArray(availability.availableDays) && availability.availableDays.length > 0) {
    // Fallback to legacy availableDays list
    isConfigured = true;
    const isDayPresent = availability.availableDays.some(
      (d: string) => d.toLowerCase() === weekday.toLowerCase()
    );

    if (!isDayPresent) {
      return {
        isConfigured: true,
        isAvailable: false,
        reason: `Doctor does not consult on ${weekday}s`,
        weekday,
        formattedDate: cleanDate,
        breaks: [],
        slots: []
      };
    }

    shiftStart = availability.startTime || '09:00';
    shiftEnd = availability.endTime || '17:00';
    breaksList = [];
  } else {
    // If no schedule configured at all
    return {
      isConfigured: false,
      isAvailable: false,
      reason: 'No schedule configured for this doctor',
      weekday,
      formattedDate: cleanDate,
      breaks: [],
      slots: []
    };
  }

  // 4. Calculate time slots between shiftStart and shiftEnd
  const [sh, sm] = shiftStart.split(':').map(Number);
  const [eh, em] = shiftEnd.split(':').map(Number);
  const startMinutes = (isNaN(sh) ? 9 : sh) * 60 + (isNaN(sm) ? 0 : sm);
  const endMinutes = (isNaN(eh) ? 17 : eh) * 60 + (isNaN(em) ? 0 : em);

  if (startMinutes >= endMinutes) {
    return {
      isConfigured,
      isAvailable: false,
      reason: `Working hours invalid for ${weekday} (${shiftStart} to ${shiftEnd})`,
      weekday,
      formattedDate: cleanDate,
      shiftStart,
      shiftEnd,
      breaks: breaksList,
      slots: []
    };
  }

  const generatedSlots: string[] = [];
  for (let min = startMinutes; min < endMinutes; min += 30) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const isDuringBreak = breaksList.some((br: any) => {
      if (!br || !br.startTime || !br.endTime) return false;
      const [bsh, bsm] = br.startTime.split(':').map(Number);
      const [beh, bem] = br.endTime.split(':').map(Number);
      const bsMin = (isNaN(bsh) ? 0 : bsh) * 60 + (isNaN(bsm) ? 0 : bsm);
      const beMin = (isNaN(beh) ? 0 : beh) * 60 + (isNaN(bem) ? 0 : bem);
      return min >= bsMin && min < beMin;
    });

    if (!isDuringBreak) {
      generatedSlots.push(timeStr);
    }
  }

  return {
    isConfigured,
    isAvailable: generatedSlots.length > 0,
    reason: generatedSlots.length === 0 ? 'No open slots during consultation hours' : undefined,
    weekday,
    formattedDate: cleanDate,
    shiftStart,
    shiftEnd,
    breaks: breaksList,
    slots: generatedSlots
  };
};

export const isDoctorAvailableOnDate = (
  doctor: StaffUser | any,
  dateString: string | undefined | null
): boolean => {
  return getDoctorScheduleForDate(doctor, dateString).isAvailable;
};

export const getAvailableSlotsForDoctorAndDate = (
  doctor: StaffUser | any,
  dateString: string | undefined | null
): string[] => {
  return getDoctorScheduleForDate(doctor, dateString).slots;
};
