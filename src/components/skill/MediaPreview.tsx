// ============================================================
// MediaPreview - 效果媒体展示组件（视频/图片，支持轮播）
// ============================================================
// 用于在卡片和详情页展示 Skill 的效果视频/图片。
// - 根据 URL 扩展名自动选择 <video> 或 <img> 渲染
// - 多个媒体时提供左右箭头 + 底部指示器轮播（fade 过渡）
// - 加载失败时显示优雅的占位区
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';

/** MediaPreview Props */
interface MediaPreviewProps {
  /** 媒体 URL 数组（mp4/webm/gif/png/jpg/webp 直链） */
  media: string[];
  /** 自定义类名 */
  className?: string;
  /** 视频是否自动播放（默认 true，用于卡片；详情页也可 true） */
  autoPlay?: boolean;
  /** 视频是否显示控制条（默认 false，卡片不显示；详情页可 true） */
  showControls?: boolean;
  /** 媒体区高度（默认 'h-48'，即 12rem） */
  height?: string;
  /** 是否圆角（默认 true） */
  rounded?: boolean;
}

/**
 * 根据 URL 扩展名判断媒体类型。
 * .mp4 / .webm / .mov → video；其余（gif/png/jpg/jpeg/webp/svg）→ image。
 * GIF 由浏览器 <img> 自动播放动画。
 */
function getMediaType(url: string): 'video' | 'image' {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  const match = clean.match(/\.([a-z0-9]+)$/);
  const ext = match?.[1] ?? '';
  if (ext === 'mp4' || ext === 'webm' || ext === 'mov') return 'video';
  return 'image';
}

/** 加载失败时的占位区 */
function ErrorPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-elevated text-content-subtle">
      <ImageOff className="w-8 h-8 mb-2 opacity-60" />
      <span className="text-xs">媒体加载失败</span>
    </div>
  );
}

/** 单个媒体项 Props */
interface MediaItemProps {
  url: string;
  autoPlay: boolean;
  showControls: boolean;
  /** 是否为当前激活项（控制视频播放/暂停） */
  active: boolean;
}

/**
 * 单个媒体项：处理单个媒体的渲染与加载失败兜底。
 * 视频通过 ref + useEffect 根据 active 控制 play/pause，
 * 避免轮播中多个视频同时播放。
 * 媒体普遍数 MB（GIF 5-15MB、mp4 8-10MB），加载需数秒：
 * 就绪前显示 shimmer 骨架屏，避免长时间灰底/黑屏被误认为"没有媒体"。
 */
function MediaItem({ url, autoPlay, showControls, active }: MediaItemProps) {
  const [hasError, setHasError] = useState(false);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const type = getMediaType(url);

  // 根据激活状态控制视频播放/暂停
  useEffect(() => {
    const video = videoRef.current;
    if (!video || type !== 'video') return;
    if (active && autoPlay) {
      // play() 返回 Promise，自动播放被阻止时静默处理
      video.play().catch(() => {
        /* 浏览器阻止自动播放时静默忽略 */
      });
    } else {
      video.pause();
    }
  }, [active, autoPlay, type]);

  if (hasError) {
    return <ErrorPlaceholder />;
  }

  return (
    <div className="absolute inset-0">
      {/* 骨架屏：媒体就绪前的微光占位（opacity 动画，reduced-motion 全局降级为静止） */}
      {!ready && <div className="absolute inset-0 bg-base-elevated animate-pulse" aria-hidden="true" />}
      {type === 'video' ? (
        <video
          ref={videoRef}
          src={url}
          className={cn('w-full h-full object-cover bg-black/30', !ready && 'opacity-0')}
          muted
          loop
          playsInline
          autoPlay={autoPlay && active}
          controls={showControls}
          preload="metadata"
          onLoadedData={() => setReady(true)}
          onError={() => setHasError(true)}
        />
      ) : (
        <img
          src={url}
          alt=""
          className={cn('w-full h-full object-cover', !ready && 'opacity-0')}
          loading="lazy"
          draggable={false}
          onLoad={() => setReady(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

/** MediaPreview 组件 */
export function MediaPreview({
  media,
  className,
  autoPlay = true,
  showControls = false,
  height = 'h-48',
  rounded = true,
}: MediaPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 空数组兜底：显示失败占位
  if (!media || media.length === 0) {
    return (
      <div
        className={cn(
          'relative overflow-hidden bg-base-elevated',
          height,
          rounded && 'rounded-xl',
          className
        )}
      >
        <ErrorPlaceholder />
      </div>
    );
  }

  const total = media.length;
  const showCarousel = total > 1;

  /** 切换到上一项（阻止冒泡，避免触发外层卡片点击） */
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i - 1 + total) % total);
  };

  /** 切换到下一项 */
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i + 1) % total);
  };

  /** 跳转到指定项 */
  const handleJump = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  return (
    <div
      className={cn(
        'group/media relative overflow-hidden bg-base-elevated',
        height,
        rounded && 'rounded-xl',
        className
      )}
    >
      {/* 媒体轮播：仅挂载当前激活项（其余项不渲染 DOM， */}
      {/* 避免一页 24 张卡片 × 全部媒体同时发起数百 MB 请求）； */}
      {/* 切换时挂载新项并由 MediaItem 的骨架屏兜底加载态 */}
      {media.map((url, index) => {
        const active = index === currentIndex;
        if (!active) return null;
        return (
          <div
            key={`${index}-${url}`}
            className="absolute inset-0 transition-opacity duration-300 opacity-100"
          >
            <MediaItem
              url={url}
              autoPlay={autoPlay}
              showControls={showControls}
              active={active}
            />
          </div>
        );
      })}

      {/* 轮播控件：仅当媒体数 > 1 时显示 */}
      {showCarousel && (
        <>
          {/* 左箭头：hover 媒体区时显示 */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="上一张"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover/media:opacity-100 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* 右箭头 */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="下一张"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover/media:opacity-100 transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 底部指示器：当前项高亮 */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {media.map((url, index) => (
              <button
                key={`dot-${index}-${url}`}
                type="button"
                onClick={(e) => handleJump(e, index)}
                aria-label={`跳转到第 ${index + 1} 张`}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}