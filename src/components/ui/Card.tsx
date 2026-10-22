

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';


interface CardProps {
  children: ReactNode;

  interactive?: boolean;

  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}


const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};


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
