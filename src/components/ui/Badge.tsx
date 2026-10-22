

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';


interface BadgeProps {
  children: ReactNode;

  color?: string;

  bordered?: boolean;

  size?: 'sm' | 'md';
  className?: string;

  onClick?: () => void;
}


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
