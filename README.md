# Albabee Calculator

Albabee is an hourly wage calculator platform for part-time workers. The project currently includes:

- main web calculator;
- static SEO guide pages;
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
- `public/sitemap.xml`, `functions/sitemap.xml.js`: sitemap output. Keep these in sync until sitemap generation is centralized.
- `vite.config.ts`: web build static copy list. Add every new root SEO page here.
- `public/ads.txt`, `public/robots.txt`, `public/_headers`, `public/_routes.json`: public SEO and Cloudflare behavior.

## Toss Status

Toss in-app work is out of the current web stabilization workflow. Archived Toss files live in `archive/toss-inapp/` and should not be built, edited, or verified during normal Cloudflare Pages work.

## Docs

- `docs/PROJECT_STRUCTURE.md`: current map, risks, and target structure.
- `docs/SEO_EXPANSION_PLAN.md`: SEO page rules and future page plan.
- `docs/BACKUP_AND_DEPLOYMENT.md`: backup, Git, and deployment policy.
- `docs/FILE_INVENTORY.md`: file-by-file inventory.

## Backup Note

The 2026-05-14 cleanup backup is stored at `backup_2026_05_14_before_cleanup/`. Use Git commits and tags as the primary rollback method for deployable changes.
