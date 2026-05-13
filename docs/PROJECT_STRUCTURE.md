# Albabee Project Structure

This document defines the current source layout after the 2026-05-14 cleanup.

## Runtime Layout

```text
albabee-app/
  index.html                    # main web calculator route
  minimum-wage.html             # SEO route, kept at root for URL stability
  weekly-pay.html               # SEO route, kept at root for URL stability
  night-pay.html                # SEO route, kept at root for URL stability
  wage-guide.html               # SEO route, kept at root for URL stability
  about.html
  privacy.html
  terms.html
  contact.html
  notice.html
  holiday-pay.html
  overtime-pay.html
  styles/
    main.css                    # main web calculator styles
  scripts/
    app.js                      # main web calculator logic
    site-nav.js                 # shared mobile drawer navigation
  public/
    ads.txt
    robots.txt
    sitemap.xml
    images/
      logo/
        albabee-logo.png
      hero/
        hero-banner.png
      icons/
        app-icon.png
        kakao-icon.png
        excel-icon.png
      seo/
    _headers
    _routes.json
    _redirects
  pages/                        # reserved for a future routed/page-generation migration
  src/
    styles/                     # reserved for future CSS modules
    components/                 # reserved for future shared components
    utils/                      # reserved for future JS utilities
    data/                       # reserved for future SEO/page registries
  functions/
    sitemap.xml.js
    _share-storage.js
    s/
  docs/
  archive/
    toss-inapp/                 # archived Toss source, excluded from web workflow
```

## Why SEO Pages Stay In Root

The public URLs currently used by sitemap, search engines, and internal links are root URLs such as:

- `/weekly-pay.html`
- `/minimum-wage.html`
- `/night-pay.html`
- `/wage-guide.html`

Moving those files into `/pages` would change URLs or require redirects. For SEO safety, the source HTML remains at the root until a route-generation step is added.

## Active Asset Policy

Only `public/images/` is the active image source for app UI assets. Vite serves these at `/images/...`.

Use role-based image folders:

```text
/images/logo/albabee-logo.png
/images/hero/albabee-hero-banner.png
/images/icons/app-icon.png
/images/icons/excel.png
/images/icons/kakao.png
```

Use absolute `/images/...` paths only. Do not use `./images/...`, `../images/...`, or `images/...` in active HTML, CSS, JS, manifest, or SEO metadata.

Before moving, renaming, archiving, or deleting files, follow [Cleanup Safety Policy](./CLEANUP_SAFETY_POLICY.md) and run:

```powershell
npm.cmd run check:assets
```

## Build Outputs

Generated output must not be edited manually:

- `dist/`
- `dist-toss/`
- `*.ait`
- `node_modules/`

These are ignored by Git and can be recreated.

## Current Risks

1. `styles/main.css` and `scripts/app.js` are still large files. They are now in clearer folders, but feature-level splitting should be done gradually with browser regression checks.
2. SEO URLs are root-based by design. Do not move SEO HTML into `/pages` without adding redirects and sitemap updates.
3. Sitemap sources still exist in both `public/sitemap.xml` and `functions/sitemap.xml.js`; keep them synchronized until generation is centralized.
4. Toss source is archived under `archive/toss-inapp/` and is intentionally excluded from current web build, preview, and routing validation.

## Recommended Next Refactors

1. Extract shared CSS sections from `styles/main.css` only after visual screenshots are in place.
2. Split `scripts/app.js` by feature in this order: calendar, allowances, sharing/export, calculation.
3. Add a small SEO registry and generate `public/sitemap.xml` plus `functions/sitemap.xml.js`.
4. Add lightweight smoke tests for `/`, `/weekly-pay.html`, `/minimum-wage.html`, `/night-pay.html`, and `/wage-guide.html`.
