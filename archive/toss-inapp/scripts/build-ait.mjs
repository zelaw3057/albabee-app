import { spawn } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const aitCommand = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'ait.cmd' : 'ait',
);

if (!existsSync(aitCommand)) {
  console.error('Cannot find local AIT CLI. Run npm install first.');
  process.exit(1);
}

rmSync(join(process.cwd(), 'dist-toss'), { recursive: true, force: true });

const child = spawn(aitCommand, ['build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    TOSS_CLEAN_BUILD: '1',
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`AIT build stopped by signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
