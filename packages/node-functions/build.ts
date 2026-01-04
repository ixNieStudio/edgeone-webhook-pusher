import * as esbuild from 'esbuild';
import { mkdirSync, existsSync, rmSync } from 'fs';

// Output to project root dist/node-functions directory
const OUT_DIR = '../../dist/node-functions';

// Clean and create output directory
if (existsSync(OUT_DIR)) {
  rmSync(OUT_DIR, { recursive: true });
}
mkdirSync(OUT_DIR, { recursive: true });

// Common esbuild options for Node Functions
// EdgeOne Node Functions support npm packages, so we bundle everything
const commonOptions: esbuild.BuildOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  // Don't externalize anything - bundle all dependencies
  packages: 'bundle',
  minify: false,
  sourcemap: false,
  // Handle Node.js built-in modules
  external: [
    'node:*',
  ],
};

console.log('Building Node Functions...');

// Build webhook handler: /send/* -> [[default]].js
// EdgeOne uses [[default]].js for catch-all routes
mkdirSync(`${OUT_DIR}/send`, { recursive: true });
await esbuild.build({
  ...commonOptions,
  entryPoints: ['./src/webhook.ts'],
  outfile: `${OUT_DIR}/send/[[default]].js`,
  banner: {
    js: '// EdgeOne Node Functions - Webhook Handler\n// Route: /send/*\n',
  },
});
console.log('✓ Webhook: dist/node-functions/send/[[default]].js -> /send/*');

// Build API handler: /api/* -> [[default]].js
mkdirSync(`${OUT_DIR}/api`, { recursive: true });
await esbuild.build({
  ...commonOptions,
  entryPoints: ['./src/app.ts'],
  outfile: `${OUT_DIR}/api/[[default]].js`,
  banner: {
    js: '// EdgeOne Node Functions - API Handler\n// Route: /api/*\n',
  },
});
console.log('✓ API: dist/node-functions/api/[[default]].js -> /api/*');

// Note: EdgeOne Pages uses file-system routing, no meta.json needed
// Routes are automatically generated from directory structure:
// - /node-functions/send/[[default]].js -> /send/*
// - /node-functions/api/[[default]].js -> /api/*

console.log('\nNode Functions build complete!');
