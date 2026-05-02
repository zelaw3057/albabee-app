import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vite';

const staticFiles = [
  'ads.txt',
  'apple-touch-icon.png',
  'app.js',
  'favicon.png',
  'googlea2096e83ab533dd5.html',
  'logo.png',
  'manifest.json',
  'minimum-wage.html',
  'night-pay.html',
  'robots.txt',
  'service-worker.js',
  'thumbnail.png',
  'weekly-pay.html',
];

const sitemapFiles = [
  'sitemap.xml',
  'sitemap2.xml',
];

function assertSitemapIsPureXml(file, target) {
  const sourceBytes = readFileSync(file);
  const targetBytes = readFileSync(target);
  const targetText = targetBytes.toString('utf8');

  if (!sourceBytes.equals(targetBytes)) {
    throw new Error(`dist/${file} must be an exact copy of ${file}`);
  }

  if (/<\/?script\b|<script\s*\/>/i.test(targetText)) {
    throw new Error(`dist/${file} must not contain script tags`);
  }
}

function copyStaticRootFiles() {
  return {
    name: 'copy-static-root-files',
    closeBundle() {
      for (const file of staticFiles) {
        const target = join('dist', file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(file, target);
      }
    },
  };
}

function copySitemapXml() {
  return {
    name: 'copy-sitemap-xml-verbatim',
    closeBundle() {
      for (const file of sitemapFiles) {
        const target = join('dist', file);
        mkdirSync(dirname(target), { recursive: true });
        rmSync(target, { force: true });
        copyFileSync(file, target);
        assertSitemapIsPureXml(file, target);
      }
    },
  };
}

export default defineConfig({
  plugins: [copyStaticRootFiles(), copySitemapXml()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
    },
  },
});
