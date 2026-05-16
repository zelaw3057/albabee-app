import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const checkDist = args.has('--dist');
const baseDir = checkDist ? join(root, 'dist') : root;

const sourceExtensions = new Set([
  '.html',
  '.css',
  '.js',
  '.json',
  '.webmanifest',
]);

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-toss',
  'archive',
  'backups',
  'backup_unused',
  'unused-assets',
  'tmp',
  'temp',
]);

const requiredSourceAssets = [
  'public/images/logo/albabee-logo.png',
  'public/images/banners/albabee-main-banner.png',
  'public/images/icons/app-icon.png',
  'public/images/icons/excel.png',
  'public/images/icons/kakao.png',
  'public/images/seo',
  'public/_routes.json',
  'public/_headers',
  'public/_redirects',
  'public/robots.txt',
  'public/sitemap.xml',
];

const requiredDistAssets = [
  'images/logo/albabee-logo.png',
  'images/banners/albabee-main-banner.png',
  'images/icons/app-icon.png',
  'images/icons/excel.png',
  'images/icons/kakao.png',
  '_routes.json',
  '_headers',
  '_redirects',
  'robots.txt',
  'sitemap.xml',
  'manifest.json',
  'site.webmanifest',
];

const refPatterns = [
  /\b(?:src|href|content|imageUrl)\s*=\s*["']([^"']+\.(?:png|jpe?g|webp|svg|ico)(?:\?[^"']*)?)["']/gi,
  /url\(\s*["']?([^"')]+?\.(?:png|jpe?g|webp|svg|ico)(?:\?[^"')]*)?)["']?\s*\)/gi,
  /"src"\s*:\s*"([^"]+?\.(?:png|jpe?g|webp|svg|ico)(?:\?[^"]*)?)"/gi,
  /\bimageUrl\s*:\s*["']([^"']+\.(?:png|jpe?g|webp|svg|ico)(?:\?[^"']*)?)["']/gi,
  /\b(?:import|export)\b[^"']*["']([^"']+\.(?:png|jpe?g|webp|svg|ico))["']/gi,
];

const references = [];
const missing = [];
const relativeImageRefs = [];
const badPublicImageRefs = [];
const checkedFiles = [];

function toPosixPath(path) {
  return path.split(sep).join('/');
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      if (ignoredDirs.has(entry)) continue;
      walk(fullPath, files);
      continue;
    }

    const ext = entry.slice(entry.lastIndexOf('.'));
    if (sourceExtensions.has(ext)) files.push(fullPath);
  }

  return files;
}

function cleanRef(rawRef) {
  return rawRef
    .replace(/^https:\/\/albabee\.pages\.dev/i, '')
    .replace(/[?#].*$/, '');
}

function resolveRef(filePath, clean) {
  if (/^https?:\/\//i.test(clean) || clean.startsWith('data:')) {
    return { type: 'external', path: clean, exists: true };
  }

  if (checkDist) {
    if (clean.startsWith('/')) {
      return {
        type: 'absolute',
        path: join(baseDir, clean.slice(1)),
        exists: existsSync(join(baseDir, clean.slice(1))),
      };
    }

    return {
      type: 'relative',
      path: resolve(dirname(filePath), clean),
      exists: existsSync(resolve(dirname(filePath), clean)),
    };
  }

  if (clean.startsWith('/images/')) {
    const assetPath = join(root, 'public', clean.slice(1));
    return { type: 'absolute-public-image', path: assetPath, exists: existsSync(assetPath) };
  }

  if (clean.startsWith('/')) {
    const assetPath = join(root, clean.slice(1));
    return { type: 'absolute-root', path: assetPath, exists: existsSync(assetPath) };
  }

  const assetPath = resolve(dirname(filePath), clean);
  return { type: 'relative', path: assetPath, exists: existsSync(assetPath) };
}

function inspectFile(filePath) {
  checkedFiles.push(filePath);
  const text = readFileSync(filePath, 'utf8');

  for (const pattern of refPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const rawRef = match[1];
      const clean = cleanRef(rawRef);
      const resolved = resolveRef(filePath, clean);
      const record = {
        file: toPosixPath(relative(root, filePath)),
        ref: rawRef,
        clean,
        resolved: toPosixPath(relative(root, resolved.path)),
        exists: resolved.exists,
      };

      references.push(record);

      if (!resolved.exists) missing.push(record);

      if (!checkDist && /^(?:\.\/|\.\.\/|images\/)/.test(clean)) {
        relativeImageRefs.push(record);
      }

      if (!checkDist && clean.startsWith('/images/')) {
        const expected = join(root, 'public', clean.slice(1));
        if (!existsSync(expected)) badPublicImageRefs.push(record);
      }
    }
  }
}

function printTable(title, rows) {
  console.log(`\n${title}`);
  if (!rows.length) {
    console.log('- none');
    return;
  }

  for (const row of rows) {
    if (typeof row === 'string') {
      console.log(`- ${row}`);
      continue;
    }
    console.log(`- ${row.file}: ${row.ref} -> ${row.resolved}`);
  }
}

for (const file of walk(baseDir)) {
  inspectFile(file);
}

const required = checkDist ? requiredDistAssets : requiredSourceAssets;
const missingRequired = required.filter((asset) => !existsSync(join(baseDir, asset)));

const uniqueReferences = new Map();
for (const ref of references) {
  uniqueReferences.set(`${ref.file}\0${ref.ref}`, ref);
}

console.log(`Asset safety check: ${checkDist ? 'dist' : 'source'}`);
console.log(`Checked files: ${checkedFiles.length}`);
console.log(`Image references: ${uniqueReferences.size}`);

printTable('Missing referenced assets', missing);
printTable('Relative image paths that must be changed to /images/...', relativeImageRefs);
printTable('Broken /images/... mappings', badPublicImageRefs);
printTable('Missing required assets', missingRequired);

if (missing.length || relativeImageRefs.length || badPublicImageRefs.length || missingRequired.length) {
  console.error('\nAsset safety check failed. Do not cleanup, move, delete, archive, or deploy until this is fixed.');
  process.exit(1);
}

console.log('\nAsset safety check passed.');
