# KDC V2 — Build and refinement prompt for Cursor / Claude / ChatGPT

You are a senior full-stack engineer, healthcare UX designer and security-focused reviewer. Work in this existing KDC-V2 Vite + React + Supabase repository. Do not replace it with a static mockup. Preserve functionality and keep terminology understandable for dentists and patients.

PRODUCT: Kingra Dental Care, a single-clinic two-role website. Users: visitor, patient, doctor. Focus: request appointment → doctor approves → patient receives in-app update → doctor shares a file → patient securely views it. Do not implement AI diagnosis, complex dental charting, messaging, billing, insurance or multi-clinic logic.

NAVIGATION: public "Our services", "Visit us", "Patient / Doctor login"; patient "Home", "My Appointments", "My Files"; doctor "Overview", "Appointments", "Patients", "Patient Files". Avoid technical/internal labels in UI.

UX: light ivory canvas #F7F8F5, deep slate #243746, calm green #176B60, minimal gold accent #E4B66A; strong typography, spacious grid, mobile-first patient screens, desktop-first doctor screens; keep accessible contrast, keyboard and screenreader support, form validation, readable loading/empty/error states. Preserve uploaded tooth/smile logo where appropriate.

DATA: Supabase PostgreSQL Auth and RLS, private Storage. Never store medical files in localStorage. Do not use public buckets or service-role key in frontend. Prevent role self-promotion and appointment double confirmation. Handle concurrent approvals, failures, unverified email, session expiration and error states. Never seed real medical records. Do not claim medical compliance.

DELIVERABLES: functional source code, SQL migrations, .env.example, README setup, Vercel deployment configuration, meaningful automated tests where possible. Test core patient and doctor journeys manually and document any untested or incomplete behavior. Ask before adding feature scope outside MVP. Do not invent research or performance numbers.

NEXT DEVELOPMENT TASKS: 1) UI quality review, 2) test the full Supabase flow, 3) enforce role and storage boundaries through integration tests, 4) improve booking conflict messaging, 5) add loading and skeleton states, 6) conduct keyboard and accessibility audit, 7) validate with a dental professional before real-world use.

## V2.4 brand / product requirements
Make KDC a unified dental care portal, not an appointment-only app. Keep the original Kingra tooth-and-smile logo in the header and dashboard. Use straightforward navigation labels: Dashboard, Appointments, Patients, Patient Records, My Records, Notifications. Both doctors and patients sign in through Google, email OTP, or phone OTP; privileges derive only from server-side approved roles. Use gentle cream/mist/navy/gold gradients; never place decorative gradients behind small text where contrast becomes inadequate. Do not add AI diagnosis, chat, or billing.
