


export type PrimaryCategory =
  | 'vibe'
  | 'promo'
  | 'education'
  | 'motion-design'
  | 'narrative-mv'
  | 'game-interactive'
  | 'post-production'
  | 'general-video'
  | 'uncategorized';


export type VibeSubcategory =
  | 'principle-demo'
  | 'cognition-fable'
  | 'data-viz'
  | 'history-evolution'
  | 'comprehensive'
  | 'pending';


export type ResourceForm =
  | 'skill'
  | 'template'
  | 'article-tutorial'
  | 'video-tutorial'
  | 'prompt'
  | 'collection'
  | 'case';


export type VisualStyle =
  | 'geometric'
  | 'line-art'
  | 'pixel'
  | 'paper-craft'
  | 'ink-wash'
  | '3d-space'
  | 'kinetic-typography'
  | 'unknown';


export type ProductionFunction =
  | 'topic-research'
  | 'copywriting'
  | 'storyboard'
  | 'animation'
  | 'beat-sync'
  | 'voiceover'
  | 'sound-fx'
  | 'subtitle'
  | 'editing'
  | 'render-export'
  | 'final-check'
  | 'full-pipeline';


export type SoundForm =
  | 'no-voiceover'
  | 'narrated'
  | 'music'
  | 'sfx';


export type InputMethod =
  | 'topic-input'
  | 'script-input'
  | 'article-to-video'
  | 'website-to-video'
  | 'video-remake'
  | 'music-driven';


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


export type Platform =
  | 'claude-code'
  | 'codex'
  | 'other-agent'
  | 'unknown';


export type ModelTag =
  | 'opus-55'
  | 'other-model'
  | 'model-agnostic'
  | 'unknown';


export type TagDimensionKey =
  | 'forms'
  | 'visualStyles'
  | 'functions'
  | 'soundForms'
  | 'inputMethods'
  | 'technologies'
  | 'platforms'
  | 'models';


export type FilterDimensionKey = 'primaryCategory' | 'vibeSubcategory' | TagDimensionKey;


export type Difficulty = '入门' | '进阶' | '高级';


export type Language = 'zh' | 'en' | 'zh-en';


export interface SkillTags {

  forms: ResourceForm[];

  visualStyles: VisualStyle[];

  functions: ProductionFunction[];

  soundForms: SoundForm[];

  inputMethods: InputMethod[];

  technologies: Technology[];

  platforms: Platform[];

  models: ModelTag[];
}


export interface Skill {
  id: string;
  name: string;
  description: string;
  longDescription: string;

  primaryCategory: PrimaryCategory;

  vibeSubcategory?: VibeSubcategory;

  family: string;

  tags: SkillTags;

  tagBasis?: string;
  author: string;

  sourceUrl: string;

  stars: number;

  installCommand?: string;

  usageExample?: string;

  configContent?: string;

  featured: boolean;
  createdAt: string;
  updatedAt: string;
  difficulty: Difficulty;
  language: Language;

  demoMedia?: string[];
}


export interface WorkShowcase {
  id: string;

  imageUrl: string;
  description: string;
}


export interface Comment {
  id: string;
  skillId: string;
  userName: string;
  userAvatar: string;
  content: string;

  rating: number;
  createdAt: string;
  likes: number;

  works?: WorkShowcase[];
}


export type FavoriteStatus = 'wishlist' | 'trying' | 'frequent' | 'archived';


export interface Favorite {
  skillId: string;

  status: FavoriteStatus;

  note: string;
  addedAt: string;
}


export type WishStatus = 'open' | 'claimed' | 'in-progress' | 'completed';


export interface Wish {
  id: string;
  title: string;
  description: string;

  primaryCategory: PrimaryCategory;

  tags: string[];
  authorName: string;
  authorAvatar: string;
  votes: number;
  status: WishStatus;
  claimantName?: string;
  claimantAvatar?: string;
  createdAt: string;

  resultUrl?: string;
}


export type ToastType = 'success' | 'error' | 'warning' | 'info';


export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;

  leaving?: boolean;
}
