# Backup And Deployment Policy

## Cleanup Safety Gate

Before cleanup, renaming, archiving, or deleting files, follow [Cleanup Safety Policy](./CLEANUP_SAFETY_POLICY.md).

Run:

```powershell
npm.cmd run check:assets
```

Do not move any file that appears in the referenced asset report.

## Backup Rule

By default, do not keep backup, old, temp, or version folders inside `albabee-app`.

Avoid these inside the project:

- `backups/` except the current ignored cleanup backup
- `backup-old/`
- `old/`
- `temp/`
- `v8/`, `v9/`, `index_final_v8.html`
- copied HTML files used only for safekeeping

Reasons:

- Git tracking can become confusing.
- Cloudflare Pages may deploy unexpected files.
- Google can discover duplicate pages if they reach the published output.
- Future AI/code edits may accidentally modify an old copy.

Use external date-based folders instead:

```text
Desktop\backups\albabee-app\YYYY-MM-DD
Desktop\backups\albabee-app\YYYY-MM-DD-HHMMSS
Desktop\backups\albabee-app\YYYY-MM-DD-label.zip
```

## Git Is The Main Rollback Tool

Use Git commits and tags as the primary rollback method.

Before large SEO or platform changes:

```powershell
npm.cmd run build
git status --short
git tag stable-YYYY-MM-DD-label
git push origin main --tags
```

## What Git Should Track

Track:

- source HTML, CSS, and JS;
- `package.json` and `package-lock.json`;
- Vite, Toss, Cloudflare, and service worker config;
- `public/_headers` and `public/_routes.json`;
- `functions/`;
- `scripts/`;
- `docs/`;
- root verification/static files such as `robots.txt`, `sitemap.xml`, `ads.txt`, and Google verification files.

Do not track:

- `node_modules/`;
- `dist/`;
- `dist-toss/`;
- `*.ait`;
- `.granite/`;
- backup folders;
- old/temp/version folders;
- local environment files;
- test reports and coverage output.

## Deployment Checklist

Before web deployment:

1. Run `npm.cmd run build`.
2. Run `npm.cmd run check:assets:dist`.
3. Confirm `dist/minimum-wage.html`, `dist/weekly-pay.html`, and `dist/night-pay.html` exist.
4. Confirm `dist/sitemap.xml` exists.
5. Confirm `dist/images/logo/albabee-logo.png`, `dist/images/banners/main-banner-v2.png`, `dist/images/icons/app-icon.png`, `dist/images/icons/kakao.png`, and `dist/images/icons/excel.png` exist.
6. Confirm `public/sitemap.xml` and `functions/sitemap.xml.js` contain the same public SEO URLs.
7. Confirm `public/robots.txt` points to `https://albabee.pages.dev/sitemap.xml`.

Before Toss/AIT packaging:

1. Run `npm.cmd run build:ait`.
2. Confirm generated Toss files are recreated from source.
3. Do not edit generated bundles by hand.

## Cloudflare And SEO Notes

Only real public pages should appear in `sitemap.xml`.

Do not place backup HTML files under the project root or `public/`. If a copied file is included in the build output, Cloudflare may serve it and Google may treat it as duplicate content.

Cloudflare-specific sitemap protection currently lives in:

- `public/_headers`
- `public/_routes.json`
- `functions/sitemap.xml.js`

Do not remove these unless sitemap behavior is tested again after deployment.
