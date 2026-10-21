// ============================================================
// 旧数据 → 新类型体系 迁移辅助
// ------------------------------------------------------------
// 背景：站点由「vibe知识大赏 Skill 大全」重构为「码上开演」，
// 旧体系（resourceType 资源类型 + visualStyle 单值画风 + 扁平 SkillTag[]）
// 迁移为新体系（primaryCategory 一级大类 + vibeSubcategory Vibe 二级 +
// SkillTags 八组独立标签维度）。
//
// 本模块仅供 src/data/skills.ts 中的存量数据做最小兼容迁移使用；
// 后续新数据导入将直接采用新结构，届时可整体删除本文件。
// ============================================================
import type { Skill, SkillTags, VibeSubcategory } from '@/types';

// ------------------------------------------------------------
// 旧类型定义（仅迁移过程内部使用，不属于公共类型体系）
// ------------------------------------------------------------

/** 旧资源类型（第一层分区） */
export type LegacyResourceType =
  | 'skill'
  | 'template'
  | 'tutorial'
  | 'case'
  | 'platform'
  | 'unclassified';

/** 旧成片画风（第二层，单值） */
export type LegacyVisualStyle =
  | 'geometric'
  | 'line-art'
  | 'pixel'
  | 'paper-craft'
  | 'ink-wash'
  | '3d-space'
  | 'multi-style'
  | 'unknown';

/** 旧扁平多维标签（第三层） */
export type LegacySkillTag =
  // 讲解方式
  | '原理演示'
  | '角色寓言'
  | '数据对比'
  | '时间演化'
  | '概念关系'
  // 内容领域
  | '心理认知'
  | '物理'
  | '数学'
  | '生物'
  | '历史'
  | '计算机'
  | '通用'
  // 制作能力
  | '选题研究'
  | '文案'
  | '分镜'
  | '动画'
  | '音乐卡点'
  | '音效'
  | '字幕'
  | '导出'
  // 声音形式
  | '无旁白'
  | '配音讲解'
  | '纯音乐'
  | '事件音效'
  // 使用入口
  | '输入主题'
  | '输入文案'
  | '参考视频复刻'
  | '文章转视频'
  // 技术栈
  | 'Canvas'
  | 'Remotion'
  | 'HTML'
  | 'HyperFrames'
  | '像素'
  | 'Three.js'
  // Agent 平台
  | 'Claude Code'
  | 'Codex'
  | 'WorkBuddy'
  // 画幅
  | '横屏'
  | '竖屏'
  // 来源标记
  | '原创'
  | '社区Fork';

/** 旧 Skill 结构：其余字段与新 Skill 一致，仅分类三字段不同 */
export interface LegacySkill extends Omit<Skill, 'primaryCategory' | 'vibeSubcategory' | 'tags' | 'tagBasis'> {
  /** 旧第一层：资源类型 */
  resourceType: LegacyResourceType;
  /** 旧第二层：成片画风（单值） */
  visualStyle?: LegacyVisualStyle;
  /** 旧第三层：扁平多维标签 */
  tags: LegacySkillTag[];
}

// ------------------------------------------------------------
// 映射表
// ------------------------------------------------------------

/** 旧资源类型 → 新资源形态（forms） */
const RESOURCE_TYPE_TO_FORMS: Record<LegacyResourceType, SkillTags['forms']> = {
  skill: ['skill'],
  template: ['template'],
  tutorial: ['article-tutorial'],
  case: ['case'],
  platform: ['collection'],
  unclassified: ['skill'],
};

/** 旧画风 → 新画风（同名映射；multi-style 在新体系无对应，丢弃） */
const LEGACY_VISUAL_STYLE_MAP: Partial<Record<LegacyVisualStyle, SkillTags['visualStyles'][number]>> = {
  geometric: 'geometric',
  'line-art': 'line-art',
  pixel: 'pixel',
  'paper-craft': 'paper-craft',
  'ink-wash': 'ink-wash',
  '3d-space': '3d-space',
  unknown: 'unknown',
};

/** 旧标签 → 制作功能 */
const FUNCTION_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['functions'][number]>> = {
  选题研究: 'topic-research',
  文案: 'copywriting',
  分镜: 'storyboard',
  动画: 'animation',
  音乐卡点: 'beat-sync',
  音效: 'sound-fx',
  字幕: 'subtitle',
  导出: 'render-export',
};

/** 旧标签 → 声音形式 */
const SOUND_FORM_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['soundForms'][number]>> = {
  无旁白: 'no-voiceover',
  配音讲解: 'narrated',
  纯音乐: 'music',
  事件音效: 'sfx',
};

/** 旧标签 → 输入方式 */
const INPUT_METHOD_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['inputMethods'][number]>> = {
  输入主题: 'topic-input',
  输入文案: 'script-input',
  参考视频复刻: 'video-remake',
  文章转视频: 'article-to-video',
};

/** 旧标签 → 实现技术 */
const TECHNOLOGY_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['technologies'][number]>> = {
  Canvas: 'canvas',
  HTML: 'html-css',
  Remotion: 'remotion',
  HyperFrames: 'hyperframes',
  'Three.js': 'threejs',
};

/** 旧标签 → 画风（'像素' 描述的是像素画风，归入 visualStyles 维度） */
const VISUAL_STYLE_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['visualStyles'][number]>> = {
  像素: 'pixel',
};

/** 旧标签 → 使用平台 */
const PLATFORM_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['platforms'][number]>> = {
  'Claude Code': 'claude-code',
  Codex: 'codex',
  WorkBuddy: 'other-agent',
};

/** 旧讲解方式标签（用于 Vibe 二级分类判定） */
const LEGACY_EXPLAIN_TAGS: LegacySkillTag[] = ['原理演示', '角色寓言', '数据对比', '时间演化', '概念关系'];

/** 单一讲解方式 → Vibe 二级分类（概念关系无明确对应，归入待细分） */
const EXPLAIN_TAG_TO_SUBCATEGORY: Partial<Record<LegacySkillTag, VibeSubcategory>> = {
  原理演示: 'principle-demo',
  角色寓言: 'cognition-fable',
  数据对比: 'data-viz',
  时间演化: 'history-evolution',
};

/** 全流程制作所需的功能标签（选题研究 + 文案 + 分镜 + 动画 + 导出） */
const FULL_PIPELINE_TAGS: LegacySkillTag[] = ['选题研究', '文案', '分镜', '动画', '导出'];

// ------------------------------------------------------------
// 迁移逻辑
// ------------------------------------------------------------

/**
 * 推断 Vibe 二级分类：
 * 1. ≥2 种讲解方式且覆盖全流程功能标签 → comprehensive
 * 2. 仅一种讲解方式 → 按该讲解方式映射（概念关系无对应 → pending）
 * 3. 其余（无讲解方式标签等）→ pending
 */
function resolveVibeSubcategory(tags: LegacySkillTag[]): VibeSubcategory {
  const explainTags = tags.filter((t) => LEGACY_EXPLAIN_TAGS.includes(t));

  // ≥2 种讲解方式 + 全流程功能标签 → 综合科普制作
  if (explainTags.length >= 2) {
    const hasFullPipeline = FULL_PIPELINE_TAGS.every((t) => tags.includes(t));
    if (hasFullPipeline) return 'comprehensive';
  }

  // 仅一种讲解方式 → 按讲解方式映射
  if (explainTags.length === 1) {
    return EXPLAIN_TAG_TO_SUBCATEGORY[explainTags[0]] ?? 'pending';
  }

  return 'pending';
}

/**
 * 把旧扁平标签数组转换为新 SkillTags 结构。
 * 内容领域 / 画幅 / 来源等未纳入新体系的标签直接丢弃。
 */
function migrateTags(resourceType: LegacyResourceType, visualStyle: LegacyVisualStyle | undefined, tags: LegacySkillTag[]): SkillTags {
  const result: SkillTags = {
    forms: [...RESOURCE_TYPE_TO_FORMS[resourceType]],
    visualStyles: [],
    functions: [],
    soundForms: [],
    inputMethods: [],
    technologies: [],
    platforms: [],
    models: ['unknown'], // 旧数据未记录模型信息，默认待确认
  };

  // 旧画风（单值）同名映射到 visualStyles；multi-style 在新体系无对应，丢弃
  if (visualStyle) {
    const mapped = LEGACY_VISUAL_STYLE_MAP[visualStyle];
    if (mapped) result.visualStyles.push(mapped);
  }

  // 扁平标签按维度分流
  for (const tag of tags) {
    const fn = FUNCTION_TAG_MAP[tag];
    if (fn && !result.functions.includes(fn)) result.functions.push(fn);

    const sound = SOUND_FORM_TAG_MAP[tag];
    if (sound && !result.soundForms.includes(sound)) result.soundForms.push(sound);

    const input = INPUT_METHOD_TAG_MAP[tag];
    if (input && !result.inputMethods.includes(input)) result.inputMethods.push(input);

    const tech = TECHNOLOGY_TAG_MAP[tag];
    if (tech && !result.technologies.includes(tech)) result.technologies.push(tech);

    const platform = PLATFORM_TAG_MAP[tag];
    if (platform && !result.platforms.includes(platform)) result.platforms.push(platform);

    // '像素' 标签描述的是画风，归入 visualStyles（与旧 visualStyle 同名映射结果去重）
    const style = VISUAL_STYLE_TAG_MAP[tag];
    if (style && !result.visualStyles.includes(style)) result.visualStyles.push(style);

    // 内容领域（心理认知/物理/数学/…/通用）、画幅（横屏/竖屏）、来源（原创/社区Fork）
    // 未纳入新体系，直接丢弃
  }

  return result;
}

/**
 * 旧 Skill → 新 Skill 迁移。
 * 存量数据全部来自 Vibe 知识大赏生态，primaryCategory 统一迁移为 'vibe'；
 * 标签依据标记为 '索引介绍'（旧标签来自采集索引整理）。
 */
export function migrateLegacySkill(legacy: LegacySkill): Skill {
  const { resourceType, visualStyle, tags, ...rest } = legacy;
  return {
    ...rest,
    primaryCategory: 'vibe',
    vibeSubcategory: resolveVibeSubcategory(tags),
    tags: migrateTags(resourceType, visualStyle, tags),
    tagBasis: '索引介绍',
  };
}

/** 批量迁移 */
export function migrateLegacySkills(legacyList: LegacySkill[]): Skill[] {
  return legacyList.map(migrateLegacySkill);
}