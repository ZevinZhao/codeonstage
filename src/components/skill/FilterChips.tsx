import { useMemo, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { skills } from '@/data';
import { TAG_DIMENSIONS_META, getTagLabel } from '@/utils/constants';
import type { TagDimensionKey } from '@/types';

export function useDimensionValueCounts(): Map<string, number> {
  return useMemo(() => {
    const counter = new Map<string, number>();
    skills.forEach((s) => {
      for (const dim of TAG_DIMENSIONS_META) {
        const values = s.tags[dim.key] as readonly string[] | undefined;
        values?.forEach((v) => {
          const key = `${dim.key}:${v}`;
          counter.set(key, (counter.get(key) || 0) + 1);
        });
      }
    });
    return counter;
  }, []);
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
  className?: string;
}

export function FilterChip({ active, onClick, children, title, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs whitespace-nowrap cursor-pointer',
        'transition-[color,background-color,border-color,transform] duration-[160ms] ease-out-strong active:scale-[0.97]',
        active
          ? 'bg-white/[0.08] text-content font-medium'
          : 'text-content-subtle hover:text-content hover:bg-white/[0.05]',
        className
      )}
    >
      {children}
    </button>
  );
}

interface DimensionChipsProps {
  dimension: TagDimensionKey;
  selected: string[];
  onToggle: (dimension: TagDimensionKey, value: string) => void;
  valueCounts?: Map<string, number>;
  onClear?: (dimension: TagDimensionKey) => void;
  className?: string;
}

export function DimensionChips({
  dimension,
  selected,
  onToggle,
  valueCounts,
  onClear,
  className,
}: DimensionChipsProps) {
  const meta = TAG_DIMENSIONS_META.find((d) => d.key === dimension);
  if (!meta) return null;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-content-faint">{meta.label}</span>
        {selected.length > 0 && onClear && (
          <button
            type="button"
            onClick={() => onClear(dimension)}
            className="text-[11px] text-content-faint hover:text-error transition-colors cursor-pointer"
          >
            清除
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {meta.values.map((value) => {
          const active = selected.includes(value);
          const count = valueCounts?.get(`${dimension}:${value}`) ?? -1;
          if (count === 0 && !active) return null;
          return (
            <FilterChip
              key={value}
              active={active}
              onClick={() => onToggle(dimension, value)}
            >
              <span>{getTagLabel(dimension, value)}</span>
              {count > 0 && <span className="text-[10px] opacity-60">{count}</span>}
            </FilterChip>
          );
        })}
      </div>
    </div>
  );
}
