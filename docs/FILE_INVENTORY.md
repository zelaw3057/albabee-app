# File Inventory

## Active Source Files

- `index.html`: main web calculator HTML.
- `style.css`: main web calculator CSS.
- `app.js`: main web calculator logic.
- `minimum-wage.html`: SEO page for 2026 minimum wage.
- `weekly-pay.html`: SEO page for weekly holiday allowance.
- `night-pay.html`: SEO page for night work allowance.
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

## Assets

- `favicon.png`
- `apple-touch-icon.png`
- `logo.png`
- `thumbnail.png`

These are active but should eventually move under `public/assets/images/` and `public/assets/icons/`.

## Generated Or Local Files

- `node_modules/`: generated dependency directory.
- `dist/`: generated web build output.
- `dist-toss/`: generated Toss output. Currently tracked and should be untracked after verification.
- `*.ait`: generated package artifacts.
- `.granite/`: local/generated Granite data.
- `backups/`: local source snapshots.

## Cleanup Candidates

Do not delete immediately. Verify first.

- `dist-toss/`: remove from Git tracking, keep ignored.
- root `*.ait`: keep local only or move to release storage.
- duplicate `style.css` and `toss-style.css`: extract shared CSS later.
- duplicate `app.js` and `toss-app.js`: extract shared calculator logic later.
- duplicated sitemap URL lists: generate from one registry later.
