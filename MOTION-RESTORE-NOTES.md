# Dashboard Motion Figure — Restore Notes

- Restored the original orbit/ring motion figure behind the public landing dashboard hero preview.
- Leaves patient and doctor dashboard functionality untouched.
- Animation is a slow, low-contrast 45-second ring rotation, limited to the background.
- Preserves the seven-rule cleanup for service cards, navigation, and controls.
- No nested overlay cards restored.
- Respects `prefers-reduced-motion: reduce` and includes dark-mode colours and mobile sizing.

## Verify
1. Run `npm install && npm run dev`.
2. Visit the public homepage and verify the subtle orbit behind the portal preview.
3. Verify dark mode, mobile layout, and no overlap with CTAs.
4. Verify portal login / appointment controls as before.

No cloud deployment or Supabase database changes are made.
