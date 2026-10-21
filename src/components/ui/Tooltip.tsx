// ============================================================
// Tooltip 组件 - 提示气泡
// - 动效规范（emil-design-eng）：
//   1. transform-origin 朝向触发器（origin 感知的缩放）
//   2. 首次延迟 400ms 防误触；一旦有 tooltip 打开过，
//      短时间内的后续 tooltip 立即显示（感知性能：整排工具栏显得更快）
//   3. 125ms 强 ease-out，从 scale(0.97) + opacity:0 起步
//   4. 始终挂载 + transition 驱动（进退场对称、可中断）
// ============================================================
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';

/** Tooltip Props */
interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/** 位置样式：transform-origin 朝向触发器 */
const positionStyles = {
  top: { cls: 'bottom-full left-1/2 -translate-x-1/2 mb-2', origin: 'center bottom' },
  bottom: { cls: 'top-full left-1/2 -translate-x-1/2 mt-2', origin: 'center top' },
  left: { cls: 'right-full top-1/2 -translate-y-1/2 mr-2', origin: 'right center' },
  right: { cls: 'left-full top-1/2 -translate-y-1/2 ml-2', origin: 'left center' },
};

/** 首个提示延迟（ms） */
const OPEN_DELAY = 400;
/** 此前刚显示过 tooltip 的时间窗口（窗口内后续 tooltip 免延迟免动画） */
const INSTANT_WINDOW = 600;

/** 模块级标记：最近是否有 tooltip 显示过（跨实例共享） */
let lastShownAt = 0;

/** Tooltip 组件 */
export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const openTimer = useRef<number>(0);
  const pos = positionStyles[position];

  // 卸载时清理定时器
  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const handleEnter = () => {
    window.clearTimeout(openTimer.current);
    const recentlyShown = Date.now() - lastShownAt < INSTANT_WINDOW;
    if (recentlyShown) {
      // 后续 tooltip：立即显示（跳过延迟与入场动画）
      setVisible(true);
      lastShownAt = Date.now();
      return;
    }
    openTimer.current = window.setTimeout(() => {
      setVisible(true);
      lastShownAt = Date.now();
    }, OPEN_DELAY);
  };

  const handleLeave = () => {
    window.clearTimeout(openTimer.current);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {/* 始终挂载：由 transition 控制显隐（进退场对称、可中断） */}
      <div
        className={cn(
          'absolute z-50 px-2.5 py-1.5 text-xs text-content whitespace-nowrap',
          'bg-base-elevated border border-border rounded-lg shadow-card',
          'pointer-events-none',
          'transition-[transform,opacity] duration-[125ms] ease-out-strong',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]',
          pos.cls,
          className
        )}
        style={{ transformOrigin: pos.origin }}
        role="tooltip"
      >
        {content}
      </div>
    </div>
  );
}