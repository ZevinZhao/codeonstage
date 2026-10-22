import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MediaPreviewProps {
  media: string[];
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  height?: string;
  rounded?: boolean;
  fit?: 'cover' | 'contain';
  loadingLabel?: string;
}

function getMediaType(url: string): 'video' | 'image' {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  const match = clean.match(/\.([a-z0-9]+)$/);
  const ext = match?.[1] ?? '';
  if (ext === 'mp4' || ext === 'webm' || ext === 'mov') return 'video';
  return 'image';
}

function ErrorPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-base-elevated text-content-subtle">
      <ImageOff className="w-8 h-8 mb-2 opacity-60" />
      <span className="text-xs">媒体加载失败</span>
    </div>
  );
}

interface MediaItemProps {
  url: string;
  autoPlay: boolean;
  showControls: boolean;
  active: boolean;
  fit: 'cover' | 'contain';
  poster?: string;
  loadingLabel?: string;
}

function MediaItem({ url, autoPlay, showControls, active, fit, poster, loadingLabel }: MediaItemProps) {
  const [hasError, setHasError] = useState(false);
  const [ready, setReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const type = getMediaType(url);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || type !== 'video') return;
    if (active && autoPlay) {
      video.play().catch(() => {
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
      {!ready && (
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#303030_0%,#171717_38%,#080808_82%)]" aria-hidden="true">
          {poster && (
            <img
              src={poster}
              alt=""
              className="absolute inset-0 h-full w-full object-contain opacity-45 blur-[1px]"
              draggable={false}
            />
          )}
          {loadingLabel && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 px-10 text-center">
              <div>
                <div className="text-[10px] font-black tracking-[0.26em] text-white/28">正在载入预览</div>
                <div className="mt-3 text-xl font-black tracking-tight text-white/55 sm:text-2xl">{loadingLabel}</div>
              </div>
            </div>
          )}
        </div>
      )}
      {type === 'video' ? (
        <video
          ref={videoRef}
          src={url}
          poster={poster}
          className={cn('w-full h-full bg-black/30', fit === 'contain' ? 'object-contain' : 'object-cover', !ready && 'opacity-0')}
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
          className={cn('w-full h-full', fit === 'contain' ? 'object-contain' : 'object-cover', !ready && 'opacity-0')}
          loading="lazy"
          draggable={false}
          onLoad={() => setReady(true)}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

export function MediaPreview({
  media,
  className,
  autoPlay = true,
  showControls = false,
  height = 'h-48',
  rounded = true,
  fit = 'cover',
  loadingLabel,
}: MediaPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

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
  const poster = media.find((item) => getMediaType(item) === 'image');

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i - 1 + total) % total);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i + 1) % total);
  };

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
              fit={fit}
              poster={getMediaType(url) === 'video' ? poster : undefined}
              loadingLabel={loadingLabel}
            />
          </div>
        );
      })}

      {showCarousel && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="上一张"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover/media:opacity-100 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="下一张"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover/media:opacity-100 transition-all duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

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
