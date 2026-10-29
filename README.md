# Kingra Dental Care — V2

A **portfolio/demo** dental care web application with simple patient and doctor views, Supabase authentication, appointment approval, files, updates, and directions. Designed for **synthetic test data only**. NOT certified for live medical use.

## What it does
- Public clinic website, services, address, click-to-call, Google Maps directions
- Patient registration/login, appointment requests, appointment history, cancellation
- Doctor login, approve/decline/complete appointments, patient list and history
- Doctor-uploaded PDF / image documents, visible to the right patient
- In-app updates and auto refresh every 15 seconds
- Responsive UI, accessible labels and basic focus states

## 1. Prerequisites
Install Node.js current LTS, VS Code, and Git. Create free accounts at Supabase, GitHub and Vercel.

## 2. Open and run
Extract ZIP, open the extracted folder (the one containing `package.json`) in VS Code. In VS Code Terminal:

```bash
npm install
```

## 3. Set up Supabase
1. Create a new Supabase project.
2. Go to **SQL Editor** > **New query**. Paste the contents of `supabase/schema.sql`. Run it once.
3. Open **Project Settings > API Keys** (or **Connect** in the latest UI). Copy the project URL and publishable key (legacy `anon` is supported). **Never use the secret/service role key in the browser.**
4. Create `.env.local` in the project root and enter:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_key
```

5. In Supabase **Authentication > Providers > Email**, keep email sign-in enabled. If email confirmation is enabled, open confirmation messages before signing in. During isolated demo testing, you may configure confirmations appropriately. For production, require verified accounts.

## 4. Start locally

```bash
npm run dev
```

Open the local URL shown (normally http://localhost:5173). Register **two test accounts** with synthetic names: one doctor and one patient. By design, every public registration becomes a **patient**.

## 5. Assign the doctor account
Use SQL Editor (administrative action) with the actual email you used:

```sql
-- IMPORTANT: You must temporarily disable the role protection trigger in an
-- administrator-only SQL transaction. Never expose role assignment in the app.
begin;
alter table public.profiles disable trigger profile_role_protection;
update public.profiles
set role = 'doctor'
where id = (select id from auth.users where email = 'doctor-test@example.com');
alter table public.profiles enable trigger profile_role_protection;
commit;
```

Sign out and back in as the doctor. Verify you see the Doctor Workspace, not the patient portal. Don't promote the patient account.

## 6. Test the end-to-end flow
1. Log in as the patient. Choose **My Appointments** > select a weekday date, service, and free time > **Send appointment request**.
2. Log in as the doctor in another browser/incognito window. Open **Appointments** > **Approve**.
3. Refresh or wait ~15 seconds in the patient's window. Check **Confirmed** and the **Updates** area.
4. Doctor: **Patients** > select the patient > upload a **synthetic** JPG/PNG/PDF (up to 10MB).
5. Patient: **My Files** > click the file. It opens via a short-lived private URL.
6. In the public website or dashboard, click **Get directions**. Verify the destination before public launch.
7. Test rejected requests, cancel, and simultaneous appointment approval. Only one confirmed appointment per slot can succeed.

## 7. Build locally

```bash
npm run build
npm run preview
```

## 8. Push to GitHub
Start from a new repository or a `v2` branch in the existing repo. Avoid replacing V1 accidentally.

```bash
git init
git add .
git commit -m "Build KDC V2 demo"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_NEW_REPO.git
git push -u origin main
```

If using the existing repository, instead create a branch first, commit the contents there, and push that branch. Do not run `git init` in an existing repository. **Never commit `.env.local`.**

## 9. Deploy on Vercel
1. Vercel > **Add New Project** > import GitHub repository.
2. Framework preset: **Vite**. Build command: `npm run build`; Output directory: `dist`.
3. Project Settings > Environment Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production (and Preview if desired).
4. Deploy. If you set environment variables after the initial deployment, redeploy.
5. In Supabase **Authentication > URL Configuration**, set **Site URL** to your deployed URL and add `https://YOUR-DEPLOYMENT.vercel.app/**` to Redirect URLs. For local auth, allow `http://localhost:5173/**`.
6. Test sign-in, confirmation, request approval, uploads, unauthorized access and Google Maps on the live URL.

## Important scope and safety limits
- This is a single-clinic pilot, not a multi-doctor scheduling system. One global slot can only be confirmed once.
- Pending requests can overlap; only approved visits reserve the slot. A doctor gets a database error if another appointment was already confirmed at that time.
- Opening patient files uses private Storage and a signed URL. Document metadata is protected by Row Level Security.
- V2 updates are in-app only; there are no email or push notifications.
- Working hours are currently fixed to Monday–Saturday and 30-minute slots. Update UI + database rules together if changing hours.
- No real patient health information may be stored until professional security, privacy, legal, recovery, audit and clinical workflow reviews are completed.
- The pilot does not implement complete audit logging, backup management, consent records, records retention policy, rate limiting or staff permissions.
- Basic accessibility support is present but **WCAG 2.2 AA conformance has not been audited**.
- The interface is not clinically validated. Use mock data and moderated usability tests before presenting performance claims.

## Folder structure
`src/App.jsx`: application and UI; `src/styles.css`: visual system; `src/supabase.js`: Supabase client; `supabase/schema.sql`: database and RLS; `public/logo.png`: original clinic logo.


## V2.1 visual refresh
This package replaces the oversized decorative dental logo in the dashboard with a compact Kingra wordmark and uses a cleaner blue-teal clinical interface. Original logo remains in `public/logo.png` for optional brand use. The added `src/redesign.css` overrides visual styles without changing booking, authentication, database, or file workflows.

## V2.3 — Unified doctor and patient portal sign-in
The same sign-in screen is available to **patients and doctors**. New accounts always have the patient role. Never offer a public doctor-role selector: clinic administrators grant that permission privately.

### Set up sign-in providers
1. Supabase **Authentication → URL Configuration**: set Site URL to your production URL when deployed; add `http://localhost:5173/**` for local development and your exact Vercel URL to Redirect URLs.
2. **Google:** In Google Cloud Console configure an OAuth web client, using the callback URL shown under Supabase **Authentication → Providers → Google**. Enable Google in Supabase and provide the Client ID and Client Secret there. Do not put the Google Client Secret in Vite/frontend environment variables.
3. **Email:** Enable the Email provider. To send a **numeric email OTP**, edit Supabase Authentication → Email Templates → Magic Link and use `{{ .Token }}` in the template instead of `{{ .ConfirmationURL }}`. If you keep the default magic link email, the email link still works. For public use, configure an appropriate SMTP sender and rate limits.
4. **Phone:** Enable Phone provider and configure a supported SMS service/provider in Supabase. SMS may cost money. Use international phone numbers such as `+919876543210`. Until SMS is configured, phone sign-in will display provider errors; Google/email remain available.
5. Apply `supabase/schema.sql` to a fresh Supabase project (or rerun the `register_profile` function definition when upgrading an existing project). It accommodates Google profile names and phone-only users.
6. Verify Google, email and phone accounts do not automatically merge into one person merely because their identifiers look similar. Account linking is a separate authenticated process and is **not implemented** in V2.3. Use one method per test account, or deliberately link identities in a future version.

### Give an existing user doctor access (trusted administrator only)
- Have the doctor first sign in to create their account.
- Copy the doctor's **auth user UUID** from Supabase Authentication → Users.
- In Supabase SQL Editor, as project administrator, run the following with that UUID:
```sql
-- First validate the target account UUID and email in the Auth dashboard.
-- Do not run with arbitrary/unverified user IDs.
drop trigger if exists profile_role_protection on public.profiles;
update public.profiles set role='doctor' where id='REPLACE_WITH_VERIFIED_AUTH_USER_UUID'::uuid;
create trigger profile_role_protection before update on public.profiles for each row execute procedure public.prevent_role_edit();
```
- Sign out and sign back in to get the doctor portal. This manual role assignment is for a controlled demo; production needs a secure admin workflow and audit log.

### Safety
Use only fake/sample records. The existing V2 database policies need additional independent security review before real patient data or broader multi-clinic deployment. Test access from two separate accounts and browsers.

## V2.4 Portal authentication and color system

Both patients and doctors use **the same login screen**: Google OAuth, email OTP/magic link, or phone SMS OTP. New accounts are patients by default. Doctor accounts must be approved by an administrator and assigned the doctor role server-side; **do not allow users to choose their own doctor role**. Do not grant clinical access based on an email domain.

Configure Supabase Auth: enable Google provider with your Google Cloud OAuth credentials, set allowed redirect URLs for localhost and Vercel, and configure the email template for a 6-digit OTP if you want code entry rather than only a magic link. For phone access, enable Phone authentication and configure a supported SMS provider (which may incur charges). Until configured, these flows cannot be verified as working.

UI theme tokens are defined at the end of `src/redesign.css` in the V2.4 section. The palette uses light cream, mist, navy, warm gold and gentle fade gradients. Original Kingra tooth logo is preserved.

Do not load genuine patient medical data into this demo. Review authentication, RLS, storage security, privacy, retention, and local regulatory requirements before any real-world use.


## V2.5 interaction update (October 2026)

- Public site: sticky navigation, mobile menu, active section indicator, one-time scroll reveal, gentle looping hero preview, expandable service descriptions.
- Portal: patient directory search, document preview overlay (images and PDFs), upload activity indicator, loading skeleton.
- Accessibility: reduced-motion CSS, keyboard focus indicators, Escape key for preview overlay.
- Original Kingra tooth-and-sparkle logo retained unchanged; palette remains soft aqua/green/yellow with gentle gradients.
- This update does not change `supabase/schema.sql`, authentication, or appointment persistence.

### Local commands

From the folder containing `package.json`:

```powershell
npm.cmd install
npm.cmd run dev
```

For production build: `npm.cmd run build` after installing dependencies. The package was not build-tested in the generation environment because the npm dependency installation timed out.

### Security reminders

Use synthetic patient data for demos. Before handling real clinical information, commission a security and privacy review, including access rules, files, permission boundaries, audit requirements, and retention controls.
