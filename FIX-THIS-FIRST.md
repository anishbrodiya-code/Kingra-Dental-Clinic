# Fix the profile-saving error (required one-time database step)

The message about the missing `contact_email` column means that the migration from the earlier ZIP has not been applied to your **existing** Supabase database. Copy the contents of `supabase/02_personal_info.sql` into **Supabase > SQL Editor > New query** and run it. Then reload the website. Do not rerun `schema.sql` and do not disable Row Level Security.

If the error persists after the migration, click **Supabase > Project Settings > Data API > Reload schema** if available, or in SQL Editor run `NOTIFY pgrst, 'reload schema';`, then refresh.

The phone field now starts with an India (+91) country prefix for the clinic, but the patient can change the country. This is not GPS detection. Login via SMS still requires an SMS provider enabled in Supabase; entering a contact number does not verify phone ownership.

To run: extract this ZIP, open the extracted project folder in VS Code (package.json at the top level), retain your existing .env.local, then run `npm.cmd install` and `npm.cmd run dev`.
