import { readdirSync, statSync, mkdirSync, existsSync, rmSync, copyFileSync } from 'fs';
import { join, relative, dirname } from 'path';

const SRC_DIR = './src';
// Output to project root edge-functions directory (TypeScript files, EdgeOne CLI compiles them)
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
  console.log(`Copying ${sourceFiles.length} edge functions (TypeScript)...`);

  for (const srcFile of sourceFiles) {
    const relativePath = relative(SRC_DIR, srcFile);
    const outFile = join(OUT_DIR, relativePath);
    
    // Ensure directory exists
    const outDir = dirname(outFile);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    // Copy TypeScript file directly (EdgeOne CLI will compile it)
    copyFileSync(srcFile, outFile);
    console.log(`  ✓ ${relativePath}`);
  }

  console.log('Build complete! EdgeOne CLI will compile TypeScript files during deployment.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
