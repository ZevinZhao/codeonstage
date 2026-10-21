// ============================================================
// Textarea 组件 - 多行输入
// ============================================================
import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** Textarea Props */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/** Textarea 组件 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full bg-base-elevated border rounded-lg text-content placeholder:text-content-faint',
          'px-3.5 py-2.5 text-sm resize-y min-h-[80px]',
          'focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-colors',
          error
            ? 'border-error/50 focus:border-error focus:ring-error/30'
            : 'border-border',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';