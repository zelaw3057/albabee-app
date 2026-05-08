# Backup And Deployment Policy

## Backup Snapshot Created

A local source snapshot was created at:

```text
backups/2026-05-08-stable-source/
```

It includes source HTML/CSS/JS, config, public routing files, scripts, and images. It excludes:

- `.git/`
- `node_modules/`
- `dist/`
- `dist-toss/`
- `.granite/`
- `*.ait`

The backup directory is ignored by Git so it cannot accidentally deploy or bloat the repository.

## Recommended Backup Model

Use Git as the primary source of truth.

1. Before a large SEO or platform change, make sure `npm.cmd run build` passes.
2. Commit the current stable state.
3. Create a Git tag with a date and purpose.

Example:

```powershell
git tag stable-2026-05-08-pre-seo-expansion
git push origin stable-2026-05-08-pre-seo-expansion
```

Use local `backups/YYYY-MM-DD-label/` only as an extra emergency snapshot. Do not treat backup folders as production source.

## What Git Should Track

Track:

- source HTML/CSS/JS;
- `package.json` and `package-lock.json`;
- Vite, Toss, Cloudflare, and service worker configuration;
- `public/_headers` and `public/_routes.json`;
- `functions/`;
- `scripts/`;
- docs.

Do not track:

- `node_modules/`;
- `dist/`;
- `dist-toss/`;
- `*.ait`;
- `.granite/`;
- backup folders;
- local environment files;
- test reports and coverage output.

## Current Git Cleanup Needed

`dist-toss/` is currently tracked even though it is generated output. The safe cleanup path is:

```powershell
git rm -r --cached dist-toss
git status --short
npm.cmd run build:ait
```

Only commit this after confirming Toss packaging still recreates the required output.

## Deployment Checklist

Before deploying the web app:

1. Run `npm.cmd run build`.
2. Confirm `dist/minimum-wage.html`, `dist/weekly-pay.html`, and `dist/night-pay.html` exist.
3. Confirm `dist/sitemap.xml` exists.
4. Confirm `sitemap.xml` and `functions/sitemap.xml.js` contain the same SEO URLs.
5. Confirm `robots.txt` points to `https://albabee.pages.dev/sitemap.xml`.

Before deploying Toss/AIT:

1. Run `npm.cmd run build:ait`.
2. Confirm generated Toss files are recreated from source.
3. Do not edit generated bundles by hand.

## Cloudflare Notes

The project has Cloudflare-specific sitemap protection:

- `public/_headers`
- `public/_routes.json`
- `functions/sitemap.xml.js`

These files were likely added to prevent sitemap mutation or SPA fallback behavior. Do not remove them during cleanup unless sitemap behavior is re-tested on Cloudflare Pages.
