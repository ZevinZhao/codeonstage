
export interface ShowcaseItem {
  id: string;
  title: string;
  category: string;
  coverUrl: string;
  videoUrl: string;
  skillUrl: string;
  watchUrl: string;
  durationSec: number;
}

export const SCROLL_SECONDS_PER_FRAME = 15;

const RAW_BASE = 'https://raw.githubusercontent.com';

const VOX_ASSETS = `${RAW_BASE}/Alisa0808/vox-director/main/assets`;
const PIXEL_EXAMPLES = `${RAW_BASE}/YT-smart/pixel-explainer-video/main/examples`;
const VIBE_CASES = `${RAW_BASE}/Alisa0808/vibe-creating-skill/main/assets/cases`;
const REMOTION_ASSETS = `${RAW_BASE}/haidrrrry/claude-remotion-skill/main`;
const VOX_MOTION_ASSETS = `${RAW_BASE}/Anil-matcha/vox-ai-motion-graphics-generator/main/assets`;
const PROMO_ASSETS = `${RAW_BASE}/smit-vanani/claude-promo-video/master/assets`;
const MATHLENS_ASSETS = `${RAW_BASE}/shuyicc/MathLens/main/resource`;

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: 'showcase-01',
    title: '盛唐气象',
    category: '纸艺拼贴 · 历史科普',
    coverUrl: '',
    videoUrl: `${VOX_ASSETS}/showcase-tang.mp4`,
    skillUrl: 'https://github.com/Alisa0808/vox-director',
    watchUrl: 'https://github.com/Alisa0808/vox-director',
    durationSec: 30,
  },
  {
    id: 'showcase-02',
    title: '纳瓦尔宝典',
    category: '像素风 · 知识解说',
    coverUrl: '',
    videoUrl: `${PIXEL_EXAMPLES}/claude.mp4`,
    skillUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    watchUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    durationSec: 88,
  },
  {
    id: 'showcase-03',
    title: 'Vibe 创作案例',
    category: '创意编程 · 动态视觉',
    coverUrl: '',
    videoUrl: `${VIBE_CASES}/case2-vibe.mp4`,
    skillUrl: 'https://github.com/Alisa0808/vibe-creating-skill',
    watchUrl: 'https://github.com/Alisa0808/vibe-creating-skill',
    durationSec: 72,
  },
  {
    id: 'showcase-04',
    title: 'Remotion 动效演示',
    category: '代码动画 · 视觉设计',
    coverUrl: '',
    videoUrl: `${REMOTION_ASSETS}/demo.mp4`,
    skillUrl: 'https://github.com/haidrrrry/claude-remotion-skill',
    watchUrl: 'https://github.com/haidrrrry/claude-remotion-skill',
    durationSec: 66,
  },
  {
    id: 'showcase-05',
    title: 'Vox 动态图形',
    category: '动态图形 · 信息视觉',
    coverUrl: '',
    videoUrl: `${VOX_MOTION_ASSETS}/demo.mp4`,
    skillUrl: 'https://github.com/Anil-matcha/vox-ai-motion-graphics-generator',
    watchUrl: 'https://github.com/Anil-matcha/vox-ai-motion-graphics-generator',
    durationSec: 70,
  },
  {
    id: 'showcase-06',
    title: '产品宣传片',
    category: '产品演示 · 品牌叙事',
    coverUrl: '',
    videoUrl: `${PROMO_ASSETS}/demo.mp4`,
    skillUrl: 'https://github.com/smit-vanani/claude-promo-video',
    watchUrl: 'https://github.com/smit-vanani/claude-promo-video',
    durationSec: 82,
  },
  {
    id: 'showcase-07',
    title: 'MathLens',
    category: '数学可视化 · 知识演示',
    coverUrl: '',
    videoUrl: `${MATHLENS_ASSETS}/output.mp4`,
    skillUrl: 'https://github.com/shuyicc/MathLens',
    watchUrl: 'https://github.com/shuyicc/MathLens',
    durationSec: 96,
  },
  {
    id: 'showcase-08',
    title: 'Focus Cat',
    category: '角色短片 · 产品动效',
    coverUrl: '',
    videoUrl: `${REMOTION_ASSETS}/examples/videos/focus-cat-promo.mp4`,
    skillUrl: 'https://github.com/haidrrrry/claude-remotion-skill',
    watchUrl: 'https://github.com/haidrrrry/claude-remotion-skill',
    durationSec: 58,
  },
];

export const SHOWCASE_TOTAL = SHOWCASE_ITEMS.length;

export function indexFromOffset(offset: number, total = SHOWCASE_ITEMS.length): number {
  const n = Math.round(offset);
  return ((n % total) + total) % total;
}

export function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
