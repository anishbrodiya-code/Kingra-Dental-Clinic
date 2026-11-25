# Verification report

| Check | Result |
| --- | --- |
| `npm install` | Passed. npm emitted advisory warnings for the host's npm settings and esbuild's install script. |
| `npm run build` | Passed on Node.js 24. |
| `npm test` | Passed. 10 of 10 existing validation tests. |
| Chromium responsive checks | Passed. 24 combinations of the public site, patient portal, and doctor portal at 320, 375, 390, 428, 768, 1024, 1440, and 1920 CSS px. |
| Hero and motion | Passed. The restored callout fits the viewport. The original orbit runs with both theme variants and becomes static under reduced motion. |
| Portal navigation | Passed with mocked Supabase responses. Checked role-specific destinations, mobile target height, active label, keyboard activation, final pill alignment, desktop and mobile placement, and doctor profile access. |
| Theme and contrast | Both themes exercised in Chromium. Eight representative brand-token pairs checked at 4.5:1 or higher, including normal text, muted text, active navigation and primary actions. A full WCAG conformance audit was outside this verification. |
| Role gating | Signed-out and unsupported-role scenarios both blocked portal rendering in mocked browser checks. |
| Errors and overflow | No page-level uncaught errors or horizontal page overflow in the responsive checks. |
| Live access and writes | Untested. No authorized staging Google account was supplied. Live OAuth, OTP delivery, session expiry, booking and approval writes, uploads, and backend row-level policy behavior require a staging project and test accounts. |
| Production | No production Supabase, GitHub or Vercel changes made. |

The Chromium checks used a synthetic Supabase hostname and intercepted responses. Production OAuth or data was never exercised. No requested automated check failed on the final source.

## Google-only update

Rebuilt successfully and reran all 10 existing validation tests. Targeted Chromium checks at 320 px and 1440 px verified a single Google sign-in control, no OTP forms, the Google authorize request with the correct redirect origin against a mock, and recovery from a simulated OAuth denial. The 24 responsive checks above are from the preceding V3 build. Live Google sign-in and migration of existing users were outside the verification.
