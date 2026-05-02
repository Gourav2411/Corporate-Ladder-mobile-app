#!/usr/bin/env node
/**
 * After `ng build --configuration production` runs, copy any APK + AAB
 * artifacts from /app/public/downloads/ into the deployable
 * /app/dist/app/browser/downloads/ folder so Vercel ships them as
 * static assets reachable at https://<host>/downloads/<file>.
 *
 * Idempotent — safe to run on every build. Silently skips if the source
 * folder doesn't exist (CI may build without the binaries present).
 */
import { mkdirSync, copyFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'public', 'downloads');
const DEST = join(ROOT, 'dist', 'app', 'browser', 'downloads');

if (!existsSync(SRC)) {
  console.log(`[copy-downloads] Source ${SRC} not found — skipping.`);
  process.exit(0);
}

mkdirSync(DEST, { recursive: true });

const files = readdirSync(SRC).filter((f) => /\.(apk|aab)$/i.test(f));
if (!files.length) {
  console.log(`[copy-downloads] No .apk/.aab files in ${SRC} — skipping.`);
  process.exit(0);
}

let bytes = 0;
for (const f of files) {
  const from = join(SRC, f);
  const to = join(DEST, f);
  copyFileSync(from, to);
  bytes += statSync(from).size;
  console.log(`[copy-downloads] ${f}  (${(statSync(from).size / 1024 / 1024).toFixed(1)} MB)`);
}
console.log(`[copy-downloads] Mirrored ${files.length} file(s), ${(bytes / 1024 / 1024).toFixed(1)} MB total → ${DEST}`);
