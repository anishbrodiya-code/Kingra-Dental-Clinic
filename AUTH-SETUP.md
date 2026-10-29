# KDC V2.11 — Authentication and onboarding setup

## Step 1 — database
Run `supabase/schema.sql` only for a fresh database. If you already ran it, run **only** `supabase/02_personal_info.sql` in Supabase SQL Editor. Keep Row Level Security enabled.

## Step 2 — existing connection
Keep your `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put the `service_role` key in frontend files.

## Step 3 — email six-digit codes instead of confirmation links
Supabase Dashboard → Authentication → Email Templates → **Magic Link**. Set the body to include `{{ .Token }}` (not a confirmation-link button). Example:

```html
<h2>Your Kingra Dental Care sign-in code</h2>
<p>Enter this code in the Kingra Dental Care portal:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:5px">{{ .Token }}</p>
<p>If you didn't request this code, ignore this email.</p>
```

For any **Confirm signup** template still used by password-based flows, configure its contents accordingly. This app uses `signInWithOtp` and `verifyOtp`, and the relevant template is Magic Link.

## Step 4 — branded email sender
Changing an email template's heading does **not** change its actual From sender. To show `Kingra Dental Care` instead of a Supabase sender, configure a verified domain and custom SMTP service in Authentication → SMTP Settings. Use a real address such as `login@YOUR-OWN-DOMAIN` and sender name `Kingra Dental Care`. Do not invent an address you do not control. Supabase default SMTP has testing restrictions.

## Step 5 — Google login
Create OAuth client credentials in Google Cloud and enable Google provider in Supabase Authentication → Providers → Google. Add the exact Supabase callback URL shown in that provider's instructions to Google Cloud's Authorized redirect URIs. Add `http://localhost:5173/**` to Supabase Authentication → URL Configuration redirect allow-list for local testing. Add your deployed origin for production.

## Step 6 — phone login
In Supabase Authentication → Providers → Phone, enable the provider and configure a supported SMS provider (e.g. Twilio). Without an SMS provider, phone OTP cannot deliver real codes. Supabase supports fixed-code test phone numbers for development. Phone login uses E.164 format like `+919876543210`. India SMS regulations and provider pricing may apply.

## Step 7 — onboarding
After a **new patient** signs in, the portal requires full name, contact phone and contact email. The form is also accessible from **Personal Info**. These contact fields **do not verify or link** an extra sign-in method. A patient who signs in by Google/email must still verify a phone through an independently configured flow before it can serve as a login identity. A phone-signed-in patient must similarly verify an additional email before using it for sign-in. Do not assume identical contact details automatically link auth accounts.

Doctors must be approved through the database/admin and are not granted that role through registration.

## Testing
1. Email: request code, enter six digits, open portal.
2. Google: test only after provider configuration.
3. Phone: test via provider/test number configuration.
4. Patient: fill personal details, log out and sign in again; details should persist.
5. Doctor: verify doctor role never grants itself during signup.
6. Test mobile and dark mode.

Demo only: use synthetic data, not real patient records.
