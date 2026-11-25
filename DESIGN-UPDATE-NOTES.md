# KDC V2 — Seven-rule UI refinement

Based on the latest available KDC V2 Refined UI + Security Review package. This is a source-level update only; not yet deployed.

## Changes
- Replaced the numbered dental service glyphs with consistent 20px Lucide line icons.
- Removed flag emojis from country selectors, using text labels instead.
- Retained only functional appointment-state badges. Removed non-actionable decorative hero label.
- Removed the secondary floating hero card, flattened list content inside portal panels, added 1px separators.
- Tightened label/value spacing (4px), grouped row spacing (10–12px), and used 24px+ section separation.
- Made inner radii 8px where parent panels are 16px.
- Disabled all looping/idle animations, including orbit and skeleton effects. Interactions use 180ms ease-out with reduced-motion overrides.
- Increased contrast for selected navigation and appointment time slots including dark theme.
- Preserved the original clinic logo, Supabase auth flows, doctor/patient portal, and previously prepared (not deployed) SQL security-hardening migration.

## Important limitations
- Full npm/Vite production build and browser visual regression are NOT verified in this environment: package download unavailable.
- Source is an earlier audited snapshot, not guaranteed identical to latest GitHub main. Compare and merge, do not overwrite live repository.
- Do not apply SQL migration to production without staging verification.

## Local macOS test
```bash
npm install
npm run build
npm run dev
node --test src/security/validation.test.mjs
```

Review: public website, doctor and patient portals, onboarding, appointments, document uploads, mobile nav, keyboard focus and dark mode before any deployment.
