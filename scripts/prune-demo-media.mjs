#!/usr/bin/env node
// ============================================================
// 码上开演 · demo-media 孤儿条目清理脚本（Node 18+ 纯 ESM，无三方依赖）
// ------------------------------------------------------------
// 作用：剔除 demo-media.ts 中已不存在对应 skill 的孤儿 key
// （skill 被同名去重删除后，其采集的媒体映射成为孤儿）。
// 数据源保持由 collect-readme-media.mjs 采集生成，本脚本只做
// 与当前 src/data/index.ts 的对齐清理，可安全重复执行（幂等）。
// ============================================================

import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MEDIA_PATH = resolve(ROOT, 'src/data/demo-media.ts');

/** 读取当前全站 skill id 集合（esbuild 打包 src/data/index.ts 后执行） */
async function loadSkillIds() {
  const esbuildBin = resolve(ROOT, 'node_modules/.bin/esbuild');
  if (!existsSync(esbuildBin)) {
    throw new Error('[错误] 未找到 node_modules/.bin/esbuild（请先 npm install）');
  }
  const outfile = resolve(ROOT, 'scripts/output/.tmp-prune-skills.mjs');
  execSync(
    `"${esbuildBin}" src/data/index.ts --bundle --outfile="${outfile}" --format=esm --alias:@=./src --log-level=error`,
    { cwd: ROOT, stdio: 'pipe' }
  );
  const mod = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
  rmSync(outfile, { force: true });
  return new Set(mod.skills.map((s) => s.id));
}

async function main() {
  console.log('==================================================');
  console.log('码上开演 · demo-media 孤儿清理');
  console.log('==================================================');

  const skillIds = await loadSkillIds();
  const text = readFileSync(MEDIA_PATH, 'utf8');

  // 定位对象字面量区（首个 "{" 到文件末尾的 "};"）
  const openIdx = text.indexOf('{\n');
  const closeIdx = text.lastIndexOf('};');
  if (openIdx < 0 || closeIdx < 0) {
    console.error('[错误] demo-media.ts 结构不符合预期，中止');
    process.exit(1);
  }
  const header = text.slice(0, openIdx + 2);
  const body = text.slice(openIdx + 2, closeIdx);

  // 逐块解析：  "key": [\n    "url",\n ... \n  ],\n
  const blocks = [];
  const blockRe = /^  "((?:[^"\\]|\\.)*)": \[\n((?:[^\[\]]*)?)\n  \],\n?/gm;
  let m;
  while ((m = blockRe.exec(body)) !== null) {
    blocks.push({ key: m[1], urls: m[2] });
  }
  if (blocks.length === 0) {
    console.error('[错误] 未解析到任何媒体条目，中止（避免误清空）');
    process.exit(1);
  }

  const kept = blocks.filter((b) => skillIds.has(b.key));
  const dropped = blocks.filter((b) => !skillIds.has(b.key));

  const out =
    header +
    kept.map((b) => `  "${b.key}": [\n${b.urls}\n  ],\n`).join('') +
    '};\n';
  writeFileSync(MEDIA_PATH, out, 'utf8');

  console.log(`媒体条目：${blocks.length} → ${kept.length}（清理孤儿 ${dropped.length} 条）`);
  dropped.slice(0, 20).forEach((b) => console.log(`  - ${b.key}`));
  if (dropped.length > 20) console.log(`  ……等共 ${dropped.length} 条`);

  const orphanMedia = dropped.reduce((n, b) => n + b.urls.split('\n').filter((l) => l.trim().startsWith('"')).length, 0);
  console.log(`共清理 ${orphanMedia} 条媒体直链`);
}

main().catch((err) => {
  console.error('[错误] 清理失败：', err);
  process.exit(1);
});