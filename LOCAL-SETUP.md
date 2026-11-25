# Kingra Dental Care · Local setup

Use Node.js 22 or 24 LTS with npm. Open a terminal in the extracted folder that contains `package.json`.

```sh
npm install
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` in place of `cp`.

Edit `.env.local` and set `VITE_SUPABASE_URL` to the HTTPS project URL and `VITE_SUPABASE_ANON_KEY` to the public publishable or anon key from the same Supabase project. Keep server/service-role keys out of the frontend. Use a staging project and test accounts for booking, uploading and other write tests. The public homepage also runs with no environment file.

```sh
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Keep the same origin throughout sign-in. If you use `http://localhost:5173/` instead, allow that origin separately in Supabase. Restart Vite after changing the environment file.

## Google OAuth and existing accounts

- The Supabase project used for sign-in needs Google enabled under Authentication providers. Use the project’s Supabase auth callback URL in the Google OAuth client’s authorized redirect URIs.
- In Supabase Authentication → URL Configuration, the application URL must be allowed as a redirect. For the command above, use `http://127.0.0.1:5173`. Use a staging project for configuring or validating this setup.
- Google is the only sign-in option in this app. A Google account with the same eligible email can use Supabase's automatic identity linking. A phone-only account or one under a different email may require administrator help before rollout. Verify that Google opens the same Supabase user ID, records, and role for existing staff and patients on staging.
- This release removes the email and SMS flows from the app. It makes no changes to the Supabase project's enabled Auth providers or existing sessions.
- The package uses the existing schema, Storage, role/profile lookup and row-level policies. You do not need to run a SQL file against an already provisioned project to apply this redesign.

[Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google) · [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) · [Identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)

## Verify and build

Run `npm run build` after configuring your environment to generate the deployable `dist/` output.

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

Preview defaults to port 4173. Use the dev origin for sign-in unless the preview origin is also allowed by the staging Supabase project. Vite embeds the public environment values during the build.
