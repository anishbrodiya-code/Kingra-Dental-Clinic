# Start here — KDC Security Hardening Candidate

This is **not a drop-in production deployment**. It is a reviewable patch based on the previously uploaded KDC login-fix archive, which predates some of your current GitHub `main` commits.

1. Read `docs/SECURITY-AUDIT.md` and `docs/DEPLOY-SAFELY.md`.
2. From the project directory on your Mac run `npm install`, `node --test src/security/validation.test.mjs`, and `npm run build`.
3. Compare `src/App.jsx`, `src/services/documentService.js`, `src/security/validation.js`, and `vercel.json` against your **latest GitHub clone**; merge reviewed changes only.
4. Review `supabase/04_security_hardening_REVIEW_FIRST.sql` **against a staging Supabase clone** before any production SQL.
5. Run the doctor/patient cross-account tests listed in the audit, then publish a Preview deployment for acceptance tests.

Never run the new migration blindly on your production database or replace your current GitHub repository with this older snapshot.
