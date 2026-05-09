# File Inventory

## Active Source Files

- `index.html`: main web calculator HTML.
- `style.css`: main web calculator CSS.
- `app.js`: main web calculator logic.
- `minimum-wage.html`: SEO page for 2026 minimum wage.
- `weekly-pay.html`: SEO page for weekly holiday allowance.
- `night-pay.html`: SEO page for night work allowance.
- `wage-guide.html`: SEO hub page for wage calculation guidance.
- `about.html`: site introduction page.
- `privacy.html`: privacy policy page.
- `terms.html`: terms of service page.
- `contact.html`: contact page.
- `toss.html`: Toss in-app HTML entry.
- `toss-style.css`: Toss in-app CSS.
- `toss-app.js`: Toss in-app logic.
- `manifest.json`: PWA manifest.
- `service-worker.js`: PWA cache worker.
- `robots.txt`: crawler policy.
- `sitemap.xml`: public sitemap source.
- `ads.txt`: ad verification.
- `googlea2096e83ab533dd5.html`: Google verification file.

## Active Config And Scripts

- `package.json`: npm scripts and dependencies.
- `package-lock.json`: locked dependency graph.
- `vite.config.ts`: web build config and static file copy list.
- `vite.config.toss.ts`: Toss web build config.
- `granite.config.ts`: Apps in Toss/Granite config.
- `scripts/build-ait.mjs`: Toss AIT build runner.
- `functions/sitemap.xml.js`: Cloudflare Function serving sitemap XML.
- `public/_headers`: Cloudflare headers for sitemap.
- `public/_routes.json`: Cloudflare routes for sitemap handling.
- `docs/`: project structure, SEO, backup, and deployment policy.

## Active Assets

- `favicon.png`
- `apple-touch-icon.png`
- `logo.png`
- `thumbnail.png`
- `images/hero-banner.png`
- `images/app-icon.png`
- `images/kakao-icon.png`
- `images/excel-icon.png`
- `public/images/hero-banner.png`
- `public/images/app-icon.png`
- `public/images/kakao-icon.png`
- `public/images/excel-icon.png`

The root `images/` folder is active for the current Cloudflare Pages deployment path.
The `public/images/` copy is active for Vite-style static handling and should stay in sync with root `images/` until deployment is centralized.

## Local Or Generated Files

These may exist locally, but should not be tracked or kept as source:

- `node_modules/`: generated dependency directory.
- `dist/`: generated web build output.
- `dist-toss/`: generated Toss output.
- `*.ait`: generated package artifacts.
- `.granite/`: local/generated Granite data.

## Removed From Project Root

These should not be restored into the working project root:

- internal `backups/`;
- local `dist/`;
- local `dist-toss/`;
- root `*.ait` files.

Current stable external backup target:

```text
C:\Users\User.DESKTOP-BLBKBC2\Desktop\albabee-backup-2026-05-09-ui-stable.zip
```

## Future Cleanup Candidates

- Extract shared CSS from `style.css` and `toss-style.css`.
- Extract shared calculator logic from `app.js` and `toss-app.js`.
- Generate sitemap files from one SEO registry.
- Centralize image/icon assets only after Cloudflare Pages root/static behavior is re-tested.
