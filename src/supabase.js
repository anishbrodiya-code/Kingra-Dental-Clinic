import { createClient } from '@supabase/supabase-js';

// Vite substitutes these values at build time. Changing .env.local does not fix a
// previously built Vercel deployment: set both in Vercel and redeploy it.
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
let parsedUrl = null;
try {
  const candidate = new URL(rawUrl);
  if (candidate.protocol === 'https:' && candidate.hostname.endsWith('.supabase.co') &&
      !/your-project|project-ref|example/i.test(candidate.hostname)) parsedUrl = candidate;
} catch { /* show a configuration message instead of crashing */ }

export const configurationError = !parsedUrl
  ? 'Supabase project URL is missing or invalid. Copy the Project URL from Supabase → Project Settings → API and update VITE_SUPABASE_URL in your environment.'
  : !key || /your[_-]?key|your[_-]?anon|paste[_-]?here/i.test(key)
  ? 'Supabase public client key is missing. Set VITE_SUPABASE_ANON_KEY using the matching project’s publishable/anon key.'
  : '';
export const configured = !configurationError;
export const supabase = configured
  ? createClient(parsedUrl.origin, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// A broken or retired Supabase hostname otherwise redirects the user to a
// browser DNS error before React can display an explanation.
export async function checkAuthEndpoint() {
  if (configurationError) throw new Error(configurationError);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${parsedUrl.origin}/auth/v1/settings`, {
      method: 'GET', signal: controller.signal, cache: 'no-store',
      headers: { apikey: key },
    });
    if (!response.ok) throw new Error(`Supabase Auth returned HTTP ${response.status}. Confirm the project is active and the public key matches its URL.`);
    return true;
  } catch (error) {
    if (error.message?.startsWith('Supabase Auth returned')) throw error;
    throw new Error(`Cannot connect to Supabase Auth at ${parsedUrl.hostname}. Check that the project still exists, copy its exact Project URL into Vercel, and redeploy. (${error.name === 'AbortError' ? 'Connection timed out' : 'Network or DNS error'})`);
  } finally {
    clearTimeout(timeout);
  }
}
