# Kingra Dental Care V3

- Restored KDC's original teal, blue-gray and muted gold palette. Shared light and dark tokens live in `src/tokens.css`. The logo and DM Sans and Manrope typography are retained.
- Preserved the homepage motion figure from the original source, including the mint and gold orbit, its layering behind the hero preview and the 45-second cycle. Restored the mint and gold hero wash and floating visit callout visible in the screen recording. The orbit is static when reduced motion is enabled.
- Retained the responsive service and dashboard bento layouts. Split doctor appointments into requests and schedule/history, separated records from uploads, and grouped editable profile details and verified sign-in identities into distinct panels. Patient booking and visits, and doctor directory and patient details, use purpose-sized columns on desktop and stack on mobile.
- Both portal roles have four floating mobile destinations with large targets and a visible label for the active destination. The doctor profile is in the header on mobile and the horizontal navigation on desktop. The indicator uses the requested 260 ms easing and controls use 180 ms pressed feedback. Desktop fine pointers receive subtle hover lift.
- Made Google the sole sign-in option on the patient and doctor login screen. Removed email and SMS one-time-code forms and handlers. Contact fields and role-based route access remain available. Supabase provider settings and account identities were not changed.

See [local setup](LOCAL-SETUP.md), [deployment](DEPLOYMENT.md), and [verification](VERIFICATION.md).
