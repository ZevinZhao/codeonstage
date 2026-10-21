#!/usr/bin/env node
/**
 * validate-demo-media.mjs
 *
 * 逐个探测 src/data/demo-media.ts 中的媒体 URL 是否可加载（走本地代理），
 * 剔除死链后重写该文件（保持自动生成格式）。
 *
 * 背景：
 *   卡片排序按"有 demoMedia 优先"分组（见 SkillListPage.tsx），
 *   若不剔除死链，"有媒体但加载失败"的卡片会占据前排，体验更差。
 *
 * 产出：
 *   - scripts/output/media-validation.json  探测明细（url -> status/ok）
 *   - src/data/demo-media.ts                清洗后重写（仅保留可加载 URL）
 *
 * 运行：
 *   node scripts/validate-demo-media.mjs
 *   # 代理默认 http://127.0.0.1:6789，可用 PROXY 环境变量覆盖；NO_PROXY=1 直连
 *
 * 说明：
 *   - 探测用 Range: bytes=0-0（只拉 1 字节）+ HEAD 兜底，尽量不耗流量。
 *   - 200/206 且 content-type 非 text/html 视为可加载；
 *     404/403/超时（重试 1 次）视为死链。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const DEMO_MEDIA_TS = join(ROOT, 'src', 'data', 'demo-media.ts');
const VALIDATION_JSON = join(SCRIPT_DIR, 'output', 'media-validation.json');

/** 本地代理（浏览器同款网络路径）；NO_PROXY=1 时直连 */
const PROXY = process.env.NO_PROXY === '1' ? null : process.env.PROXY || 'http://127.0.0.1:6789';

// NODE_USE_ENV_PROXY 需在 Node 启动时生效（进程内设置无效）：
// 未开启且需要代理时，带环境变量重启自身（对用户透明）。
if (PROXY && process.env.NODE_USE_ENV_PROXY !== '1') {
  const r = spawnSync(process.argv[0], process.argv.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, NODE_USE_ENV_PROXY: '1', HTTPS_PROXY: PROXY, HTTP_PROXY: PROXY },
  });
  process.exit(r.status ?? 1);
}

const CONCURRENCY = 8;
const TIMEOUT_MS = 15000;

// ---------------------------------------------------------------------------
// 解析 demo-media.ts（自动生成格式：JSON 键值，无第三方解析依赖）
// ---------------------------------------------------------------------------

/** 从 demo-media.ts 源码中解析出 Record<string, string[]> */
function parseDemoMedia() {
  const src = readFileSync(DEMO_MEDIA_TS, 'utf8');
  const start = src.indexOf('{');
  const end = src.lastIndexOf('}');
  // 提取对象字面量，剥掉尾逗号后按 JSON 解析（生成格式含尾逗号，非严格 JSON）
  const literal = src.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1');
  return JSON.parse(literal);
}

/** 重写 demo-media.ts（保持自动生成的文件头与格式） */
function writeDemoMedia(skillMedia) {
  const ids = Object.keys(skillMedia).sort();
  const lines = [
    '// ============================================================',
    '// 效果展示媒体映射表（自动生成，请勿手工编辑）',
    '// ------------------------------------------------------------',
    '// 由 scripts/collect-readme-media.mjs 采集各仓库 README 中的',
    '// 演示媒体直链生成，并经 scripts/validate-demo-media.mjs 剔除',
    '// 不可加载的死链。key 为 skill.id，value 为可直接内嵌的媒体 URL。',
    '// 卡片展示逻辑见 src/components/skill/SkillCard.tsx（依赖 skill.demoMedia）。',
    '// ============================================================',
    '',
    '/** skill.id -> 效果媒体直链（mp4/webm 用 <video>，gif/png/jpg 用 <img>） */',
    'export const DEMO_MEDIA: Record<string, string[]> = {',
  ];
  for (const id of ids) {
    lines.push(`  ${JSON.stringify(id)}: [`);
    for (const url of skillMedia[id]) lines.push(`    ${JSON.stringify(url)},`);
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');
  writeFileSync(DEMO_MEDIA_TS, lines.join('\n'));
}

// ---------------------------------------------------------------------------
// 探测单个 URL（走代理，Range 1 字节）
// ---------------------------------------------------------------------------

async function probeUrl(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        redirect: 'follow',
        signal: controller.signal,

      });
      clearTimeout(timer);
      const ct = res.headers.get('content-type') || '';
      // 200/206 且非 HTML（404 页多为 text/html）视为可加载
      const ok = (res.status === 200 || res.status === 206) && !/text\/html/i.test(ct);
      // 消耗掉极小响应体，释放连接
      await res.arrayBuffer().catch(() => {});
      if (ok || attempt === 1) return { ok, status: res.status, contentType: ct };
      // 5xx / 异常状态重试一次
      if (res.status >= 500 || res.status === 429) continue;
      return { ok, status: res.status, contentType: ct };
    } catch (err) {
      clearTimeout(timer);
      if (attempt === 1) return { ok: false, status: 0, error: String(err) };
    }
  }
  return { ok: false, status: 0 };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  console.log(`代理：${PROXY || '直连'}`);
  const skillMedia = parseDemoMedia();
  const urls = [...new Set(Object.values(skillMedia).flat())];
  console.log(`待探测 URL：${urls.length}`);

  const resultMap = new Map();
  let done = 0;
  async function worker(queue) {
    while (queue.length) {
      const url = queue.shift();
      const r = await probeUrl(url);
      resultMap.set(url, r);
      done += 1;
      if (done % 100 === 0) console.log(`  已探测 ${done}/${urls.length}（死链 ${[...resultMap.values()].filter((x) => !x.ok).length}）`);
    }
  }
  const queue = [...urls];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

  // 剔除死链，媒体全死的 skill 整条移除
  const cleaned = {};
  let removedUrls = 0;
  let removedSkills = 0;
  for (const [id, list] of Object.entries(skillMedia)) {
    const kept = list.filter((u) => resultMap.get(u)?.ok);
    removedUrls += list.length - kept.length;
    if (kept.length > 0) cleaned[id] = kept;
    else removedSkills += 1;
  }

  writeDemoMedia(cleaned);
  writeFileSync(
    VALIDATION_JSON,
    JSON.stringify({ generatedAt: new Date().toISOString(), proxy: PROXY, total: urls.length, ok: [...resultMap.values()].filter((x) => x.ok).length, removedUrls, removedSkills, detail: Object.fromEntries(resultMap) }, null, 2)
  );

  const beforeSkills = Object.keys(skillMedia).length;
  console.log(`探测完成：URL 可加载 ${[...resultMap.values()].filter((x) => x.ok).length}/${urls.length}，剔除死链 ${removedUrls} 个`);
  console.log(`skill 条目：${beforeSkills} -> ${Object.keys(cleaned).length}（移除 ${removedSkills} 条全死链）`);
  console.log(`已重写 ${DEMO_MEDIA_TS}`);
  console.log(`明细见 ${VALIDATION_JSON}`);
}

main().catch((err) => {
  console.error('探测失败：', err);
  process.exit(1);
});