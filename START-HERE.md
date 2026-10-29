# Kingra Dental Care V2.11 — Start here

1. Extract this ZIP; open the extracted folder (the one with `package.json`) in VS Code.
2. Recreate or copy `.env.local` from your previous project with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Your Supabase database already has `schema.sql` applied. Run **only** `supabase/02_personal_info.sql` in Supabase SQL Editor. Do not run the original schema again.
4. In PowerShell run `npm.cmd install` followed by `npm.cmd run dev`.
5. Open http://localhost:5173.
6. New patient accounts will see a personal-details form before the portal. See `AUTH-SETUP.md` for configuring email codes, Google and SMS provider, and custom sender branding.

This ZIP contains source code only, not database credentials. Google and SMS cannot work until their external identity providers are configured in Supabase. Use synthetic patient data only.
