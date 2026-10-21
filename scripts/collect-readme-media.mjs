#!/usr/bin/env node
/**
 * collect-readme-media.mjs
 *
 * 遍历全站 Skill 对应的 GitHub 仓库，抓取 README 并提取其中的
 * 效果演示媒体（mp4/webm/gif/png/jpg...）直链，生成卡片可直接展示的映射表。
 *
 * 背景：
 *   卡片是否展示媒体只取决于 `skill.demoMedia`（见 SkillCard.tsx）。
 *   此前仅有 3 条 skill 在 src/data/skills.ts 内手工挂了 demoMedia，
 *   而 Opus 导入的 600+ 条完全没有媒体字段，导致卡片几乎看不到视频/图片。
 *
 * 产出：
 *   - scripts/output/skills-dump.json     真实运行时数据 dump（esbuild 构建，保证 id/sourceUrl 一致）
 *   - scripts/output/readme-cache.json    各仓库 README 抓取缓存（断点续跑，不重复请求）
 *   - scripts/output/media-report.json    采集统计（成功/失败/媒体命中）
 *   - src/data/demo-media.ts              生成的 DEMO_MEDIA 映射表（skill.id -> 媒体直链[]）
 *
 * 运行：
 *   GITHUB_TOKEN=xxx node scripts/collect-readme-media.mjs
 *   # 未提供 token 时走未认证限速（60 次/小时），配合缓存可多轮续跑
 *
 * 说明：
 *   - 只读 src/ 与网络，只写 scripts/output/ 与 src/data/demo-media.ts。
 *   - 纯 ESM，零第三方依赖（Node 18+ 内置 fetch）；esbuild 复用项目现有依赖。
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// 路径与配置
// ---------------------------------------------------------------------------

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = join(SCRIPT_DIR, 'output');

const SKILLS_DUMP_JSON = join(OUTPUT_DIR, 'skills-dump.json');
const SKILLS_DUMP_ENTRY = join(SCRIPT_DIR, 'dump-skills-entry.ts');
const README_CACHE_JSON = join(OUTPUT_DIR, 'readme-cache.json');
const REPORT_JSON = join(OUTPUT_DIR, 'media-report.json');
const DEMO_MEDIA_TS = join(ROOT, 'src', 'data', 'demo-media.ts');

/** GitHub Token（可选；提供后限速 5000/h，未提供 60/h） */
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

/** 并发抓取数（过大易触发二级限速） */
const CONCURRENCY = 8;

/** 本轮最多抓取的仓库数（0 = 不限制；用于无 token 分批抽验） */
const MAX_REPOS = Number(process.env.MAX_REPOS || 0);

/** 单仓库最多保留的媒体数量 */
const MAX_MEDIA_PER_REPO = 6;

/** 每个 skill 最多保留的媒体数量（卡片轮播用） */
const MAX_MEDIA_PER_SKILL = 6;

/** 保留的媒体扩展名（按优先级排序） */
const KEEP_EXTS = ['mp4', 'webm', 'mov', 'gif', 'webp', 'png', 'jpg', 'jpeg'];

/**
 * 手工保底媒体（来自各仓库 README，历史上硬编码在 skills.ts 内）。
 * 采集缺失时始终保留，避免回归。
 */
const MANUAL_SEED = {
  'heychengc-vibe-knowledge-film': [
    'https://raw.githubusercontent.com/HeyChengC/vibe-knowledge-film/main/examples/fold_C.gif',
    'https://raw.githubusercontent.com/HeyChengC/vibe-knowledge-film/main/examples/pigeon_B.gif',
  ],
  'win-hao-knowledge-video': [
    'https://raw.githubusercontent.com/Win-Hao/knowledge-video/main/docs/hero.gif',
  ],
  'yt-smart-pixel-explainer-video': [
    'https://raw.githubusercontent.com/YT-smart/pixel-explainer-video/main/examples/claude.mp4',
    'https://raw.githubusercontent.com/YT-smart/pixel-explainer-video/main/examples/codex.mp4',
    'https://raw.githubusercontent.com/YT-smart/pixel-explainer-video/main/examples/workbuddy.mp4',
    'https://raw.githubusercontent.com/YT-smart/pixel-explainer-video/main/examples/doubao.mp4',
  ],
};

/** 需要剔除的装饰性图片/徽章来源（host 或路径片段） */
const NOISE_PATTERNS = [
  /shields\.io/i,
  /badgen\.net/i,
  /badge\.fury\.io/i,
  /travis-ci/i,
  /codecov\.io/i,
  /coveralls\.io/i,
  /circleci/i,
  /snyk\.io/i,
  /img\.shields/i,
  /simpleicons/i,
  /visitor-badge/i,
  /\b(logo|icon|favicon|avatar|badge|license|star-history|social-preview)\b/i,
];

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 字符串 → id slug（与 generate-opus-skills-data.mjs / skills.ts 保持一致） */
function toSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** 从 sourceUrl 提取 { owner, repo }（仅 GitHub 仓库根链接） */
function parseRepo(sourceUrl) {
  const m = sourceUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, '');
  // 排除 GitHub 站内非仓库路径
  if (['topics', 'search', 'orgs', 'users', 'collections'].includes(owner.toLowerCase())) return null;
  return { owner, repo };
}

/** 取 URL 扩展名（小写，无则空串） */
function extOf(url) {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  const m = clean.match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

/** 是否命中应剔除的噪声图片 */
function isNoise(url) {
  return NOISE_PATTERNS.some((re) => re.test(url));
}

/**
 * 规范化媒体 URL：
 *   - github blob / raw 链接 → raw.githubusercontent.com 直链
 *   - 相对路径 → 基于仓库默认分支的 raw 直链
 *   - 绝对链接原样保留
 */
function normalizeMediaUrl(rawUrl, { owner, repo, branch }) {
  let url = rawUrl.trim().replace(/^<|>$/g, '');
  if (!url) return null;

  // GitHub blob/raw → raw 直链
  const blob = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/i);
  if (blob) {
    const ref = blob[3];
    const p = blob[4];
    return `https://raw.githubusercontent.com/${blob[1]}/${blob[2]}/${ref}/${p}`;
  }

  // 绝对链接
  if (/^https?:\/\//i.test(url)) return url;
  if (/^\/\//.test(url)) return `https:${url}`;
  if (/^(data:|mailto:)/i.test(url)) return null;

  // 相对路径 → raw 直链
  const rel = url.replace(/^\.\//, '').replace(/^\//, '');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rel}`;
}

// ---------------------------------------------------------------------------
// 步骤 1：生成真实数据 dump（esbuild，保证 id/sourceUrl 与运行时一致）
// ---------------------------------------------------------------------------

/** 用 esbuild 打包 dump 入口并执行，产出 skills-dump.json */
function buildSkillsDump() {
  const esbuildBin = join(ROOT, 'node_modules', '.bin', 'esbuild');
  if (!existsSync(esbuildBin)) {
    throw new Error('未找到 esbuild，可先执行 npm install');
  }
  const outFile = join(OUTPUT_DIR, 'skills-dump.mjs');
  execFileSync(
    esbuildBin,
    [
      SKILLS_DUMP_ENTRY,
      '--bundle',
      '--platform=node',
      '--format=esm',
      `--alias:@=${join(ROOT, 'src')}`,
      `--outfile=${outFile}`,
      '--log-level=error',
    ],
    { cwd: ROOT, stdio: 'inherit' }
  );
  const json = execFileSync('node', [outFile], { cwd: ROOT, encoding: 'utf8' });
  writeFileSync(SKILLS_DUMP_JSON, json);
  return JSON.parse(json);
}

// ---------------------------------------------------------------------------
// 步骤 2：抓取 README（带缓存与限速保护）
// ---------------------------------------------------------------------------

function loadJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

/** 请求单个仓库 README，返回 { status, readme, branch } */
async function fetchReadme({ owner, repo }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'code-on-stage-media-collector',
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
  const remaining = res.headers.get('x-ratelimit-remaining');
  const status = res.status;

  if (status === 200) {
    const data = await res.json();
    // html_url 形如 https://github.com/o/r/blob/<branch>/README.md，可解析默认分支
    const bm = (data.html_url || '').match(/\/blob\/([^/]+)\//);
    const branch = bm ? bm[1] : 'main';
    const content = data.content ? Buffer.from(data.content, 'base64').toString('utf8') : '';
    return { status, readme: content, branch, remaining };
  }
  return { status, readme: '', branch: 'main', remaining };
}

/** 并发池抓取所有缺失的 README */
async function fetchAllReadmes(repos, cache) {
  const pending = repos.filter((r) => {
    const key = `${r.owner}/${r.repo}`;
    return !cache[key] || cache[key].status === undefined || cache[key].retry;
  });

  let done = 0;
  let rateLimited = false;
  const limit = MAX_REPOS > 0 ? MAX_REPOS : Infinity;

  async function worker(queue) {
    while (queue.length && !rateLimited && done < limit) {
      const r = queue.shift();
      const key = `${r.owner}/${r.repo}`;
      try {
        const result = await fetchReadme(r);
        cache[key] = { ...result, fetchedAt: new Date().toISOString() };
        if (result.remaining !== null && Number(result.remaining) <= 1) {
          rateLimited = true;
        }
      } catch (err) {
        cache[key] = { status: -1, readme: '', branch: 'main', error: String(err), retry: true };
      }
      done += 1;
      if (done % 50 === 0) {
        console.log(`  已抓取 ${done}/${pending.length}${rateLimited ? '（触发限速，提前停止）' : ''}`);
        writeFileSync(README_CACHE_JSON, JSON.stringify(cache, null, 0));
      }
    }
  }

  const queue = [...pending];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  writeFileSync(README_CACHE_JSON, JSON.stringify(cache, null, 0));
  return { fetched: done, rateLimited, remaining: queue.length };
}

// ---------------------------------------------------------------------------
// 步骤 3：从 README 文本提取媒体直链
// ---------------------------------------------------------------------------

/** 提取 README 中的候选媒体 URL（markdown 图片 + HTML src/href + 裸链） */
function extractCandidateUrls(readme) {
  const urls = new Set();

  // markdown 图片：![alt](url "title")
  for (const m of readme.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g)) {
    urls.add(m[1]);
  }
  // HTML <img src> / <video src> / <source src>
  for (const m of readme.matchAll(/<(?:img|video|source)[^>]*\bsrc=["']([^"']+)["']/gi)) {
    urls.add(m[1]);
  }
  // 裸链接 / markdown 链接 / HTML href：仅取带媒体扩展名的
  for (const m of readme.matchAll(/https?:\/\/[^\s)"'<>]+\.(?:mp4|webm|mov|gif|webp|png|jpe?g)/gi)) {
    urls.add(m[0]);
  }

  return [...urls];
}

/** 对单个仓库的 README 提取并筛选媒体 */
function extractMedia(readme, repoInfo) {
  if (!readme) return [];
  const seen = new Set();
  const kept = [];

  for (const raw of extractCandidateUrls(readme)) {
    const ext = extOf(raw);
    if (!KEEP_EXTS.includes(ext)) continue;
    const url = normalizeMediaUrl(raw, repoInfo);
    if (!url) continue;
    if (isNoise(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    kept.push(url);
  }

  // 按扩展名优先级排序（视频优先，其次 gif，最后静态图），保持组内原顺序
  const rank = (u) => KEEP_EXTS.indexOf(extOf(u));
  kept.sort((a, b) => rank(a) - rank(b));
  return kept.slice(0, MAX_MEDIA_PER_REPO);
}

// ---------------------------------------------------------------------------
// 步骤 4：生成 demo-media.ts
// ---------------------------------------------------------------------------

function writeDemoMediaTs(skillMedia) {
  const ids = Object.keys(skillMedia).sort();
  const lines = [
    '// ============================================================',
    '// 效果展示媒体映射表（自动生成，请勿手工编辑）',
    '// ------------------------------------------------------------',
    '// 由 scripts/collect-readme-media.mjs 采集各仓库 README 中的',
    '// 演示媒体直链生成。key 为 skill.id，value 为可直接内嵌的媒体 URL。',
    '// 卡片展示逻辑见 src/components/skill/SkillCard.tsx（依赖 skill.demoMedia）。',
    '// ============================================================',
    '',
    '/** skill.id -> 效果媒体直链（mp4/webm 用 <video>，gif/png/jpg 用 <img>） */',
    'export const DEMO_MEDIA: Record<string, string[]> = {',
  ];

  for (const id of ids) {
    lines.push(`  ${JSON.stringify(id)}: [`);
    for (const url of skillMedia[id]) {
      lines.push(`    ${JSON.stringify(url)},`);
    }
    lines.push('  ],');
  }

  lines.push('};');
  lines.push('');
  writeFileSync(DEMO_MEDIA_TS, lines.join('\n'));
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('步骤 1/4：构建真实数据 dump（esbuild）...');
  const skills = buildSkillsDump();
  console.log(`  skills 总数：${skills.length}`);

  // repo -> skillId 集合
  const repoToSkillIds = new Map();
  for (const s of skills) {
    const repo = parseRepo(s.sourceUrl);
    if (!repo) continue;
    const key = `${repo.owner}/${repo.repo}`;
    if (!repoToSkillIds.has(key)) repoToSkillIds.set(key, { ...repo, skillIds: new Set() });
    repoToSkillIds.get(key).skillIds.add(s.id);
  }
  const repos = [...repoToSkillIds.values()];
  console.log(`  GitHub 唯一仓库：${repos.length}`);

  console.log('步骤 2/4：抓取 README（缓存断点续跑）...');
  const cache = loadJson(README_CACHE_JSON, {});
  const { fetched, rateLimited, remaining } = await fetchAllReadmes(repos, cache);
  console.log(`  本轮抓取 ${fetched}，缓存累计 ${Object.keys(cache).length}`);
  if (rateLimited) {
    console.log(`  ⚠ 触发 GitHub 限速，剩余 ${remaining} 个仓库未抓取。`);
    console.log('  配置 GITHUB_TOKEN 提升限速后重跑即可续抓（已抓取的不会重复请求）。');
  }

  console.log('步骤 3/4：提取媒体直链...');
  const skillMedia = {};
  // 手工保底媒体优先注入
  for (const [id, urls] of Object.entries(MANUAL_SEED)) {
    skillMedia[id] = [...new Set(urls)];
  }

  let repoHit = 0;
  const report = [];
  for (const repo of repos) {
    const key = `${repo.owner}/${repo.repo}`;
    const entry = cache[key];
    const media =
      entry && entry.status === 200
        ? extractMedia(entry.readme, { owner: repo.owner, repo: repo.repo, branch: entry.branch || 'main' })
        : [];
    if (media.length) repoHit += 1;
    report.push({ repo: key, status: entry?.status ?? null, count: media.length, skillIds: [...repo.skillIds] });

    for (const id of repo.skillIds) {
      const merged = [...new Set([...(skillMedia[id] || []), ...media])].slice(0, MAX_MEDIA_PER_SKILL);
      if (merged.length) skillMedia[id] = merged;
    }
  }
  console.log(`  命中媒体的仓库：${repoHit}/${repos.length}`);
  console.log(`  有媒体的 skill：${Object.keys(skillMedia).length}`);

  console.log('步骤 4/4：写入 src/data/demo-media.ts ...');
  writeDemoMediaTs(skillMedia);
  writeFileSync(REPORT_JSON, JSON.stringify({ generatedAt: new Date().toISOString(), repoHit, skillHit: Object.keys(skillMedia).length, report }, null, 2));
  console.log(`  完成：${Object.keys(skillMedia).length} 条 skill 已挂载媒体。`);
  console.log(`  明细见 ${REPORT_JSON}`);
}

main().catch((err) => {
  console.error('采集失败：', err);
  process.exit(1);
});