// ============================================================
// 首页 - 码上开演 · 放映厅（交互阶段）
// ------------------------------------------------------------
// 深色沉浸式电影放映厅：三段式（顶部导航 / 中央曲面胶卷 / 底部信息区），
// 整页 100dvh 无滚动条。核心视觉为 <FilmStripReel />（Three.js 渲染的
// 横向弯曲 35mm 胶卷），offset 由 useFilmstrip 统一状态机驱动：
//   自动缓慢滚动（15s/格，仅桌面且未偏好减少动效）→ 悬停 150ms 柔停
//   → 离开 1s 平滑恢复 → 箭头/键盘/点击切换（720ms 居中 + 5s 冷却）
//   → 触摸拖动跟手 + 松手 snap/回弹（移动端）
//   → ambient 常驻视频：胶卷布局就绪后全部有视频的作品同时静音循环
//     播放（自动巡游滚动照常），点击画面中央/空格对当前作品有声观看。
// 适配与降级：
//   - 移动布局（触屏/窄视口）：自动巡游初始即停；main 区域
//     touch-action: none 交给触摸拖动；控制条触控目标 ≥44px。
//   - Page Visibility / 胶卷离屏：状态机统一挂起（滚动/渲染/视频暂停）。
//   - WebGL 不可用/初始化失败：FilmStripReel 上报 onError → 切换
//     <FilmstripFallback />（HTML 降级轮播，索引与页脚数据同步）。
// 入场编排：导航先淡入 → 胶卷 700ms 上移淡入（ease-out-strong）
//          → 信息区随后淡入上移；reduced-motion 全局降级为纯淡入。
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  X,
} from 'lucide-react';
import { FilmStripReel } from '@/components/filmstrip/FilmStripReel';
import { FilmstripFallback } from '@/components/filmstrip/FilmstripFallback';
import { VideoControls } from '@/components/filmstrip/VideoControls';
import { useFilmstrip } from '@/hooks/useFilmstrip';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ReelErrorReason } from '@/components/filmstrip/FilmStripReel';
import { SHOWCASE_ITEMS, formatDuration } from '@/data/showcase';

/** 首页 - 放映厅 */
export function HomePage() {
  // —— WebGL 降级：Three 初始化失败后切换 HTML 轮播（索引由降级组件上报）——
  const [useFallbackReel, setUseFallbackReel] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  // —— 胶卷布局就绪（FilmStripReel onReady('layout')）：触发 ambient 常驻视频 ——
  const [layoutReady, setLayoutReady] = useState(false);

  // 统一状态机：自动滚动 / 悬停暂停 / 手动切换 / 触摸拖动 / 视频播放。
  // 降级模式下关闭输入驱动（Three 句柄不存在，交互由降级 UI 自管，
  // 避免键盘/点击双重响应与索引双源不同步）
  const reel = useFilmstrip(SHOWCASE_ITEMS, { inputEnabled: !useFallbackReel });
  const { startAmbient } = reel;

  // 双源索引汇流：页脚标题/页码/Skill 链接的统一数据源
  const total = SHOWCASE_ITEMS.length;
  const activeIndex = useFallbackReel ? fallbackIndex : reel.currentIndex;
  const item = SHOWCASE_ITEMS[activeIndex];
  const duration = formatDuration(item.durationSec);

  // 当前作品是否可内联播放（有视频源且未加载失败）
  const canPlayInline = !!item.videoUrl && !reel.videoFailedIds.includes(item.id);

  /** WebGL 初始化失败上报（引用稳定，避免 Three 场景因回调变化重建） */
  const handleReelError = useCallback((_reason: ReelErrorReason) => {
    setUseFallbackReel(true);
  }, []);

  /** 胶卷布局就绪回调（'layout' = 场景可渲染；引用稳定供 effect 依赖） */
  const handleReelReady = useCallback((phase: 'layout' | 'images') => {
    if (phase === 'layout') setLayoutReady(true);
  }, []);

  // ambient 常驻视频：胶卷布局就绪后启动全部视频的静音循环播放（含
  // star 最高的盛唐视频）—— 自动巡游滚动照常进行，所有视频格同时播。
  // 幂等保护在 hook 内（slots 已创建则跳过；StrictMode 重挂载后重建）
  useEffect(() => {
    if (!layoutReady || useFallbackReel) return;
    startAmbient();
  }, [layoutReady, startAmbient, useFallbackReel]);

  /** 空格 / 点击画面中央的统一播放入口 */
  const handlePlayAction = () => {
    if (canPlayInline) {
      reel.playCurrent();
    } else {
      // 无视频源或加载失败：兜底跳转原站观看
      window.open(item.watchUrl, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * 胶卷区域点击委托（简版分区方案，仅 WebGL 模式）：
   * 左 1/3 → 上一部；右 1/3 → 下一部；中央 → 播放/暂停。
   * （降级模式的切换入口由 FilmstripFallback 自带：箭头/小卡片/滑动）
   */
  const handleStageClick = (e: ReactMouseEvent<HTMLElement>) => {
    // 控件自身的点击由其 handler 处理，不进入区域判定。
    // 注意用 Element 判定（不能用 HTMLElement）：点击落在按钮内的 SVG 图标上时
    // target 是 SVGElement（非 HTMLElement 子类），否则守卫失效会导致
    // 「按钮 onClick + 区域委托」双重触发（例如播放被立即暂停的竞态）
    if (e.target instanceof Element && e.target.closest('button, a, input')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.33) {
      reel.nudge(-1);
    } else if (x > 0.67) {
      reel.nudge(1);
    } else if (reel.video.active) {
      // 播放会话中点击画面 = 播放/暂停切换
      reel.togglePlayPause();
    } else {
      handlePlayAction();
    }
  };


  return (
    <div className="bg-screening-hall relative flex h-dvh flex-col overflow-hidden text-content">
      {/* ================= 顶部导航 ================= */}
      <header className="animate-fade-in relative z-10 flex h-16 shrink-0 items-center justify-between px-6 sm:px-10">
        {/* 品牌字标：衬线 + 宽字距 */}
        <Link to="/" className="flex items-baseline gap-3" aria-label="码上开演 首页">
          <span className="font-display text-xl leading-none tracking-[0.18em] text-content">
            码上开演
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.32em] text-content-faint sm:inline">
            Screening Room
          </span>
        </Link>

        <nav className="flex items-center gap-6 sm:gap-8" aria-label="放映厅导航">
          {/* 当前页：放映厅（高亮） */}
          <span
            className="flex items-center gap-2 text-sm font-medium text-content"
            aria-current="page"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-content/80" />
            放映厅
          </span>
          <Link
            to="/skills"
            className="text-sm text-content-subtle transition-colors duration-200 hover:text-content-muted"
          >
            全部 Skills
          </Link>
          <Link
            to="/skills"
            aria-label="搜索 Skill"
            className="text-content-subtle transition-colors duration-200 hover:text-content-muted"
          >
            <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
        </nav>
      </header>

      {/* ================= 中央：曲面胶卷（悬停/触摸交互区 = 整个 main） ================= */}
      {/* touch-none：浏览器不接管触摸手势（页面本身无滚动），横向拖动全部
          交给状态机的 touch 处理（跟手 + snap），preventDefault 兜底 */}
      <main
        ref={reel.interactionRef}
        onClick={useFallbackReel ? undefined : handleStageClick}
        className="reel-stage relative min-h-0 flex-1 touch-none"
        aria-label="精选作品胶卷"
      >
        {/* 胶卷层：铺满区域（入场 700ms 淡入 + 12px 上移）；offset 由状态机命令式驱动 */}
        <div className="reel-enter absolute inset-0" style={{ animationDelay: '250ms' }}>
          {useFallbackReel ? (
            // WebGL 降级：HTML 轮播（中央大卡片 + 小卡片 + 箭头 + video），
            // 索引变化上报 fallbackIndex，页脚数据与本组件同步
            <FilmstripFallback
              items={SHOWCASE_ITEMS}
              index={fallbackIndex}
              onIndexChange={setFallbackIndex}
            />
          ) : (
            <FilmStripReel
              ref={reel.reelRef}
              items={SHOWCASE_ITEMS}
              onReady={handleReelReady}
              onError={handleReelError}
            />
          )}
        </div>

        {/* —— 以下控件仅 WebGL 模式渲染（降级模式由 FilmstripFallback 自带）—— */}

        {/* 左箭头：圆形半透明深色底 + 细边框（悬停提亮、放大 1.04、按下 0.97） */}
        {!useFallbackReel && (
          <button
            type="button"
            data-testid="reel-prev"
            onClick={() => reel.nudge(-1)}
            aria-label="上一部作品"
            className="animate-fade-in absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-black/35 text-content-muted backdrop-blur-sm transition-[transform,border-color,color] duration-160 ease-out-strong hover:scale-[1.04] hover:border-white/30 hover:text-content active:scale-[0.97] sm:left-8 sm:h-14 sm:w-14"
            style={{ animationDelay: '600ms' }}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}

        {/* 右箭头 */}
        {!useFallbackReel && (
          <button
            type="button"
            data-testid="reel-next"
            onClick={() => reel.nudge(1)}
            aria-label="下一部作品"
            className="animate-fade-in absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-black/35 text-content-muted backdrop-blur-sm transition-[transform,border-color,color] duration-160 ease-out-strong hover:scale-[1.04] hover:border-white/30 hover:text-content active:scale-[0.97] sm:right-8 sm:h-14 sm:w-14"
            style={{ animationDelay: '600ms' }}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
        )}


        {/* 播放控制条（会话激活时出现；位于交互区内，鼠标移向它不会恢复滚动） */}
        {reel.video.active && (
          <VideoControls
            playing={reel.video.playing}
            muted={reel.video.muted}
            currentTime={reel.video.currentTime}
            duration={reel.video.duration}
            isFullscreen={reel.isFullscreen}
            onTogglePlay={reel.togglePlayPause}
            onToggleMute={reel.toggleMute}
            onSeek={reel.seek}
            onToggleFullscreen={reel.toggleFullscreen}
          />
        )}

        {/* 视频加载失败行内提示（保留封面 + 原站观看入口，自动消失） */}
        {reel.videoNotice && (
          <div
            role="status"
            data-testid="reel-notice"
            className="animate-fade-in absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-black/55 px-4 py-2 backdrop-blur-md"
          >
            <span className="whitespace-nowrap text-sm text-content-muted">
              {reel.videoNotice}
            </span>
            <a
              href={item.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-content transition-colors duration-200 hover:text-content-muted"
            >
              原站观看
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
            <button
              type="button"
              onClick={reel.dismissNotice}
              aria-label="关闭提示"
              className="flex h-6 w-6 items-center justify-center rounded-full text-content-faint transition-colors duration-200 hover:text-content"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </main>

      {/* ================= 底部信息区 ================= */}
      <footer
        className="animate-fade-up relative z-10 flex shrink-0 items-end justify-between gap-8 px-6 pb-8 pt-4 sm:px-10 sm:pb-10"
        style={{ animationDelay: '450ms' }}
      >
        {/* 左：竖排刊头 + 标题 + 分类标签（尺寸固定，切换不跳动） */}
        <div className="flex min-w-0 items-end gap-5 sm:gap-7">
          {/* 竖排「精选作品 / 编号」 */}
          <div className="hidden flex-col items-center gap-3 sm:flex" aria-hidden="true">
            <span
              className="text-[10px] leading-none tracking-[0.32em] text-content-faint"
              style={{ writingMode: 'vertical-rl' }}
            >
              精选作品
            </span>
            <span className="h-5 w-px bg-border-strong" />
            <span className="font-mono text-[11px] tabular-nums text-content-subtle">
              {String(activeIndex + 1).padStart(3, '0')}
            </span>
          </div>

          {/* 标题块：key 切换时轻淡入（200ms，文字区固定不跳动） */}
          <div key={item.id} className="animate-fade-in min-w-0">
            <h1 className="font-display min-h-[44px] truncate text-4xl leading-[1.12] tracking-[0.06em] text-content sm:min-h-[52px] sm:text-5xl">
              {item.title}
            </h1>
            <div className="mt-3 flex h-6 items-center gap-3">
              <span className="whitespace-nowrap text-sm text-content-muted">
                {item.category}
              </span>
              {duration && (
                <>
                  <span className="h-1 w-1 rounded-full bg-content-faint" aria-hidden="true" />
                  <time className="font-mono text-xs tabular-nums text-content-faint">
                    {duration}
                  </time>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 右：查看 Skill（悬停下划线展开 + 箭头轻移）+ 分页页码 */}
        <div className="flex shrink-0 flex-col items-end gap-5">
          <a
            href={item.skillUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-1.5 text-sm font-medium text-content"
          >
            查看 Skill
            <ArrowUpRight
              className="h-4 w-4 transition-transform duration-200 ease-out-strong group-hover:-translate-y-[3px] group-hover:translate-x-[3px]"
              strokeWidth={1.75}
            />
            {/* 细下划线：悬停时从左侧展开，文字位置稳定 */}
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-white/40 transition-transform duration-200 ease-out-strong group-hover:scale-x-100"
            />
          </a>

          {/* 分页页码：等宽数字 */}
          <div
            className="font-mono text-sm tabular-nums text-content-faint"
            aria-live="polite"
            aria-label={`第 ${activeIndex + 1} 部，共 ${total} 部`}
          >
            <span className="text-content">
              {String(activeIndex + 1).padStart(2, '0')}
            </span>
            <span className="mx-1.5">/</span>
            <span>{String(total).padStart(2, '0')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}