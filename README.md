# Albabee Calculator

Albabee is an hourly wage calculator platform for part-time workers. The project currently includes:

- main web calculator;
- static SEO guide pages;
- Toss in-app variant;
- Cloudflare Pages sitemap handling;
- PWA assets and service worker.

## Common Commands

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run web:build
```

## Important Files

- `index.html`, `styles/main.css`, `scripts/app.js`: main web calculator.
- `minimum-wage.html`, `weekly-pay.html`, `night-pay.html`: SEO pages.
- `toss.html`, `styles/toss.css`, `scripts/toss-app.js`: Toss in-app source.
- `sitemap.xml`, `functions/sitemap.xml.js`: sitemap output. Keep these in sync until sitemap generation is centralized.
- `vite.config.ts`: web build static copy list. Add every new root SEO page here.
- `public/_headers`, `public/_routes.json`: Cloudflare sitemap behavior.

## Toss Status

Toss in-app work is paused while the public web homepage is stabilized. Keep Toss source files, but use the normal web commands for homepage work. Toss notes and re-entry steps live in `docs/TOSS_INAPP_PLAN.md`.

## Docs

- `docs/PROJECT_STRUCTURE.md`: current map, risks, and target structure.
- `docs/SEO_EXPANSION_PLAN.md`: SEO page rules and future page plan.
- `docs/BACKUP_AND_DEPLOYMENT.md`: backup, Git, and deployment policy.
- `docs/FILE_INVENTORY.md`: file-by-file inventory.

## Backup Note

The current cleanup backup is stored at `backups/stable_build_2026-05/` and is ignored by Git. Use Git commits and tags as the primary rollback method for deployable changes.
