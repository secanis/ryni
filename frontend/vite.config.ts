import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import path from 'path';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pickCommit, pickVersion } from './src/utils/version';

const pbUrl = (process.env.VITE_PB_URL || 'http://localhost:8090').replace(/\/+$/, '');

function git(args: string[], fallback: string): string {
  try {
    return execFileSync('git', args, { cwd: import.meta.dirname, encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
}

// Build metadata shown on the About page. Resolution order lives in
// src/utils/version.ts (unit-tested); this only supplies the raw inputs.
// The Docker build context is frontend/, so there is no .git inside the
// image and release.yml passes RYNI_VERSION / RYNI_COMMIT explicitly.
const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dirname, './package.json'), 'utf8'));
const version = pickVersion(
  process.env.RYNI_VERSION,
  git(['describe', '--tags', '--always', '--dirty'], ''),
  pkg.version || '',
);
const commit = pickCommit(process.env.RYNI_COMMIT, git(['rev-parse', '--short', 'HEAD'], ''));
const buildTime = new Date().toISOString();

export default defineConfig({
  plugins: [solid()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(commit),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  resolve: {
    alias: {
      '~': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/': {
        target: pbUrl,
        changeOrigin: true,
      },
      '/t/': {
        target: pbUrl,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api/': {
        target: pbUrl,
        changeOrigin: true,
      },
      '/t/': {
        target: pbUrl,
        changeOrigin: true,
      },
    },
  },
});
