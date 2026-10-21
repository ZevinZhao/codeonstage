// ============================================================
// 精选作品数据 - 首页放映厅「胶卷」轮播
// ------------------------------------------------------------
// 12 条精选作品（对应参考图 01 / 12 分页）。
// 素材优先使用真实直链（raw.githubusercontent.com 支持 CORS）：
//   - 5 条 MP4 视频（首屏 Alisa0808/vox-director「盛唐」为
//     全站 star 最高且有视频的 Skill，2376★ · 30s · 7.6MB；
//     YT-smart/pixel-explainer-video 4 条）
//   - 3 条 GIF 封面（HeyChengC/vibe-knowledge-film × 2、
//     Win-Hao/knowledge-video × 1）
// 其余条目 coverUrl 留空，由组件层用 Canvas 程序化生成
// 「演示封面」（深色底 + 细几何图形 + 「演示封面」标注）。
// ============================================================

/** 精选作品条目 */
export interface ShowcaseItem {
  /** 唯一 id（showcase-01 ~ showcase-12） */
  id: string;
  /** 作品标题（中文，有设计感） */
  title: string;
  /** 分类标签（如「3D 动效 · 创意视频」） */
  category: string;
  /** 封面图直链；空字符串 = 使用程序化演示封面 */
  coverUrl: string;
  /** 视频 MP4 直链；空字符串 = 无视频（静态阶段暂以封面渲染） */
  videoUrl: string;
  /** Skill 仓库链接（「查看 Skill ↗」跳转目标） */
  skillUrl: string;
  /** 原站观看链接（视频缺失时播放按钮的兜底跳转） */
  watchUrl: string;
  /** 视频时长（秒），0 = 未知（不显示时长角标） */
  durationSec: number;
}

// ------------------------------------------------------------
// 可配置常量（为交互阶段预留）
// ------------------------------------------------------------

/** 自动放映时每帧停留秒数（交互阶段的自动滚动间隔） */
export const SCROLL_SECONDS_PER_FRAME = 15;

/** 精选作品总数（当前 12 条，页码「01 / 12」由此驱动） */
export const SHOWCASE_TOTAL = 12;

// ------------------------------------------------------------
// 真实素材直链（与 src/data/skills.ts 的 DEMO_MEDIA 对齐）
// ------------------------------------------------------------

const RAW_BASE = 'https://raw.githubusercontent.com';

const VOX_ASSETS = `${RAW_BASE}/Alisa0808/vox-director/main/assets`;
const PIXEL_EXAMPLES = `${RAW_BASE}/YT-smart/pixel-explainer-video/main/examples`;
const FILM_EXAMPLES = `${RAW_BASE}/HeyChengC/vibe-knowledge-film/main/examples`;
const KNOWLEDGE_DOCS = `${RAW_BASE}/Win-Hao/knowledge-video/main/docs`;

// ------------------------------------------------------------
// 12 条精选作品（顺序即胶卷顺序，items[0] 为首屏中央作品）
// ------------------------------------------------------------

export const SHOWCASE_ITEMS: ShowcaseItem[] = [
  // —— 首屏中央：star 最高且有视频（Alisa0808/vox-director，2376★）——
  // 剪纸拼贴风历史科普短片《盛唐》，30s 循环播放；封面由程序化演示封面兜底
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
    title: '形态之间',
    category: '3D 动效 · 创意视频',
    coverUrl: `${FILM_EXAMPLES}/fold_C.gif`,
    videoUrl: '',
    skillUrl: 'https://github.com/HeyChengC/vibe-knowledge-film',
    watchUrl: 'https://github.com/HeyChengC/vibe-knowledge-film',
    durationSec: 92,
  },
  {
    id: 'showcase-03',
    title: '鸽子的迷信',
    category: '认知与心理 · 角色寓言',
    coverUrl: `${FILM_EXAMPLES}/pigeon_B.gif`,
    videoUrl: '',
    skillUrl: 'https://github.com/HeyChengC/vibe-knowledge-film',
    watchUrl: 'https://github.com/HeyChengC/vibe-knowledge-film',
    durationSec: 85,
  },
  {
    id: 'showcase-04',
    title: '开场白',
    category: '品牌动效 · 演示混剪',
    coverUrl: `${KNOWLEDGE_DOCS}/hero.gif`,
    videoUrl: '',
    skillUrl: 'https://github.com/Win-Hao/knowledge-video',
    watchUrl: 'https://github.com/Win-Hao/knowledge-video',
    durationSec: 64,
  },
  // —— 真实 MP4 视频（点击/键盘播放入口，循环播放）——
  {
    id: 'showcase-05',
    title: '像素讲解员',
    category: '像素风 · 解说视频',
    coverUrl: '',
    videoUrl: `${PIXEL_EXAMPLES}/claude.mp4`,
    skillUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    watchUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    durationSec: 88,
  },
  {
    id: 'showcase-06',
    title: '代码即导演',
    category: '像素风 · 创意短片',
    coverUrl: '',
    videoUrl: `${PIXEL_EXAMPLES}/codex.mp4`,
    skillUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    watchUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    durationSec: 94,
  },
  {
    id: 'showcase-07',
    title: '豆包剧场',
    category: '像素风 · 平台演绎',
    coverUrl: '',
    videoUrl: `${PIXEL_EXAMPLES}/doubao.mp4`,
    skillUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    watchUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    durationSec: 76,
  },
  {
    id: 'showcase-08',
    title: '工作搭子',
    category: '像素风 · 效率叙事',
    coverUrl: '',
    videoUrl: `${PIXEL_EXAMPLES}/workbuddy.mp4`,
    skillUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    watchUrl: 'https://github.com/YT-smart/pixel-explainer-video',
    durationSec: 102,
  },
  // —— 演示封面条目（coverUrl 为空，组件层 Canvas 程序化生成）——
  {
    id: 'showcase-09',
    title: '无旁白法则',
    category: '原理演示 · 科普规范',
    coverUrl: '',
    videoUrl: '',
    skillUrl: 'https://github.com/worlds3/vibe-knowledge',
    watchUrl: 'https://github.com/worlds3/vibe-knowledge',
    durationSec: 142,
  },
  {
    id: 'showcase-10',
    title: '概念卷轴',
    category: '概念关系 · 动态设计',
    coverUrl: '',
    videoUrl: '',
    skillUrl: 'https://github.com/Jogzh/concept-reel',
    watchUrl: 'https://github.com/Jogzh/concept-reel',
    durationSec: 115,
  },
  {
    id: 'showcase-11',
    title: '等轴世界',
    category: '三维空间 · 科普动画',
    coverUrl: '',
    videoUrl: '',
    skillUrl: 'https://github.com/shij8396/vibe-knowledge-awards',
    watchUrl: 'https://github.com/shij8396/vibe-knowledge-awards',
    durationSec: 105,
  },
  {
    id: 'showcase-12',
    title: '像素寓言',
    category: '复古像素 · 角色动画',
    coverUrl: '',
    videoUrl: '',
    skillUrl: 'https://github.com/Friday-s/pixel-knowledge',
    watchUrl: 'https://github.com/Friday-s/pixel-knowledge',
    durationSec: 97,
  },
];

/** 根据浮点偏移取当前居中条目索引（支持任意方向的循环取模） */
export function indexFromOffset(offset: number, total = SHOWCASE_ITEMS.length): number {
  const n = Math.round(offset);
  return ((n % total) + total) % total;
}

/** 秒数格式化为 mm:ss（如 88 → "01:28"） */
export function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}