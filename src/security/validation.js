/** Client-side boundaries improve UX; Supabase RLS and SQL triggers enforce security. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MIME = Object.freeze({
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
});

export function cleanDocumentTitle(value) {
  const result = String(value ?? '').trim();
  if (!result || result.length > 150 || /[\u0000-\u001f\u007f]/.test(result)) {
    throw new Error('Use a document title between 1 and 150 characters.');
  }
  return result;
}
export function validatePatientId(value) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))) {
    throw new Error('Select a valid patient.');
  }
  return value;
}
export async function validateUpload(file) {
  if (!(file instanceof File) || !file.size || file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Choose a non-empty file smaller than 10 MB.');
  }
  if (!Object.hasOwn(ACCEPTED_MIME, file.type)) {
    throw new Error('Only PDF, PNG, JPEG or WebP files are supported.');
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (...sig) => sig.every((b, i) => bytes[i] === b);
  const pdf = starts(0x25, 0x50, 0x44, 0x46, 0x2d);
  const png = starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a);
  const jpeg = starts(0xff,0xd8,0xff);
  const webp = starts(0x52,0x49,0x46,0x46) &&
    bytes[8]===0x57 && bytes[9]===0x45 && bytes[10]===0x42 && bytes[11]===0x50;
  const match = {'application/pdf':pdf,'image/png':png,'image/jpeg':jpeg,'image/webp':webp};
  if (!match[file.type]) throw new Error('The file content does not match its declared type.');
  return { extension: ACCEPTED_MIME[file.type], title: file.name };
}
export function safeActionError(error) {
  // Do not show DB internals, SQL details, file paths or provider errors to patients.
  const code = String(error?.code || '');
  if (code === '23505') return 'That appointment slot has already been taken. Please choose another.';
  if (code === '42501' || code === 'PGRST301') return 'You do not have permission to perform that action.';
  if (code === 'PGRST204') return 'The portal needs a database update. Contact the administrator.';
  return 'Unable to complete the request. Please try again, or contact the clinic.';
}
export function publicAuthError(error) {
  const text=String(error?.message||'').toLowerCase();
  if (/rate limit|too many|over_email_send_rate_limit/.test(text)) return 'Too many attempts. Please try again later.';
  if (/invalid.*otp|invalid.*token|expired.*token|token.*expired/.test(text)) return 'The sign-in code is invalid or expired. Request a new code.';
  if (/email.*not.*confirmed/.test(text)) return 'Please verify your email before signing in.';
  if (/phone provider|sms provider|unsupported phone/.test(text)) return 'SMS sign-in is unavailable. Please use Google or email.';
  return 'Unable to sign in right now. Check your connection and try again.';
}
