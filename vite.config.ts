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

function assertSitemapIsPureXml(target) {
  const sourceBytes = readFileSync('sitemap.xml');
  const targetBytes = readFileSync(target);
  const targetText = targetBytes.toString('utf8');

  if (!sourceBytes.equals(targetBytes)) {
    throw new Error('dist/sitemap.xml must be an exact copy of sitemap.xml');
  }

  if (/<\/?script\b|<script\s*\/>/i.test(targetText)) {
    throw new Error('dist/sitemap.xml must not contain script tags');
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
      const target = join('dist', 'sitemap.xml');
      mkdirSync(dirname(target), { recursive: true });
      rmSync(target, { force: true });
      copyFileSync('sitemap.xml', target);
      assertSitemapIsPureXml(target);
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
