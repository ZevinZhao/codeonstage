

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';


interface SelectOption {
  value: string;
  label: string;
}


interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  fullWidth?: boolean;
}


export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, fullWidth = true, className, ...props }, ref) => {
    return (
      <div className={cn('relative inline-flex', fullWidth && 'w-full')}>
        <select
          ref={ref}
          className={cn(
            'w-full bg-base-elevated border border-border rounded-lg text-content',
            'px-3.5 py-2 pr-9 text-sm appearance-none cursor-pointer',
            'focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-colors',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-base-surface">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-subtle pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';
