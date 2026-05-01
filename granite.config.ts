import { defineConfig } from '@apps-in-toss/web-framework/config';

const isTossCleanBuild = process.env.TOSS_CLEAN_BUILD === '1';

export default defineConfig({
  appName: 'albabee-calculator',
  brand: {
    displayName: '\uC54C\uBC14\uBE44 \uACC4\uC0B0\uAE30',
    primaryColor: '#111827',
    icon: './favicon.png',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'npm run web:dev',
      build: isTossCleanBuild ? 'npm run web:build:ait' : 'npm run web:build',
    },
  },
  permissions: [
    {
      name: 'clipboard',
      access: 'read',
    },
    {
      name: 'clipboard',
      access: 'write',
    },
  ],
  outdir: isTossCleanBuild ? 'dist-toss' : 'dist',
  webViewProps: {
    type: 'partner',
    bounces: true,
    pullToRefreshEnabled: false,
    allowsBackForwardNavigationGestures: true,
    overScrollMode: 'never',
  },
});
