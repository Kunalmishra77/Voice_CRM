import { createClient } from '@supabase/supabase-js';
import { useDiagnosticsStore } from '../state/diagnosticsStore';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3010/api';

// The supabase client is kept so that any lingering import won't break at compile time,
// but api.ts no longer uses this client — all queries go through the backend proxy.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// ── Startup Health Check (via backend — no direct Supabase REST call from browser) ──
export const checkSupabaseHealth = async () => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    const body = await res.json();
    if (!body.ok) throw new Error(body.error || 'Backend health check failed');
    // All good — backend is connected to Supabase
  } catch (error: any) {
    useDiagnosticsStore.getState().addError({
      type: 'network',
      message: 'Backend Health Check Failed ❌',
      hint: error.message,
      recommendedFix: 'Make sure the backend server is running at http://localhost:3010 (npm run dev in the backend folder).'
    });
  }
};

// Run health check 1.5 s after page load
setTimeout(checkSupabaseHealth, 1500);
