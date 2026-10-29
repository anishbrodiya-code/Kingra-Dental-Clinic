# Email verification opening a new tab or failing to connect

The email confirmation link must redirect to a site that is running.

1. Run `npm.cmd run dev` and leave VS Code terminal open. Confirm `http://localhost:5173` works in **the same browser and computer** where you click the email.
2. Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: add `http://localhost:5173/**`
3. Supabase Dashboard → Authentication → Providers → Email: enable Email.
4. **Request a fresh sign-in email after changing the URLs**. Old emails may still use the old destination and expire.
5. If the browser shows ERR_CONNECTION_REFUSED, the local server is not running, uses a different port, or the link was opened on another device.
6. If the browser shows an auth error on KDC, return to the sign-in page and request a fresh code or link.
7. If clicking the link shows a *different* host such as `localhost:3000`, configure Supabase as above and request a new email.

For deployed use, configure the production Vercel URL in Supabase allowed Redirect URLs and update the Site URL to the public URL once live.

**Security:** Never disable row-level security, share Supabase service_role/secret keys, or upload real patient records for this demo.
