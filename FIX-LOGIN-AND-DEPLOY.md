# KDC V2 — Google login and deployment recovery

## Root cause

The error `DNS_PROBE_FINISHED_NXDOMAIN` means the hostname used by the deployed Google login flow cannot be resolved. This is not fixed by changing Google passwords or by redeploying the same environment variables. The project may have been deleted, the URL may be misspelled, or it may be inactive/unresolvable. The ZIP does not contain your live `.env.local` and cannot establish which project reference is correct.

The red GitHub Pages deployment is from `.github/workflows/static.yml`, which attempted to upload the entire React/Vite source tree as static content. That file has been removed from this fixed ZIP. Vercel is the intended hosting provider.

## Recovery — in this order

1. Go to https://supabase.com/dashboard and open the existing **Kingra Dental Care** project. If it is paused, restore it. If you cannot find it, verify the project has not been deleted: a new empty project does **not** contain your existing profiles, appointments and files.
2. Go to Project Settings → API (or **Connect** panel, depending on Supabase dashboard version). Copy its exact **Project URL** and **public/publishable/anon key** from the **same** project. Never share or commit a service-role key.
3. In https://vercel.com/dashboard select the project deploying `kingra-dental-clinic.vercel.app` → Settings → Environment Variables. Replace `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for **Production** (and Preview if used). Values are baked into Vite at build time; **trigger a fresh Production deployment**, not merely a page refresh.
4. In Supabase → Authentication → URL Configuration, set Site URL `https://kingra-dental-clinic.vercel.app` and allow Redirect URL `https://kingra-dental-clinic.vercel.app/**`; also allow `http://localhost:5173/**` for development. The app currently uses `window.location.origin` as OAuth `redirectTo`.
5. In Supabase → Authentication → Providers → Google, verify it is enabled with the correct Google OAuth client. Under Google Cloud Console → OAuth Client, the **Authorized redirect URI** must match the **exact callback displayed by this Supabase project**: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`. It is *not* the Vercel URL. Update Google Cloud if the project reference changed.
6. Test `https://<PROJECT-REF>.supabase.co/auth/v1/settings` in a browser: it must resolve and return a response, not DNS NXDOMAIN. If even the verified dashboard URL fails, check project status / DNS/network and Supabase service health.
7. In GitHub repo `anishbrodiya-code/Kingra-Dental-Clinic`, remove `.github/workflows/static.yml` (included in this ZIP's absence when copying), and go to Settings → Pages → Build and deployment; choose Deploy from a branch → branch **None** → Save if Pages is not used. The old failed historical deployment remains visible but new runs should stop.
8. Ensure Vercel's Git integration points to the same `main` branch, and verify a new Vercel deployment is **Ready**. GitHub Pages status does not indicate whether Vercel is up-to-date.

## Deploy fixed source to the existing Git repository

Use your **Git-cloned** working folder (`KDC-GitHub`) rather than running `git` inside extracted ZIP. Before copying, ensure any newer work in GitHub is preserved; this ZIP is a snapshot of the user-uploaded version and might be older than the remote repo.

Run from the fixed ZIP extracted source folder in PowerShell (adjust paths):

```powershell
# IMPORTANT: inspect differences with the latest GitHub `main` before replacing files.
# Copy only src/supabase.js, src/App.jsx, .env.example and FIX-LOGIN-AND-DEPLOY.md
# into the existing repo, and delete .github/workflows/static.yml there.
cd C:\Users\anish\OneDrive\Desktop\KDC-GitHub
git switch main
git pull origin main
git status
# After copying the repaired files into this Git clone:
git add -A
git commit -m "Guard Google login against unreachable Supabase URL and remove old Pages workflow"
git push origin main
```

Do not commit `.env.local`. It is intentionally ignored.

## Local test

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run dev
```

The new code checks the Supabase Auth endpoint **before redirecting** for Google login. If unreachable, the page shows a readable error. It cannot itself correct the incorrect URL: the Supabase and Vercel dashboard steps above are required.

## Security & boundaries

The project is a demonstration until independently reviewed. Use synthetic medical records. Phone OTP requires a real SMS provider and is not guaranteed to work by this code change. Do not create a fresh empty Supabase project unless you intend to migrate data and reconfigure all authentication/authorization and storage.
