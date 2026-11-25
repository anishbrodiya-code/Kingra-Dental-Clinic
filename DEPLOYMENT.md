# Preview and publish through the existing projects

The repository is [Kingra-Dental-Clinic](https://github.com/anishbrodiya-code/Kingra-Dental-Clinic) and the live domain is [kingra-dental-clinic.vercel.app](https://kingra-dental-clinic.vercel.app).

From the extracted V3 folder, run the following in the macOS terminal. The clone is a sibling folder. Use an unused folder name if it already exists.

```sh
git clone https://github.com/anishbrodiya-code/Kingra-Dental-Clinic.git ../kingra-v3-release
git -C ../kingra-v3-release switch -c kdc-v3-refined-bento
rsync -av --exclude='.git' --include='.env.example' --exclude='.env*' \
  --exclude='node_modules' --exclude='dist' --exclude='.DS_Store' \
  --exclude='supabase/' ./ ../kingra-v3-release/
cd ../kingra-v3-release
git status --short
npm ci --include=dev
npm test
npm run build
```

The copy excludes local environment files and leaves the repository's existing Supabase migration directory untouched. Review the changes and any legacy files before staging. Keep any production-specific configuration required by the existing repository. The deployment guide assumes the app is at the repository root.

```sh
git add -A
git diff --cached --stat
git commit -m "Refine Kingra Dental Care bento UI"
git push -u origin kdc-v3-refined-bento
```

1. Open a pull request into `main` on the existing repo. In the existing Vercel project, verify the linked repository, root directory, and production branch.
2. Open the branch's Vercel Preview deployment. Verify the homepage and portal layouts. For authenticated checks, use a staging Supabase project with Preview-scoped public URL and key. Allow the preview origin in staging Auth redirects if needed.
3. Merge once the preview is approved. If the Vercel project's tracked production branch is `main`, that merge triggers a production build. Verify the deployment is Ready and smoke-check the existing live domain. Reuse the existing Production environment values. No SQL migration is required for this UI release.

[Git deployments on Vercel](https://vercel.com/docs/git)
