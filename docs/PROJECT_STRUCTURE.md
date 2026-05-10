# Albabee Project Structure

This document defines the current source layout after the 2026-05 cleanup.

## Runtime Layout

```text
albabee-app/
  index.html                    # main web calculator route
  toss.html                     # Toss in-app route
  minimum-wage.html             # SEO route, kept at root for URL stability
  weekly-pay.html               # SEO route, kept at root for URL stability
  night-pay.html                # SEO route, kept at root for URL stability
  wage-guide.html               # SEO route, kept at root for URL stability
  about.html
  privacy.html
  terms.html
  contact.html
  styles/
    main.css                    # main web calculator styles
    toss.css                    # Toss in-app styles
  scripts/
    app.js                      # main web calculator logic
    toss-app.js                 # Toss in-app logic
    build-ait.mjs               # Toss AIT build helper
  public/
    images/
      hero-banner.png
      app-icon.png
      kakao-icon.png
      excel-icon.png
    _headers
    _routes.json
    _redirects
  functions/
    sitemap.xml.js
    _share-storage.js
    s/
  docs/
  backups/                      # local backup only, ignored by Git
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

The old root `images/` folder was a byte-identical duplicate and has been moved to:

```text
backups/unused_assets_2026-05/images-root-duplicate/
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
3. Sitemap sources still exist in both `sitemap.xml` and `functions/sitemap.xml.js`; keep them synchronized until generation is centralized.
4. Toss source is separate from web source. Changes to calculator behavior may need to be ported intentionally.

## Recommended Next Refactors

1. Extract shared CSS sections from `styles/main.css` only after visual screenshots are in place.
2. Split `scripts/app.js` by feature in this order: calendar, allowances, sharing/export, calculation.
3. Add a small SEO registry and generate `sitemap.xml` plus `functions/sitemap.xml.js`.
4. Add lightweight smoke tests for `/`, `/weekly-pay.html`, `/minimum-wage.html`, `/night-pay.html`, and `/wage-guide.html`.
