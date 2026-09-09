
import { createClient } from '@supabase/supabase-js';

/**
 * Access environment variables using direct dot notation.
 * This is CRITICAL for Vite's `define` plugin to perform literal string replacement.
 */
export const supabaseUrl = 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || 
  // @ts-ignore
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
  "https://mcfudvdwuvldkegwgtiz.supabase.co";

export const supabaseAnonKey = 
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || 
  // @ts-ignore
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  "sb_publishable_7oLgId9S_lriwXxrETiHuQ_WbecTVK5";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase credentials could not be resolved.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; code?: string }> {
  try {
    const { error } = await supabase.from('himas_appointments').select('id').limit(1);
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return { 
          ok: false, 
          code: 'TABLE_MISSING',
          message: 'Connected to Supabase, but "himas_appointments" table is missing. Run database.sql in your Supabase SQL Editor.' 
        };
      }
      return { 
        ok: false, 
        code: error.code,
        message: error.message || 'Supabase query error' 
      };
    }
    return { ok: true, message: 'Successfully connected and verified database tables.' };
  } catch (err: any) {
    return { 
      ok: false, 
      message: err?.message || 'Network error connecting to Supabase.' 
    };
  }
}
