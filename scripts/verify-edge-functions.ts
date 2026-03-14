/**
 * Verify committed root edge-functions are present and do not contain hardcoded secrets.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const apiDir = path.join(ROOT_DIR, 'edge-functions', 'api');
const healthPath = path.join(apiDir, 'health.js');
const hardcodedSecretPattern = /\bconst\s+\w*KEY\s*=\s*['"][^'"]+['"]/;

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(apiDir)) {
  fail('edge-functions/api not found. Root edge-functions directory is required.');
}

if (!fs.existsSync(healthPath)) {
  fail('edge-functions/api/health.js not found. Health endpoint is required.');
}

const files: string[] = [];
const collectJsFiles = (dir: string) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
};

collectJsFiles(apiDir);

const badFiles: string[] = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (hardcodedSecretPattern.test(content)) {
    badFiles.push(path.relative(ROOT_DIR, file));
  }
}

if (badFiles.length > 0) {
  fail(`Hardcoded internal key found in committed edge-functions:\n- ${badFiles.join('\n- ')}`);
}

console.log('✅ Edge Functions verified: root directory present and no hardcoded internal key detected.');
