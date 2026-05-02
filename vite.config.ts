import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vite';

const staticFiles = [
  '_headers',
  '_routes.json',
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
  'sitemap.xml',
  'thumbnail.png',
  'weekly-pay.html',
];

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

export default defineConfig({
  plugins: [copyStaticRootFiles()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
    },
  },
});
