# Albabee Project Structure

This document records the intended long-term structure for Albabee so SEO pages, the web calculator, Toss in-app output, and a future Flutter app do not collide.

## Current Runtime Map

| Area | Current files | Status | Notes |
| --- | --- | --- | --- |
| Main web calculator | `index.html`, `style.css`, `app.js` | Active | Public web entry served at `/`. Service worker caches these paths. |
| SEO pages | `minimum-wage.html`, `weekly-pay.html`, `night-pay.html` | Active | Static search landing pages. Each must be copied by `vite.config.ts` and listed in `sitemap.xml`. |
| SEO infrastructure | `sitemap.xml`, `robots.txt`, `functions/sitemap.xml.js`, `public/_headers`, `public/_routes.json` | Active but fragile | Sitemap is duplicated in root file and Cloudflare Function. Keep both in sync until sitemap generation is centralized. |
| PWA/static identity | `manifest.json`, `service-worker.js`, `favicon.png`, `apple-touch-icon.png`, `logo.png`, `thumbnail.png` | Active | Referenced by the web app and copied into production output. |
| Toss in-app source | `toss.html`, `toss-style.css`, `toss-app.js`, `vite.config.toss.ts`, `scripts/build-ait.mjs`, `granite.config.ts` | Active platform variant | Similar to web app but separate entry and build config. |
| Build outputs | `dist/`, `dist-toss/`, `*.ait` | Generated | Should not be edited by hand. `dist-toss/` is currently tracked in Git and should be untracked in a cleanup commit. |
| Dependencies | `node_modules/` | Generated | Never commit. Recreate with `npm install`. |
| Backups | `backups/`, `backup-old/` | Local only | Ignored by Git. Use for emergency snapshots, not as source of truth. |

## Main Risks

1. Sitemap drift: `sitemap.xml` and `functions/sitemap.xml.js` both contain URL lists.
2. Static copy drift: every new SEO page must be added to `vite.config.ts` or it will not appear in `dist/`.
3. Build artifact drift: `dist-toss/` is tracked today even though it is generated.
4. Web/Toss duplication: `app.js` and `toss-app.js`, plus `style.css` and `toss-style.css`, are large duplicated files.
5. Root clutter: many platform files live in the project root, so future pages and app variants can become hard to distinguish.
6. Service worker cache drift: renamed CSS/JS/image paths must be reflected in `service-worker.js`.

## Recommended Target Structure

Use this as the next migration target, not as an immediate all-at-once move.

```text
albabee-app/
  src/
    web/
      index.html
      css/
        app.css
      js/
        app.js
    toss/
      index.html
      css/
        toss.css
      js/
        toss.js
    seo/
      pages/
        minimum-wage.html
        weekly-pay.html
        night-pay.html
        labor-contract.html
        overtime-pay.html
        severance-pay.html
        tax-3-3.html
        holiday-pay.html
        probation-pay.html
      shared/
        seo.css
        seo-pages.json
        render-seo-page.mjs
  public/
    ads.txt
    robots.txt
    sitemap.xml
    manifest.json
    _headers
    _routes.json
    assets/
      images/
      icons/
  functions/
    sitemap.xml.js
  scripts/
    build-ait.mjs
    generate-sitemap.mjs
    validate-seo.mjs
  docs/
  backups/
```

## Migration Order

1. Add a central SEO registry such as `src/seo/shared/seo-pages.json`.
2. Generate `sitemap.xml` and `functions/sitemap.xml.js` from the registry.
3. Extract SEO shared CSS from inline styles into `src/seo/shared/seo.css`.
4. Move images/icons into `public/assets/` and update references.
5. Split web and Toss source files only after tests/builds pass.
6. Untrack generated `dist-toss/` after confirming Toss build can recreate it.

## Rules For New SEO Pages

Every SEO page should have:

- one `h1`;
- several `h2` sections;
- internal links to `/`, `/minimum-wage.html`, `/weekly-pay.html`, and `/night-pay.html` where relevant;
- a calculator CTA with the same text: `알바비 계산하러 가기`;
- FAQ visible in HTML and matching `FAQPage` JSON-LD;
- canonical URL;
- entry in `sitemap.xml`;
- entry in `functions/sitemap.xml.js` until sitemap generation is centralized;
- entry in `vite.config.ts` static files until the build is changed to discover SEO pages.

## Ownership Boundaries

- Main calculator changes go to `index.html`, `style.css`, `app.js`.
- Toss changes go to `toss.html`, `toss-style.css`, `toss-app.js`, Toss config, and AIT scripts.
- SEO content changes go to SEO HTML pages and sitemap files.
- Cloudflare routing/header changes go to `public/` and `functions/`.
- Generated output should not be manually edited.
