/**
 * 内部 API 密钥生成脚本
 * 
 * 功能：
 * 1. 生成 64 字符十六进制密钥
 * 2. 写入 shared/internal-key.json（供 Node Functions 使用）
 * 3. 替换 Edge Functions 中的占位符
 * 4. 输出密钥到控制台（部分遮蔽）
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// 匹配已注入的密钥或占位符的正则表达式
// 匹配: const BUILD_KEY = '...' 或 const BUILD_KEY = "__BUILD_KEY_PLACEHOLDER__"
const BUILD_KEY_PATTERN = /const BUILD_KEY = ['"]([a-f0-9]{64}|__BUILD_KEY_PLACEHOLDER__)['"];?/g;

interface InternalKeyConfig {
  buildKey: string;
  generatedAt: string;
}

/**
 * 生成 64 字符十六进制密钥（256 位熵）
 */
export function generateKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 验证密钥格式
 */
export function isValidKeyFormat(key: string): boolean {
  return /^[0-9a-f]{64}$/.test(key);
}

/**
 * 写入密钥配置文件
 */
function writeKeyConfig(key: string): void {
  const config: InternalKeyConfig = {
    buildKey: key,
    generatedAt: new Date().toISOString(),
  };

  const outputDir = path.join(ROOT_DIR, 'shared');
  const outputPath = path.join(outputDir, 'internal-key.json');

  // 确保目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log(`✅ Key config written to: shared/internal-key.json`);
}

/**
 * 从源文件夹复制到输出文件夹
 */
function copyEdgeFunctionsFromSrc(): void {
  const srcDir = path.join(ROOT_DIR, 'edge-functions-src');
  const destDir = path.join(ROOT_DIR, 'edge-functions');

  if (!fs.existsSync(srcDir)) {
    console.warn(`⚠️  Source directory not found: ${srcDir}`);
    return;
  }

  // 删除旧的输出文件夹
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }

  // 递归复制
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log(`✅ Copied edge-functions-src/ to edge-functions/`);
}

/**
 * 替换 Edge Functions 中的密钥（占位符或旧密钥）
 * 始终注入到根目录的 edge-functions/（EdgeOne 从这里部署）
 */
function injectKeyToEdgeFunctions(key: string): void {
  const kvDir = path.join(ROOT_DIR, 'edge-functions', 'api', 'kv');

  if (!fs.existsSync(kvDir)) {
    console.warn(`⚠️  Edge Functions KV directory not found: ${kvDir}`);
    return;
  }

  const files = fs.readdirSync(kvDir).filter(f => f.endsWith('.js'));
  let injectedCount = 0;

  for (const file of files) {
    const filePath = path.join(kvDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // 检查是否包含占位符或已注入的密钥
    if (BUILD_KEY_PATTERN.test(content)) {
      // 重置正则表达式的 lastIndex
      BUILD_KEY_PATTERN.lastIndex = 0;
      // 替换为新密钥
      content = content.replace(BUILD_KEY_PATTERN, `const BUILD_KEY = '${key}';`);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Injected key into: edge-functions/api/kv/${file}`);
      injectedCount++;
    }
  }

  if (injectedCount === 0) {
    console.log(`ℹ️  No BUILD_KEY found in Edge Functions (files may need manual update)`);
  }
}

/**
 * 主函数
 */
function main(): void {
  console.log('\n🔐 Generating Internal API Key...\n');

  const key = generateKey();

  if (!isValidKeyFormat(key)) {
    console.error('❌ Generated key has invalid format');
    process.exit(1);
  }

  // 写入配置文件
  writeKeyConfig(key);

  // 从源文件夹复制到输出文件夹
  copyEdgeFunctionsFromSrc();

  // 注入到根目录的 edge-functions/（EdgeOne 从这里部署）
  injectKeyToEdgeFunctions(key);

  // 输出密钥（部分遮蔽）
  const maskedKey = `${key.substring(0, 8)}...${key.substring(56)}`;
  console.log(`\n🔑 Internal API Key: ${maskedKey}`);
  console.log(`   Full key: ${key}\n`);
}

// 运行
main();
