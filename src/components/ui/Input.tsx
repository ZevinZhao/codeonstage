

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';


interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  error?: boolean;
  fullWidth?: boolean;
}


export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, error, fullWidth = true, className, ...props }, ref) => {
    return (
      <div className={cn('relative inline-flex', fullWidth && 'w-full')}>
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full bg-base-elevated border rounded-lg text-content placeholder:text-content-faint',
            'px-3.5 py-2 text-sm',
            'focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-colors',
            icon && 'pl-10',
            error
              ? 'border-error/50 focus:border-error focus:ring-error/30'
              : 'border-border',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
