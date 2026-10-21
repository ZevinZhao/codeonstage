// ============================================================
// Tabs 组件 - 标签页切换
// ============================================================
import { type ReactNode, useState } from 'react';
import { cn } from '@/utils/cn';

/** Tab 项 */
interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
}

/** Tabs Props */
interface TabsProps {
  items: TabItem[];
  active?: string;
  onChange?: (key: string) => void;
  className?: string;
}

/** Tabs 组件 */
export function Tabs({ items, active, onChange, className }: TabsProps) {
  const [internalActive, setInternalActive] = useState(items[0]?.key ?? '');
  const current = active ?? internalActive;

  const handleChange = (key: string) => {
    if (onChange) {
      onChange(key);
    } else {
      setInternalActive(key);
    }
  };

  return (
    <div className={cn('flex items-center gap-1 border-b border-border', className)}>
      {items.map((item) => {
        const isActive = current === item.key;
        return (
          <button
            key={item.key}
            onClick={() => handleChange(item.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'text-content'
                : 'text-content-subtle hover:text-content-muted'
            )}
          >
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-md',
                    isActive
                      ? 'bg-white/[0.08] text-content'
                      : 'bg-base-elevated text-content-subtle'
                  )}
                >
                  {item.count}
                </span>
              )}
            </span>
            {/* 激活下划线 */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-content/70 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}