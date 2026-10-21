// ============================================================
// VideoControls - 放映厅视频播放控制条
// ------------------------------------------------------------
// 播放会话激活时出现在中央画面下方（半透明深色圆角条，与现有
// 按钮风格一致）。位于胶卷交互区内：鼠标移向控制条不会触发
// 自动滚动恢复。
// 动效规范：进入用 animate-fade-in（ease-out-strong）；
// hover scale ≤1.04、active 0.97；时间显示 tabular-nums 等宽。
// ============================================================
import { useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';

/** 控制条按钮通用样式（圆形半透明 + 克制悬停反馈）。
 *  触控目标：移动端 h-11 w-11 = 44px（拇指可命中下限），sm 起桌面 32px */
const CTRL_BUTTON_CLASS =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-content-muted transition-[transform,color] duration-160 ease-out-strong hover:scale-[1.04] hover:text-content active:scale-[0.97] sm:h-8 sm:w-8';

/** 控制条 props */
export interface VideoControlsProps {
  /** 视频实际播放中（false = 暂停观看） */
  playing: boolean;
  /** 是否静音 */
  muted: boolean;
  /** 当前播放位置（秒） */
  currentTime: number;
  /** 总时长（秒，metadata 加载前为 0 → 进度条禁用） */
  duration: number;
  /** 是否处于全屏 */
  isFullscreen: boolean;
  /** 播放/暂停切换 */
  onTogglePlay: () => void;
  /** 静音切换 */
  onToggleMute: () => void;
  /** 进度跳转（秒，拖动松手/键盘提交时触发） */
  onSeek: (time: number) => void;
  /** 全屏切换 */
  onToggleFullscreen: () => void;
}

/** 秒 → mm:ss（等宽数字由 font-mono + tabular-nums 保证） */
function formatTime(sec: number): string {
  const v = Number.isFinite(sec) && sec > 0 ? sec : 0;
  const m = Math.floor(v / 60);
  const s = Math.floor(v % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 视频播放控制条（HTML/CSS 实现，实际可用） */
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
  // 拖动中的本地值：拖动期间不被 timeupdate 回写打断（松手提交后清除）
  const [dragValue, setDragValue] = useState<number | null>(null);
  const display = dragValue ?? currentTime;
  const pct = duration > 0 ? Math.min(100, (display / duration) * 100) : 0;

  /** 提交拖动值（松手/失焦/键盘抬起） */
  const commitDrag = () => {
    if (dragValue != null) {
      onSeek(dragValue);
      setDragValue(null);
    }
  };

  // 范围输入的指针事件（触摸/笔均支持；释放隐式指针捕获避免拖动残留）
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
      {/* 播放/暂停切换 */}
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

      {/* 当前时间 */}
      <span className="w-11 text-right font-mono text-xs tabular-nums text-content-faint">
        {formatTime(display)}
      </span>

      {/* 进度条（可拖动 seek；拖动期间显示本地值）。移动端 flex-1 占满剩余空间防溢出 */}
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

      {/* 总时长 */}
      <span className="w-11 font-mono text-xs tabular-nums text-content-faint">
        {formatTime(duration)}
      </span>

      {/* 静音切换 */}
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

      {/* 全屏切换（胶卷区域容器，WebGL canvas 内的视频画面一并全屏） */}
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