// ============================================================
// 码上开演 · AI 编码视频 Skill 合集网站 类型定义
// 分类体系：primaryCategory（一级大类，单选）+ vibeSubcategory（Vibe 二级分类）
//          + tags（8 组独立标签维度，各维度分别记录、允许多选）
// ============================================================

/** 一级大类（每条资源只选一个） */
export type PrimaryCategory =
  | 'vibe' // Vibe 知识大赏：知识大赏风格的 Skills、模板、教程和案例
  | 'promo' // 产品宣传与演示：产品发布、软件演示、广告、作品集宣传
  | 'education' // 科普与教学：知识讲解、课程、数学动画、科学可视化
  | 'motion-design' // 动效与视觉设计：动态字体、标志动画、抽象视觉、三维动效
  | 'narrative-mv' // 叙事短片与音乐 MV：故事、角色动画、歌词视频、音乐短片
  | 'game-interactive' // 游戏与交互动画：游戏预告、交互场景、游戏式演示
  | 'post-production' // 剪辑与声音后期：剪辑、字幕、配音、配乐、音效、成片检查
  | 'general-video' // 通用视频制作：多用途制作流程、渲染框架、综合工具箱、资源导航
  | 'uncategorized'; // 待分类：信息不足的资源

/** Vibe 二级分类（仅 primaryCategory === 'vibe' 时有值） */
export type VibeSubcategory =
  | 'principle-demo' // 原理演示：用图形运动解释机制、规律、因果
  | 'cognition-fable' // 认知与心理寓言：用角色、行为或实验场景表达认知偏差
  | 'data-viz' // 数据与关系可视化：用数量、比例、结构、网络关系讲知识
  | 'history-evolution' // 历史与过程演化：展示时间线、发展史、变化过程
  | 'comprehensive' // 综合科普制作：支持多种讲解方式的完整工作流
  | 'pending'; // 待细分

// ------------------------------------------------------------
// 独立标签维度（各维度分别记录、允许多选）
// ------------------------------------------------------------

/** 资源形态 */
export type ResourceForm =
  | 'skill' // 可安装技能包
  | 'template' // 工程模板
  | 'article-tutorial' // 文章教程
  | 'video-tutorial' // 视频教程
  | 'prompt' // 提示词
  | 'collection' // 资源合集
  | 'case'; // 作品案例

/** 画风 */
export type VisualStyle =
  | 'geometric' // 极简几何
  | 'line-art' // 线稿手绘
  | 'pixel' // 像素复古
  | 'paper-craft' // 纸艺拼贴
  | 'ink-wash' // 水墨水彩
  | '3d-space' // 三维空间
  | 'kinetic-typography' // 动态字体
  | 'unknown'; // 资料不足

/** 制作功能 */
export type ProductionFunction =
  | 'topic-research' // 选题研究
  | 'copywriting' // 文案
  | 'storyboard' // 分镜
  | 'animation' // 动画
  | 'beat-sync' // 卡点
  | 'voiceover' // 配音
  | 'sound-fx' // 音效
  | 'subtitle' // 字幕
  | 'editing' // 剪辑
  | 'render-export' // 渲染导出
  | 'final-check' // 成片检查
  | 'full-pipeline'; // 全流程制作

/** 声音形式 */
export type SoundForm =
  | 'no-voiceover' // 无旁白
  | 'narrated' // 配音讲解
  | 'music' // 音乐配乐
  | 'sfx'; // 事件音效

/** 输入方式 */
export type InputMethod =
  | 'topic-input' // 输入主题
  | 'script-input' // 输入文案
  | 'article-to-video' // 文章转视频
  | 'website-to-video' // 网站转视频
  | 'video-remake' // 参考视频复刻
  | 'music-driven'; // 音乐驱动

/** 实现技术 */
export type Technology =
  | 'canvas'
  | 'html-css'
  | 'remotion'
  | 'hyperframes'
  | 'threejs'
  | 'webgl'
  | 'gsap'
  | 'manim'
  | 'blender';

/** 使用平台 */
export type Platform =
  | 'claude-code' // Claude Code
  | 'codex' // Codex
  | 'other-agent' // 其他 Agent
  | 'unknown'; // 待确认

/** 模型 */
export type ModelTag =
  | 'opus-55' // Opus 5.5
  | 'other-model' // 其他模型
  | 'model-agnostic' // 模型不限
  | 'unknown'; // 待确认

// ------------------------------------------------------------
// 标签维度 key（SkillTags 的字段名，供筛选 UI 使用）
// ------------------------------------------------------------

/** 8 个标签维度在 SkillTags 上的字段名 */
export type TagDimensionKey =
  | 'forms'
  | 'visualStyles'
  | 'functions'
  | 'soundForms'
  | 'inputMethods'
  | 'technologies'
  | 'platforms'
  | 'models';

/** 筛选维度 key（大类 + Vibe 二级 + 8 个标签维度） */
export type FilterDimensionKey = 'primaryCategory' | 'vibeSubcategory' | TagDimensionKey;

// ------------------------------------------------------------
// 难度 / 语言（保留）
// ------------------------------------------------------------

/** 难度等级 */
export type Difficulty = '入门' | '进阶' | '高级';

/** 语言 */
export type Language = 'zh' | 'en' | 'zh-en';

// ------------------------------------------------------------
// Skill 接口
// ------------------------------------------------------------

/** 结构化多维标签（8 个独立维度，各维度分别记录、允许多选） */
export interface SkillTags {
  /** 资源形态 */
  forms: ResourceForm[];
  /** 画风 */
  visualStyles: VisualStyle[];
  /** 制作功能 */
  functions: ProductionFunction[];
  /** 声音形式 */
  soundForms: SoundForm[];
  /** 输入方式 */
  inputMethods: InputMethod[];
  /** 实现技术 */
  technologies: Technology[];
  /** 使用平台 */
  platforms: Platform[];
  /** 模型 */
  models: ModelTag[];
}

/** Skill 接口 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  /** 一级大类（单选） */
  primaryCategory: PrimaryCategory;
  /** Vibe 二级分类（仅 primaryCategory === 'vibe' 时有值） */
  vibeSubcategory?: VibeSubcategory;
  /** 项目家族（同名仓库折叠） */
  family: string;
  /** 结构化多维标签 */
  tags: SkillTags;
  /** 标签依据：'作者说明' | '索引介绍' | '名称推断'（可选） */
  tagBasis?: string;
  author: string;
  /** GitHub 链接 */
  sourceUrl: string;
  /** GitHub stars */
  stars: number;
  /** 安装命令 */
  installCommand?: string;
  /** 使用示例代码 */
  usageExample?: string;
  /** 配置内容片段 */
  configContent?: string;
  /** 是否精选 */
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  difficulty: Difficulty;
  language: Language;
  /** 效果展示媒体 URL（mp4/webm 视频或 gif/png/jpg 图片直链，可内嵌播放） */
  demoMedia?: string[];
}

/** 成品展示 */
export interface WorkShowcase {
  id: string;
  /** base64 或 URL */
  imageUrl: string;
  description: string;
}

/** 评论 */
export interface Comment {
  id: string;
  skillId: string;
  userName: string;
  userAvatar: string;
  content: string;
  /** 1-5 星 */
  rating: number;
  createdAt: string;
  likes: number;
  /** 成品展示 */
  works?: WorkShowcase[];
}

/** 收藏状态 */
export type FavoriteStatus = 'wishlist' | 'trying' | 'frequent' | 'archived';

/** 收藏 */
export interface Favorite {
  skillId: string;
  /** 待试用/试用中/常用/已弃用 */
  status: FavoriteStatus;
  /** 使用心得 */
  note: string;
  addedAt: string;
}

/** 许愿状态 */
export type WishStatus = 'open' | 'claimed' | 'in-progress' | 'completed';

/** 许愿 */
export interface Wish {
  id: string;
  title: string;
  description: string;
  /** 一级大类（原 resourceType 资源类型，按语义改为大类） */
  primaryCategory: PrimaryCategory;
  /** 标签 */
  tags: string[];
  authorName: string;
  authorAvatar: string;
  votes: number;
  status: WishStatus;
  claimantName?: string;
  claimantAvatar?: string;
  createdAt: string;
  /** 完成后的链接 */
  resultUrl?: string;
}

/** Toast 类型 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Toast 项 */
export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  /** 退场标记（播放退出动画后移除） */
  leaving?: boolean;
}