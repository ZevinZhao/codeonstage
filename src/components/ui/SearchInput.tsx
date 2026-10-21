// ============================================================
// SearchInput 组件 - 搜索输入框带图标
// ============================================================
import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

/** SearchInput Props */
interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  fullWidth?: boolean;
}

/** SearchInput 组件 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, fullWidth = true, value, className, ...props }, ref) => {
    const hasValue = typeof value === 'string' && value.length > 0;
    return (
      <div className={cn('relative inline-flex', fullWidth && 'w-full')}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-subtle pointer-events-none" />
        <input
          ref={ref}
          type="text"
          value={value}
          className={cn(
            'w-full bg-base-elevated border border-border rounded-lg text-content placeholder:text-content-faint',
            'pl-10 pr-9 py-2 text-sm',
            'focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-colors',
            className
          )}
          {...props}
        />
        {hasValue && onClear && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-content-subtle hover:text-content transition-colors"
            aria-label="清除"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';