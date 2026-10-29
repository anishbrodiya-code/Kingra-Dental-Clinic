# KDC authentication repair

1. Run `supabase/03_restore_missing_profiles.sql` in **Supabase SQL Editor** only if you deleted rows from `public.profiles`. This restores missing profiles for existing authenticated users as **patients**, not doctors. Review the SELECT results first. It does not reset email limits or recreate deleted Auth users.
2. Country code starts with India (+91), and phone and email are separate fields. Do not expect a phone OTP to work without a configured SMS provider.
3. The “Unsupported phone provider” message is Supabase configuration: go to Authentication → Providers → Phone; enable the provider and configure supported SMS delivery credentials. Enable only after testing and considering costs.
4. `Email rate limit exceeded` is enforced by Supabase. Stop repeatedly requesting codes; wait for the window to reset. For sustained testing and branding, configure **custom SMTP** with a verified sending domain in Supabase. Do not disable security or attempt to bypass email limits.
5. Check Authentication → Users to verify the account still exists. A deleted `profiles` row is different from a deleted Auth user.
6. Use your existing `.env.local` file; never include service-role keys in the frontend. Use fake patient records for testing.

Run `npm.cmd install` and `npm.cmd run dev` in VS Code.
