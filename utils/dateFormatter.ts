export const formatDateToDDMMMYYYY = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Handles 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm...' without timezone conversion shift
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const year = Number(ymdMatch[1]);
      const monthNum = Number(ymdMatch[2]);
      const dayNum = Number(ymdMatch[3]);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = monthNames[monthNum - 1] || '—';
      const dayStr = String(dayNum).padStart(2, '0');
      return `${dayStr} ${monthStr} ${year}`;
    }

    // Handles 'DD/MM/YYYY' or 'DD-MM-YYYY'
    const dmyMatch = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
    if (dmyMatch) {
      const dayStr = dmyMatch[1];
      const monthNum = Number(dmyMatch[2]);
      const year = dmyMatch[3];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = monthNames[monthNum - 1] || '—';
      return `${dayStr} ${monthStr} ${year}`;
    }
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

export const formatDateTimeToDDMMMYYYY = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (match) {
      const year = Number(match[1]);
      const monthNum = Number(match[2]);
      const dayNum = Number(match[3]);
      const hours = match[4];
      const minutes = match[5];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthStr = monthNames[monthNum - 1] || '—';
      const dayStr = String(dayNum).padStart(2, '0');
      return `${dayStr} ${monthStr} ${year} ${hours}:${minutes}`;
    }
  }

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

export const getTodayLocalIso = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
