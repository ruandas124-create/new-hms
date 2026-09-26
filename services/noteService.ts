import { supabase } from './supabaseClient';
import { LeadNote } from '../types';

const STORAGE_PREFIX = 'hms_lead_notes_';

export const formatNoteTimestamp = (isoString?: string): { dateStr: string; timeStr: string } => {
  if (!isoString) {
    const now = new Date();
    return {
      dateStr: now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    };
  }
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { dateStr: isoString, timeStr: '' };
    }
    const dateStr = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: isoString, timeStr: '' };
  }
};

const getLocalNotes = (leadId: string): LeadNote[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${leadId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[noteService] Error loading local notes:', e);
  }
  return [];
};

const saveLocalNotes = (leadId: string, notes: LeadNote[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${leadId}`, JSON.stringify(notes));
  } catch (e) {
    console.warn('[noteService] Error saving local notes:', e);
  }
};

/**
 * Fetch all notes associated with a given lead or patient ID.
 * Returns newest notes first.
 */
export const fetchNotesForLead = async (leadId: string): Promise<LeadNote[]> => {
  const notesMap = new Map<string, LeadNote>();

  // 1. Load any locally cached notes first
  const localNotes = getLocalNotes(leadId);
  localNotes.forEach(n => {
    if (n && n.id) notesMap.set(n.id, n);
  });

  // 2. Query dedicated 'lead_notes' table if available
  try {
    const { data: dedicatedData, error: dedicatedErr } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (!dedicatedErr && Array.isArray(dedicatedData)) {
      dedicatedData.forEach((row: any) => {
        const { dateStr, timeStr } = formatNoteTimestamp(row.created_at);
        notesMap.set(row.id, {
          id: row.id,
          lead_id: row.lead_id,
          note: row.note,
          created_at: row.created_at || new Date().toISOString(),
          created_date: row.created_date || dateStr,
          created_time: row.created_time || timeStr,
          created_by: row.created_by || undefined,
          created_by_name: row.created_by_name || 'Master Admin'
        });
      });
    }
  } catch (e) {
    // lead_notes table may not exist in standard public schema cache yet
  }

  // 3. Query discrete note records stored in himas_appointments
  try {
    const { data: apptNoteRows, error: apptErr } = await supabase
      .from('himas_appointments')
      .select('id, remarks, doctor_assessment, created_at, updated_at')
      .eq('booking_status', 'LeadNote');

    if (!apptErr && Array.isArray(apptNoteRows)) {
      apptNoteRows.forEach((row: any) => {
        const docAssessment = row.doctor_assessment;
        if (docAssessment && (docAssessment.lead_id === leadId || docAssessment.leadId === leadId)) {
          const rawCreated = docAssessment.created_at || row.created_at || row.updated_at || new Date().toISOString();
          const { dateStr, timeStr } = formatNoteTimestamp(rawCreated);
          const noteId = docAssessment.note_id || row.id.replace('lead_note_', '');

          notesMap.set(noteId, {
            id: noteId,
            lead_id: leadId,
            note: docAssessment.note || row.remarks || '',
            created_at: rawCreated,
            created_date: docAssessment.created_date || dateStr,
            created_time: docAssessment.created_time || timeStr,
            created_by: docAssessment.created_by || undefined,
            created_by_name: docAssessment.created_by_name || 'Master Admin'
          });
        }
      });
    }
  } catch (e) {
    console.warn('[noteService] Error fetching note rows from appointments table:', e);
  }

  // Convert to array and sort newest notes first
  const sortedNotes = Array.from(notesMap.values()).sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return timeB - timeA;
  });

  // Sync cache
  saveLocalNotes(leadId, sortedNotes);

  return sortedNotes;
};

/**
 * Persist a new note for a lead.
 * Records exact date, time, note content, and author information.
 * Never overwrites previous notes; creates a separate persistent database record.
 */
export const addNoteForLead = async (params: {
  leadId: string;
  note: string;
  hospitalId?: string;
  createdBy?: string;
  createdByName?: string;
}): Promise<LeadNote> => {
  const trimmedNote = params.note.trim();
  if (!trimmedNote) {
    throw new Error('Note content cannot be empty.');
  }

  const now = new Date();
  const id = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const created_at = now.toISOString();
  const created_date = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const created_time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const created_by = params.createdBy || 'staff_master_01';
  const created_by_name = params.createdByName || 'Master Admin';

  const newNoteRecord: LeadNote = {
    id,
    lead_id: params.leadId,
    note: trimmedNote,
    created_at,
    created_date,
    created_time,
    created_by,
    created_by_name
  };

  // 1. Persist locally first for instant, guaranteed availability
  const currentLocal = getLocalNotes(params.leadId);
  const updatedLocal = [newNoteRecord, ...currentLocal.filter(n => n.id !== id)];
  saveLocalNotes(params.leadId, updatedLocal);

  // 2. Insert into 'lead_notes' table if present
  try {
    await supabase.from('lead_notes').insert({
      id,
      lead_id: params.leadId,
      note: trimmedNote,
      created_at,
      created_by,
      created_by_name
    });
  } catch (err) {
    // Ignored if lead_notes table is not provisioned in Supabase
  }

  // 3. Persist as an authoritative record in 'himas_appointments'
  try {
    await supabase.from('himas_appointments').insert({
      id: `lead_note_${id}`,
      hospital_id: params.hospitalId || 'himas_facility_01',
      name: `Note for ${params.leadId}`,
      mobile: '0000000000',
      booking_status: 'LeadNote',
      remarks: trimmedNote,
      created_at,
      updated_at: created_at,
      doctor_assessment: {
        is_note: true,
        note_id: id,
        lead_id: params.leadId,
        note: trimmedNote,
        created_at,
        created_date,
        created_time,
        created_by,
        created_by_name
      }
    });
  } catch (err) {
    console.warn('[noteService] Notice: fallback row persistence:', err);
  }

  return newNoteRecord;
};
