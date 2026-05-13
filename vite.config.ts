import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vite';

const staticFiles = [
  'ads.txt',
  'about.html',
  'apple-touch-icon.png',
  'scripts/app.js',
  'scripts/site-nav.js',
  'contact.html',
  'faq.html',
  'favicon.png',
  'googlea2096e83ab533dd5.html',
  'how-to-use.html',
  'holiday-pay.html',
  'logo.png',
  'manifest.json',
  'minimum-wage.html',
  'night-pay.html',
  'notice.html',
  'overtime-pay.html',
  'privacy.html',
  'robots.txt',
  'service-worker.js',
  'sitemap.xml',
  'styles/main.css',
  'terms.html',
  'thumbnail.png',
  'wage-guide.html',
  'weekly-pay.html',
];

function copyStaticRootFiles() {
  return {
    name: 'copy-static-root-files',
    writeBundle() {
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
