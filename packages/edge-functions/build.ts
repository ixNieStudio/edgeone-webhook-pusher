import * as esbuild from 'esbuild';
import { readdirSync, statSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = './src';
// Output to project root edge-functions directory
const OUT_DIR = '../../edge-functions';

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

  console.log('Build complete!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
