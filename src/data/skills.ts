// ============================================================
// Skill 数据集 - Vibe 知识大赏 Skills（存量数据）
// 数据来源：2026-10-20 采集，共 119 条；2026-10-21 同名去重
// （剔除 vibe-knowledge-film 59 个社区 Fork、vibe-knowledge-video-skill
//   4 个 Fork、vibe-knowledge-video 家族 11 个同名仓库、
//   vibe-knowledge 5 个同名待分类仓库、vibe-director /
//   vibe-knowledge-awards 各 1 个同名仓库）后剩 38 条。
// ------------------------------------------------------------
// 说明：本文件内的条目仍以旧标签体系书写
// （resourceType + visualStyle + 扁平 tags），统一通过
// legacyMigration.ts 的 migrateLegacySkills 批量迁移到新体系
// （primaryCategory='vibe' + vibeSubcategory + SkillTags 八维标签）。
// ============================================================
import type { Skill, Difficulty, Language } from '@/types';
import {
  migrateLegacySkills,
  type LegacySkill,
  type LegacySkillTag,
  type LegacyResourceType,
  type LegacyVisualStyle,
} from './legacyMigration';

/** 计算N天前的时间戳 */
const daysAgo = (n: number): string => {
  const d = new Date('2026-10-20T00:00:00Z');
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

// ============================================================
// 标签常量
// ============================================================

// HeyChengC/vibe-knowledge-film（入口，432 stars）
const TAGS_FILM: LegacySkillTag[] = [
  '原理演示', '角色寓言', '通用', '选题研究', '文案', '分镜', '动画', '音效', '字幕', '导出',
  '无旁白', '事件音效', '输入主题', '输入文案', 'Canvas', 'Claude Code', '横屏', '原创',
];

// LuZhong-Li/vibe-knowledge-video-skill（入口，18 stars）
const TAGS_VIDEO_SKILL: LegacySkillTag[] = [
  '原理演示', '数据对比', '心理认知', '通用', '选题研究', '文案', '分镜', '动画', '音效', '字幕', '导出',
  '无旁白', '事件音效', '输入主题', 'HTML', 'Claude Code', '横屏', '原创',
];

// vibe-director 家族标签
const TAGS_DIRECTOR: LegacySkillTag[] = [
  '角色寓言', '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '导出',
  '无旁白', '输入主题', '横屏', '原创',
];

// ============================================================
// 辅助构造函数
// ============================================================

interface SkillOpts {
  resourceType: LegacyResourceType;
  visualStyle?: LegacyVisualStyle;
  family: string;
  tags: LegacySkillTag[];
  description: string;
  longDescription: string;
  stars?: number;
  featured?: boolean;
  difficulty?: Difficulty;
  language?: Language;
  name?: string;
}

/** 生成 GitHub 仓库 Skill 数据 */
function gh(author: string, repo: string, day: number, opts: SkillOpts): LegacySkill {
  const id = `${author}-${repo}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const url = `https://github.com/${author}/${repo}`;
  return {
    id,
    name: opts.name ?? repo,
    description: opts.description,
    longDescription: opts.longDescription,
    resourceType: opts.resourceType,
    visualStyle: opts.visualStyle,
    family: opts.family,
    tags: opts.tags,
    author,
    sourceUrl: url,
    stars: opts.stars ?? 0,
    installCommand: `git clone ${url}.git`,
    featured: opts.featured ?? false,
    createdAt: daysAgo(day + 10),
    updatedAt: daysAgo(day),
    difficulty: opts.difficulty ?? '入门',
    language: opts.language ?? 'zh',
  };
}

/** 生成 GitHub 文件链接数据（template 类型） */
function ghDoc(
  author: string,
  repo: string,
  path: string,
  day: number,
  description: string,
  longDescription: string,
  family: string,
  tags: LegacySkillTag[] = ['通用'],
  nameOverride?: string
): LegacySkill {
  const id = `${author}-${repo}-${path}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const url = `https://github.com/${author}/${repo}/blob/main/${path}`;
  return {
    id,
    // 展示名默认取文件名；同名文件（如多个 SKILL.md）传 nameOverride 用完整路径区分
    name: nameOverride ?? (path.split('/').pop() || path),
    description,
    longDescription,
    resourceType: 'template',
    family,
    tags,
    author,
    sourceUrl: url,
    stars: 0,
    installCommand: `查看文档：${url}`,
    featured: false,
    createdAt: daysAgo(day + 10),
    updatedAt: daysAgo(day),
    difficulty: '入门',
    language: 'zh',
  };
}

/** 生成非 GitHub 链接数据 */
function link(
  id: string,
  name: string,
  description: string,
  longDescription: string,
  sourceUrl: string,
  resourceType: LegacyResourceType,
  tags: LegacySkillTag[],
  day: number,
  extra?: Partial<LegacySkill>
): LegacySkill {
  return {
    id,
    name,
    description,
    longDescription,
    resourceType,
    family: id,
    tags,
    author: '社区',
    sourceUrl,
    stars: 0,
    featured: false,
    createdAt: daysAgo(day + 10),
    updatedAt: daysAgo(day),
    difficulty: '入门',
    language: 'zh',
    ...extra,
  };
}

// ============================================================
// Skill 数据集（38 条，旧体系书写；原 119 条，2026-10-21 同名去重）
// ============================================================
const legacySkills: LegacySkill[] = [
  // ============================================================
  // 6 个入口（featured: true）
  // ============================================================
  gh('HeyChengC', 'vibe-knowledge-film', 1, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibe-knowledge-film',
    tags: TAGS_FILM,
    description: 'Vibe 知识大赏短片 Skill；含两种画风与样片流程。',
    longDescription:
      '两种画风：「夜曲」适合讲底层、难懂的知识，「寓言」适合把心理、行为这类逻辑直观演示。用 Canvas 和 JavaScript 把每一帧画出来，驱动浏览器逐帧截图压成视频，再混上声音。',
    stars: 432,
    featured: true,
    difficulty: '进阶',
  }),
  gh('LuZhong-Li', 'vibe-knowledge-video-skill', 2, {
    resourceType: 'skill',
    visualStyle: 'geometric',
    family: 'vibe-knowledge-video-skill',
    tags: TAGS_VIDEO_SKILL,
    description: '无旁白科普动画的规范、模板与成片工程。',
    longDescription:
      '复刻 Vibe 知识大赏风格：120–150s · 16:9 · 无人类旁白的 HTML 科普短视频。图形是演员，文字是标签，声音只是动作的回声。八阶段全链路制作规范 + 可直接套用的工程模板。',
    stars: 18,
    featured: true,
    difficulty: '进阶',
  }),
  gh('worlds3', 'vibe-knowledge', 3, {
    resourceType: 'skill',
    visualStyle: 'geometric',
    family: 'vibe-knowledge',
    tags: [
      '原理演示', '时间演化', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点',
      '字幕', '导出', '纯音乐', '输入主题', 'Canvas', 'Claude Code', '横屏', '原创',
    ],
    description: 'Canvas 科普动画与制作流程 Skill。',
    longDescription:
      '纯前端 Canvas 动画做的知识科普短视频。每一期都是一个 HTML 页面：画面全部由 render(t) 按时间算出来，跟着 BGM 卡点播放，也能逐帧导出 4K 60fps MP4。',
    stars: 1,
    featured: true,
    difficulty: '进阶',
  }),
  gh('Win-Hao', 'knowledge-video', 4, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'knowledge-video',
    tags: [
      '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点', '音效',
      '字幕', '导出', '纯音乐', '事件音效', '输入主题', 'HyperFrames', 'Claude Code', '横屏', '原创',
    ],
    description: '知识视频制作 Skill。',
    longDescription:
      '把一个主题变成让人想看到底的知识解说视频。六步流程：研究→文案→图片→视觉与分镜→审阅→渲染。agent自己做research，每步都给用户检查，事实必须有source。',
    featured: true,
    difficulty: '进阶',
  }),
  gh('Jogzh', 'concept-reel', 5, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'concept-reel',
    tags: [
      '原理演示', '概念关系', '通用', '选题研究', '文案', '分镜', '动画', '音效',
      '字幕', '导出', '无旁白', '事件音效', '输入主题', 'Canvas', 'Claude Code', '横屏', '原创',
    ],
    description: '概念科普视频生成与 Agent Skill。',
    longDescription:
      '面向 Vibe 知识大赏的知识短片创作，把一个主题变成可预览、可修改、可重复渲染的字幕动画。15 种动态设计风格（逐帧手绘、等距2.5D、扁平矢量、极简线稿等），支持 AI 选型。',
    featured: true,
    difficulty: '进阶',
  }),
  gh('AlbertPine', 'vibe-knowledge-video-director', 6, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibe-knowledge-video-director',
    tags: [
      '角色寓言', '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '导出',
      '无旁白', '输入主题', 'Codex', '横屏', '原创',
    ],
    description: '科普视频文案、叙事与动效导演 Skill。',
    longDescription:
      '用于制作中文情景驱动知识动画的 Codex Skill。把知识主题改写成 2-3 分钟、无配音、以连续图形和角色动作为主的短片。先核查事实、再写故事、最后完成真实渲染和画面验收。',
    featured: true,
    difficulty: '进阶',
  }),

  // ============================================================
  // vibe-knowledge-video 家族（保留 stars 最高的 1 条）
  // ============================================================
  gh('xiazhuo123456789', 'vibe-knowledge-video', 70, {
    resourceType: 'skill',
    visualStyle: 'geometric',
    family: 'vibe-knowledge-video',
    tags: [
      '原理演示', '时间演化', '历史', '通用', '选题研究', '文案', '分镜', '动画',
      '音乐卡点', '字幕', '导出', '无旁白', '纯音乐', '输入主题', 'Canvas', '横屏', '原创',
    ],
    description: 'Vibe 知识大赏科普视频制作 Skill。',
    longDescription:
      'xiazhuo123456789 维护的 vibe-knowledge-video，基于 Canvas 制作无旁白科普动画，支持时间演化与历史类主题，配合 BGM 卡点。',
    stars: 62,
  }),

  // ============================================================
  // vibe-director 家族（保留 1 条）
  // ============================================================
  gh('86777835', 'vibe-director', 82, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibe-director',
    tags: TAGS_DIRECTOR,
    description: '科普视频导演 Skill。',
    longDescription:
      '86777835 维护的 vibe-director，负责科普视频的文案、分镜、叙事与动效导演，支持角色寓言与原理演示两种风格。',
  }),

  // ============================================================
  // 其他特色仓库（14 个）
  // ============================================================
  gh('walter-io', 'vibecoding-remotion', 84, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibecoding-remotion',
    tags: [
      '角色寓言', '通用', '文案', '分镜', '动画', '导出', '纯音乐', '配音讲解',
      '输入文案', 'Remotion', 'WorkBuddy', '横屏', '原创',
    ],
    description: '基于 Remotion 的 vibecoding 视频 Skill。',
    longDescription:
      'walter-io 维护的 vibecoding-remotion，使用 Remotion 框架制作知识科普视频，支持纯音乐与配音讲解，通过 WorkBuddy 平台使用。',
  }),
  gh('lazySir', 'Narrated-Vibe-Knowledge-Film', 85, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'narrated-vibe-knowledge-film',
    tags: [
      '原理演示', '角色寓言', '通用', '选题研究', '文案', '分镜', '动画', '音效',
      '字幕', '导出', '配音讲解', '事件音效', '输入主题', 'Canvas', 'Codex', '横屏', '原创',
    ],
    description: '带旁白的 Vibe 知识大赏短片 Skill。',
    longDescription:
      'lazySir 维护的 Narrated-Vibe-Knowledge-Film，在 Vibe 知识大赏风格基础上增加配音讲解，使用 Codex 平台与 Canvas 技术。',
  }),
  gh('lesliewu66', 'vibe-knowledge-studio', 86, {
    resourceType: 'skill',
    visualStyle: 'geometric',
    family: 'vibe-knowledge-studio',
    tags: [
      '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点', '导出',
      '纯音乐', '事件音效', '输入主题', 'Canvas', 'Codex', '横屏', '原创',
    ],
    description: 'Vibe 知识大赏工作室 Skill。',
    longDescription:
      'lesliewu66 维护的 vibe-knowledge-studio，基于 Canvas 的知识科普动画制作工作室，支持音乐卡点，使用 Codex 平台。',
  }),
  gh('Friday-s', 'pixel-knowledge', 87, {
    resourceType: 'skill',
    visualStyle: 'pixel',
    family: 'pixel-knowledge',
    tags: [
      '角色寓言', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点', '音效',
      '字幕', '导出', '配音讲解', '事件音效', '输入主题', 'Canvas', '像素', 'Claude Code', '横屏', '原创',
    ],
    description: '像素风知识科普视频 Skill。',
    longDescription:
      'Friday-s 维护的 pixel-knowledge，使用像素风格制作知识科普视频，基于 Canvas 与像素技术，配合 Claude Code 使用。',
  }),
  gh('YT-smart', 'pixel-explainer-video', 88, {
    resourceType: 'skill',
    visualStyle: 'pixel',
    family: 'pixel-explainer-video',
    tags: [
      '角色寓言', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点', '音效',
      '字幕', '导出', '配音讲解', '事件音效', '输入主题', 'Canvas', '像素', '横屏', '原创',
    ],
    description: '像素风科普解说视频 Skill。',
    longDescription:
      'YT-smart 维护的 pixel-explainer-video，使用像素风格制作科普解说视频，基于 Canvas 与像素技术。',
  }),
  gh('shij8396', 'vibe-knowledge-awards', 89, {
    resourceType: 'skill',
    visualStyle: '3d-space',
    family: 'vibe-knowledge-awards',
    tags: [
      '原理演示', '时间演化', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点',
      '字幕', '导出', '无旁白', '输入主题', 'Three.js', '横屏', '原创',
    ],
    description: '基于 Three.js 的三维知识科普 Skill。',
    longDescription:
      'shij8396 维护的 vibe-knowledge-awards，使用 Three.js 制作三维空间风格的知识科普动画，支持时间演化类主题。',
    stars: 2,
  }),
  gh('Buffaiai', 'vibe-knowledge-award', 90, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibe-knowledge-award',
    tags: [
      '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '音效', '字幕',
      '导出', '无旁白', '输入主题', 'Remotion', '横屏', '原创',
    ],
    description: '基于 Remotion 的知识科普 Skill。',
    longDescription:
      'Buffaiai 维护的 vibe-knowledge-award，使用 Remotion 框架制作无旁白知识科普动画。',
  }),
  gh('Nanping5', 'Vibe-Knowledge-Festival', 92, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibe-knowledge-festival',
    tags: [
      '原理演示', '时间演化', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点',
      '字幕', '导出', '输入主题', 'Remotion', '横屏', '原创',
    ],
    description: '基于 Remotion 的知识科普 Skill。',
    longDescription:
      'Nanping5 维护的 Vibe-Knowledge-Festival，使用 Remotion 框架制作知识科普动画，支持音乐卡点与时间演化类主题。',
  }),
  gh('AuroraBarista', 'vibe-knowledge-skill', 93, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibe-knowledge-skill',
    tags: [
      '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '字幕', '导出',
      '输入主题', 'Canvas', 'Claude Code', 'Codex', '横屏', '原创',
    ],
    description: 'Vibe 知识大赏 Skill。',
    longDescription:
      'AuroraBarista 维护的 vibe-knowledge-skill，基于 Canvas 的知识科普动画制作 Skill，同时支持 Claude Code 与 Codex 平台。',
  }),
  gh('immurray', 'vibe-video', 94, {
    resourceType: 'skill',
    visualStyle: 'unknown',
    family: 'vibe-video',
    tags: ['通用', '输入主题', '横屏', '原创'],
    description: 'vibe-video Skill。',
    longDescription:
      'immurray 维护的 vibe-video，资料不足，暂不判断画风与详细能力。',
  }),
  gh('steelan9199', 'vibe-knowledge-mv-yashu', 95, {
    resourceType: 'skill',
    visualStyle: 'unknown',
    family: 'vibe-knowledge-mv-yashu',
    tags: ['通用', '输入主题', '纯音乐', '横屏', '原创'],
    description: 'Vibe 知识大赏 MV Skill。',
    longDescription:
      'steelan9199 维护的 vibe-knowledge-mv-yashu，面向音乐/MV 类知识科普，资料不足暂不判断画风。',
  }),
  gh('steelan9199', 'vibe-knowledge-video-yashu', 96, {
    resourceType: 'skill',
    visualStyle: 'unknown',
    family: 'vibe-knowledge-video-yashu',
    tags: ['通用', '输入主题', '横屏', '原创'],
    description: 'Vibe 知识大赏视频 Skill。',
    longDescription:
      'steelan9199 维护的 vibe-knowledge-video-yashu，资料不足，暂不判断画风与详细能力。',
  }),
  gh('wwwyh007', 'Vibe-GPT-Evolution', 97, {
    resourceType: 'skill',
    visualStyle: 'geometric',
    family: 'vibe-gpt-evolution',
    tags: [
      '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '音乐卡点', '字幕',
      '导出', '纯音乐', '输入主题', 'Canvas', '横屏', '原创',
    ],
    description: 'Vibe GPT 演化知识科普 Skill。',
    longDescription:
      'wwwyh007 维护的 Vibe-GPT-Evolution，基于 Canvas 制作知识科普动画，支持音乐卡点与纯音乐。',
  }),
  gh('xxjj2024', 'Vibe-Knowledge-Awards-Video-Production', 98, {
    resourceType: 'skill',
    visualStyle: 'multi-style',
    family: 'vibe-knowledge-awards-video-production',
    tags: [
      '原理演示', '通用', '选题研究', '文案', '分镜', '动画', '字幕', '导出',
      '输入主题', '横屏', '原创',
    ],
    description: 'Vibe 知识大赏视频制作 Skill。',
    longDescription:
      'xxjj2024 维护的 Vibe-Knowledge-Awards-Video-Production，面向 Vibe 知识大赏的视频制作 Skill。',
  }),

  // ============================================================
  // template（3 个，GitHub 文档/Skill 文件）
  // ============================================================
  ghDoc(
    'ChenShuo2004',
    'cs-skills',
    'cs-code-video/references/signature.md',
    104,
    'cs-code-video Skill 签名定义文档',
    'ChenShuo2004 维护的 cs-skills 仓库中 cs-code-video Skill 的签名定义文档（signature.md），描述了知识视频 Skill 的输入输出规范与签名定义。',
    'cs-skills',
    ['通用'],
    'cs-code-video/references/signature.md'
  ),
  ghDoc(
    'ChenShuo2004',
    'cs-skills',
    'cs-code-video/SKILL.md',
    105,
    'cs-code-video Skill 定义文件',
    'ChenShuo2004 维护的 cs-skills 仓库中 cs-code-video Skill 的定义文件（SKILL.md），包含 Skill 的完整描述、使用方法与配置说明。',
    'cs-skills',
    ['通用'],
    'cs-code-video/SKILL.md'
  ),
  ghDoc(
    'worlds3',
    'vibe-knowledge',
    'skill/vibe-knowledge/SKILL.md',
    106,
    'vibe-knowledge Skill 定义文件',
    'worlds3 维护的 vibe-knowledge 仓库中 Skill 的定义文件（SKILL.md），包含 Canvas 科普动画 Skill 的完整描述、使用方法与配置说明。',
    'vibe-knowledge',
    ['通用'],
    'skill/vibe-knowledge/SKILL.md'
  ),

  // ============================================================
  // 非GitHub条目 - 教程/平台（11 个）
  // ============================================================
  // 107: 抖音 - Anatomy Skill 科普视频
  link(
    'douyin-anatomy-skill',
    'Anatomy Skill 机械结构科普视频',
    '用 Anatomy Skill 制作"芯片是如何制造的"科普视频',
    '抖音视频教程：展示如何使用 Anatomy Skill 将复杂的机械结构变成风格独特的等轴立体动画，并用这个风格制作"芯片是如何制造的"科普视频。讲解清晰，是 Vibe 知识大赏制作思路的优秀参考。',
    'https://www.douyin.com/video/7695818351213399337',
    'tutorial',
    ['输入主题', '横屏'],
    107
  ),
  // 108: t.co - HeyChengC/vibe-knowledge-film 介绍文章
  link(
    'heychengc-vibe-knowledge-film-article',
    'HeyChengC/vibe-knowledge-film 介绍',
    '抖音爆款 Vibe 知识大赏知识短片 Skill 介绍文章',
    'HeyChengC/vibe-knowledge-film 的介绍文章，描述其为抖音爆款 Vibe 知识大赏知识短片 Skill，能深度拆解爆款视频、复刻画风、导演分镜表、自动配音效、一键出片。',
    'https://t.co/2fdCRrmSHN',
    'tutorial',
    ['输入主题', '横屏'],
    108
  ),
  // 109: claudepluginhub - knowledge-video 收录页面
  link(
    'claudepluginhub-knowledge-video',
    'knowledge-video - Claude Code Plugin',
    'Claude Code Plugin Hub 收录的 knowledge-video Skill 页面',
    'ClaudePluginHub 平台收录的 Win-Hao/knowledge-video Skill 页面，提供 Skill 详情、安装说明与使用指南。ClaudePluginHub 是 Claude Code 插件的收录与分发平台。',
    'https://www.claudepluginhub.com/plugins/win-hao-knowledge-video',
    'platform',
    ['通用'],
    109
  ),
  // 110: bilibili - vibe知识大赏动画视频怎么做
  link(
    'bilibili-vibe-knowledge-tutorial',
    'vibe知识大赏动画视频怎么做',
    '哔哩哔哩教程：vibe知识大赏动画视频制作入门',
    'B站视频教程，讲解 vibe 知识大赏动画视频的制作方法。看完视频即可上手制作自己的知识科普短视频，适合零基础新手学习 Vibe 知识大赏制作流程。',
    'https://www.bilibili.com/video/BV1bCHQ6nE7E/',
    'tutorial',
    ['输入主题', '横屏'],
    110
  ),
  // 111: 抖音 - 丢个主题就能做
  link(
    'douyin-vibe-drop-topic',
    'Vibe知识大赏丢个主题就能做',
    '在 Codex 里装上知识大赏 Skill，丢一个主题进去，自动挑画风、写字幕、排镜头',
    '抖音视频教程：展示在 Codex 中安装知识大赏 Skill 后，只需丢一个主题进去，Skill 会自动挑选画风、写字幕、排镜头，先出 30 秒样片供确认，再制作完整视频。体现了 Vibe 知识大赏制作的便捷性。',
    'https://www.douyin.com/video/7694993637419006075',
    'tutorial',
    ['输入主题', '横屏'],
    111
  ),
  // 112: 抖音 - vibe视频制作教程
  link(
    'douyin-vibe-tutorial-beginner',
    'Vibe视频制作教程（新手版）',
    'Vibe 视频制作保姆级教程，零基础制作 Vibe 知识视频全流程',
    '抖音视频教程：Vibe 视频制作新手教程，覆盖 vibe 知识大赏怎么做、vibecoding 视频教程、零基础制作 Vibe 视频、Vibe 视频提示词、Vibe 视频制作全流程、Vibe 视频分镜教程与剪辑技巧等内容。',
    'https://www.douyin.com/video/7693447743918165402',
    'tutorial',
    ['输入主题', '横屏'],
    112
  ),
  // 113: skillget - knowledge-video (EN)
  link(
    'skillget-knowledge-video-en',
    'Win-Hao/knowledge-video | Skillget (EN)',
    'Skillget 平台收录的 knowledge-video Skill（英文页面）',
    'Skillget 平台收录的 Win-Hao/knowledge-video Skill 英文页面，提供 Skill 详情、安装说明与使用指南。Skillget 是 Skill 的收录与发现平台，支持多语言展示。',
    'https://www.skillget.dev/listings/win-hao-knowledge-video?lang=en',
    'platform',
    ['通用'],
    113,
    { language: 'en' }
  ),
  // 114: skillget - knowledge-video (TR)
  link(
    'skillget-knowledge-video-tr',
    'Win-Hao/knowledge-video | Skillget (TR)',
    'Skillget 平台收录的 knowledge-video Skill（土耳其语页面）',
    'Skillget 平台收录的 Win-Hao/knowledge-video Skill 土耳其语页面，提供 Skill 详情与安装说明。展示了 Vibe 知识大赏 Skill 在国际社区的传播与多语言支持。',
    'https://www.skillget.dev/listings/win-hao-knowledge-video?lang=tr',
    'platform',
    ['通用'],
    114
  ),
  // 115: 抖音 - 用豆包也能做vibe知识大赏
  link(
    'douyin-vibe-doubao',
    '用豆包做vibe知识大赏',
    '用豆包也能做 vibe 知识大赏，拆解爆款视频输入主题即可制作',
    '抖音视频教程：展示如何用豆包（而非 Claude Code）也能制作 vibe 知识大赏视频。关键在于使用知识大赏 Skill，直接拆解爆款视频、输入主题即可进行制作，而且免费。',
    'https://www.douyin.com/video/7692450763251826917',
    'tutorial',
    ['输入主题', '横屏'],
    115
  ),
  // 116: 抖音 - 真的想起个新号了
  link(
    'douyin-vibe-new-account',
    'Vibe知识大赏 AI剪视频',
    'Vibe 知识大赏 AI 剪视频经验分享与 AI 工具测评',
    '抖音视频：分享 Vibe 知识大赏 AI 剪视频的经验，包括 AI 工具测评、视频剪辑 Skill 使用心得等。体现了 AI 视频剪辑工具在知识科普短视频制作中的应用。',
    'https://www.douyin.com/video/7695020515039496874',
    'tutorial',
    ['输入主题', '横屏'],
    116
  ),
  // 117: maker.tuxutool.com - 造物台
  link(
    'tuxutool-maker',
    '造物台 - 在线工具与 HTML 动画',
    '在线工具、HTML 动画、Vibe 知识大赏与 Skills 综合资源',
    '造物台是一个综合在线工具平台，提供 HTML 动画制作工具、Vibe 知识大赏相关资源与 Skills 收录。适合在线制作知识科普动画与探索 Vibe 知识大赏生态。',
    'https://maker.tuxutool.com/',
    'tutorial',
    ['输入主题', '横屏'],
    117
  ),

  // ============================================================
  // 作品/经验参考（2 个，case 类型）
  // ============================================================
  link(
    'douyin-work-siduchishui',
    'Vibe知识大赏 | 神之一战——《四渡赤水》',
    'Vibe 知识大赏作品参考：四渡赤水历史科普视频',
    '抖音作品参考：以"四渡赤水"为主题的 Vibe 知识大赏历史科普视频。讲述同一条河渡了四次，3 万人被 40 万人围住，那张网始终没能合上的精彩历史故事。是历史类知识科普短视频的优秀范例。',
    'https://www.douyin.com/video/7692193799224757523',
    'case',
    ['横屏'],
    118
  ),
  link(
    'douyin-work-entropy',
    '熵增定律',
    'Vibe 知识鉴赏作品参考：熵增定律科普视频',
    '抖音作品参考：以"熵增定律"为主题的 Vibe 知识鉴赏科普视频。讲述一段关系若缺少人为的照料与维系，便会循着熵增的规律慢慢滑向无序与疏离。将物理定律与情感关系巧妙结合，是概念科普的优秀范例。',
    'https://www.douyin.com/video/7693875136210126912',
    'case',
    ['横屏'],
    119
  ),
];

// ============================================================
// 旧体系 → 新体系 批量迁移
// 全部存量数据来自 Vibe 知识大赏生态：
//   primaryCategory 统一为 'vibe'，vibeSubcategory 由讲解方式标签推断，
//   扁平 tags 分流到 SkillTags 八个维度（详见 legacyMigration.ts）
// ============================================================
export const skills: Skill[] = migrateLegacySkills(legacySkills);

// 效果展示媒体（demoMedia）在 src/data/index.ts 合并后统一挂载，
// 采集来源与映射表见 src/data/demo-media.ts。

/** 精选 Skill */
export const featuredSkills: Skill[] = skills.filter((s) => s.featured);

/** 根据 ID 获取 Skill */
export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}
