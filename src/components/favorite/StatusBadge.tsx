import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  FAVORITE_STATUS_LABELS,
  ALL_FAVORITE_STATUSES,
} from '@/utils/constants';
import type { FavoriteStatus } from '@/types';

const statusStyles: Record<FavoriteStatus, { dot: string; badge: string }> = {
  wishlist: {
    dot: 'bg-info',
    badge: 'bg-info/10 text-info border-info/20',
  },
  trying: {
    dot: 'bg-warning',
    badge: 'bg-warning/10 text-warning border-warning/20',
  },
  frequent: {
    dot: 'bg-success',
    badge: 'bg-success/10 text-success border-success/20',
  },
  archived: {
    dot: 'bg-content-subtle',
    badge: 'bg-content-faint/10 text-content-subtle border-content-faint/20',
  },
};

interface StatusBadgeProps {
  status: FavoriteStatus;
  editable?: boolean;
  onChange?: (status: FavoriteStatus) => void;
  className?: string;
}

export function StatusBadge({
  status,
  editable = false,
  onChange,
  className,
}: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const style = statusStyles[status];

  const handleSelect = (next: FavoriteStatus) => {
    setOpen(false);
    if (next !== status) onChange?.(next);
  };

  if (!editable) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border',
          style.badge,
          className
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
        {FAVORITE_STATUS_LABELS[status]}
      </span>
    );
  }

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border transition-colors active:scale-95',
          style.badge,
          'hover:opacity-80 cursor-pointer'
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
        {FAVORITE_STATUS_LABELS[status]}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-20 min-w-[120px] py-1 rounded-lg bg-base-surface border border-border shadow-card-hover animate-scale-in"
          style={{ transformOrigin: 'top left' }}
        >
          {ALL_FAVORITE_STATUSES.map((s) => {
            const sStyle = statusStyles[s];
            const active = s === status;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className={cn(
                  'w-full flex items-center gap-2 px-2.5 py-1.5 text-xs transition-colors',
                  active
                    ? 'text-content bg-base-elevated'
                    : 'text-content-muted hover:text-content hover:bg-base-elevated/60'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', sStyle.dot)} />
                <span className="flex-1 text-left">
                  {FAVORITE_STATUS_LABELS[s]}
                </span>
                {active && <Check className="w-3 h-3 text-content" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
