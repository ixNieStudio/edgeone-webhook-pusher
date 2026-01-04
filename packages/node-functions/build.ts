import * as esbuild from 'esbuild';
import { mkdirSync, existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

// Output to project root node-functions directory
const OUT_DIR = '../../node-functions';

interface NodeFunctionMeta {
  name: string;
  entry: string;
  routes: string[];
}

// Clean and create output directory
if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true });
}
mkdirSync(OUT_DIR, { recursive: true });

// Common esbuild options
const commonOptions: esbuild.BuildOptions = {
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

const functions: NodeFunctionMeta[] = [];

// Webhook handler: /send/* (Koa app with [[default]].js)
mkdirSync(`${OUT_DIR}/send`, { recursive: true });
await esbuild.build({
  ...commonOptions,
  entryPoints: ['./src/webhook.ts'],
  outfile: `${OUT_DIR}/send/[[default]].js`,
  banner: {
    js: '// EdgeOne Node Functions - Webhook Handler\n// Route: /send/*\n',
  },
});
functions.push({
  name: 'webhook',
  entry: 'send/[[default]].js',
  routes: ['/send/*'],
});
console.log('✓ Webhook: node-functions/send/[[default]].js -> /send/*');

// API handler: /api/* (Koa app with [[default]].js)
mkdirSync(`${OUT_DIR}/api`, { recursive: true });
await esbuild.build({
  ...commonOptions,
  entryPoints: ['./src/app.ts'],
  outfile: `${OUT_DIR}/api/[[default]].js`,
  banner: {
    js: '// EdgeOne Node Functions - API Handler\n// Route: /api/*\n',
  },
});
functions.push({
  name: 'api',
  entry: 'api/[[default]].js',
  routes: ['/api/*'],
});
console.log('✓ API: node-functions/api/[[default]].js -> /api/*');

// Generate meta.json
const metaPath = join(OUT_DIR, 'meta.json');
writeFileSync(metaPath, JSON.stringify(functions, null, 2));
console.log(`✓ meta.json (${functions.length} functions)`);

console.log('\nBuild complete!');
