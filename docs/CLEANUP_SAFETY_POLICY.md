# Cleanup Safety Policy

This policy is mandatory before moving, archiving, renaming, or deleting files.

## Absolute Rules

1. Do not move or delete files until references are scanned.
2. Scan all HTML, CSS, JS, JSON, and webmanifest files before cleanup.
3. Treat these references as active usage:
   - `img src`
   - `background-image` and `url(...)`
   - favicon links
   - `apple-touch-icon`
   - `og:image` and `twitter:image`
   - manifest icons
   - JS asset paths
   - `import` and `export` asset paths
4. Never move a referenced file to `backup_unused`.
5. Prefer archive over deletion. Use an external archive folder first:

```text
Desktop\backups\albabee-app\archive\YYYY-MM-DD\
```

6. Keep project-internal files limited to current source/runtime files.
7. Keep active images under:

```text
public/images/logo/
public/images/banners/
public/images/icons/
public/images/og/
```

For the current Cloudflare Pages publish-root deployment, keep the root `images/` mirror synchronized with the live files in `public/images/`.

8. Use absolute runtime image paths only:

```html
<img src="/images/logo/albabee-logo.png" alt="알바BEE 로고">
```

Do not use:

```html
<img src="./images/logo.png">
<img src="../images/logo.png">
<img src="images/logo.png">
```

## Required Pre-Cleanup Procedure

Run:

```powershell
npm.cmd run check:assets
git status --short
```

Before moving anything, report:

- files planned for move/archive;
- whether each file is referenced;
- paths that reference each file;
- risk level and reason;
- exact destination folder.

If any referenced file is included in a move list, stop.

## Rename Procedure

When renaming an asset, update every reference in the same change:

- HTML;
- CSS;
- JS;
- inline styles;
- favicon and apple-touch-icon links;
- `og:image` and `twitter:image`;
- JSON-LD logo/image;
- manifest icons;
- service worker cache lists.

Then run:

```powershell
npm.cmd run check:assets
npm.cmd run build
npm.cmd run check:assets:dist
```

## Required Post-Cleanup Verification

Run:

```powershell
npm.cmd run check:assets
npm.cmd run build
npm.cmd run check:assets:dist
```

Also verify these deployment URLs in local preview or after deployment:

- `/images/logo/albabee-logo.png`
- `/images/banners/main-banner-v2.png`
- `/images/icons/app-icon.png`
- `/images/icons/excel.png`
- `/images/icons/kakao.png`
- `/site.webmanifest`
- `/manifest.json`
- `/weekly-pay`
- `/night-pay`
- `/minimum-wage`

## Post-Cleanup Report

Report:

- changed files;
- moved or archived files;
- changed paths;
- missing files, if any;
- broken references, if any;
- source asset check result;
- dist asset check result;
- build result;
- whether recovery was needed.
