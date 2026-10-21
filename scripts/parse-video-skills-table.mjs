#!/usr/bin/env node
/**
 * parse-video-skills-table.mjs
 *
 * 解析《02-Opus 5.5 前端动画视频 Skills.md》资源清单，产出结构化中间 JSON。
 *
 * 导入范围：
 *   - 「先看这些入口」（列表格式，约 7 条）        → section = 'entry'
 *   - 「主要资料（568）」（表格）                  → section = 'main'
 *   - 「视频制作配套（114）」（表格）              → section = 'companion'
 *   - 「作品/经验参考（426）」（X 帖子）           → 跳过，不导入
 *
 * 输出：
 *   - scripts/output/intermediate.json    结构化资源数组
 *   - scripts/output/category-stats.json  分类分布统计
 *
 * 运行：node scripts/parse-video-skills-table.mjs（Node 18+，零第三方依赖，纯 ESM）
 *
 * 说明：
 *   - 本脚本只读源 Markdown，只写 scripts/output/，不触碰 src/ 目录。
 *   - 分类映射规则与团队约定一致，规则细节见各 RULES 常量的行内注释（标注任务规则编号）。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// 常量与配置
// ---------------------------------------------------------------------------

/** 源 Markdown 文件路径 */
const SOURCE_FILE =
  '/Users/wupeng/.codex/.chatgpt-projects/g-p-6ad5fec4d050819194cd6564afc546ae/outputs/resource-library-2026-10-20/02-Opus 5.5 前端动画视频 Skills.md';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(SCRIPT_DIR, 'output');
const INTERMEDIATE_FILE = join(OUTPUT_DIR, 'intermediate.json');
const STATS_FILE = join(OUTPUT_DIR, 'category-stats.json');

/** uncategorized 占比阈值：超过则判定为规则覆盖不足（打印警告） */
const UNCATEGORIZED_RATIO_LIMIT = 0.4;

/** 章节标题 → 导入行为映射（按标题前缀匹配；null 表示跳过该章节） */
const SECTION_HEADERS = [
  { test: /^##\s+先看这些入口/, section: 'entry' },
  { test: /^##\s+主要资料/, section: 'main' },
  { test: /^##\s+视频制作配套/, section: 'companion' },
  { test: /^##\s+作品\/经验参考/, section: null }, // X 帖子部分，跳过
];

/** entry 章节行格式：`- [name](url)：描述` */
const ENTRY_LINE_RE = /^-\s+\[([^\]]+)\]\(([^)]+)\)[：:]\s*(.*)$/;

/** Markdown 链接格式：`[显示名](url)` */
const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/;

/** GitHub blob 链接显示名尾巴，如 `...SKILL.md at main · user/repo · GitHub` */
const GITHUB_PATH_TAIL_RE = /\s+at\s+[^·]+·.*$/;

// ---------------------------------------------------------------------------
// 分类规则（primaryCategory，按优先级自上而下，满足即停）
// ---------------------------------------------------------------------------

/**
 * 规则 1 —— Vibe 知识大赏（本表理论无，保险起见检查）。
 * 边界处理：'vibe' 单独命中不触发（vibe-coding 是通用术语，vibe-editing 等
 * 是泛用剪辑库，并非"Vibe 大赏复刻"）；仅当出现"知识大赏"，或 vibe 与
 * "大赏/同款/复刻"共现时才归 'vibe'。
 */
const VIBE_STRONG_RE = /知识大赏|大赏|同款|复刻/;

/** 规则 2 —— 剪辑与声音后期：标签含 ✂️ Editing，或名称含后期相关关键词 */
const POST_PRODUCTION_TAG = '✂️ editing';
const POST_PRODUCTION_NAME_SUBSTR = [
  'editing', 'edit', 'cut', 'cutter', 'clip', 'clipping', 'srt', 'subtitle',
  '字幕', 'premiere', 'after-effects', 'audio', 'voice', 'dubbing', '音效', '配音',
];

/** 规则 3 —— 数字人口播：标签含 🧑‍💼 Avatars → 多用途 general-video */
const AVATARS_TAG = '🧑‍💼 avatars';

/** 规则 4 —— 科普与教学 */
const EDUCATION_TAGS = ['🎓 explainers', '科普拓展', '科普'];
const EDUCATION_NAME_SUBSTR = ['explainer', 'knowledge', '教育', 'tutorial-video'];

/** 规则 5 —— 叙事短片与音乐 MV */
const NARRATIVE_MV_TAGS = ['🎵 music videos', '音乐/mv', '📖 stories & animation'];
const NARRATIVE_MV_NAME_SUBSTR = ['music-video', 'music video', 'lyric', 'story'];
/** 'mv' 等短词用分词精确匹配，避免子串误命中 */
const NARRATIVE_MV_NAME_WORDS = ['mv', 'mvs'];

/** 规则 6 —— 产品宣传与演示 */
const PROMO_TAG = '📣 promo & demos';
const SHORTS_TAG = '📱 shorts & social';
const PROMO_NAME_WORDS = ['promo', 'promos', 'ad', 'ads', 'launch', 'demo', 'demos'];

/** 规则 7 —— 游戏与互动 */
const GAME_NAME_SUBSTR = ['game', '游戏'];

/** 规则 8 —— 动效与视觉设计 */
const MOTION_DESIGN_TAGS = ['🎞 motion graphics', '🎬'];
const MOTION_DESIGN_NAME_SUBSTR = [
  'motion-graphic', 'motion graphic', 'kinetic', 'typography', 'logo-intro', 'logointro',
];

/**
 * 规则 9 —— 通用视频制作兜底标签。
 * 注：规则 10 的 `🧪 Tested end to end` 为质量标记而非用途标签，不参与判定（天然跳过）。
 */
const GENERAL_VIDEO_FALLBACK_TAGS = [
  '🧱 frameworks & toolkits', '工具箱', '📝 scripts & learning',
  '📱 shorts & social', '环境/ip', '其他模型/配套拓展',
];

// ---------------------------------------------------------------------------
// 资源形态（forms）映射：rawType → forms
// ---------------------------------------------------------------------------

/** 任务规则未覆盖、按语义补充的 rawType 映射（教程类 → tutorial；文档/收录页 → collection） */
const EXTRA_FORMS_BY_RAW_TYPE = {
  '教程/文章': ['tutorial'],
  '视频教程': ['tutorial'],
  'GitHub 文档': ['collection'],
  'Skill 收录页面': ['collection'],
  '入口索引': ['collection'], // entry 章节自造 rawType
};

// ---------------------------------------------------------------------------
// 技术栈 / 制作功能 / 画风 识别规则
// ---------------------------------------------------------------------------

/** 实现技术：sub=子串匹配，word=分词精确匹配；来源为名称与 rawTags 段落 */
const TECHNOLOGY_RULES = [
  { value: 'hyperframes', substr: ['hyperframes'] },
  { value: 'remotion', substr: ['remotion'] },
  { value: 'manim', substr: ['manim'] },
  { value: 'canvas', substr: ['canvas'] },
  { value: 'html-css', substr: ['html'] },
  { value: 'gsap', substr: ['gsap'] },
  { value: 'threejs', substr: ['three.js', 'threejs', 'three-js'], words: ['three'] },
  { value: 'webgl', substr: ['webgl'] },
  { value: 'blender', substr: ['blender'] },
  { value: 'canvas', substr: ['p5.js', 'p5js', 'p5-js'], words: ['p5'] }, // p5.js 近似归 canvas
  { value: 'html-css', substr: ['lottie'] }, // Lottie 近似归 html-css
];

/** 制作功能（宁缺毋滥：名称关键词 + `📝 Scripts & learning` 标签→copywriting） */
const FUNCTION_RULES = [
  { value: 'copywriting', substr: ['script', 'copywriting', '文案'], tag: '📝 scripts & learning' },
  { value: 'subtitle', substr: ['subtitle', 'srt', '字幕'] },
  { value: 'editing', substr: ['edit', 'cut'] },
  { value: 'render-export', substr: ['render', 'export'] },
  { value: 'sound-fx', substr: ['音效', 'sound'] },
  { value: 'voiceover', substr: ['配音', 'voice', 'tts'] },
];

/** 画风（只在明确时添加，无法判断则空数组） */
const VISUAL_STYLE_RULES = [
  { value: 'paper-craft', substr: ['paper-cut', 'papercut', '剪纸'] },
  { value: 'line-art', substr: ['hand-drawn', 'handdrawn', '手绘'] },
  { value: 'pixel', substr: ['pixel', '像素'] },
  { value: 'ink-wash', substr: ['水墨', 'ink-wash', 'inkwash'], words: ['ink'] },
  { value: '3d-space', substr: ['3d'], words: ['three'] },
  { value: 'kinetic-typography', substr: ['typography', '字体'] },
  { value: 'geometric', substr: ['geometric'] },
];

/** 其他模型关键词（命中则 models=['other-model']，否则默认 ['opus-55']） */
const OTHER_MODEL_NAME_SUBSTR = ['minimax', 'gpt', 'gemini'];
const OTHER_MODEL_NAME_WORDS = ['h3']; // 'h3' 过短，分词精确匹配避免误命中

// ---------------------------------------------------------------------------
// 通用工具函数
// ---------------------------------------------------------------------------

/** 名称/文本分词：按非字母数字字符拆分（'remotion-ad-video' → ['remotion','ad','video']） */
function tokenize(text) {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** 名称是否含任一子串关键词 */
function hasAnySubstring(lowerText, keywords) {
  return keywords.some((kw) => lowerText.includes(kw));
}

/** 名称分词后是否含任一精确词 */
function hasAnyWord(text, words) {
  const tokens = tokenize(text);
  return words.some((w) => tokens.includes(w));
}

/** 去掉 GitHub blob 链接显示名的 ` at main · user/repo · GitHub` 尾巴 */
function cleanDisplayName(display) {
  return display.replace(GITHUB_PATH_TAIL_RE, '').trim();
}

/** 从 URL 提取 author/repo：GitHub 取 owner 与仓库名（文件链接取仓库名）；非 GitHub 为 社区/null */
function extractAuthorRepo(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { author: '社区', repo: null };
  }
  if (parsed.hostname === 'github.com') {
    const segments = parsed.pathname.split('/').filter(Boolean);
    const author = segments[0] ?? null;
    let repo = segments[1] ?? null;
    if (repo && repo.endsWith('.git')) repo = repo.slice(0, -4);
    return { author: author ?? '社区', repo };
  }
  // 非 GitHub 链接（教程/文章、收录页等）：无仓库语义，repo 置 null
  return { author: '社区', repo: null };
}

/** 解析发现来源单元格：`[来源](url)` → { text, url }；纯文本 → { text, url: null } */
function parseDiscoveryCell(cell) {
  const match = cell.match(LINK_RE);
  if (match) return { text: match[1].trim(), url: match[2].trim() };
  return { text: cell.trim(), url: null };
}

// ---------------------------------------------------------------------------
// 规则函数实现
// ---------------------------------------------------------------------------

/**
 * primaryCategory 判定（按优先级，满足即停）。
 * @returns {{ category: string, basis: string }} basis：'索引介绍'=标签命中；'名称推断'=仅名称命中
 */
function classifyPrimaryCategory({ name, tagCell }) {
  const nameLower = name.toLowerCase();
  const tagsLower = tagCell.toLowerCase();
  const combined = `${name}${tagCell}`;

  // 规则 1：Vibe 知识大赏 / 同款复刻
  if (combined.includes('知识大赏') || (nameLower.includes('vibe') && VIBE_STRONG_RE.test(combined))) {
    return { category: 'vibe', basis: '名称推断' };
  }
  // 规则 2：剪辑与声音后期
  if (tagsLower.includes(POST_PRODUCTION_TAG)) return { category: 'post-production', basis: '索引介绍' };
  if (hasAnySubstring(nameLower, POST_PRODUCTION_NAME_SUBSTR)) {
    return { category: 'post-production', basis: '名称推断' };
  }
  // 规则 3：数字人口播 → 多用途
  if (tagsLower.includes(AVATARS_TAG)) return { category: 'general-video', basis: '索引介绍' };
  // 规则 4：科普与教学
  if (EDUCATION_TAGS.some((t) => tagsLower.includes(t))) return { category: 'education', basis: '索引介绍' };
  if (hasAnySubstring(nameLower, EDUCATION_NAME_SUBSTR)) return { category: 'education', basis: '名称推断' };
  // 规则 5：叙事短片与音乐 MV
  if (NARRATIVE_MV_TAGS.some((t) => tagsLower.includes(t))) return { category: 'narrative-mv', basis: '索引介绍' };
  if (hasAnySubstring(nameLower, NARRATIVE_MV_NAME_SUBSTR) || hasAnyWord(name, NARRATIVE_MV_NAME_WORDS)) {
    return { category: 'narrative-mv', basis: '名称推断' };
  }
  // 规则 6：产品宣传与演示
  //   - `📣 Promo & demos` 标签本身即为"产品宣传与演示"的明确信号（63 条中 44 条名称无
  //     promo 关键词，若要求 AND 会大量漏判）；
  //   - `📱 Shorts & social` 仅在名称含 promo/ad/launch/demo 时归 promo，
  //     否则继续向下走规则 9 兜底（对应任务"仅 Shorts & social 无其他用途线索时归
  //     general-video"的约束）。
  if (tagsLower.includes(PROMO_TAG)) return { category: 'promo', basis: '索引介绍' };
  if (
    (tagsLower.includes(SHORTS_TAG) || tagsLower.includes(PROMO_TAG)) &&
    hasAnyWord(name, PROMO_NAME_WORDS)
  ) {
    return { category: 'promo', basis: '名称推断' };
  }
  // 规则 7：游戏与互动
  if (hasAnySubstring(nameLower, GAME_NAME_SUBSTR)) return { category: 'game-interactive', basis: '名称推断' };
  // 规则 8：动效与视觉设计
  if (MOTION_DESIGN_TAGS.some((t) => t && tagsLower.includes(t))) {
    return { category: 'motion-design', basis: '索引介绍' };
  }
  if (hasAnySubstring(nameLower, MOTION_DESIGN_NAME_SUBSTR)) {
    return { category: 'motion-design', basis: '名称推断' };
  }
  // 规则 9：通用视频制作兜底（规则 10 的 Tested end to end 天然不在此列，视为跳过）
  if (GENERAL_VIDEO_FALLBACK_TAGS.some((t) => tagsLower.includes(t))) {
    return { category: 'general-video', basis: '索引介绍' };
  }
  // 规则 11：待分类
  return { category: 'uncategorized', basis: '索引介绍' };
}

/** 资源形态 forms：rawType 映射（可多值） */
function mapForms({ rawType, name, tagCell }) {
  const nameLower = name.toLowerCase();
  const textLower = `${name} ${tagCell}`.toLowerCase();

  switch (rawType) {
    case 'Skill/工具仓库候选':
      return ['skill'];
    case '索引/提示词/指南仓库':
      // 名称/说明含 prompt 时追加 'prompt'
      return textLower.includes('prompt') ? ['collection', 'prompt'] : ['collection'];
    case '代码动画仓库/案例候选':
      // 名称含 demo/example/case → ['case','template']，否则 ['template']
      return ['demo', 'example', 'case'].some((w) => nameLower.includes(w))
        ? ['case', 'template']
        : ['template'];
    case '代码动画仓库/文档':
      return ['collection'];
    case 'Skill 文件':
      return ['skill'];
    default:
      // 任务规则未覆盖的 rawType（教程/文章、视频教程、GitHub 文档、Skill 收录页面、入口索引）
      return EXTRA_FORMS_BY_RAW_TYPE[rawType] ?? [];
  }
}

/** 实现技术 technologies：从 rawTags 段落与名称识别（去重保序） */
function mapTechnologies({ name, rawTags }) {
  const haystackLower = `${name} ${rawTags.join(' ')}`.toLowerCase();
  const result = [];
  for (const rule of TECHNOLOGY_RULES) {
    const hit =
      (rule.substr && hasAnySubstring(haystackLower, rule.substr)) ||
      (rule.words && hasAnyWord(haystackLower, rule.words));
    if (hit && !result.includes(rule.value)) result.push(rule.value);
  }
  return result;
}

/** 制作功能 functions：从名称/标签识别，宁缺毋滥（无法判断则空数组） */
function mapFunctions({ name, tagCell }) {
  const nameLower = name.toLowerCase();
  const tagsLower = tagCell.toLowerCase();
  const result = [];
  for (const rule of FUNCTION_RULES) {
    const hit = hasAnySubstring(nameLower, rule.substr) || (rule.tag && tagsLower.includes(rule.tag));
    if (hit && !result.includes(rule.value)) result.push(rule.value);
  }
  return result;
}

/** 画风 visualStyles：从名称/标签识别，只在明确时添加 */
function mapVisualStyles({ name, rawTags }) {
  const haystackLower = `${name} ${rawTags.join(' ')}`.toLowerCase();
  const result = [];
  for (const rule of VISUAL_STYLE_RULES) {
    const hit =
      hasAnySubstring(haystackLower, rule.substr) ||
      (rule.words && hasAnyWord(haystackLower, rule.words));
    if (hit && !result.includes(rule.value)) result.push(rule.value);
  }
  return result;
}

/** 模型 models：默认 ['opus-55']（本表为 Opus 5.5 采集结果）；名称含其他模型线索则 ['other-model'] */
function mapModels(name) {
  const nameLower = name.toLowerCase();
  const isOtherModel =
    hasAnySubstring(nameLower, OTHER_MODEL_NAME_SUBSTR) || hasAnyWord(name, OTHER_MODEL_NAME_WORDS);
  return isOtherModel ? ['other-model'] : ['opus-55'];
}

/** 平台 platforms：默认 ['unknown']；名称/来源含 claude→claude-code、含 codex→codex（可并存） */
function mapPlatforms(name, discoverySource, discoveryUrl) {
  const text = `${name} ${discoverySource} ${discoveryUrl ?? ''}`.toLowerCase();
  const platforms = [];
  if (text.includes('claude')) platforms.push('claude-code');
  if (text.includes('codex')) platforms.push('codex');
  return platforms.length > 0 ? platforms : ['unknown'];
}

// ---------------------------------------------------------------------------
// 行解析
// ---------------------------------------------------------------------------

/** 拆分标签列：第一段为 rawType，其余段落按 ` · ` 分隔、段内再按 ` / ` 拆分（如 `Explainers / Manim`） */
function splitTagCell(tagCell) {
  const segments = tagCell
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean);
  const rawType = segments[0] ?? '';
  const rawTags = segments
    .slice(1)
    .flatMap((seg) => seg.split(' / ').map((s) => s.trim()))
    .filter(Boolean);
  return { rawType, rawTags };
}

/** 组装单条结构化资源记录 */
function buildRecord({ section, name, url, tagCell, discovery, sourceRow, sourceId, description }) {
  const { rawType, rawTags } = splitTagCell(tagCell);
  const { author, repo } = extractAuthorRepo(url);
  const { category, basis } = classifyPrimaryCategory({ name, tagCell });

  const record = {
    section,
    name,
    url,
    author,
    repo,
    rawType,
    rawTags,
    discoverySource: discovery.text,
    discoveryUrl: discovery.url,
    primaryCategory: category,
    vibeSubcategory: null, // 本表为非 Vibe 大赏资源，统一 null（规则 1 命中时也无细分依据）
    tags: {
      forms: mapForms({ rawType, name, tagCell }),
      visualStyles: mapVisualStyles({ name, rawTags }),
      functions: mapFunctions({ name, tagCell }),
      soundForms: [], // 信息不足不推测，留待人工补充
      inputMethods: [], // 同上
      technologies: mapTechnologies({ name, rawTags }),
      platforms: mapPlatforms(name, discovery.text, discovery.url),
      models: mapModels(name),
    },
    tagBasis: basis,
    // 溯源字段：便于与源表格逐行对照（不属于核心结构，后续对齐阶段可丢弃）
    sourceRow,
    sourceId,
  };
  if (description) record.description = description;
  return record;
}

/** 解析 entry 章节的列表行：`- [name](url)：描述` */
function parseEntryLine(line, sourceRow) {
  const match = line.match(ENTRY_LINE_RE);
  if (!match) return null;
  const [, displayName, url, rawDescription] = match;
  const description = rawDescription.trim().replace(/。$/, '');
  return buildRecord({
    section: 'entry',
    name: cleanDisplayName(displayName),
    url: url.trim(),
    tagCell: '', // entry 无标签列
    discovery: { text: '文档入口章节（先看这些入口）', url: null },
    sourceRow,
    sourceId: null,
    description,
  });
}

/** 解析 main/companion 章节的表格数据行 */
function parseTableLine(line, section, sourceRow) {
  const cols = line.split('|').map((c) => c.trim());
  if (cols.length < 6) return { error: `列数异常（${cols.length - 2} 列）` };

  const [, idCell, nameCell, tagCell, srcCell] = cols;
  const sourceId = Number.parseInt(idCell, 10);

  const linkMatch = nameCell.match(LINK_RE);
  if (!linkMatch) return { error: '名称列未解析到链接' };

  const name = cleanDisplayName(linkMatch[1]) || nameCell; // 兜底：显示名为空时用整格文本
  const url = linkMatch[2].trim();
  const discovery = parseDiscoveryCell(srcCell);

  return {
    record: buildRecord({ section, name, url, tagCell, discovery, sourceRow, sourceId }),
    sourceId: Number.isNaN(sourceId) ? null : sourceId,
  };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function main() {
  // 1. 读取源文件
  let lines;
  try {
    lines = readFileSync(SOURCE_FILE, 'utf8').split('\n');
  } catch (err) {
    console.error(`[错误] 无法读取源文件：${SOURCE_FILE}`);
    console.error(`        ${err.message}`);
    process.exit(1);
  }

  // 2. 按章节标题切分并逐行解析
  const records = [];
  const warnings = [];
  const sectionLineCounts = { entry: 0, main: 0, companion: 0, skipped: 0 };
  // currentSection：'entry'|'main'|'companion' = 导入章节；'skip' = X 帖子章节；null = 未进入任何章节
  let currentSection = null;
  let expectedNextId = null; // 表格编号连续性校验

  /** 表格数据行判定：以 | 开头且非表头（| 编号...）与非分隔行（|---|） */
  const isTableDataLine = (l) =>
    l.startsWith('|') && !/^\|\s*编号/.test(l) && !/^\|[\s:|-]+\|/.test(l);

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i];

    const header = SECTION_HEADERS.find((h) => h.test.test(line));
    if (header) {
      currentSection = header.section ?? 'skip';
      expectedNextId = 1;
      continue;
    }
    if (currentSection === null) continue;

    // entry 章节：匹配 `- [name](url)：描述` 列表行
    if (currentSection === 'entry') {
      if (!line.startsWith('- ')) continue;
      const record = parseEntryLine(line, lineNo);
      if (record) {
        records.push(record);
        sectionLineCounts.entry += 1;
      } else {
        warnings.push(`第 ${lineNo} 行：entry 列表行解析失败 -> ${line.slice(0, 60)}`);
      }
      continue;
    }

    // X 帖子章节：仅计数，不导入
    if (currentSection === 'skip') {
      if (isTableDataLine(line)) sectionLineCounts.skipped += 1;
      continue;
    }

    // main / companion 章节：表格数据行
    if (!isTableDataLine(line)) continue;

    const { record, sourceId, error } = parseTableLine(line, currentSection, lineNo);
    if (error || !record) {
      warnings.push(`第 ${lineNo} 行：表格行解析失败（${error ?? '未知原因'}）-> ${line.slice(0, 60)}`);
      continue;
    }

    if (sourceId !== null && sourceId !== expectedNextId) {
      warnings.push(
        `第 ${lineNo} 行：编号不连续（期望 ${expectedNextId}，实际 ${sourceId}）`,
      );
    }
    if (sourceId !== null) expectedNextId = sourceId + 1;

    records.push(record);
    sectionLineCounts[currentSection] += 1;
  }


  // 3. 输出中间 JSON
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(INTERMEDIATE_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');

  // 4. 分类分布统计
  const categoryCount = new Map();
  const rawTypeCount = new Map();
  const tagBasisCount = new Map();
  for (const r of records) {
    categoryCount.set(r.primaryCategory, (categoryCount.get(r.primaryCategory) ?? 0) + 1);
    rawTypeCount.set(r.rawType, (rawTypeCount.get(r.rawType) ?? 0) + 1);
    tagBasisCount.set(r.tagBasis, (tagBasisCount.get(r.tagBasis) ?? 0) + 1);
  }
  const total = records.length;
  const toRatioMap = (m) =>
    Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v / total]));
  const uncategorizedRatio = (categoryCount.get('uncategorized') ?? 0) / total;

  const stats = {
    generatedAt: new Date().toISOString(),
    source: SOURCE_FILE,
    total,
    bySection: {
      entry: sectionLineCounts.entry,
      main: sectionLineCounts.main,
      companion: sectionLineCounts.companion,
      skippedXPosts: sectionLineCounts.skipped,
    },
    primaryCategory: Object.fromEntries([...categoryCount.entries()].sort((a, b) => b[1] - a[1])),
    primaryCategoryRatio: toRatioMap(categoryCount),
    uncategorizedRatio,
    rawType: Object.fromEntries([...rawTypeCount.entries()].sort((a, b) => b[1] - a[1])),
    tagBasis: Object.fromEntries([...tagBasisCount.entries()].sort((a, b) => b[1] - a[1])),
  };
  writeFileSync(STATS_FILE, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

  // 5. 控制台报告
  console.log('==== 解析完成 ====');
  console.log(`源文件：${SOURCE_FILE}`);
  console.log(`条数统计：entry=${sectionLineCounts.entry}  main=${sectionLineCounts.main}  companion=${sectionLineCounts.companion}  合计=${total}`);
  console.log(`（跳过 X 帖子章节 ${sectionLineCounts.skipped} 条）`);
  console.log('\n---- primaryCategory 分布 ----');
  for (const [cat, count] of [...categoryCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(count).padStart(4)}  (${(count / total * 100).toFixed(1).padStart(5)}%)  ${cat}`);
  }
  console.log(`\nuncategorized 占比：${(uncategorizedRatio * 100).toFixed(1)}%（阈值 40%）`);
  if (uncategorizedRatio >= UNCATEGORIZED_RATIO_LIMIT) {
    console.error('[警告] 待分类占比过高，请检查分类规则覆盖情况！');
  } else {
    console.log('✓ 占比低于阈值');
  }

  if (warnings.length > 0) {
    console.error(`\n[警告] 共 ${warnings.length} 条解析警告：`);
    warnings.forEach((w) => console.error(`  - ${w}`));
  } else {
    console.log('\n✓ 无解析警告（全部行解析成功，表格编号连续）');
  }

  console.log(`\n输出文件：`);
  console.log(`  - ${INTERMEDIATE_FILE}`);
  console.log(`  - ${STATS_FILE}`);
}

main();