import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

export function GalleryMedia({ media, paused, fallback }: {
  media: string[];
  paused: boolean;
  fallback: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [ratio, setRatio] = useState(16 / 10);
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orderedMedia = useMemo(
    () => [...media].sort((a, b) => {
      const aIsVideo = /\.(mp4|webm|mov)(?:[?#]|$)/i.test(a) ? 1 : 0;
      const bIsVideo = /\.(mp4|webm|mov)(?:[?#]|$)/i.test(b) ? 1 : 0;
      return aIsVideo - bIsVideo;
    }),
    [media]
  );
  const url = orderedMedia[index];
  const video = !!url && /\.(mp4|webm|mov)(?:[?#]|$)/i.test(url);
  const animatedImage = !!url && /\.(gif|webp)(?:[?#]|$)/i.test(url);
  const poster = orderedMedia.find((item) => /\.(png|jpe?g|webp)(?:[?#]|$)/i.test(item));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '160px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    if (visible && !paused) void player.play().catch(() => {});
    else player.pause();
  }, [paused, visible, url, ready]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!paused || !ready || !animatedImage || !image || !canvas) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext('2d')?.drawImage(image, 0, 0);
  }, [paused, ready, animatedImage, url]);

  const failed = () => {
    setReady(false);
    setIndex((current) => current + 1);
  };

  return (
    <div ref={containerRef} className="gallery-media" style={{ aspectRatio: ratio }}>
      <div className={cn('absolute inset-0 transition-opacity duration-150', ready && 'opacity-0')}>
        {fallback}
      </div>
      {url && (
        <>
          {!ready && <div className="absolute inset-0 gallery-media-loading" aria-hidden="true" />}
          {video ? (
            <video
              ref={videoRef}
              src={visible ? url : undefined}
              poster={poster}
              className={cn('absolute inset-0 h-full w-full object-contain', !ready && !poster && 'opacity-0')}
              muted loop playsInline preload="metadata"
              onLoadedMetadata={(event) => {
                const player = event.currentTarget;
                if (player.videoWidth && player.videoHeight) setRatio(player.videoWidth / player.videoHeight);
              }}
              onLoadedData={() => setReady(true)}
              onError={failed}
            />
          ) : (
            <>
              <img
                ref={imageRef} src={url} alt="" loading="lazy" decoding="async" draggable={false}
                className={cn('absolute inset-0 h-full w-full object-contain', !ready && 'opacity-0')}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight);
                  setReady(true);
                }}
                onError={failed}
              />
              {animatedImage && <canvas ref={canvasRef} className={cn('absolute inset-0 h-full w-full object-contain', !(paused && ready) && 'hidden')} />}
            </>
          )}
        </>
      )}
    </div>
  );
}
