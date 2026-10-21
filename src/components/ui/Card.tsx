// ============================================================
// Card 组件 - 卡片容器
// ============================================================
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Card Props */
interface CardProps {
  children: ReactNode;
  /** 是否可点击（hover 效果） */
  interactive?: boolean;
  /** 内边距 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

/** 内边距映射 */
const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

/** Card 组件 */
export function Card({ children, interactive, padding = 'md', className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-base-card border border-border rounded-xl',
        'shadow-card',
        paddingStyles[padding],
        interactive &&
          'cursor-pointer hover:border-border-strong hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98] transition-[transform,border-color,box-shadow] duration-200 ease-out-strong',
        className
      )}
    >
      {children}
    </div>
  );
}