import * as esbuild from 'esbuild';
import { readdirSync, statSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, relative, dirname } from 'path';

const SRC_DIR = './src';
// Output to project root dist/edge-functions directory (EdgeOne Pages uses file-system routing)
const OUT_DIR = '../../dist/edge-functions';

// Find all TS files in src directory
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
  // Clean output directory
  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const sourceFiles = findTsFiles(SRC_DIR);
  console.log(`Building ${sourceFiles.length} edge functions...`);

  for (const srcFile of sourceFiles) {
    const relativePath = relative(SRC_DIR, srcFile);
    const outFile = join(OUT_DIR, relativePath.replace(/\.ts$/, '.js'));

    // Ensure output directory exists
    const outDir = dirname(outFile);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    // EdgeOne Edge Functions: simple JS files with onRequest export
    // No bundling needed - EdgeOne uses file-system routing
    await esbuild.build({
      entryPoints: [srcFile],
      outfile: outFile,
      bundle: false,
      format: 'esm',
      target: 'es2022',
      platform: 'browser',
      minify: false,
      sourcemap: false,
    });

    console.log(`  ✓ ${relativePath.replace(/\.ts$/, '.js')}`);
  }

  // Note: EdgeOne Pages uses file-system routing, no meta.json needed
  // Routes are automatically generated from directory structure:
  // - /edge-functions/api/kv/users.js -> /api/kv/users
  // - /edge-functions/api/kv/channels.js -> /api/kv/channels

  console.log('Edge Functions build complete!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
