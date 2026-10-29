# KDC V2 Mobile Responsive Update

This package uses the **actual GitHub main source** uploaded for the update, with an additional responsive CSS file imported last: `src/mobile-responsive.css`.

## What changed
- Breakpoints and spacing for mobile (320–430px), tablets (up to 960px), and desktop.
- Public header, hamburger menu, brand sizing, hero and decorative circle sizing.
- Treatment cards and expanded treatment details.
- Doctor/patient dashboards, tables-as-cards, bottom navigation, patient forms, booking slots and record previews.
- Mobile modal sizing, reduced-motion and touch feedback.

No Supabase SQL, authentication logic, credentials, or API calls were changed. The app still requires your existing `.env.local` in local development and existing Vercel environment variables on deployment.

## Local steps
1. Extract ZIP. Open the folder that contains `package.json` in VS Code.
2. Copy your existing `.env.local` (not included here) to the folder.
3. Run `npm.cmd ci` (or `npm.cmd install`) then `npm.cmd run dev`.
4. Verify at 320, 375, 390, 430, 768 and 1024 px. Test both account roles and document preview.
5. Run `npm.cmd run build` before deployment.

## Deploy
Copy updated source into your existing `KDC-GitHub` clone, commit on `main`, and push. Vercel should automatically redeploy. Do not commit `.env.local`.

## Limitations
CSS-focused changes are not a substitute for end-to-end mobile browser testing, particularly on iOS Safari. Test real devices before accepting clinical data; use fictional demonstration records only.
