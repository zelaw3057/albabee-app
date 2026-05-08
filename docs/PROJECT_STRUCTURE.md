# Albabee Project Structure

This document defines the clean operating structure for Albabee.

## Current Runtime Map

| Area | Current files | Status | Notes |
| --- | --- | --- | --- |
| Main web calculator | `index.html`, `style.css`, `app.js` | Active | Public web entry served at `/`. |
| SEO pages | `minimum-wage.html`, `weekly-pay.html`, `night-pay.html` | Active | Only real SEO pages should be in the root and sitemap. |
| SEO infrastructure | `sitemap.xml`, `robots.txt`, `functions/sitemap.xml.js`, `public/_headers`, `public/_routes.json` | Active | Sitemap URLs are duplicated in root XML and Cloudflare Function until generation is centralized. |
| PWA/static identity | `manifest.json`, `service-worker.js`, `favicon.png`, `apple-touch-icon.png`, `logo.png`, `thumbnail.png` | Active | Referenced by the web app and copied into production output. |
| Toss in-app source | `toss.html`, `toss-style.css`, `toss-app.js`, `vite.config.toss.ts`, `scripts/build-ait.mjs`, `granite.config.ts` | Active platform variant | Generated Toss output must not be tracked. |
| Build outputs | `dist/`, `dist-toss/`, `*.ait` | Generated | Recreate from source. Do not edit or track. |
| Dependencies | `node_modules/` | Generated | Local only. Recreate with `npm install`. |
| Backups | external `Desktop\albabee-backup-*` folders | External only | Do not keep backup folders inside `albabee-app`. |

## Clean Root Rule

The project root should contain only active source/config files needed to build or deploy the current product.

Do not keep these in the project:

- backup folders;
- old copies;
- temp HTML files;
- generated bundles;
- package artifacts;
- versioned files such as `index_final_v8.html`.

## Current Risks

1. Sitemap drift: `sitemap.xml` and `functions/sitemap.xml.js` both contain URL lists.
2. Static copy drift: every new SEO page must be added to `vite.config.ts` or it will not appear in `dist/`.
3. Web/Toss duplication: `app.js` and `toss-app.js`, plus `style.css` and `toss-style.css`, are large duplicated files.
4. Service worker cache drift: renamed CSS/JS/image paths must be reflected in `service-worker.js`.
5. SEO duplicate risk: backup HTML files in the root or `public/` could be deployed and crawled.

## Recommended Target Structure

Use this as a gradual migration target:

```text
albabee-app/
  src/
    web/
      index.html
      css/app.css
      js/app.js
    toss/
      index.html
      css/toss.css
      js/toss.js
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
    assets/
      images/
      icons/
    _headers
    _routes.json
  functions/
  scripts/
  docs/
```

Backups stay outside this tree.

## Migration Order

1. Keep the root clean and remove generated/backup files from Git.
2. Add a central SEO registry such as `src/seo/shared/seo-pages.json`.
3. Generate `sitemap.xml`, `functions/sitemap.xml.js`, and SEO navigation from the registry.
4. Extract SEO shared CSS from inline styles into a shared CSS file.
5. Move images/icons into `public/assets/` and update references.
6. Split web and Toss source only after web and Toss builds pass.

## Rules For New SEO Pages

Every SEO page should have:

- one `h1`;
- multiple `h2` sections;
- internal links to `/`, `/minimum-wage.html`, `/weekly-pay.html`, and `/night-pay.html` where relevant;
- a calculator CTA with text like `알바비 계산하러 가기`;
- a related information hub section;
- FAQ visible in HTML and matching `FAQPage` JSON-LD;
- canonical URL;
- entry in `sitemap.xml`;
- entry in `functions/sitemap.xml.js` until sitemap generation is centralized;
- entry in `vite.config.ts` static copy list until the build discovers SEO pages automatically.

## Ownership Boundaries

- Main calculator changes: `index.html`, `style.css`, `app.js`.
- Toss changes: `toss.html`, `toss-style.css`, `toss-app.js`, Toss config, AIT scripts.
- SEO content changes: SEO HTML pages and sitemap files.
- Cloudflare routing/header changes: `public/` and `functions/`.
- Generated output: never edit manually.
