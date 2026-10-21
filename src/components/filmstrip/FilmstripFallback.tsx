// ============================================================
// FilmstripFallback - WebGL 不可用时的 HTML 降级轮播
// ------------------------------------------------------------
// isWebGLAvailable() 为假或 Three 渲染器创建失败时，由 HomePage 切换到
// 本组件（完整可用的普通轮播，非占位）：
//   - 布局：中央大卡片（当前作品封面 + 播放按钮）+ 左右小卡片（相邻
//     作品缩略）+ 左右箭头（触控目标 ≥44px），深色放映厅氛围一致。
//   - 交互对齐：手动切换（箭头/键盘 ←→/触摸滑动）、HTML5 video 直接
//     播放（native controls + playsInline）、无视频条目点击跳原站。
//   - 数据同步：受控 index（onIndexChange 上报），标题/页码/Skill 链接
//     由 HomePage 页脚统一渲染，与 WebGL 版同一数据源。
//   - 性能：邻近 ±1 作品封面 Image() 预热（coverUrl 非空条目）；
//     真实封面加载失败自动回退程序化演示封面。
// 动效规范：入场 animate-fade-in（ease-out-strong）；hover scale ≤1.04。
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from 'lucide-react';
import type { ShowcaseItem } from '@/data/showcase';
import { drawDemoCover } from './demoCover';

/** 触摸滑动切换的最小水平位移（px，且大于垂直位移才判定） */
const TOUCH_SWIPE_THRESHOLD = 48;

/** 行内提示自动消失时长（ms） */
const NOTICE_TIMEOUT_MS = 8000;

/** 循环取模到 [0, n) */
function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

// ------------------------------------------------------------
// 封面子视图（真实图 / 演示封面兜底）
// ------------------------------------------------------------

/** 程序化演示封面画布（drawDemoCover 绘制，DPR 自适应，一次性渲染） */
function DemoCoverCanvas({
  seed,
  title,
  className,
}: {
  seed: number;
  title: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 320;
    const h = canvas.clientHeight || 180;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawDemoCover(ctx, { x: 0, y: 0, w, h, seed, title });
  }, [seed, title]);
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}

/** 封面视图：coverUrl 加载成功显示真实图（contain 不裁切），失败回退演示封面 */
function CoverView({
  item,
  itemIndex,
  className,
}: {
  item: ShowcaseItem;
  itemIndex: number;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  // 切换条目后重置失败态（网络恢复后允许重试）
  useEffect(() => {
    setImgFailed(false);
  }, [item.id, item.coverUrl]);

  if (item.coverUrl && !imgFailed) {
    return (
      <img
        src={item.coverUrl}
        alt={`《${item.title}》封面`}
        className={`bg-[#101014] object-contain ${className ?? ''}`}
        loading="lazy"
        draggable={false}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <DemoCoverCanvas seed={itemIndex + 1} title={item.title} className={className} />;
}

// ------------------------------------------------------------
// 组件接口
// ------------------------------------------------------------

/** 降级轮播 props */
export interface FilmstripFallbackProps {
  /** 精选作品列表（与 WebGL 版同一数据源） */
  items: ShowcaseItem[];
  /** 受控当前索引（父组件持有，驱动页脚标题/页码同步） */
  index: number;
  /** 索引变化上报（循环取模由组件内部保证） */
  onIndexChange: (index: number) => void;
}

/** 与 WebGL 版箭头一致的按钮样式（h-12=48px 触控目标 ≥44px） */
const ARROW_BUTTON_CLASS =
  'animate-fade-in absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-black/35 text-content-muted backdrop-blur-sm transition-[transform,border-color,color] duration-160 ease-out-strong hover:scale-[1.04] hover:border-white/30 hover:text-content active:scale-[0.97]';

// ------------------------------------------------------------
// 组件实现
// ------------------------------------------------------------

/** WebGL 降级轮播（普通 HTML/CSS 实现，功能对齐 WebGL 版核心交互） */
export function FilmstripFallback({ items, index, onIndexChange }: FilmstripFallbackProps) {
  const total = items.length;
  const item = items[index] ?? items[0];
  const prevItem = items[mod(index - 1, total)];
  const nextItem = items[mod(index + 1, total)];

  // —— 播放会话（当前索引正在播放 → 中央卡片渲染 video）——
  // 双轨制（与 WebGL 版对齐）：
  //   ambient：playingIndex = null 时，当前条目有视频即静音自动循环播放
  //            （切换作品后视频跟随条目自动续播，无控制条）；
  //   手动观看：点击播放按钮 → playingIndex = index，有声 + 控制条。
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [videoFailedIds, setVideoFailedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef(0);
  /** 已预热的封面 URL（避免重复发起请求） */
  const preloadedRef = useRef<Set<string>>(new Set());
  /** 拖动判定基准（touchstart → touchend） */
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  /** 手动有声观看中（false = ambient 静音循环或封面） */
  const isWatching = playingIndex === index && !!item.videoUrl;
  const canPlayInline = !!item.videoUrl && !videoFailedIds.includes(item.id);
  /** ambient 静音循环播放（当前条目有视频且未在手动观看） */
  const ambientPlaying = playingIndex == null && canPlayInline;

  /** 相对步进（循环） */
  const step = (dir: 1 | -1) => {
    onIndexChange(mod(index + dir, total));
  };

  /** 展示行内提示（自动消失） */
  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
  };

  /** 播放按钮三态：有声观看 / 原站观看兜底 */
  const handlePlayAction = () => {
    if (!item.videoUrl || videoFailedIds.includes(item.id)) {
      window.open(item.watchUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setPlayingIndex(index); // 有声观看（autoPlay + native controls）
  };

  /** video 元素加载/解码失败：回退封面 + 行内提示 */
  const handleVideoError = () => {
    if (!item.videoUrl || videoFailedIds.includes(item.id)) return;
    setVideoFailedIds((prev) => [...prev, item.id]);
    setPlayingIndex(null);
    showNotice('视频加载失败，已保留封面');
  };

  // 切换作品时退出手动观看 → 回 ambient（新条目有视频则自动静音续播）
  useEffect(() => {
    if (playingIndex != null && playingIndex !== index) setPlayingIndex(null);
  }, [index, playingIndex]);

  // —— 邻近作品封面预热（±1 的 coverUrl 提前 Image() 预载）——
  useEffect(() => {
    for (const d of [-1, 1]) {
      const neighbor = items[mod(index + d, total)];
      if (neighbor?.coverUrl && !preloadedRef.current.has(neighbor.coverUrl)) {
        preloadedRef.current.add(neighbor.coverUrl);
        const img = new Image();
        img.decoding = 'async';
        img.src = neighbor.coverUrl;
      }
    }
  }, [index, items, total]);

  // —— 键盘 ←/→ 切换（与 WebGL 版一致；输入控件场景不劫持）——
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        step(1);
      }
      // 空格/播放控制交给 video 元素 native controls 聚焦后自行处理
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items, total, onIndexChange]);

  // —— 触摸滑动切换（简化实现：位移阈值判定，不做跟手动画）——
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      // 落点在控件/video 上 → 交还自身处理（进度条拖动等）
      if (e.target instanceof Element && e.target.closest('button, a, video, input')) {
        swipeRef.current = null;
        return;
      }
      swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onEnd = (e: TouchEvent) => {
      const start = swipeRef.current;
      swipeRef.current = null;
      if (!start || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      // 水平位移达阈值且大于垂直位移 → 切换（手指左滑 = 下一部）
      if (Math.abs(dx) > TOUCH_SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        onIndexChange(mod(index + (dx < 0 ? 1 : -1), total));
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items, total, onIndexChange]);

  // —— 卸载清理计时器（StrictMode 双挂载安全）——
  useEffect(() => {
    return () => window.clearTimeout(noticeTimerRef.current);
  }, []);

  return (
    <div
      className="absolute inset-0"
      data-testid="reel-fallback"
      role="region"
      aria-label="精选作品（基础视图）"
    >
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="relative w-full max-w-3xl">
          {/* ============ 左右小卡片（sm 以上显示，点击切换相邻作品） ============ */}
          <button
            type="button"
            data-testid="reel-fallback-side-prev"
            onClick={() => step(-1)}
            aria-label={`上一部：${prevItem.title}`}
            className="absolute top-1/2 z-0 hidden w-32 -translate-x-[calc(100%+16px)] -translate-y-1/2 sm:block"
          >
            <div className="aspect-video overflow-hidden rounded-lg border border-border bg-base-surface opacity-70 transition-opacity duration-200 ease-out-strong hover:opacity-100">
              <CoverView
                item={prevItem}
                itemIndex={mod(index - 1, total)}
                className="h-full w-full"
              />
            </div>
            <span className="mt-2 block truncate text-left text-xs text-content-subtle">
              {prevItem.title}
            </span>
          </button>

          <button
            type="button"
            data-testid="reel-fallback-side-next"
            onClick={() => step(1)}
            aria-label={`下一部：${nextItem.title}`}
            className="absolute top-1/2 z-0 hidden w-32 translate-x-[calc(100%+16px)] -translate-y-1/2 right-0 sm:block"
          >
            <div className="aspect-video overflow-hidden rounded-lg border border-border bg-base-surface opacity-70 transition-opacity duration-200 ease-out-strong hover:opacity-100">
              <CoverView
                item={nextItem}
                itemIndex={mod(index + 1, total)}
                className="h-full w-full"
              />
            </div>
            <span className="mt-2 block truncate text-right text-xs text-content-subtle">
              {nextItem.title}
            </span>
          </button>

          {/* ============ 中央大卡片（封面 / video 播放） ============ */}
          <div
            key={item.id}
            className="animate-fade-in relative aspect-video w-full overflow-hidden rounded-xl border border-border-strong bg-black shadow-card"
            data-testid="reel-fallback-card"
          >
            {isWatching || ambientPlaying ? (
              <>
                {/* HTML5 video（playsInline 防移动端全屏接管；loop 循环）：
                    手动观看有声 + native controls；ambient 静音自动播放无控制条 */}
                <video
                  className="h-full w-full bg-black"
                  src={item.videoUrl}
                  controls={isWatching}
                  autoPlay
                  muted={!isWatching}
                  loop
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  onEnded={() => setPlayingIndex(null)}
                  onError={handleVideoError}
                />

                {/* ambient 静音播放时的播放按钮（进入有声观看）：
                    h-14 w-14 = 56px（触控目标 ≥44px）；观看中有 native controls 不显示 */}
                {ambientPlaying && (
                  <button
                    type="button"
                    data-testid="reel-fallback-play"
                    onClick={handlePlayAction}
                    aria-label={`播放《${item.title}》`}
                    className="group absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-content backdrop-blur-sm transition-[transform,border-color] duration-160 ease-out-strong hover:scale-[1.04] hover:border-white/30 active:scale-[0.97]"
                  >
                    <Play className="h-6 w-6 translate-x-[2px] fill-current" strokeWidth={1.5} />
                  </button>
                )}
              </>
            ) : (
              <>
                <CoverView item={item} itemIndex={index} className="h-full w-full" />

                {/* 分类角标（右上，信息与 WebGL 版页脚一致） */}
                <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] text-content-muted backdrop-blur-sm">
                  {item.category}
                </span>

                {/* 中央播放按钮：h-14 w-14 = 56px（触控目标 ≥44px）；
                    无视频/已失败 → 原站观看（外链图标） */}
                <button
                  type="button"
                  data-testid="reel-fallback-play"
                  onClick={handlePlayAction}
                  aria-label={canPlayInline ? `播放《${item.title}》` : `原站观看《${item.title}》`}
                  className="group absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-content backdrop-blur-sm transition-[transform,border-color] duration-160 ease-out-strong hover:scale-[1.04] hover:border-white/30 active:scale-[0.97]"
                >
                  {canPlayInline ? (
                    <Play className="h-6 w-6 translate-x-[2px] fill-current" strokeWidth={1.5} />
                  ) : (
                    <ExternalLink className="h-6 w-6" strokeWidth={1.5} />
                  )}
                </button>
              </>
            )}
          </div>

          {/* ============ 左右箭头（移动端主切换入口） ============ */}
          <button
            type="button"
            data-testid="reel-fallback-prev"
            onClick={() => step(-1)}
            aria-label="上一部作品"
            className={`${ARROW_BUTTON_CLASS} -left-1 sm:left-2`}
            style={{ animationDelay: '600ms' }}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            data-testid="reel-fallback-next"
            onClick={() => step(1)}
            aria-label="下一部作品"
            className={`${ARROW_BUTTON_CLASS} -right-1 sm:right-2`}
            style={{ animationDelay: '600ms' }}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* 视频加载失败行内提示（自动消失，与 WebGL 版样式一致） */}
      {notice && (
        <div
          role="status"
          data-testid="reel-fallback-notice"
          className="animate-fade-in absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-black/55 px-4 py-2 backdrop-blur-md"
        >
          <span className="whitespace-nowrap text-sm text-content-muted">{notice}</span>
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
            onClick={() => {
              window.clearTimeout(noticeTimerRef.current);
              setNotice(null);
            }}
            aria-label="关闭提示"
            className="flex h-6 w-6 items-center justify-center rounded-full text-content-faint transition-colors duration-200 hover:text-content"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}