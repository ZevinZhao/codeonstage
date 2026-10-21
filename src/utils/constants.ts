// ============================================================
// 常量映射定义（码上开演 · 新分类体系）
// 大类（PrimaryCategory）+ Vibe 二级（VibeSubcategory）+ 8 组独立标签维度
// ============================================================
import type {
  PrimaryCategory,
  VibeSubcategory,
  ResourceForm,
  VisualStyle,
  ProductionFunction,
  SoundForm,
  InputMethod,
  Technology,
  Platform,
  ModelTag,
  SkillTags,
  TagDimensionKey,
  FilterDimensionKey,
  FavoriteStatus,
  WishStatus,
  Difficulty,
} from '@/types';

// ============================================================
// 一级大类（PrimaryCategory）
// ============================================================

/** 大类中文标签 */
export const PRIMARY_CATEGORY_LABELS: Record<PrimaryCategory, string> = {
  vibe: 'Vibe 知识大赏',
  promo: '产品宣传与演示',
  education: '科普与教学',
  'motion-design': '动效与视觉设计',
  'narrative-mv': '叙事短片与音乐 MV',
  'game-interactive': '游戏与交互动画',
  'post-production': '剪辑与声音后期',
  'general-video': '通用视频制作',
  uncategorized: '待分类',
};

/** 大类描述 */
export const PRIMARY_CATEGORY_DESCRIPTIONS: Record<PrimaryCategory, string> = {
  vibe: '知识大赏风格的 Skills、模板、教程和案例',
  promo: '产品发布、软件演示、广告、作品集宣传',
  education: '知识讲解、课程、数学动画、科学可视化',
  'motion-design': '动态字体、标志动画、抽象视觉、三维动效',
  'narrative-mv': '故事、角色动画、歌词视频、音乐短片',
  'game-interactive': '游戏预告、交互场景、游戏式演示',
  'post-production': '剪辑、字幕、配音、配乐、音效、成片检查',
  'general-video': '多用途制作流程、渲染框架、综合工具箱、资源导航',
  uncategorized: '信息不足、尚待分类的资源',
};

/** 大类图标 key（lucide 图标名） */
export const PRIMARY_CATEGORY_ICONS: Record<PrimaryCategory, string> = {
  vibe: 'Sparkles',
  promo: 'Megaphone',
  education: 'GraduationCap',
  'motion-design': 'Wand2',
  'narrative-mv': 'Clapperboard',
  'game-interactive': 'Gamepad2',
  'post-production': 'Scissors',
  'general-video': 'Video',
  uncategorized: 'CircleDashed',
};

/** 大类文本色 */
export const PRIMARY_CATEGORY_COLORS: Record<PrimaryCategory, string> = {
  vibe: 'text-brand-400',
  promo: 'text-orange-400',
  education: 'text-info',
  'motion-design': 'text-violet-400',
  'narrative-mv': 'text-pink-400',
  'game-interactive': 'text-lime-400',
  'post-production': 'text-cyan-400',
  'general-video': 'text-success',
  uncategorized: 'text-content-muted',
};

/** 大类徽章配色（bg/text/border 三件套） */
export const PRIMARY_CATEGORY_BADGE_COLORS: Record<PrimaryCategory, string> = {
  vibe: 'bg-brand-500/10 text-brand-300 border-brand-500/20',
  promo: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  education: 'bg-info/10 text-info border-info/20',
  'motion-design': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'narrative-mv': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'game-interactive': 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  'post-production': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'general-video': 'bg-success/10 text-success border-success/20',
  uncategorized: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

/** 所有大类列表（按展示顺序） */
export const ALL_PRIMARY_CATEGORIES: PrimaryCategory[] = [
  'vibe',
  'promo',
  'education',
  'motion-design',
  'narrative-mv',
  'game-interactive',
  'post-production',
  'general-video',
  'uncategorized',
];

// ============================================================
// Vibe 二级分类（VibeSubcategory，仅 primaryCategory === 'vibe'）
// ============================================================

/** Vibe 二级分类中文标签 */
export const VIBE_SUBCATEGORY_LABELS: Record<VibeSubcategory, string> = {
  'principle-demo': '原理演示',
  'cognition-fable': '认知与心理寓言',
  'data-viz': '数据与关系可视化',
  'history-evolution': '历史与过程演化',
  comprehensive: '综合科普制作',
  pending: '待细分',
};

/** Vibe 二级分类描述 */
export const VIBE_SUBCATEGORY_DESCRIPTIONS: Record<VibeSubcategory, string> = {
  'principle-demo': '用图形运动解释机制、规律、因果',
  'cognition-fable': '用角色、行为或实验场景表达认知偏差',
  'data-viz': '用数量、比例、结构、网络关系讲知识',
  'history-evolution': '展示时间线、发展史、变化过程',
  comprehensive: '支持多种讲解方式的完整工作流',
  pending: '讲解方式信息不足，待细分',
};

/** Vibe 二级分类图标 key */
export const VIBE_SUBCATEGORY_ICONS: Record<VibeSubcategory, string> = {
  'principle-demo': 'Lightbulb',
  'cognition-fable': 'Drama',
  'data-viz': 'BarChart3',
  'history-evolution': 'History',
  comprehensive: 'Workflow',
  pending: 'CircleDashed',
};

/** Vibe 二级分类徽章配色 */
export const VIBE_SUBCATEGORY_BADGE_COLORS: Record<VibeSubcategory, string> = {
  'principle-demo': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'cognition-fable': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  'data-viz': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'history-evolution': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  comprehensive: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  pending: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

/** 所有 Vibe 二级分类列表（按展示顺序） */
export const ALL_VIBE_SUBCATEGORIES: VibeSubcategory[] = [
  'principle-demo',
  'cognition-fable',
  'data-viz',
  'history-evolution',
  'comprehensive',
  'pending',
];

// ============================================================
// 标签维度一：资源形态（ResourceForm）
// ============================================================

/** 资源形态中文标签 */
export const RESOURCE_FORM_LABELS: Record<ResourceForm, string> = {
  skill: 'Skill',
  template: '工程模板',
  'article-tutorial': '文章教程',
  'video-tutorial': '视频教程',
  prompt: '提示词',
  collection: '资源合集',
  case: '作品案例',
};

/** 资源形态描述 */
export const RESOURCE_FORM_DESCRIPTIONS: Record<ResourceForm, string> = {
  skill: '可安装的技能包，配合 AI Agent 使用',
  template: '可修改复用的动画源码、示例工程',
  'article-tutorial': '图文形式的制作教程与流程说明',
  'video-tutorial': '视频形式的教程与演示录像',
  prompt: '可直接使用的提示词与指令模板',
  collection: '资源合集、导航与收录平台',
  case: '用于参考画面、节奏和表达的作品',
};

/** 资源形态图标 key */
export const RESOURCE_FORM_ICONS: Record<ResourceForm, string> = {
  skill: 'Package',
  template: 'Code2',
  'article-tutorial': 'FileText',
  'video-tutorial': 'PlayCircle',
  prompt: 'MessageSquare',
  collection: 'Library',
  case: 'Film',
};

/** 资源形态徽章配色 */
export const RESOURCE_FORM_BADGE_COLORS: Record<ResourceForm, string> = {
  skill: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  template: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'article-tutorial': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'video-tutorial': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  prompt: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  collection: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  case: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

/** 所有资源形态列表（按展示顺序） */
export const ALL_RESOURCE_FORMS: ResourceForm[] = [
  'skill',
  'template',
  'article-tutorial',
  'video-tutorial',
  'prompt',
  'collection',
  'case',
];

// ============================================================
// 标签维度二：画风（VisualStyle，多选）
// ============================================================

/** 画风中文标签 */
export const VISUAL_STYLE_LABELS: Record<VisualStyle, string> = {
  geometric: '极简几何',
  'line-art': '线稿手绘',
  pixel: '像素复古',
  'paper-craft': '纸艺拼贴',
  'ink-wash': '水墨水彩',
  '3d-space': '三维空间',
  'kinetic-typography': '动态字体',
  unknown: '资料不足',
};

/** 画风描述 */
export const VISUAL_STYLE_DESCRIPTIONS: Record<VisualStyle, string> = {
  geometric: '圆、方块、箭头等几何图形承担主要表达',
  'line-art': '线条、小人、简笔画承担主要表达',
  pixel: '像素角色、点阵画面、游戏界面',
  'paper-craft': '剪纸、照片、纸张纹理和拼贴画面',
  'ink-wash': '墨迹、晕染、笔触等绘画质感',
  '3d-space': '立体模型、空间运动、镜头变化',
  'kinetic-typography': '文字作为主角的动态排版动画',
  unknown: '资料不足，暂不判断画风',
};

/** 画风图标 key */
export const VISUAL_STYLE_ICONS: Record<VisualStyle, string> = {
  geometric: 'Shapes',
  'line-art': 'PenLine',
  pixel: 'Grid3x3',
  'paper-craft': 'Layers',
  'ink-wash': 'Brush',
  '3d-space': 'Box',
  'kinetic-typography': 'Type',
  unknown: 'CircleDashed',
};

/** 画风徽章配色 */
export const VISUAL_STYLE_BADGE_COLORS: Record<VisualStyle, string> = {
  geometric: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'line-art': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  pixel: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  'paper-craft': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'ink-wash': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  '3d-space': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'kinetic-typography': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  unknown: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

/** 所有画风列表（按展示顺序） */
export const ALL_VISUAL_STYLES: VisualStyle[] = [
  'geometric',
  'line-art',
  'pixel',
  'paper-craft',
  'ink-wash',
  '3d-space',
  'kinetic-typography',
  'unknown',
];

// ============================================================
// 标签维度三：制作功能（ProductionFunction，多选）
// ============================================================

/** 制作功能中文标签 */
export const PRODUCTION_FUNCTION_LABELS: Record<ProductionFunction, string> = {
  'topic-research': '选题研究',
  copywriting: '文案',
  storyboard: '分镜',
  animation: '动画',
  'beat-sync': '卡点',
  voiceover: '配音',
  'sound-fx': '音效',
  subtitle: '字幕',
  editing: '剪辑',
  'render-export': '渲染导出',
  'final-check': '成片检查',
  'full-pipeline': '全流程制作',
};

/** 制作功能描述 */
export const PRODUCTION_FUNCTION_DESCRIPTIONS: Record<ProductionFunction, string> = {
  'topic-research': '检索资料、核实事实、确定选题',
  copywriting: '撰写讲解文案与叙事脚本',
  storyboard: '规划分镜、镜头节奏与画面草图',
  animation: '生成图形运动与关键帧动画',
  'beat-sync': '对齐音乐节拍与画面切换',
  voiceover: '生成或合成配音旁白',
  'sound-fx': '为事件配上音效',
  subtitle: '生成并校对字幕',
  editing: '剪辑拼接素材与成片',
  'render-export': '逐帧渲染并导出成片',
  'final-check': '成片质检与画面验收',
  'full-pipeline': '覆盖从选题到成片的完整流程',
};

/** 制作功能图标 key */
export const PRODUCTION_FUNCTION_ICONS: Record<ProductionFunction, string> = {
  'topic-research': 'Search',
  copywriting: 'PenLine',
  storyboard: 'LayoutGrid',
  animation: 'Play',
  'beat-sync': 'Music2',
  voiceover: 'Mic',
  'sound-fx': 'Volume2',
  subtitle: 'Captions',
  editing: 'Scissors',
  'render-export': 'Download',
  'final-check': 'CheckCircle2',
  'full-pipeline': 'Workflow',
};

/** 制作功能徽章配色 */
export const PRODUCTION_FUNCTION_BADGE_COLORS: Record<ProductionFunction, string> = {
  'topic-research': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  copywriting: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  storyboard: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  animation: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'beat-sync': 'bg-green-500/10 text-green-400 border-green-500/20',
  voiceover: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'sound-fx': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  subtitle: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  editing: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'render-export': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'final-check': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'full-pipeline': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
};

/** 所有制作功能列表（按制作流程顺序） */
export const ALL_PRODUCTION_FUNCTIONS: ProductionFunction[] = [
  'topic-research',
  'copywriting',
  'storyboard',
  'animation',
  'beat-sync',
  'voiceover',
  'sound-fx',
  'subtitle',
  'editing',
  'render-export',
  'final-check',
  'full-pipeline',
];

// ============================================================
// 标签维度四：声音形式（SoundForm，多选）
// ============================================================

/** 声音形式中文标签 */
export const SOUND_FORM_LABELS: Record<SoundForm, string> = {
  'no-voiceover': '无旁白',
  narrated: '配音讲解',
  music: '音乐配乐',
  sfx: '事件音效',
};

/** 声音形式描述 */
export const SOUND_FORM_DESCRIPTIONS: Record<SoundForm, string> = {
  'no-voiceover': '成片不使用旁白，画面自己说话',
  narrated: '配音讲解承担叙事',
  music: '以音乐铺底驱动情绪',
  sfx: '动作与事件配有音效',
};

/** 声音形式图标 key */
export const SOUND_FORM_ICONS: Record<SoundForm, string> = {
  'no-voiceover': 'VolumeX',
  narrated: 'Mic',
  music: 'Music',
  sfx: 'Zap',
};

/** 声音形式徽章配色 */
export const SOUND_FORM_BADGE_COLORS: Record<SoundForm, string> = {
  'no-voiceover': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  narrated: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  music: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  sfx: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

/** 所有声音形式列表 */
export const ALL_SOUND_FORMS: SoundForm[] = ['no-voiceover', 'narrated', 'music', 'sfx'];

// ============================================================
// 标签维度五：输入方式（InputMethod，多选）
// ============================================================

/** 输入方式中文标签 */
export const INPUT_METHOD_LABELS: Record<InputMethod, string> = {
  'topic-input': '输入主题',
  'script-input': '输入文案',
  'article-to-video': '文章转视频',
  'website-to-video': '网站转视频',
  'video-remake': '参考视频复刻',
  'music-driven': '音乐驱动',
};

/** 输入方式描述 */
export const INPUT_METHOD_DESCRIPTIONS: Record<InputMethod, string> = {
  'topic-input': '给一个主题，自动完成研究与制作',
  'script-input': '提供现成文案，直接进入制作',
  'article-to-video': '把长文内容改编为视频',
  'website-to-video': '抓取网站内容生成视频',
  'video-remake': '参考已有视频的风格或结构复刻',
  'music-driven': '以音乐为起点驱动画面生成',
};

/** 输入方式图标 key */
export const INPUT_METHOD_ICONS: Record<InputMethod, string> = {
  'topic-input': 'Hash',
  'script-input': 'FileText',
  'article-to-video': 'FileVideo',
  'website-to-video': 'Globe',
  'video-remake': 'Repeat',
  'music-driven': 'Music4',
};

/** 输入方式徽章配色 */
export const INPUT_METHOD_BADGE_COLORS: Record<InputMethod, string> = {
  'topic-input': 'bg-green-500/10 text-green-400 border-green-500/20',
  'script-input': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'article-to-video': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'website-to-video': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'video-remake': 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  'music-driven': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

/** 所有输入方式列表 */
export const ALL_INPUT_METHODS: InputMethod[] = [
  'topic-input',
  'script-input',
  'article-to-video',
  'website-to-video',
  'video-remake',
  'music-driven',
];

// ============================================================
// 标签维度六：实现技术（Technology，多选）
// ============================================================

/** 实现技术中文标签 */
export const TECHNOLOGY_LABELS: Record<Technology, string> = {
  canvas: 'Canvas',
  'html-css': 'HTML/CSS',
  remotion: 'Remotion',
  hyperframes: 'HyperFrames',
  threejs: 'Three.js',
  webgl: 'WebGL',
  gsap: 'GSAP',
  manim: 'Manim',
  blender: 'Blender',
};

/** 实现技术描述 */
export const TECHNOLOGY_DESCRIPTIONS: Record<Technology, string> = {
  canvas: '用 Canvas API 逐帧绘制画面',
  'html-css': '以 HTML/CSS 为主体的动画实现',
  remotion: '基于 React 的程序化视频框架',
  hyperframes: 'HyperFrames 动画框架',
  threejs: 'Three.js 三维场景渲染',
  webgl: 'WebGL 着色器与图形渲染',
  gsap: 'GSAP 补间动画驱动',
  manim: 'Manim 数学动画引擎',
  blender: 'Blender 三维制作与渲染',
};

/** 实现技术图标 key */
export const TECHNOLOGY_ICONS: Record<Technology, string> = {
  canvas: 'Frame',
  'html-css': 'Code2',
  remotion: 'Atom',
  hyperframes: 'Frames',
  threejs: 'Boxes',
  webgl: 'MonitorPlay',
  gsap: 'FastForward',
  manim: 'Sigma',
  blender: 'Blend',
};

/** 实现技术徽章配色 */
export const TECHNOLOGY_BADGE_COLORS: Record<Technology, string> = {
  canvas: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'html-css': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  remotion: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  hyperframes: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  threejs: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  webgl: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  gsap: 'bg-red-500/10 text-red-400 border-red-500/20',
  manim: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  blender: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

/** 所有实现技术列表 */
export const ALL_TECHNOLOGIES: Technology[] = [
  'canvas',
  'html-css',
  'remotion',
  'hyperframes',
  'threejs',
  'webgl',
  'gsap',
  'manim',
  'blender',
];

// ============================================================
// 标签维度七：使用平台（Platform，多选）
// ============================================================

/** 使用平台中文标签 */
export const PLATFORM_LABELS: Record<Platform, string> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
  'other-agent': '其他 Agent',
  unknown: '待确认',
};

/** 使用平台描述 */
export const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  'claude-code': '配合 Claude Code 使用',
  codex: '配合 Codex 使用',
  'other-agent': '其他 Agent 平台（WorkBuddy、豆包等）',
  unknown: '平台信息待确认',
};

/** 使用平台图标 key */
export const PLATFORM_ICONS: Record<Platform, string> = {
  'claude-code': 'Terminal',
  codex: 'Bot',
  'other-agent': 'Cpu',
  unknown: 'CircleDashed',
};

/** 使用平台徽章配色 */
export const PLATFORM_BADGE_COLORS: Record<Platform, string> = {
  'claude-code': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  codex: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'other-agent': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  unknown: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

/** 所有使用平台列表 */
export const ALL_PLATFORMS: Platform[] = ['claude-code', 'codex', 'other-agent', 'unknown'];

// ============================================================
// 标签维度八：模型（ModelTag，多选）
// ============================================================

/** 模型中文标签 */
export const MODEL_LABELS: Record<ModelTag, string> = {
  'opus-55': 'Opus 5.5',
  'other-model': '其他模型',
  'model-agnostic': '模型不限',
  unknown: '待确认',
};

/** 模型描述 */
export const MODEL_DESCRIPTIONS: Record<ModelTag, string> = {
  'opus-55': '面向 Claude Opus 5.5 优化',
  'other-model': '指定其他模型（Sonnet、GPT 等）',
  'model-agnostic': '不挑模型，任意 Agent 均可运行',
  unknown: '模型信息待确认',
};

/** 模型图标 key */
export const MODEL_ICONS: Record<ModelTag, string> = {
  'opus-55': 'Brain',
  'other-model': 'Cpu',
  'model-agnostic': 'Infinity',
  unknown: 'CircleDashed',
};

/** 模型徽章配色 */
export const MODEL_BADGE_COLORS: Record<ModelTag, string> = {
  'opus-55': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'other-model': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'model-agnostic': 'bg-green-500/10 text-green-400 border-green-500/20',
  unknown: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

/** 所有模型列表 */
export const ALL_MODELS: ModelTag[] = ['opus-55', 'other-model', 'model-agnostic', 'unknown'];

// ============================================================
// 标签维度元数据（供筛选 UI 使用）
// ============================================================

/** 单个标签维度元数据 */
export interface TagDimensionMeta {
  /** SkillTags 上的字段名 */
  key: TagDimensionKey;
  /** 中文标签 */
  label: string;
  /** 维度说明 */
  description: string;
  /** 该维度全部取值 */
  values: string[];
}

/** 8 个标签维度元数据（按固定顺序） */
export const TAG_DIMENSIONS_META: TagDimensionMeta[] = [
  {
    key: 'forms',
    label: '资源形态',
    description: '资源以什么形态存在',
    values: ALL_RESOURCE_FORMS,
  },
  {
    key: 'visualStyles',
    label: '画风',
    description: '成片的主要视觉风格',
    values: ALL_VISUAL_STYLES,
  },
  {
    key: 'functions',
    label: '制作功能',
    description: '能帮完成哪些制作步骤',
    values: ALL_PRODUCTION_FUNCTIONS,
  },
  {
    key: 'soundForms',
    label: '声音形式',
    description: '成片怎么听',
    values: ALL_SOUND_FORMS,
  },
  {
    key: 'inputMethods',
    label: '输入方式',
    description: '需要准备什么作为输入',
    values: ALL_INPUT_METHODS,
  },
  {
    key: 'technologies',
    label: '实现技术',
    description: '用什么技术实现动画与渲染',
    values: ALL_TECHNOLOGIES,
  },
  {
    key: 'platforms',
    label: '使用平台',
    description: '配合哪个 Agent 平台使用',
    values: ALL_PLATFORMS,
  },
  {
    key: 'models',
    label: '模型',
    description: '面向哪个模型',
    values: ALL_MODELS,
  },
];

// ============================================================
// 筛选维度元数据与首屏/更多筛选分组
// ============================================================

/** 筛选维度元数据（大类 + Vibe 二级 + 8 个标签维度） */
export interface FilterDimensionMeta {
  /** 维度 key */
  key: FilterDimensionKey;
  /** 中文标签 */
  label: string;
  /** 维度说明 */
  description: string;
  /** 该维度全部取值 */
  values: string[];
}

/** 全部筛选维度元数据 */
export const FILTER_DIMENSIONS_META: FilterDimensionMeta[] = [
  {
    key: 'primaryCategory',
    label: '大类',
    description: '资源的一级用途分类（单选）',
    values: ALL_PRIMARY_CATEGORIES,
  },
  {
    key: 'vibeSubcategory',
    label: 'Vibe 细分',
    description: 'Vibe 知识大赏的二级讲解方式（单选）',
    values: ALL_VIBE_SUBCATEGORIES,
  },
  ...TAG_DIMENSIONS_META,
];

/** 首屏筛选维度：大类、资源形态、画风、制作功能 */
export const FIRST_SCREEN_FILTER_DIMENSIONS: FilterDimensionKey[] = [
  'primaryCategory',
  'forms',
  'visualStyles',
  'functions',
];

/** 更多筛选维度：Vibe 细分与其余标签维度 */
export const MORE_FILTER_DIMENSIONS: FilterDimensionKey[] = [
  'vibeSubcategory',
  'soundForms',
  'inputMethods',
  'technologies',
  'platforms',
  'models',
];

// ============================================================
// 维度取值 → 中文标签 / 徽章配色 的统一查询
// ============================================================

/** 各维度的取值中文标签映射 */
const DIMENSION_LABEL_MAPS: Record<FilterDimensionKey, Record<string, string>> = {
  primaryCategory: PRIMARY_CATEGORY_LABELS,
  vibeSubcategory: VIBE_SUBCATEGORY_LABELS,
  forms: RESOURCE_FORM_LABELS,
  visualStyles: VISUAL_STYLE_LABELS,
  functions: PRODUCTION_FUNCTION_LABELS,
  soundForms: SOUND_FORM_LABELS,
  inputMethods: INPUT_METHOD_LABELS,
  technologies: TECHNOLOGY_LABELS,
  platforms: PLATFORM_LABELS,
  models: MODEL_LABELS,
};

/** 各维度的取值徽章配色映射 */
const DIMENSION_BADGE_COLOR_MAPS: Record<FilterDimensionKey, Record<string, string>> = {
  primaryCategory: PRIMARY_CATEGORY_BADGE_COLORS,
  vibeSubcategory: VIBE_SUBCATEGORY_BADGE_COLORS,
  forms: RESOURCE_FORM_BADGE_COLORS,
  visualStyles: VISUAL_STYLE_BADGE_COLORS,
  functions: PRODUCTION_FUNCTION_BADGE_COLORS,
  soundForms: SOUND_FORM_BADGE_COLORS,
  inputMethods: INPUT_METHOD_BADGE_COLORS,
  technologies: TECHNOLOGY_BADGE_COLORS,
  platforms: PLATFORM_BADGE_COLORS,
  models: MODEL_BADGE_COLORS,
};

/** 各维度的取值描述映射 */
const DIMENSION_DESCRIPTION_MAPS: Record<FilterDimensionKey, Record<string, string>> = {
  primaryCategory: PRIMARY_CATEGORY_DESCRIPTIONS,
  vibeSubcategory: VIBE_SUBCATEGORY_DESCRIPTIONS,
  forms: RESOURCE_FORM_DESCRIPTIONS,
  visualStyles: VISUAL_STYLE_DESCRIPTIONS,
  functions: PRODUCTION_FUNCTION_DESCRIPTIONS,
  soundForms: SOUND_FORM_DESCRIPTIONS,
  inputMethods: INPUT_METHOD_DESCRIPTIONS,
  technologies: TECHNOLOGY_DESCRIPTIONS,
  platforms: PLATFORM_DESCRIPTIONS,
  models: MODEL_DESCRIPTIONS,
};

/** 获取筛选维度的中文名称 */
export function getFilterDimensionLabel(dimension: FilterDimensionKey): string {
  const meta = FILTER_DIMENSIONS_META.find((d) => d.key === dimension);
  return meta?.label ?? dimension;
}

/** 获取筛选维度的全部取值列表 */
export function getFilterDimensionValues(dimension: FilterDimensionKey): string[] {
  const meta = FILTER_DIMENSIONS_META.find((d) => d.key === dimension);
  return meta?.values ?? [];
}

/** 获取维度某个取值的中文标签（未知取值原样返回） */
export function getTagLabel(dimension: FilterDimensionKey, value: string): string {
  return DIMENSION_LABEL_MAPS[dimension]?.[value] ?? value;
}

/** 获取维度某个取值的描述 */
export function getTagDescription(dimension: FilterDimensionKey, value: string): string {
  return DIMENSION_DESCRIPTION_MAPS[dimension]?.[value] ?? '';
}

/** 获取维度某个取值的徽章配色（bg/text/border 三件套） */
export function getTagBadgeColor(dimension: FilterDimensionKey, value: string): string {
  return DIMENSION_BADGE_COLOR_MAPS[dimension]?.[value] ?? DEFAULT_TAG_COLOR;
}

// ============================================================
// SkillTags 摊平与搜索辅助
// ============================================================

/** 摊平后的单个标签 */
export interface FlatTag {
  /** 所属标签维度 */
  dimension: TagDimensionKey;
  /** 维度内取值 */
  value: string;
  /** 中文标签 */
  label: string;
}

/** 把 SkillTags 摊平为标签列表（按维度固定顺序） */
export function flattenSkillTags(tags: SkillTags): FlatTag[] {
  const result: FlatTag[] = [];
  for (const dim of TAG_DIMENSIONS_META) {
    const values = tags[dim.key] as string[] | undefined;
    if (!values) continue;
    for (const value of values) {
      result.push({ dimension: dim.key, value, label: getTagLabel(dim.key, value) });
    }
  }
  return result;
}

/** 提取标签的可搜索文本（含取值本身与中文标签），用于关键词搜索 */
export function getSkillTagTexts(tags: SkillTags | string[]): string[] {
  if (Array.isArray(tags)) return tags;
  const texts: string[] = [];
  for (const dim of TAG_DIMENSIONS_META) {
    const values = tags[dim.key] as string[] | undefined;
    if (!values) continue;
    for (const value of values) {
      texts.push(value, getTagLabel(dim.key, value));
    }
  }
  return texts;
}

// ============================================================
// 自由标签（许愿池等用户输入标签）配色
// ============================================================

/** 自由标签备选配色（按哈希轮转） */
const FREE_TAG_PALETTE: string[] = [
  'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'bg-green-500/10 text-green-400 border-green-500/20',
  'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'bg-pink-500/10 text-pink-400 border-pink-500/20',
];

/** 默认标签颜色 */
export const DEFAULT_TAG_COLOR = 'bg-base-elevated text-content-muted border-border';

/** 简单字符串哈希 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** 获取自由标签（用户输入）的配色：按内容稳定哈希轮转取色 */
export function getFreeTagColor(tag: string): string {
  if (!tag) return DEFAULT_TAG_COLOR;
  return FREE_TAG_PALETTE[hashString(tag) % FREE_TAG_PALETTE.length];
}

// ============================================================
// 其他常量（保留）
// ============================================================

/** 收藏状态映射 */
export const FAVORITE_STATUS_LABELS: Record<FavoriteStatus, string> = {
  wishlist: '待试用',
  trying: '试用中',
  frequent: '常用',
  archived: '已弃用',
};

/** 收藏状态颜色 */
export const FAVORITE_STATUS_COLORS: Record<FavoriteStatus, string> = {
  wishlist: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  trying: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  frequent: 'bg-green-500/10 text-green-400 border-green-500/20',
  archived: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

/** 许愿状态映射 */
export const WISH_STATUS_LABELS: Record<WishStatus, string> = {
  open: '待认领',
  claimed: '已认领',
  'in-progress': '开发中',
  completed: '已完成',
};

/** 许愿状态颜色 */
export const WISH_STATUS_COLORS: Record<WishStatus, string> = {
  open: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  claimed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'in-progress': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
};

/** 难度颜色映射 */
export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  入门: 'bg-green-500/10 text-green-400 border-green-500/20',
  进阶: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  高级: 'bg-red-500/10 text-red-400 border-red-500/20',
};

/** 语言映射 */
export const LANGUAGE_LABELS: Record<string, string> = {
  zh: '中文',
  en: '英文',
  'zh-en': '中英双语',
};

/** 所有难度列表 */
export const ALL_DIFFICULTIES: Difficulty[] = ['入门', '进阶', '高级'];

/** 所有收藏状态列表 */
export const ALL_FAVORITE_STATUSES: FavoriteStatus[] = ['wishlist', 'trying', 'frequent', 'archived'];

/** 所有许愿状态列表 */
export const ALL_WISH_STATUSES: WishStatus[] = ['open', 'claimed', 'in-progress', 'completed'];