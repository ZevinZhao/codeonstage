import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from 'lucide-react';
import type { ShowcaseItem } from '@/data/showcase';
import { drawDemoCover } from './demoCover';

const TOUCH_SWIPE_THRESHOLD = 48;

const NOTICE_TIMEOUT_MS = 8000;

function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

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

export interface FilmstripFallbackProps {
  items: ShowcaseItem[];
  index: number;
  onIndexChange: (index: number) => void;
}

const ARROW_BUTTON_CLASS =
  'animate-fade-in absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border-strong bg-black/35 text-content-muted backdrop-blur-sm transition-[transform,border-color,color] duration-160 ease-out-strong hover:scale-[1.04] hover:border-white/30 hover:text-content active:scale-[0.97]';

export function FilmstripFallback({ items, index, onIndexChange }: FilmstripFallbackProps) {
  const total = items.length;
  const item = items[index] ?? items[0];
  const prevItem = items[mod(index - 1, total)];
  const nextItem = items[mod(index + 1, total)];

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [videoFailedIds, setVideoFailedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef(0);
  const preloadedRef = useRef<Set<string>>(new Set());
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const isWatching = playingIndex === index && !!item.videoUrl;
  const canPlayInline = !!item.videoUrl && !videoFailedIds.includes(item.id);
  const ambientPlaying = playingIndex == null && canPlayInline;

  const step = (dir: 1 | -1) => {
    onIndexChange(mod(index + dir, total));
  };

  const showNotice = (text: string) => {
    setNotice(text);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
  };

  const handlePlayAction = () => {
    if (!item.videoUrl || videoFailedIds.includes(item.id)) {
      window.open(item.watchUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    setPlayingIndex(index); // 有声观看（autoPlay + native controls）
  };

  const handleVideoError = () => {
    if (!item.videoUrl || videoFailedIds.includes(item.id)) return;
    setVideoFailedIds((prev) => [...prev, item.id]);
    setPlayingIndex(null);
    showNotice('视频加载失败，已保留封面');
  };

  useEffect(() => {
    if (playingIndex != null && playingIndex !== index) setPlayingIndex(null);
  }, [index, playingIndex]);

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
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [index, items, total, onIndexChange]);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
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
  }, [index, items, total, onIndexChange]);

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

          <div
            key={item.id}
            className="animate-fade-in relative aspect-video w-full overflow-hidden rounded-xl border border-border-strong bg-black shadow-card"
            data-testid="reel-fallback-card"
          >
            {isWatching || ambientPlaying ? (
              <>
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

                <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] text-content-muted backdrop-blur-sm">
                  {item.category}
                </span>

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
