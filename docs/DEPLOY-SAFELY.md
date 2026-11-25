# KDC — Safe security rollout

**Do not replace the current GitHub `main` with this ZIP.** The archive was based on the previously uploaded *older* login-fix snapshot, while your GitHub repository has newer commits.

1. Back up the currently deployed GitHub repository and Supabase schema/data. Confirm the Vercel Production deployment is Ready and Google login works.
2. Review changed files: `src/security/validation.js`, `src/App.jsx`, `vercel.json`, and `supabase/04_security_hardening_REVIEW_FIRST.sql`. Compare them with current `main`, resolve conflicts, and merge only reviewed changes.
3. Run `node --test src/security/validation.test.mjs`, `npm ci`, `npm run build`, and real-browser workflows locally.
4. Create a staging Supabase project with synthetic patients. Apply the existing schema/migrations and the new hardening migration. Run the 10 checks in `docs/SECURITY-AUDIT.md`.
5. Verify `storage.objects.owner_id` is populated for new uploads, orphan cleanup works, and no existing records violate new guards.
6. Deploy to a **Vercel Preview** environment pointing at **staging**, not the production clinical database. Check security headers and workflows.
7. Only after staging is green, schedule production database migration, then deploy reviewed changes to the existing Vercel project.
8. Review and tune Supabase Auth OTP limits, CAPTCHA, email templates, session timeouts, and Google redirect allowlists. Enable alerts and logging in your provider dashboards.
9. If scanning finds a genuinely exposed secret, revoke and replace it first; then assess Git history rewrite as a separate operation.

**Never paste secret keys into chat, commit `.env.local`, or configure `service_role` as a `VITE_` key.**
