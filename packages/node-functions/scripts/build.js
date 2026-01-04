import * as esbuild from 'esbuild';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Node functions at project root
const baseOutDir = `${__dirname}/../../../node-functions`;

// Clean and create output directory
if (existsSync(baseOutDir)) {
  rmSync(baseOutDir, { recursive: true });
}
mkdirSync(`${baseOutDir}/send`, { recursive: true });

// Common esbuild options
const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: [
    'node:*',
    'fs',
    'path',
    'crypto',
    'http',
    'https',
    'stream',
    'url',
    'util',
    'events',
    'buffer',
    'querystring',
    'net',
    'tls',
    'zlib',
    'os',
  ],
  packages: 'bundle',
  minify: false,
  sourcemap: false,
};

console.log('Building Node Functions...');

// Webhook handler: /send/{sendKey}
// File: node-functions/send/[key].js -> matches /send/{key}
await esbuild.build({
  ...commonOptions,
  entryPoints: [`${__dirname}/../src/webhook.ts`],
  outfile: `${baseOutDir}/send/[key].js`,
  banner: {
    js: '// EdgeOne Node Functions - Webhook Handler\n// Route: /send/{sendKey}\n',
  },
});
console.log(`✓ Webhook: node-functions/send/[key].js -> /send/{sendKey}`);

console.log('\nBuild complete!');
