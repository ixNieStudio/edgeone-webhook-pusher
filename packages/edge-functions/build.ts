import * as esbuild from 'esbuild';
import { readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';

const SRC_DIR = './src';
const OUT_DIR = '../../.output/public/edge-functions';

// Find all TypeScript files in src directory
function findTsFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function build() {
  const isWatch = process.argv.includes('--watch');

  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const entryPoints = findTsFiles(SRC_DIR);

  console.log(`Building ${entryPoints.length} edge functions...`);

  const ctx = await esbuild.context({
    entryPoints,
    outdir: OUT_DIR,
    bundle: false,
    format: 'esm',
    target: 'es2023',
    platform: 'neutral',
    sourcemap: false,
    minify: false,
    outExtension: { '.js': '.js' },
    // Preserve directory structure
    outbase: SRC_DIR,
  });

  if (isWatch) {
    console.log('Watching for changes...');
    await ctx.watch();
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Build complete!');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
