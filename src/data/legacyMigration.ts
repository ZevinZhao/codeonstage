import type { Skill, SkillTags, VibeSubcategory } from '@/types';

export type LegacyResourceType =
  | 'skill'
  | 'template'
  | 'tutorial'
  | 'case'
  | 'platform'
  | 'unclassified';

export type LegacyVisualStyle =
  | 'geometric'
  | 'line-art'
  | 'pixel'
  | 'paper-craft'
  | 'ink-wash'
  | '3d-space'
  | 'multi-style'
  | 'unknown';

export type LegacySkillTag =
  | '原理演示'
  | '角色寓言'
  | '数据对比'
  | '时间演化'
  | '概念关系'
  | '心理认知'
  | '物理'
  | '数学'
  | '生物'
  | '历史'
  | '计算机'
  | '通用'
  | '选题研究'
  | '文案'
  | '分镜'
  | '动画'
  | '音乐卡点'
  | '音效'
  | '字幕'
  | '导出'
  | '无旁白'
  | '配音讲解'
  | '纯音乐'
  | '事件音效'
  | '输入主题'
  | '输入文案'
  | '参考视频复刻'
  | '文章转视频'
  | 'Canvas'
  | 'Remotion'
  | 'HTML'
  | 'HyperFrames'
  | '像素'
  | 'Three.js'
  | 'Claude Code'
  | 'Codex'
  | 'WorkBuddy'
  | '横屏'
  | '竖屏'
  | '原创'
  | '社区Fork';

export interface LegacySkill extends Omit<Skill, 'primaryCategory' | 'vibeSubcategory' | 'tags' | 'tagBasis'> {
  resourceType: LegacyResourceType;
  visualStyle?: LegacyVisualStyle;
  tags: LegacySkillTag[];
}

const RESOURCE_TYPE_TO_FORMS: Record<LegacyResourceType, SkillTags['forms']> = {
  skill: ['skill'],
  template: ['template'],
  tutorial: ['article-tutorial'],
  case: ['case'],
  platform: ['collection'],
  unclassified: ['skill'],
};

const LEGACY_VISUAL_STYLE_MAP: Partial<Record<LegacyVisualStyle, SkillTags['visualStyles'][number]>> = {
  geometric: 'geometric',
  'line-art': 'line-art',
  pixel: 'pixel',
  'paper-craft': 'paper-craft',
  'ink-wash': 'ink-wash',
  '3d-space': '3d-space',
  unknown: 'unknown',
};

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

const SOUND_FORM_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['soundForms'][number]>> = {
  无旁白: 'no-voiceover',
  配音讲解: 'narrated',
  纯音乐: 'music',
  事件音效: 'sfx',
};

const INPUT_METHOD_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['inputMethods'][number]>> = {
  输入主题: 'topic-input',
  输入文案: 'script-input',
  参考视频复刻: 'video-remake',
  文章转视频: 'article-to-video',
};

const TECHNOLOGY_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['technologies'][number]>> = {
  Canvas: 'canvas',
  HTML: 'html-css',
  Remotion: 'remotion',
  HyperFrames: 'hyperframes',
  'Three.js': 'threejs',
};

const VISUAL_STYLE_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['visualStyles'][number]>> = {
  像素: 'pixel',
};

const PLATFORM_TAG_MAP: Partial<Record<LegacySkillTag, SkillTags['platforms'][number]>> = {
  'Claude Code': 'claude-code',
  Codex: 'codex',
  WorkBuddy: 'other-agent',
};

const LEGACY_EXPLAIN_TAGS: LegacySkillTag[] = ['原理演示', '角色寓言', '数据对比', '时间演化', '概念关系'];

const EXPLAIN_TAG_TO_SUBCATEGORY: Partial<Record<LegacySkillTag, VibeSubcategory>> = {
  原理演示: 'principle-demo',
  角色寓言: 'cognition-fable',
  数据对比: 'data-viz',
  时间演化: 'history-evolution',
};

const FULL_PIPELINE_TAGS: LegacySkillTag[] = ['选题研究', '文案', '分镜', '动画', '导出'];

function resolveVibeSubcategory(tags: LegacySkillTag[]): VibeSubcategory {
  const explainTags = tags.filter((t) => LEGACY_EXPLAIN_TAGS.includes(t));

  if (explainTags.length >= 2) {
    const hasFullPipeline = FULL_PIPELINE_TAGS.every((t) => tags.includes(t));
    if (hasFullPipeline) return 'comprehensive';
  }

  if (explainTags.length === 1) {
    return EXPLAIN_TAG_TO_SUBCATEGORY[explainTags[0]] ?? 'pending';
  }

  return 'pending';
}

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

  if (visualStyle) {
    const mapped = LEGACY_VISUAL_STYLE_MAP[visualStyle];
    if (mapped) result.visualStyles.push(mapped);
  }

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

    const style = VISUAL_STYLE_TAG_MAP[tag];
    if (style && !result.visualStyles.includes(style)) result.visualStyles.push(style);

  }

  return result;
}

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

export function migrateLegacySkills(legacyList: LegacySkill[]): Skill[] {
  return legacyList.map(migrateLegacySkill);
}
