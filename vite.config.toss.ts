import { copyFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vite';

const tossStaticFiles = [
  'apple-touch-icon.png',
  'favicon.png',
  'logo.png',
  'thumbnail.png',
  'scripts/toss-app.js',
  'styles/toss.css',
];

function copyTossStaticFiles() {
  return {
    name: 'copy-toss-static-files',
    closeBundle() {
      const tossHtml = join('dist-toss', 'toss.html');
      const indexHtml = join('dist-toss', 'index.html');

      if (existsSync(tossHtml)) {
        renameSync(tossHtml, indexHtml);
      }

      for (const file of tossStaticFiles) {
        const target = join('dist-toss', file);
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(file, target);
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyTossStaticFiles()],
  build: {
    outDir: 'dist-toss',
    emptyOutDir: true,
    rollupOptions: {
      input: 'toss.html',
    },
  },
});
