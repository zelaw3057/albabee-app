# File Inventory

## Active App Source

- `index.html`: main web calculator HTML.
- `styles/main.css`: main web calculator CSS.
- `scripts/app.js`: main web calculator logic.

## Active SEO And Policy Pages

These remain in the project root to preserve existing public URLs:

- `minimum-wage.html`
- `weekly-pay.html`
- `night-pay.html`
- `overtime-pay.html`
- `holiday-pay.html`
- `wage-guide.html`
- `faq.html`
- `notice.html`
- `how-to-use.html`
- `about.html`
- `privacy.html`
- `terms.html`
- `contact.html`

## Active Config And Scripts

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `functions/sitemap.xml.js`
- `functions/_share-storage.js`
- `functions/s/`
- `public/_headers`
- `public/_routes.json`
- `public/_redirects`

## Active SEO/PWA Infrastructure

- `manifest.json`
- `service-worker.js`
- `public/robots.txt`
- `public/sitemap.xml`
- `public/ads.txt`
- `googlea2096e83ab533dd5.html`
- `favicon.png`
- `apple-touch-icon.png`
- `logo.png`
- `thumbnail.png`

## Active UI Images

Active image assets live in `public/images/`:

- `public/images/logo/albabee-logo.png`
- `public/images/hero/hero-banner.png`
- `public/images/icons/app-icon.png`
- `public/images/icons/kakao-icon.png`
- `public/images/icons/excel-icon.png`
- `public/images/seo/` is reserved for future SEO images.

These are served publicly as `/images/...`.

## Backup And Unused Assets

- `backups/stable_build_2026-05/`: source backup taken before cleanup.
- `backups/unused_assets_2026-05/images-root-duplicate/`: old root `images/` duplicate moved out of active source.
- `backup_2026_05_14_before_cleanup/`: pre-cleanup source backup.
- `backup_unused/`: temporary verification output and other safely removed local-only files.
- `archive/toss-inapp/`: archived Toss in-app source/config. Excluded from current web stabilization workflow.

Both folders are ignored by Git.

## Generated Or Local Only

- `node_modules/`
- `dist/`
- `dist-toss/`
- `.granite/`
- `.vite/`
- `.cache/`
- `.wrangler/`
- `*.ait`
- `*.log`

## Cleanup Analysis

- No separate test files were found.
- Temporary Vite logs and `tmp-seo-verify/` screenshots were moved to `backup_unused/temp_files/`.
- Main CSS/JS and Toss CSS/JS were moved into role-based folders.
- Toss source/config was later moved into `archive/toss-inapp/` so current verification stays web-only.
- SEO pages were intentionally not moved into `/pages` to avoid breaking existing indexed URLs.
