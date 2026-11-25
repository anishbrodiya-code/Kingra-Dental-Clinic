# KDC V2 — Refined UI & Security Review Build

## What this package is
A **local review build** derived from the KDC security-hardening package in this conversation. It is **not** the current GitHub `main` codebase or live Vercel deployment. No live data or hosting configuration was changed.

## What changed in the UI
- New final `src/polished.css` design layer, imported last in `src/main.jsx`, to reduce clashes between older redesign layers.
- Consolidated typography, spacing, border radii, surfaces, card elevation, and colour tokens.
- Restyled public landing, portal navigation, appointment cards, booking slots, forms, account onboarding, notification panels, file lists and both responsive layouts.
- Explicit contrast states for selected desktop navigation, mobile tabs, booking times, authentication method tabs, and dark-mode selected states.
- Preserved the original Kingra logo and existing patient / doctor workflows.
- Added keyboard-accessible skip links and `aria-current="page"` on selected portal navigation controls.
- Kept motion subtle; honours reduced-motion preferences.

## Existing security measures (from predecessor package)
- Client-side validation of upload file signatures and size, and safer document handling (`src/security/` and `src/services/`).
- Reviewed Supabase RLS hardening proposal in `supabase/04_security_hardening_REVIEW_FIRST.sql`.
- Security header configuration in `vercel.json`.
- Source-level validation tests (`node --test src/security/validation.test.mjs`).

## Security measures NOT verified / deployed
- The SQL migration is **not** applied to Supabase and has not undergone live RLS access-control tests.
- No authenticated cookie BFF, malware-scanning gateway, or server-side rate limiter was introduced.
- No audit of your *live* GitHub history, Supabase Auth settings or secrets was completed.
- Real medical data is not approved for production use on the strength of this source review.

## How to run locally on macOS
From the folder containing `package.json`:

```bash
npm install
npm run dev
```

Run tests:

```bash
node --test src/security/validation.test.mjs
npm run build
```

Ensure `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` referencing the same *authorized test* Supabase project. Do not upload `.env.local` or any secret keys.

## Merge / deployment precautions
1. **Do not overwrite current GitHub `main` with this older archive.** Clone the latest repository and compare the changes.
2. The safest UI merge is `src/polished.css`, the `import './polished.css'` line, and the specific accessible navigation changes in `src/App.jsx`.
3. Review any security code and the SQL migration as separate PRs; test with synthetic data against staging before production.
4. Test patient and doctor portals, Google login, onboarding, appointment confirmations, document uploads/downloads and mobile + dark mode manually.
5. Only deploy after `npm run build` succeeds and functional tests pass locally.
