// Bundles the RÝNI tracker to frontend/public/ryni.js as a standalone IIFE.
// Run from the frontend dir: `node scripts/build-tracker.mjs`.
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [resolve(frontend, 'src/tracker/index.ts')],
  bundle: true,
  format: 'iife',
  minify: true,
  target: 'es2018',
  outfile: resolve(frontend, 'public/ryni.js'),
});

console.log('[build-tracker] wrote frontend/public/ryni.js');
