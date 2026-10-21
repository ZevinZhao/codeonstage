// ============================================================
// FilterChips - 筛选胶囊组件（共享）
// - FilterChip：单个筛选胶囊（选中态 + 按压反馈，emil 规范）
// - DimensionChips：单个标签维度的多选胶囊组（资源形态/画风/制作功能等）
// - useDimensionValueCounts：全量数据中各维度取值的出现次数
// 供 SkillFilter（列表页）与 HomePage（首页筛选条）复用。
// ============================================================
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { skills } from '@/data';
import { TAG_DIMENSIONS_META, getTagLabel } from '@/utils/constants';
import type { TagDimensionKey } from '@/types';

/** 计算某个维度取值在数据中出现的次数（key 为 `${dimension}:${value}`） */
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

/** FilterChip Props */
interface FilterChipProps {
  /** 是否选中 */
  active: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 内容 */
  children: ReactNode;
  /** 悬停提示（取值描述） */
  title?: string;
  /** 自定义类名 */
  className?: string;
}

/** 单个筛选胶囊：统一选中态与按压反馈（active:scale-[0.97] + 160ms ease-out-strong） */
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
          ? 'bg-accent-500/15 text-accent-300 font-medium'
          : 'text-content-subtle hover:text-content hover:bg-white/[0.05]',
        className
      )}
    >
      {children}
    </button>
  );
}

/** DimensionChips Props */
interface DimensionChipsProps {
  /** 标签维度 key */
  dimension: TagDimensionKey;
  /** 该维度当前选中的取值 */
  selected: string[];
  /** 切换取值回调 */
  onToggle: (dimension: TagDimensionKey, value: string) => void;
  /** 取值计数（不传则不显示计数；计数为 0 且未选中的取值会被隐藏） */
  valueCounts?: Map<string, number>;
  /** 清除该维度全部选中的回调（不传则不显示清除按钮） */
  onClear?: (dimension: TagDimensionKey) => void;
  /** 自定义类名 */
  className?: string;
}

/** 单个标签维度的多选胶囊组：维度名 + 取值胶囊 + 维度级清除 */
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
          // 计数为 0 且未选中的取值不展示，避免无效筛选
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