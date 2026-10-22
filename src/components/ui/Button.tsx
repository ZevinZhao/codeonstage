

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';


type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';


type Size = 'sm' | 'md' | 'lg';


interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}


const variantStyles: Record<Variant, string> = {

  primary:
    'bg-content text-[#0a0a0a] hover:bg-white disabled:hover:bg-content',
  secondary:
    'bg-base-elevated text-content border border-border hover:border-border-strong hover:bg-base-card',
  ghost:
    'bg-transparent text-content-muted hover:text-content hover:bg-base-elevated',
  danger:
    'bg-error/10 text-error border border-error/20 hover:bg-error/20',
  outline:
    'bg-transparent text-content border border-border hover:border-border-strong hover:bg-white/[0.04]',
};


const sizeStyles: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
};


export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium select-none',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',

          'transition-[transform,opacity,background-color,border-color,color] duration-[160ms] ease-out-strong active:scale-[0.97]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
