// ============================================================
// Badge 组件 - 标签徽章
// ============================================================
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Badge Props */
interface BadgeProps {
  children: ReactNode;
  /** 自定义颜色类名（Tailwind） */
  color?: string;
  /** 是否带边框 */
  bordered?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md';
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
}

/** Badge 组件 */
export function Badge({ children, color, bordered = true, size = 'sm', className, onClick }: BadgeProps) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center font-medium rounded-md',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        bordered && 'border',
        color || 'bg-base-elevated text-content-muted border-border',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
    >
      {children}
    </span>
  );
}