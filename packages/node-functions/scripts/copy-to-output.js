import { cpSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = `${__dirname}/../dist`;
const destDir = `${__dirname}/../../../.output/public/node-functions`;

// Ensure output directory exists
if (!existsSync(dirname(destDir))) {
  mkdirSync(dirname(destDir), { recursive: true });
}

// Copy dist to output
cpSync(srcDir, destDir, { recursive: true });

console.log('Copied node-functions to .output/public/node-functions');
