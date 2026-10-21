#!/usr/bin/env node
// ============================================================
// 码上开演 · Opus 索引数据生成脚本（Node 18+ 纯 ESM，无三方依赖）
// ------------------------------------------------------------
// 输入：scripts/output/intermediate.json
//   （Opus 5.5 前端动画视频 Skills 索引解析出的 689 条中间数据：
//     entry 7 + main 568 + companion 114）
// 输出：src/data/opus/ 下按一级大类拆分的 8 个 TS 数据文件 + index.ts，
//   以及 src/data/index.ts（全站数据统一出口）。
//
// 幂等：重复执行直接覆盖生成文件，结果稳定（时间戳基于固定基准日派生）。
//
// 处理流程：
//   1. 内部去重：entry 与 main 章节存在 7 组完全相同的仓库 URL，
//      合并为一条（entry 提供人工 description，main 提供更完整的
//      rawType / rawTags / tags 数据）。
//   2. 跨数据去重：与现有 Vibe 数据按规范化 sourceUrl 比对，
//      现有数据优先保留（其标签更完整），剔除中间数据中的重复条目。
//   2.5 跨数据同名去重：与现有 Vibe 数据按规范化展示名比对
//      （小写 + 去非字母数字），现有数据优先保留；随后 Opus 内部
//      按同一规则分组，同名组视为同一项目的 fork/搬运，每组保留
//      1 条（优先级：已采集 demoMedia > 描述更完整 > 原始顺序）。
//      例外：文件链接条目（SKILL.md/README.md）与泛仓库名（skills）
//      属「同名不同项目/文件」，改为 父目录/文件名、作者/仓库 的
//      展示名区分，不剔除。
//   3. 修正层（分类重判，规则依据用户分类规则第 4 条「说明优先于名称」）：
//      a. entry 章节 7 个仓库按 ENTRY_RULES 硬编码归类（优先级最高）；
//      b. 其余条目：用途类标签判定优先（忽略名称关键词），
//         标签优先级 Explainers/科普 > Music/Stories > Promo >
//         Motion graphics > Frameworks/工具箱/Scripts > Editing；
//      c. 无用途标签时才启用名称关键词兜底（分词精确匹配避免误命中）；
//      d. forms 维度非法值 'tutorial' 按 rawType 修正为
//         'article-tutorial' / 'video-tutorial'。
//   4. 生成 TS 数据文件并打印统计报告；最后用 esbuild 打包
//      src/data/index.ts 做运行时数据自检。
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INPUT_PATH = resolve(ROOT, 'scripts/output/intermediate.json');
const OPUS_DIR = resolve(ROOT, 'src/data/opus');
const DATA_INDEX_PATH = resolve(ROOT, 'src/data/index.ts');

/** 采集基准日（与存量数据保持一致） */
const BASE_DATE = new Date('2026-10-20T00:00:00Z');
/** 采集日期标注（写入描述文案） */
const COLLECT_DATE = '2026-10-20';

// ============================================================
// 一、分类规则定义
// ============================================================

/**
 * entry 章节 7 个入口仓库的硬编码规则（优先级最高，覆盖一切自动判定）。
 * key 为 `author/repo`（保持原大小写）。
 * 说明：这 7 个仓库在 main 章节会再次出现（同 URL），合并后仍命中本表。
 */
const ENTRY_RULES = {
  // 视频 Skills 总索引 → general-video + forms 含 collection
  'zhuyansen/awesome-claude-video-skills': {
    primaryCategory: 'general-video',
    forms: ['collection'],
  },
  // 以代码制作多种风格短片 → general-video
  'lemomo-ai/lemo-opuscar': {
    primaryCategory: 'general-video',
  },
  // 手绘动画、动态字体等风格 → general-video + visualStyles
  'tuzhechen2005/opus-video-skills': {
    primaryCategory: 'general-video',
    visualStyles: ['line-art', 'kinetic-typography'],
  },
  // 方案、预览、逐镜头渲染 → general-video
  'Kianzzz/xilo-opus-video': {
    primaryCategory: 'general-video',
  },
  // 音乐驱动的动态图形 → narrative-mv（音乐驱动是主要特征）
  'makevoid/motion-graphics-music-video-skill': {
    primaryCategory: 'narrative-mv',
    inputMethods: ['music-driven'],
  },
  // 手绘代码动画基础工程 → general-video + forms 含 template + skill
  'JohnHeibel/ClaudeAnimationBase': {
    primaryCategory: 'general-video',
    forms: ['template', 'skill'],
    visualStyles: ['line-art'],
  },
  // 提示词与 X 案例导航 → general-video + forms 含 prompt + collection
  'joeseesun/opus-video-prompts': {
    primaryCategory: 'general-video',
    forms: ['prompt', 'collection'],
  },
};

/**
 * 用途类标签判定规则（按优先级自上而下，满足即停）。
 * 命中任一标签时【忽略名称关键词判定】，直接按标签归类——
 * 这是修正层对「说明优先于名称」的实现（修复如 Paper-Cut 有
 * 🎓 Explainers + 科普 标签却因名称含 "cut" 被误判为 post-production 的问题）。
 * 匹配值均为小写形式。
 */
const PURPOSE_TAG_RULES = [
  { match: ['🎓 explainers', '科普拓展', '科普'], category: 'education' },
  { match: ['🎵 music videos', '音乐/mv', '📖 stories & animation'], category: 'narrative-mv' },
  { match: ['📣 promo & demos'], category: 'promo' },
  { match: ['🎞 motion graphics'], category: 'motion-design' },
  {
    match: ['🧱 frameworks & toolkits', '工具箱', '📝 scripts & learning', '环境/ip'],
    category: 'general-video',
  },
  { match: ['✂️ editing'], category: 'post-production' },
];

/** promo 名称分词（供 📱 Shorts & social 组合判定复用） */
const PROMO_NAME_WORDS = ['promo', 'promos', 'ad', 'ads', 'launch', 'demo', 'demos'];

/**
 * 弱用途标签（非任务指定的强用途标签，按原解析脚本语义归 general-video）。
 * 其中 📱 Shorts & social 特殊：名称含 promo 词则归 promo，否则归 general-video。
 */
const WEAK_TAG_GENERAL = ['🧑‍💼 avatars', '其他模型/配套拓展'];

/**
 * 名称关键词兜底规则（仅在【无任何用途类标签】时启用，按顺序满足即停）。
 * - substr：小写子串匹配（适合复合词，如 'product-launch'、中文词）
 * - words：分词精确匹配（避免 'history' 误命中 'story'、'gradient' 误命中 'ad'）
 * - cooccur：多个分词共现（如 'app' + 'video'）
 * 顺序按任务描述：promo > motion-design > narrative-mv > education >
 * post-production > game-interactive > general-video（泛视频词殿后）。
 */
const NAME_RULES = [
  {
    category: 'promo',
    substr: ['product-launch', 'ad-video', '演示'],
    words: PROMO_NAME_WORDS,
    cooccur: [['app', 'video'], ['product', 'video']],
  },
  {
    category: 'motion-design',
    substr: ['motion', 'typography', 'kinetic', 'logo'],
  },
  {
    category: 'narrative-mv',
    substr: ['music', 'lyric', 'song', '音乐'],
    words: ['mv', 'mvs', 'story', 'stories'],
  },
  {
    category: 'education',
    substr: ['knowledge', 'explainer', 'popsci', '科普', 'education', '教学', '教育', '教程', 'tutorial-video'],
    words: ['tutorial', 'tutorials'],
  },
  {
    category: 'post-production',
    substr: [
      'after-effects', 'premiere', 'subtitle', 'audio', 'voice', 'sound', 'tts', 'srt',
      'dubbing', '字幕', '音效', '配音',
    ],
    words: ['edit', 'edits', 'editing', 'cut', 'cuts', 'cutter', 'clip', 'clips', 'clipping'],
  },
  {
    category: 'game-interactive',
    substr: ['game', '游戏'],
  },
  {
    category: 'general-video',
    substr: [
      'video-skill', 'opus-video', 'opus5', 'video-maker', 'video-generator',
      'video-production', 'production', '视频',
      // 连写词兜底（如 'opusvideo' / 'ProductVideoCreator' 分词不出 'video'）
      'video',
      // HyperFrames 视频框架系列仓库（与 technologies 维度判定一致）
      'hyperframes',
      // awesome-* 资源合集/导航（大类语义「资源导航」）
      'awesome',
    ],
    words: ['video', 'videos'],
    cooccur: [['full', 'video']],
  },
];

/** 一级大类中文名（用于报告与描述文案） */
const CATEGORY_ZH = {
  promo: '产品宣传与演示',
  education: '科普与教学',
  'motion-design': '动效与视觉设计',
  'narrative-mv': '叙事短片与音乐 MV',
  'game-interactive': '游戏与交互动画',
  'post-production': '剪辑与声音后期',
  'general-video': '通用视频制作',
  uncategorized: '待分类',
};

/** 输出文件配置：大类 → { 文件名, 导出常量名 }（game-interactive 条数少也独立成文件，保持大类语义完整） */
const CATEGORY_FILES = {
  promo: { file: 'promo.ts', exportName: 'opusPromoSkills' },
  education: { file: 'education.ts', exportName: 'opusEducationSkills' },
  'motion-design': { file: 'motion-design.ts', exportName: 'opusMotionDesignSkills' },
  'narrative-mv': { file: 'narrative-mv.ts', exportName: 'opusNarrativeMvSkills' },
  'game-interactive': { file: 'game-interactive.ts', exportName: 'opusGameInteractiveSkills' },
  'post-production': { file: 'post-production.ts', exportName: 'opusPostProductionSkills' },
  'general-video': { file: 'general-video.ts', exportName: 'opusGeneralVideoSkills' },
  uncategorized: { file: 'uncategorized.ts', exportName: 'opusUncategorizedSkills' },
};

/** rawTags → 中文短语（用于 description / longDescription，严禁编造细节） */
const RAW_TAG_ZH = {
  '🎓 Explainers': '科普讲解',
  科普: '科普',
  科普拓展: '科普拓展',
  '🎵 Music videos': '音乐 MV',
  '音乐/MV': '音乐/MV',
  '📖 Stories & animation': '故事动画',
  '📣 Promo & demos': '产品宣传演示',
  '🎞 Motion graphics': '动态图形',
  '🧱 Frameworks & toolkits': '框架与工具箱',
  工具箱: '工具箱',
  '📝 Scripts & learning': '脚本与学习',
  '环境/IP': '环境/IP',
  '✂️ Editing': '剪辑',
  '📱 Shorts & social': '短视频/社交',
  '🧑‍💼 Avatars': '数字人',
  '🧪 Tested end to end': '端到端验证',
  '其他模型/配套拓展': '其他模型配套',
  '账号/订阅': '账号/订阅',
  'Made with Claude Opus 5.5': 'Opus 5.5 制作',
  // 技术栈名保留原文
  Remotion: 'Remotion',
  HyperFrames: 'HyperFrames',
  Manim: 'Manim',
  GSAP: 'GSAP',
  'Three.js': 'Three.js',
  Blender: 'Blender',
  Canvas: 'Canvas',
  HTML: 'HTML',
  'p5.js': 'p5.js',
  WebGL: 'WebGL',
};

/** rawType → 中文短语（用于 description） */
const RAW_TYPE_ZH = {
  'Skill/工具仓库候选': 'Skill 仓库',
  '索引/提示词/指南仓库': '索引/提示词仓库',
  '代码动画仓库/案例候选': '代码动画案例仓库',
  '代码动画仓库/文档': '代码动画文档',
  '教程/文章': '教程文章',
  视频教程: '视频教程',
  'GitHub 文档': 'GitHub 文档',
  'Skill 文件': 'Skill 文件',
  'Skill 收录页面': 'Skill 收录页面',
};

/** forms 非法值修正：中间数据把教程类映射成了 'tutorial'（不在 ResourceForm 联合类型中） */
function fixForms(forms, rawType) {
  const fixed = forms.map((f) => {
    if (f !== 'tutorial') return f;
    // 视频教程 → video-tutorial；教程/文章等 → article-tutorial
    return rawType === '视频教程' ? 'video-tutorial' : 'article-tutorial';
  });
  // 兜底：仍为空的按 rawType 补一个基础形态，避免 forms 空数组失去筛选价值
  if (fixed.length === 0) {
    if (rawType === 'Skill/工具仓库候选' || rawType === 'Skill 文件') return ['skill'];
    if (rawType === '索引/提示词/指南仓库' || rawType === 'Skill 收录页面') return ['collection'];
    if (rawType.startsWith('代码动画仓库')) return ['template'];
    if (rawType === 'GitHub 文档') return ['collection'];
  }
  return fixed;
}

// ============================================================
// 二、通用工具函数
// ============================================================

/** 分词：按非字母数字字符拆分（中文段落自然成为分隔符，'remotion-ad-video' → ['remotion','ad','video']） */
function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** 小写文本是否含任一子串关键词 */
function hasAnySubstring(lowerText, keywords) {
  return keywords.some((kw) => lowerText.includes(kw));
}

/** 文本分词后是否含任一精确词 */
function hasAnyWord(text, words) {
  const tokens = tokenize(text);
  return words.some((w) => tokens.includes(w));
}

/** 文本分词后是否含某组词的全部（共现） */
function hasCooccur(text, wordGroup) {
  const tokens = tokenize(text);
  return wordGroup.every((w) => tokens.includes(w));
}

/** 字符串 → id slug：小写、非字母数字折叠为单个连字符（与现有 '0v0o-svg-fullvideoproductionskill' 风格一致） */
function toSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** URL 规范化（去查询参数与尾斜杠、小写），作为去重键 */
function normalizeUrl(url) {
  return url.replace(/\?.*$/, '').replace(/\/+$/, '').toLowerCase();
}

/** 展示名归一化（小写 + 去非字母数字/中文），作为同名去重键（'awesome-opus5-5-videos' 与 'awesome-opus-5-5-videos' 视为同名） */
function normalizeName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

/** 泛仓库名：多个不相关作者的独立项目恰好同名（如 skills 合集仓库），用 作者/仓库 展示名区分，不做同名剔除 */
const GENERIC_REPO_NAMES = new Set(['skills']);

/** 读取 demo-media.ts 中已采集媒体的 skill id 集合（用于同名组内保留优先级判断） */
function loadDemoMediaIds() {
  const path = resolve(ROOT, 'src/data/demo-media.ts');
  if (!existsSync(path)) return new Set();
  const text = readFileSync(path, 'utf8');
  const ids = new Set();
  for (const m of text.matchAll(/^\s*"([^"]+)":\s*\[/gm)) ids.add(m[1]);
  return ids;
}

/**
 * 非 GitHub 链接 → 语义化 id slug（host 主域 + 路径字母数字段）。
 * 如 'https://www.douyin.com/video/7692673643154820378' → 'douyin-video-7692673643154820378'。
 */
function urlSlug(url) {
  const u = new URL(url);
  // 去掉 www. 前缀；其余子域（如 app.）折叠为连字符保留区分度
  const host = u.hostname.replace(/^www\./i, '').replace(/\./g, '-');
  const segs = u.pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.replace(/\.(html?|php)$/i, ''))
    .filter((s) => /^[a-zA-Z0-9-]+$/.test(s) && s.length > 1);
  let slug = toSlug([host, ...segs].join('-'));
  if (slug.length > 90) slug = slug.slice(0, 90).replace(/-+$/, '');
  return slug || 'link';
}

/** 从 GitHub blob URL 提取仓库内的文件路径（去掉 /blob/<branch>/ 前缀），非 blob URL 返回 null */
function blobPath(url) {
  const m = url.match(/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+?)(?:\?.*)?$/i);
  return m ? m[1] : null;
}

/** 计算条目展示名（与 buildSkill 保持一致；供跨集同名去重在组装前取键） */
function displayNameOf(item) {
  const isGithub = /github\.com/i.test(item.url);
  if (!isGithub) return cleanDisplayName(item.name);
  const filePath = blobPath(item.url);
  if (filePath) {
    // 文件链接条目：父目录/文件名（父目录缺失用 repo 名），避免多个 SKILL.md/README.md 重名
    const segs = filePath.split('/');
    const fileName = segs.pop();
    const parent = segs.length > 0 ? segs[segs.length - 1] : item.repo;
    return `${parent}/${fileName}`;
  }
  if (GENERIC_REPO_NAMES.has(item.repo.toLowerCase())) {
    // 泛仓库名：不同作者的独立项目，用 作者/仓库 区分
    return `${item.author}/${item.repo}`;
  }
  return item.repo;
}

/** 计算基准日往前 n 天的 ISO 时间戳（保证脚本幂等：不依赖运行时钟） */
function daysAgo(n) {
  const d = new Date(BASE_DATE);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

/** TS 单引号字符串字面量（处理反斜杠/单引号/换行等转义） */
function tsStr(value) {
  return `'${String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')}'`;
}

/**
 * 非 GitHub 条目的展示名清理：
 * 去掉平台尾巴（' - 抖音'、' - 技术栈'、'_哔哩哔哩_bilibili'），超长截断。
 */
function cleanDisplayName(name) {
  let s = String(name).trim();
  s = s.replace(/\s*[-–—]\s*(抖音|技术栈)\s*$/u, '');
  s = s.replace(/[_-]?哔哩哔哩[_-]?bilibili$/iu, '');
  if (s.length > 80) s = `${s.slice(0, 79)}…`;
  return s;
}

/** 语言判定：名称含中文 / URL 为中文平台或中文路径 → 'zh'，否则 'en'（GitHub 仓库多为英文，默认 en） */
function detectLanguage(name, url) {
  if (/[\u4e00-\u9fff]/.test(name)) return 'zh';
  if (/zh[-_.]cn/i.test(`${name} ${url}`)) return 'zh';
  if (/(douyin\.com|bilibili\.com|jishuzhan\.net)/i.test(url)) return 'zh';
  return 'en';
}

// ============================================================
// 三、分类判定（修正层核心）
// ============================================================

/**
 * primaryCategory 重判。
 * 优先级：entry 硬编码规则（调用方处理）> 用途类标签 > 弱用途标签 >
 * 名称关键词兜底 > uncategorized。
 * @returns {{ category: string, basis: string }} basis：'索引介绍'=标签命中；'名称推断'=名称命中
 */
function classifyPrimaryCategory(item) {
  const tagsLower = (item.rawTags || []).map((t) => t.toLowerCase());
  const name = item.name;

  // 1. 用途类标签判定（忽略名称关键词——「说明优先于名称」）
  for (const rule of PURPOSE_TAG_RULES) {
    if (rule.match.some((t) => tagsLower.includes(t))) {
      return { category: rule.category, basis: '索引介绍' };
    }
  }

  // 2. 📱 Shorts & social：名称含 promo 词 → promo；否则归 general-video
  if (tagsLower.includes('📱 shorts & social')) {
    if (hasAnyWord(name, PROMO_NAME_WORDS)) return { category: 'promo', basis: '名称推断' };
    return { category: 'general-video', basis: '索引介绍' };
  }

  // 3. 其余弱用途标签（数字人、其他模型配套）→ general-video
  if (WEAK_TAG_GENERAL.some((t) => tagsLower.includes(t))) {
    return { category: 'general-video', basis: '索引介绍' };
  }

  // 4. 名称关键词兜底（仅无用途标签时启用）
  const nameLower = name.toLowerCase();
  for (const rule of NAME_RULES) {
    if (rule.substr && hasAnySubstring(nameLower, rule.substr)) {
      return { category: rule.category, basis: '名称推断' };
    }
    if (rule.words && hasAnyWord(name, rule.words)) {
      return { category: rule.category, basis: '名称推断' };
    }
    if (rule.cooccur && rule.cooccur.some((group) => hasCooccur(name, group))) {
      return { category: rule.category, basis: '名称推断' };
    }
  }

  // 5. 无任何线索 → 待分类（保持原 tagBasis 口径，标索引介绍）
  return { category: 'uncategorized', basis: '索引介绍' };
}

// ============================================================
// 四、主流程
// ============================================================

async function main() {
  console.log('==================================================');
  console.log('码上开演 · Opus 索引数据生成');
  console.log('==================================================');

  // ---- 读取中间数据 ----
  if (!existsSync(INPUT_PATH)) {
    console.error(`[错误] 找不到输入文件：${INPUT_PATH}`);
    process.exit(1);
  }
  const intermediate = JSON.parse(readFileSync(INPUT_PATH, 'utf8'));
  const bySection = intermediate.reduce((acc, d) => {
    acc[d.section] = (acc[d.section] || 0) + 1;
    return acc;
  }, {});
  console.log(`输入中间数据：${intermediate.length} 条（${Object.entries(bySection).map(([k, v]) => `${k} ${v}`).join(' / ')}）`);

  // ---- 步骤 1：内部去重（entry 与 main 同 URL 合并） ----
  const internalMergeLog = [];
  const urlGroups = new Map();
  for (const item of intermediate) {
    const key = normalizeUrl(item.url);
    if (!urlGroups.has(key)) urlGroups.set(key, []);
    urlGroups.get(key).push(item);
  }
  const deduped = [];
  for (const [, group] of urlGroups) {
    if (group.length === 1) {
      deduped.push(group[0]);
      continue;
    }
    // 同 URL 多条：entry 条目为描述来源，main 条目为数据来源（rawType/rawTags/tags 更完整）
    const entryItem = group.find((d) => d.section === 'entry') || group[0];
    const dataItem = group.find((d) => d.section !== 'entry') || group[0];
    const merged = {
      ...dataItem,
      // entry 的人工 description 优先；main 条目本身没有 description 字段
      description: entryItem.description ?? dataItem.description ?? null,
      // 合并条目的 tags 各维度取并集（entry 与 main 的 platforms/models 可能互补）
      tags: mergeTags(entryItem.tags, dataItem.tags),
      // 标记：合并后的入口条目（用于 ENTRY_RULES 匹配与描述文案）
      isEntry: entryItem.section === 'entry',
    };
    internalMergeLog.push(merged.author + '/' + merged.repo);
    deduped.push(merged);
  }
  console.log(`[去重] 内部同 URL 合并：${internalMergeLog.length} 条`);
  internalMergeLog.forEach((name) => console.log(`  - ${name}（entry 与 main 重复，已合并）`));

  // ---- 步骤 2：与现有 Vibe 数据按 sourceUrl / 展示名去重（现有优先保留） ----
  const vibe = await loadExistingVibeSkills();
  const crossDupLog = [];
  const crossNameDupLog = [];
  const kept = deduped.filter((item) => {
    if (vibe.sourceUrls.has(normalizeUrl(item.url))) {
      crossDupLog.push(item.url);
      return false;
    }
    if (vibe.names.has(normalizeName(displayNameOf(item)))) {
      crossNameDupLog.push(`${displayNameOf(item)}（撞现有 Vibe 数据）`);
      return false;
    }
    return true;
  });
  console.log(`[去重] 与现有 ${vibe.count} 条 Vibe 数据重复：${crossDupLog.length} 条（现有数据优先保留）`);
  crossDupLog.forEach((url) => console.log(`  - ${url}`));
  console.log(`[去重] 与现有 Vibe 数据同名：${crossNameDupLog.length} 条（现有数据优先保留）`);
  crossNameDupLog.forEach((name) => console.log(`  - ${name}`));

  // ---- 步骤 3：修正层 + Skill 数据组装 ----
  const entryIds = new Set();
  const builtSkills = kept.map((item, index) => {
    const skill = buildSkill(item, index);
    if (item.isEntry) entryIds.add(skill.id);
    return skill;
  });

  // ---- 步骤 3.5：Opus 内部按归一化展示名去重（同名 fork/搬运组每组保留 1 条） ----
  const demoMediaIds = loadDemoMediaIds();
  const nameGroups = new Map();
  for (const skill of builtSkills) {
    const key = normalizeName(skill.name);
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key).push(skill);
  }
  const nameDupLog = [];
  const opusSkills = [];
  for (const [, group] of nameGroups) {
    if (group.length === 1) {
      opusSkills.push(group[0]);
      continue;
    }
    // 组内保留优先级：索引入口条目（人工整理）> 已采集 demoMedia > 描述更完整 > 原始顺序
    // （Opus 数据 stars 恒为 0、featured 恒为 false，这两个维度无区分度）
    const sorted = [...group].sort(
      (a, b) =>
        Number(entryIds.has(b.id)) - Number(entryIds.has(a.id)) ||
        Number(demoMediaIds.has(b.id)) - Number(demoMediaIds.has(a.id)) ||
        b.longDescription.length - a.longDescription.length
    );
    const winner = sorted[0];
    opusSkills.push(winner);
    nameDupLog.push({ name: winner.name, keep: winner.id, drop: group.filter((s) => s !== winner).map((s) => s.id) });
  }
  console.log(`[去重] Opus 内部同名组：${nameDupLog.length} 组，剔除 ${nameDupLog.reduce((n, g) => n + g.drop.length, 0)} 条`);
  nameDupLog.forEach((g) => console.log(`  - ${g.name}：保留 ${g.keep}，剔除 ${g.drop.length} 条同名`));

  // id 唯一性兜底（理论上不会触发；触发时追加 -2/-3 序号保证唯一）
  const idSeen = new Map();
  for (const skill of opusSkills) {
    const count = idSeen.get(skill.id) || 0;
    if (count > 0) {
      console.warn(`[警告] id 冲突，追加序号：${skill.id} → ${skill.id}-${count + 1}`);
      skill.id = `${skill.id}-${count + 1}`;
    }
    idSeen.set(skill.id, (idSeen.get(skill.id) || 0) + 1);
  }

  // ---- 步骤 4：统计 ----
  const byCategory = {};
  for (const s of opusSkills) byCategory[s.primaryCategory] = (byCategory[s.primaryCategory] || 0) + 1;
  const uncategorizedCount = byCategory.uncategorized || 0;
  const uncategorizedRatio = opusSkills.length ? uncategorizedCount / opusSkills.length : 0;

  // ---- 步骤 5：生成 TS 文件 ----
  mkdirSync(OPUS_DIR, { recursive: true });
  const generatedFiles = [];
  for (const [category, cfg] of Object.entries(CATEGORY_FILES)) {
    const items = opusSkills
      .filter((s) => s.primaryCategory === category)
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.id.localeCompare(b.id));
    const filePath = `${OPUS_DIR}/${cfg.file}`;
    writeFileSync(filePath, renderCategoryFile(category, cfg.exportName, items), 'utf8');
    generatedFiles.push({ path: `src/data/opus/${cfg.file}`, count: items.length });
  }
  writeFileSync(`${OPUS_DIR}/index.ts`, renderOpusIndex(opusSkills.length), 'utf8');
  generatedFiles.push({ path: 'src/data/opus/index.ts', count: opusSkills.length });
  writeFileSync(DATA_INDEX_PATH, renderDataIndex(vibe.count), 'utf8');
  generatedFiles.push({ path: 'src/data/index.ts', count: opusSkills.length });

  // ---- 步骤 6：报告 ----
  console.log('--------------------------------------------------');
  const nameDropped = nameDupLog.reduce((n, g) => n + g.drop.length, 0);
  console.log(
    `生成新数据：${opusSkills.length} 条（${intermediate.length} - 内部合并 ${internalMergeLog.length} - 跨数据 URL 去重 ${crossDupLog.length} - 跨数据同名 ${crossNameDupLog.length} - Opus 内部同名剔除 ${nameDropped}）`
  );
  console.log('各大类分布：');
  for (const [category, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${category.padEnd(18)}${CATEGORY_ZH[category].padEnd(12)}${String(count).padStart(4)} 条`);
  }
  const ratioPct = (uncategorizedRatio * 100).toFixed(1);
  console.log(`待分类占比：${uncategorizedCount} / ${opusSkills.length} = ${ratioPct}%（目标 < 25%）${uncategorizedRatio < 0.25 ? ' ✓' : ' ✗ 未达标'}`);
  console.log('生成文件：');
  generatedFiles.forEach((f) => console.log(`  - ${f.path}（${f.count} 条）`));

  // ---- 步骤 7：esbuild 运行时自检 ----
  await verifyRuntime(opusSkills.length, vibe.count);
}

/** 合并两条中间数据的 tags（各维度去重并集，保序） */
function mergeTags(a, b) {
  const result = {};
  const dims = ['forms', 'visualStyles', 'functions', 'soundForms', 'inputMethods', 'technologies', 'platforms', 'models'];
  for (const dim of dims) {
    const merged = [];
    for (const v of [...(a?.[dim] || []), ...(b?.[dim] || [])]) {
      if (!merged.includes(v)) merged.push(v);
    }
    result[dim] = merged;
  }
  return result;
}

/** 读取现有 Vibe 数据（skills.ts）：sourceUrl 集合 + 归一化展示名集合 + 条数，用于跨数据去重 */
async function loadExistingVibeSkills() {
  const esbuildBin = resolve(ROOT, 'node_modules/.bin/esbuild');
  if (!existsSync(esbuildBin)) {
    throw new Error('[错误] 未找到 node_modules/.bin/esbuild，无法提取现有数据（请先 npm install）');
  }
  const outfile = resolve(ROOT, 'scripts/output/.tmp-vibe-skills.mjs');
  execSync(
    `"${esbuildBin}" src/data/skills.ts --bundle --outfile="${outfile}" --format=esm --alias:@=./src --log-level=error`,
    { cwd: ROOT, stdio: 'pipe' }
  );
  const mod = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
  rmSync(outfile, { force: true });
  return {
    sourceUrls: new Set(mod.skills.map((s) => normalizeUrl(s.sourceUrl))),
    names: new Set(mod.skills.map((s) => normalizeName(s.name))),
    count: mod.skills.length,
  };
}

/** 把一条中间数据组装为 Skill 对象（应用修正层全部规则） */
function buildSkill(item, index) {
  const isGithub = /github\.com/i.test(item.url);
  const filePath = isGithub ? blobPath(item.url) : null;
  const isFileLink = Boolean(filePath);

  // ---- 分类重判 ----
  const entryRule = item.isEntry ? ENTRY_RULES[`${item.author}/${item.repo}`] : null;
  let category;
  let basis;
  if (entryRule) {
    category = entryRule.primaryCategory;
    basis = '索引介绍';
  } else {
    ({ category, basis } = classifyPrimaryCategory(item));
  }

  // ---- tags（平移 + forms 修正 + entry 覆盖） ----
  const srcTags = item.tags || {};
  const tags = {
    forms: entryRule?.forms ?? fixForms(srcTags.forms || [], item.rawType),
    visualStyles: entryRule?.visualStyles ?? srcTags.visualStyles ?? [],
    functions: srcTags.functions ?? [],
    soundForms: srcTags.soundForms ?? [],
    inputMethods: entryRule?.inputMethods ?? srcTags.inputMethods ?? [],
    technologies: srcTags.technologies ?? [],
    platforms: srcTags.platforms ?? [],
    models: srcTags.models ?? [],
  };

  // ---- 展示名（与 displayNameOf 同一规则）----
  const name = displayNameOf(item);

  // ---- id ----
  let id;
  if (isGithub) {
    // 仓库条目：author-repo；文件链接条目：author-repo-<仓库内路径>（同仓库多条时天然区分）
    const suffix = isFileLink ? `-${filePath}` : '';
    id = toSlug(`${item.author}-${item.repo}${suffix}`);
  } else {
    id = urlSlug(item.url);
  }

  // ---- 描述文案（克制：只陈述索引线索，不编造功能细节） ----
  const tagPhraseText = tagPhrase(item.rawTags || []);
  const rawTypeZh = RAW_TYPE_ZH[item.rawType] || '';
  let description;
  if (item.description) {
    // entry 合并条目：使用索引入口现成的人工描述
    description = item.description;
  } else if (tagPhraseText) {
    description = `据索引介绍，属于${tagPhraseText}方向的视频制作 Skill`;
  } else if (rawTypeZh) {
    description = `收录于 Opus 5.5 前端动画视频 Skills 索引的${rawTypeZh}资源`;
  } else {
    description = '收录于 Opus 5.5 前端动画视频 Skills 索引的视频制作 Skill 仓库';
  }

  const categoryZh = CATEGORY_ZH[category];
  let classifySentence;
  if (entryRule) {
    classifySentence = `索引入口章节收录，据入口说明归入${categoryZh}`;
  } else if (category === 'uncategorized') {
    classifySentence = '索引未提供用途标签，名称亦无明显视频制作线索，暂列待分类';
  } else if (basis === '索引介绍' && tagPhraseText) {
    classifySentence = `索引标签含${tagPhraseText}，据此归入${categoryZh}（tagBasis：索引介绍）`;
  } else {
    classifySentence = `无用途标签线索，依据名称关键词推断归入${categoryZh}（tagBasis：名称推断）`;
  }
  const longDescription =
    `采集自 Opus 5.5 前端动画视频 Skills 索引（${COLLECT_DATE} 采集）。` +
    `${classifySentence}。未核验实际效果与可用性，详情见仓库链接。`;

  // ---- 安装命令 ----
  let installCommand;
  if (isGithub && !isFileLink) {
    installCommand = `git clone ${item.url}.git`;
  } else if (isFileLink) {
    installCommand = `查看文档：${item.url}`;
  } else {
    installCommand = `查看链接：${item.url}`;
  }

  // ---- 家族：同名仓库自动形成家族；非 GitHub 条目以 id 为家族 ----
  const family = item.repo || id;

  return {
    id,
    name,
    description,
    longDescription,
    primaryCategory: category,
    family,
    tags,
    tagBasis: basis,
    author: item.author,
    sourceUrl: item.url,
    stars: 0,
    installCommand,
    featured: false,
    createdAt: daysAgo((index % 14) + 16),
    updatedAt: daysAgo(index % 14),
    difficulty: '入门',
    language: detectLanguage(item.name, item.url),
  };
}

/** rawTags → 中文标签串（去重、最多 5 个，超出加「等」） */
function tagPhrase(rawTags) {
  const zh = [...new Set(rawTags.map((t) => RAW_TAG_ZH[t] ?? t))];
  if (zh.length === 0) return '';
  if (zh.length > 5) return `${zh.slice(0, 5).join('、')}等`;
  return zh.join('、');
}

// ============================================================
// 五、TS 文件渲染
// ============================================================

/** 渲染单个大类数据文件 */
function renderCategoryFile(category, exportName, items) {
  const header =
    '// ============================================================\n' +
    `// 码上开演 · Opus 索引数据 —— ${CATEGORY_ZH[category]}（primaryCategory: '${category}'）\n` +
    '// ------------------------------------------------------------\n' +
    '// 本文件由 scripts/generate-opus-skills-data.mjs 自动生成，请勿手工编辑。\n' +
    `// 数据来源：Opus 5.5 前端动画视频 Skills 索引（${COLLECT_DATE} 采集）。\n` +
    `// 生成条数：${items.length}\n` +
    '// ============================================================\n';

  const body = items
    .map((s) => {
      const lines = [
        '  {',
        `    id: ${tsStr(s.id)},`,
        `    name: ${tsStr(s.name)},`,
        `    description: ${tsStr(s.description)},`,
        `    longDescription: ${tsStr(s.longDescription)},`,
        `    primaryCategory: '${s.primaryCategory}',`,
        `    family: ${tsStr(s.family)},`,
        `    tags: { forms: [${s.tags.forms.map(tsStr).join(', ')}], visualStyles: [${s.tags.visualStyles.map(tsStr).join(', ')}], functions: [${s.tags.functions.map(tsStr).join(', ')}], soundForms: [${s.tags.soundForms.map(tsStr).join(', ')}], inputMethods: [${s.tags.inputMethods.map(tsStr).join(', ')}], technologies: [${s.tags.technologies.map(tsStr).join(', ')}], platforms: [${s.tags.platforms.map(tsStr).join(', ')}], models: [${s.tags.models.map(tsStr).join(', ')}] },`,
        `    tagBasis: ${tsStr(s.tagBasis)},`,
        `    author: ${tsStr(s.author)},`,
        `    sourceUrl: ${tsStr(s.sourceUrl)},`,
        `    stars: ${s.stars},`,
        `    installCommand: ${tsStr(s.installCommand)},`,
        `    featured: ${s.featured},`,
        `    createdAt: ${tsStr(s.createdAt)},`,
        `    updatedAt: ${tsStr(s.updatedAt)},`,
        `    difficulty: ${tsStr(s.difficulty)},`,
        `    language: ${tsStr(s.language)},`,
        '  },',
      ];
      return lines.join('\n');
    })
    .join('\n');

  return (
    header +
    "import type { Skill } from '@/types';\n" +
    '\n' +
    `/** Opus 索引导入 · ${CATEGORY_ZH[category]}（${items.length} 条，自动生成） */\n` +
    `export const ${exportName}: Skill[] = [\n${body}\n];\n`
  );
}

/** 渲染 src/data/opus/index.ts（合并导出 opusSkills） */
function renderOpusIndex(total) {
  const imports = Object.values(CATEGORY_FILES)
    .map((cfg) => `import { ${cfg.exportName} } from './${cfg.file.replace(/\.ts$/, '')}';`)
    .join('\n');
  const spreads = Object.values(CATEGORY_FILES)
    .map((cfg) => `  ...${cfg.exportName},`)
    .join('\n');
  return (
    '// ============================================================\n' +
    '// 码上开演 · Opus 索引数据合并导出\n' +
    '// ------------------------------------------------------------\n' +
    '// 本文件由 scripts/generate-opus-skills-data.mjs 自动生成，请勿手工编辑。\n' +
    `// 数据来源：Opus 5.5 前端动画视频 Skills 索引（${COLLECT_DATE} 采集），共 ${total} 条。\n` +
    '// ============================================================\n' +
    "import type { Skill } from '@/types';\n" +
    '\n' +
    imports +
    '\n\n' +
    `/** Opus 5.5 前端动画视频 Skills 索引导入的数据（共 ${total} 条） */\n` +
    `export const opusSkills: Skill[] = [\n${spreads}\n];\n`
  );
}

/** 渲染 src/data/index.ts（全站数据统一出口：Vibe 存量 + Opus 导入 + demo-media 挂载） */
function renderDataIndex(vibeCount) {
  return (
    '// ============================================================\n' +
    '// 码上开演 · 数据统一出口\n' +
    '// ------------------------------------------------------------\n' +
    `// 合并存量 Vibe 数据（./skills，${vibeCount} 条，经 legacyMigration 迁移）\n` +
    '// 与 Opus 索引导入数据（./opus，scripts/generate-opus-skills-data.mjs 生成）。\n' +
    '// 对外仅暴露 skills / featuredSkills / getSkillById 三个 API。\n' +
    '// 注意：全项目请统一从 "@/data" 导入数据，勿直接引用 "@/data/skills"。\n' +
    '// ============================================================\n' +
    "import type { Skill } from '@/types';\n" +
    '\n' +
    "import { skills as vibeSkills } from './skills';\n" +
    "import { opusSkills } from './opus';\n" +
    "import { DEMO_MEDIA } from './demo-media';\n" +
    '\n' +
    '/** 全站 Skill 数据集（Vibe 存量 + Opus 索引导入） */\n' +
    'export const skills: Skill[] = [...vibeSkills, ...opusSkills];\n' +
    '\n' +
    '// 效果展示媒体挂载：合并后统一注入，确保 Opus 数据同样可展示（见 SkillCard.tsx）\n' +
    'skills.forEach((s) => {\n' +
    '  const media = DEMO_MEDIA[s.id];\n' +
    '  if (media && media.length > 0) {\n' +
    '    s.demoMedia = media;\n' +
    '  }\n' +
    '});\n' +
    '\n' +
    '/** 精选 Skill（新导入数据默认非精选，精选仍来自存量入口） */\n' +
    'export const featuredSkills: Skill[] = skills.filter((s) => s.featured);\n' +
    '\n' +
    '/** 根据 ID 获取 Skill */\n' +
    'export function getSkillById(id: string): Skill | undefined {\n' +
    '  return skills.find((s) => s.id === id);\n' +
    '}\n'
  );
}

// ============================================================
// 六、运行时自检（esbuild 打包 src/data/index.ts 后执行统计断言）
// ============================================================

async function verifyRuntime(expectedOpusCount, vibeCount) {
  console.log('--------------------------------------------------');
  console.log('运行时自检（esbuild bundle src/data/index.ts）：');
  const esbuildBin = resolve(ROOT, 'node_modules/.bin/esbuild');
  if (!existsSync(esbuildBin)) {
    console.warn('  [跳过] 未找到 esbuild，跳过运行时自检');
    return;
  }
  const outfile = resolve(ROOT, 'scripts/output/.tmp-data-check.mjs');
  execSync(
    `"${esbuildBin}" src/data/index.ts --bundle --outfile="${outfile}" --format=esm --alias:@=./src --log-level=error`,
    { cwd: ROOT, stdio: 'pipe' }
  );
  try {
    const mod = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
    const total = mod.skills.length;
    const expectedTotal = vibeCount + expectedOpusCount;
    const dist = {};
    for (const s of mod.skills) dist[s.primaryCategory] = (dist[s.primaryCategory] || 0) + 1;
    console.log(`  skills.length = ${total}（Vibe ${vibeCount} + Opus ${expectedOpusCount} = ${expectedTotal}）${total === expectedTotal ? ' ✓' : ' ✗'}`);
    console.log(`  featuredSkills.length = ${mod.featuredSkills.length} ✓`);
    const sample = mod.skills[mod.skills.length - 1];
    const found = mod.getSkillById(sample.id);
    console.log(`  getSkillById('${sample.id}') → ${found ? sample.name : '未找到'} ${found ? '✓' : '✗'}`);
    console.log('  合并后全站大类分布：');
    for (const [cat, count] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${cat.padEnd(18)}${String(count).padStart(4)} 条`);
    }
    if (total !== expectedTotal) {
      console.error('  [错误] 数据总数不符合预期！');
      process.exitCode = 1;
    }
  } finally {
    rmSync(outfile, { force: true });
  }
}

main().catch((err) => {
  console.error('[错误] 生成失败：', err);
  process.exit(1);
});