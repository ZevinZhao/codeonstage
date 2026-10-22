import { useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';

const CTRL_BUTTON_CLASS =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-content-muted transition-[transform,color] duration-160 ease-out-strong hover:scale-[1.04] hover:text-content active:scale-[0.97] sm:h-8 sm:w-8';

export interface VideoControlsProps {
  playing: boolean;
  muted: boolean;
  currentTime: number;
  duration: number;
  isFullscreen: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSeek: (time: number) => void;
  onToggleFullscreen: () => void;
}

function formatTime(sec: number): string {
  const v = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(v / 60);
  const s = Math.floor(v % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function VideoControls({
  playing,
  muted,
  currentTime,
  duration,
  isFullscreen,
  onTogglePlay,
  onToggleMute,
  onSeek,
  onToggleFullscreen,
}: VideoControlsProps) {
  const [dragValue, setDragValue] = useState<number | null>(null);
  const display = dragValue ?? currentTime;
  const pct = duration > 0 ? Math.min(100, (display / duration) * 100) : 0;

  const commitDrag = () => {
    if (dragValue != null) {
      onSeek(dragValue);
      setDragValue(null);
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLInputElement>) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    commitDrag();
  };

  return (
    <div
      role="group"
      aria-label="视频播放控制"
      data-testid="reel-controls"
      className="animate-fade-in absolute bottom-7 left-1/2 z-20 flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/55 px-2 backdrop-blur-md sm:gap-3 sm:px-4"
    >
      <button
        type="button"
        data-testid="reel-toggle"
        onClick={onTogglePlay}
        aria-label={playing ? '暂停' : '播放'}
        className={CTRL_BUTTON_CLASS}
      >
        {playing ? (
          <Pause className="h-4 w-4 fill-current" strokeWidth={1.5} />
        ) : (
          <Play className="h-4 w-4 translate-x-[1px] fill-current" strokeWidth={1.5} />
        )}
      </button>

      <span className="w-11 text-right font-mono text-xs tabular-nums text-content-faint">
        {formatTime(display)}
      </span>

      <input
        type="range"
        data-testid="reel-seek"
        aria-label="播放进度"
        className="reel-range min-w-0 flex-1 sm:w-56 sm:flex-none"
        min={0}
        max={duration > 0 ? duration : 1}
        step={0.1}
        value={display}
        disabled={duration <= 0}
        style={{ '--progress': `${pct}%` } as CSSProperties}
        onChange={(e) => setDragValue(Number(e.currentTarget.value))}
        onPointerUp={handlePointerUp}
        onKeyUp={commitDrag}
        onBlur={commitDrag}
      />

      <span className="w-11 font-mono text-xs tabular-nums text-content-faint">
        {formatTime(duration)}
      </span>

      <button
        type="button"
        data-testid="reel-mute"
        onClick={onToggleMute}
        aria-label={muted ? '取消静音' : '静音'}
        aria-pressed={muted}
        className={CTRL_BUTTON_CLASS}
      >
        {muted ? (
          <VolumeX className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Volume2 className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>

      <button
        type="button"
        data-testid="reel-fullscreen"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? '退出全屏' : '全屏'}
        className={CTRL_BUTTON_CLASS}
      >
        {isFullscreen ? (
          <Minimize className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Maximize className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}
