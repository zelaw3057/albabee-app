# Toss In-App Plan

Toss in-app work is paused while the public web homepage at `albabee.pages.dev` is stabilized.

Do not delete Toss source files. Keep them out of the normal web deployment path and return to them later from a separate branch or a focused Toss task.

## Current Toss-Related Files

Source and config:

- `toss.html`: Toss-specific HTML entry.
- `toss-style.css`: Toss-specific stylesheet.
- `toss-app.js`: Toss-specific app logic.
- `vite.config.toss.ts`: Toss web build config. Outputs to `dist-toss/`.
- `granite.config.ts`: Apps in Toss/Granite config.
- `scripts/build-ait.mjs`: AIT build runner.
- `.granite/`: local/generated Granite data. Ignored by Git.

Package scripts:

- `toss:dev`: starts `ait dev`.
- `toss:build:web`: runs the Toss Vite build config.
- `toss:build:ait`: runs the AIT packaging script.
- `build:ait`: legacy alias for AIT packaging.
- `web:build:ait`: legacy alias for the Toss Vite build.

Dependencies:

- `@apps-in-toss/framework`
- `@apps-in-toss/web-framework`

Generated outputs:

- `dist-toss/`
- `*.ait`

These outputs are ignored and should not be committed.

## Web Deployment Boundary

The normal web build uses `vite.config.ts`.

It copies only:

- `index.html`
- `app.js`
- `style.css`
- SEO pages
- static assets
- sitemap/robots/ads/manifest/service worker files

It does not copy `toss.html`, `toss-app.js`, `toss-style.css`, `vite.config.toss.ts`, or `granite.config.ts`.

## Toss Code Still Present In Web Files

The public web app currently contains a small Toss in-app browser policy:

- `app.js`: `isTossInAppBrowser()`
- `app.js`: `applyTossInAppPolicy()`
- `style.css`: `body.is-toss-inapp` rules

These are inert for normal browsers. They only apply when the user agent includes `toss`. Leave them alone unless a future web-only cleanup explicitly removes Toss behavior from the public web app.

## Donation And Sharing Notes

Web version:

- `index.html` loads Kakao SDK for Kakao sharing.
- `app.js` uses Kakao Share when available.
- `copyShareLink()` falls back to a hash-based URL if the `/s` short-link endpoint is unavailable.
- `openKakaoPayDonation()` opens a KakaoPay URL.

Toss behavior:

- `applyTossInAppPolicy()` hides the support/donation area and Kakao share button in Toss in-app browsers.
- Toss-specific sharing behavior should be rechecked before reactivation.

## Re-Entry Checklist

When Toss work resumes:

1. Create a separate branch, for example `toss-inapp`.
2. Run `npm install` if dependencies are missing.
3. Run `npm run toss:dev` for Toss development.
4. Run `npm run toss:build:web` to confirm `dist-toss/` is recreated.
5. Run `npm run toss:build:ait` to package AIT output.
6. Verify `granite.config.ts`:
   - `appName`
   - brand display name and icon
   - clipboard permissions
   - `webViewProps`
   - output directory
7. Compare `app.js` and `toss-app.js` before copying any logic between them.
8. Do not commit `dist-toss/`, `.granite/`, or `*.ait`.

## Caution

Do not change these while focusing on web stability unless there is a clear web bug:

- `index.html`
- `app.js`
- `style.css`
- `vite.config.ts`
- `sitemap.xml`
- `robots.txt`
- SEO pages

The web homepage remains the source of truth for the public site.
