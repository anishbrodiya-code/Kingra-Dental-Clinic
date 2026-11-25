# Kingra Dental Care V2 — Source Security Review

**Scope:** The uploaded `KDC-V2-Login-and-Deployment-Fix.zip` plus the earlier uploaded `KDC-V2-Mobile-Responsive-Complete(1).zip` for comparison. **Not** a live environment penetration test, not the newer GitHub `main` branch, and not an audit of Supabase's managed infrastructure. No real patient data was accessed.

## Summary of findings and mitigations

| Risk | Before | In this package | Residual risk |
|---|---|---|---|
| Broken object-level authorization | RLS policies exist on core tables, but doctors could alter arbitrary appointment booking fields in an `UPDATE` | Server-side SQL trigger enforces immutable identity and booking fields; explicit status transitions | Must run and verify SQL against production-equivalent test accounts |
| Patient notification tampering | RLS limited rows but permitted changes to message/recipient on the user's own row | Trigger permits only marking the existing row read | Test notification updates with real JWTs |
| Document metadata spoofing | Doctor could create arbitrary `file_path`/`file_type` combinations | Insert trigger validates patient-scoped UUID path, extension, type, and title; UPDATE/DELETE revoked | File bytes still not inspected server-side; malware scan needed for real medical data |
| File orphan cleanup | UI attempted delete after failed metadata insertion, but Storage had no DELETE policy | Narrow orphan-only cleanup policy for uploading doctor | Confirm `owner_id` behavior in your Supabase Storage version; orphan cleanup must be tested |
| Untrusted user-supplied file MIME | Browser trusts `file.type` | Client checks signatures for supported PDF/PNG/JPEG/WebP and limits size | Client check can be bypassed: add upload proxy, virus scanner, content re-encoding before clinical use |
| Excessive error detail | Error strings from PostgREST and Storage displayed directly | Replaced common record/update error display with generic messages | Auth UI still displays provider errors; audit every message with QA |
| Spoofed cached session | UI initialized directly from cached `getSession()` | Browser startup additionally calls `getUser()` before rendering private portal | Browser tokens still persist in local storage. Backend authorization MUST rely on RLS, not React state |
| HTTP response hardening | Minimal Vercel configuration | `nosniff`, framing restriction, HTTPS HSTS, referrer and permissions policy headers | CSP not safely enforceable without full browser and OAuth testing |
| Hidden secrets and repository history | No service-role key seen in source files, only `VITE_` public client configuration and example placeholders | `.env.*` remains ignored except example; checks documented | Git commit history and Vercel/Supabase secret values NOT inspected. Any exposed secret must be revoked/rotated |
| Abuse controls | No custom API or edge rate limiter in frontend | Acknowledged as an infrastructure and Supabase Auth task | Rate limiting, bot controls, and device challenge NOT implemented or verified |

## Authentication/session architecture reality

The current project is a **Vite React SPA** using Supabase Auth for Google OAuth and email OTP. Passwords, reset-token entropy, email verification, and login rate limiting are managed by Supabase Auth; there is no custom password database or password hashing logic in this source. Introducing Argon2id/bcrypt into the React bundle would be incorrect. Configure Auth settings in Supabase and verify with live provider tests.

The current SPA uses Supabase's persistent browser session. It does **not** have server-issued `HttpOnly` session cookies, and setting a cookie flag in React cannot achieve this. A session-BFF/SSR architecture is required if the product mandates `HttpOnly; Secure; SameSite` session cookies. Supabase Auth logout revokes refresh tokens; already-issued JWT access tokens remain valid until expiration. Configure short JWT lifetimes and session policies according to your threat model; do not assert instantaneous access token invalidation.

For a portfolio demonstration containing **synthetic records only**, the authenticated browser + strict RLS architecture can be retained. For real patients, commission an independent clinical-data security/compliance assessment before onboarding anyone.

## Test gates before applying SQL

1. Backup your existing Supabase database schema and relevant data; verify you can restore.
2. Apply `supabase/04_security_hardening_REVIEW_FIRST.sql` to a **separate staging clone**, *after* schema and profile migrations.
3. Test patient A cannot read patient B records, documents or notifications through raw Supabase HTTP queries.
4. Test patient A cannot edit notification message, recipient, or mark unread; can only mark their own notice read.
5. Test patient cannot modify other patient's appointments; doctor can approve pending, but cannot change patient ID or appointment details.
6. Test doctor uploads valid image/PDF; spoofed file type is rejected; client cannot update document visibility through REST.
7. Test failed metadata insert cleans up only its own unregistered orphan; cannot delete registered files.
8. Test Google sign-in, onboarding, appointment approval, signed downloads, doctor portal, dark theme, mobile breakpoints.
9. Verify Vercel builds with Production public env vars and that no service-role key appears in browser bundle.
10. Disable public clinical data use until independent verification.

## Not completed / require live account or architecture change

- GitHub `git log --all` history leak audit. Supplied ZIP has no `.git` directory. Run a history secret scan on your Git clone with an approved scanning tool; revoke secrets **before** rewriting Git history.
- Supabase password parameters and OTP expiry/rate limits; email template hardening, SMTP, Google OAuth callback allowlists, CAPTCHA.
- Strict HttpOnly SPA session cookies. Requires a dedicated server-side BFF and auth migration.
- True server-side upload malware scanning and canonical content rewriting; cannot be enforced from SPA only.
- Server-side API rate limiting (the browser cannot enforce anti-bot limits), anomaly detection and secure audit log export.
- DDoS controls, network restriction and DB access restrictions; these are platform/dashboard settings.
- Dependency advisories and complete build validation, due to unavailable npm registry installation in this runtime.
- Full 10-part architectural refactor: the legacy JSX is still largely monolithic; the changes are security-first and intentionally avoid breaking working UI flows.

## Supported API interfaces

- Supabase-managed `/auth/v1/*`: provider sign-in, OTP verification, sessions; no custom password endpoints.
- PostgREST `/rest/v1/profiles`, `/appointments`, `/documents`, `/notifications`: RLS-protected CRUD (read/write access differs per role).
- Storage `/storage/v1/object/*`: private `patient-files` bucket; signed short-lived downloads.

If introducing custom business APIs later, use a versioned `/api/v1` server route, a server-only Supabase client with verified JWT, request schemas and per-user/IP limits. Do not expose the service-role key in the browser.

## Refactoring completed in this package

- Introduced `src/security/validation.js` for input boundaries and safe messages.
- Introduced `src/services/documentService.js` so document upload business logic is separate from the React portal UI.
- Added 10 dependency-free Node tests in `src/security/validation.test.mjs`.
- The monolithic `src/App.jsx` and global CSS are **not** yet an enterprise architecture; UI component splitting and custom `/api/v1` endpoints would be a separate, tested migration.
