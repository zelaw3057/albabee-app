# Albabee Calculator

Albabee is an hourly wage calculator platform for part-time workers. The project currently includes:

- main web calculator;
- static SEO guide pages;
- Toss in-app variant;
- Cloudflare Pages sitemap handling;
- PWA assets and service worker.

## Common Commands

```powershell
npm.cmd run build
npm.cmd run web:build
npm.cmd run build:ait
```

## Important Files

- `index.html`, `style.css`, `app.js`: main web calculator.
- `minimum-wage.html`, `weekly-pay.html`, `night-pay.html`: SEO pages.
- `toss.html`, `toss-style.css`, `toss-app.js`: Toss in-app source.
- `sitemap.xml`, `functions/sitemap.xml.js`: sitemap output. Keep these in sync until sitemap generation is centralized.
- `vite.config.ts`: web build static copy list. Add every new root SEO page here.
- `public/_headers`, `public/_routes.json`: Cloudflare sitemap behavior.

## Docs

- `docs/PROJECT_STRUCTURE.md`: current map, risks, and target structure.
- `docs/SEO_EXPANSION_PLAN.md`: SEO page rules and future page plan.
- `docs/BACKUP_AND_DEPLOYMENT.md`: backup, Git, and deployment policy.
- `docs/FILE_INVENTORY.md`: file-by-file inventory.

## Backup Note

Do not keep backup folders inside this project. Use external date-based folders such as `Desktop\albabee-backup-2026-05-09`, and use Git commits and tags as the primary rollback method.
