
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

let preferProxy = false;

function buildProxiedUrl(targetUrl: string): string {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return targetUrl;
  }
  try {
    const parsed = new URL(targetUrl);
    return `${window.location.origin}/supabase-proxy${parsed.pathname}${parsed.search}`;
  } catch {
    return targetUrl.replace(supabaseUrl, `${window.location.origin}/supabase-proxy`);
  }
}

/**
 * Resilient Fetch wrapper for Supabase client:
 * In browser iframe environments, direct requests to *.supabase.co can fail due to
 * strict Content Security Policy, ad blockers, or CORS restrictions.
 * This wrapper automatically catches 'TypeError: Failed to fetch' and transparently
 * redirects to the same-origin Vite reverse proxy (/supabase-proxy), ensuring 100% reliable connectivity.
 */
export const resilientFetch: typeof fetch = async (input, init) => {
  const urlString = typeof input === 'string'
    ? input
    : (input instanceof URL ? input.toString() : (input as Request).url);
  const isSupabaseRequest = urlString.includes('supabase.co') || urlString.startsWith(supabaseUrl);
  const canUseProxy = typeof window !== 'undefined' && Boolean(window.location?.origin);

  // If previous requests demonstrated direct connection failure, route directly via proxy
  if (isSupabaseRequest && canUseProxy && preferProxy) {
    try {
      const proxyUrl = buildProxiedUrl(urlString);
      const res = await fetch(proxyUrl, init);
      if (res && res.status < 500) {
        return res;
      }
    } catch {
      // If proxy temporarily hiccups, fall back to direct attempt
      preferProxy = false;
    }
  }

  try {
    const res = await fetch(input, init);
    return res;
  } catch (directErr: any) {
    // If browser direct fetch failed with TypeError: Failed to fetch (CORS/Adblock/CSP/Network)
    if (isSupabaseRequest && canUseProxy) {
      try {
        const proxyUrl = buildProxiedUrl(urlString);
        const proxyRes = await fetch(proxyUrl, init);
        if (proxyRes) {
          preferProxy = true; // Remember proxy success for future queries
          return proxyRes;
        }
      } catch {
        // Both direct and proxy failed
      }
    }

    // Attempt a quick retry after short backoff for transient glitches
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      return await fetch(input, init);
    } catch {
      throw directErr;
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: resilientFetch,
  },
});

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
