import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  Palette,
  Gauge,
  Globe,
  Hash,
} from 'lucide-react';
import type {
  PrimaryCategory,
  VibeSubcategory,
  Difficulty,
  Language,
  TagDimensionKey,
} from '@/types';
import { cn } from '@/utils/cn';
import {
  ALL_VIBE_SUBCATEGORIES,
  ALL_DIFFICULTIES,
  VIBE_SUBCATEGORY_LABELS,

  FIRST_SCREEN_FILTER_DIMENSIONS,
  MORE_FILTER_DIMENSIONS,
  LANGUAGE_LABELS,
  getTagLabel,
  getTagDescription,
} from '@/utils/constants';
import { skills } from '@/data';
import { FilterChip, DimensionChips, useDimensionValueCounts } from './FilterChips';

export type SortBy = 'latest' | 'hot' | 'stars' | 'name';

export interface FilterState {
  primaryCategory: PrimaryCategory | null;
  vibeSubcategory: VibeSubcategory | null;
  tagFilters: Partial<Record<TagDimensionKey, string[]>>;
  difficulties: Difficulty[];
  languages: Language[];
  sortBy: SortBy;
}

export const DEFAULT_FILTER: FilterState = {
  primaryCategory: null,
  vibeSubcategory: null,
  tagFilters: {},
  difficulties: [],
  languages: [],
  sortBy: 'hot',
};

export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'hot', label: '最热' },
  { value: 'stars', label: '星标最多' },
  { value: 'latest', label: '最新' },
  { value: 'name', label: '名称' },
];

const LANGUAGE_OPTIONS: Language[] = ['zh', 'en', 'zh-en'];

interface SkillFilterProps {
  filter: FilterState;
  onChange: (filter: FilterState) => void;
  className?: string;
}

export const FIRST_SCREEN_TAG_DIMENSIONS = FIRST_SCREEN_FILTER_DIMENSIONS.filter(
  (d): d is TagDimensionKey => d !== 'primaryCategory'
);

const MORE_TAG_DIMENSIONS = MORE_FILTER_DIMENSIONS.filter(
  (d): d is TagDimensionKey => d !== 'vibeSubcategory'
);

const ALL_TAG_DIMENSIONS = [...FIRST_SCREEN_TAG_DIMENSIONS, ...MORE_TAG_DIMENSIONS];

interface SelectedChip {
  key: string;
  label: string;
  onRemove: () => void;
}

export function SkillFilter({ filter, onChange, className }: SkillFilterProps) {
  const valueCounts = useDimensionValueCounts();

  const vibeCounts = useMemo(() => {
    const counts = new Map<VibeSubcategory, number>();
    skills.forEach((s) => {
      if (s.primaryCategory !== 'vibe' || !s.vibeSubcategory) return;
      counts.set(s.vibeSubcategory, (counts.get(s.vibeSubcategory) || 0) + 1);
    });
    return counts;
  }, []);
  const vibeTotal = useMemo(
    () => [...vibeCounts.values()].reduce((sum, n) => sum + n, 0),
    [vibeCounts]
  );

  const [moreOpen, setMoreOpen] = useState(false);
  const [moreMounted, setMoreMounted] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);

  useEffect(() => {
    if (moreOpen) {
      setMoreMounted(true);
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setMoreVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    setMoreVisible(false);
    const t = setTimeout(() => setMoreMounted(false), 180);
    return () => clearTimeout(t);
  }, [moreOpen]);

  const setVibeSubcategory = (vibeSubcategory: VibeSubcategory | null) => {
    onChange({ ...filter, vibeSubcategory });
  };

  const toggleTagValue = (dimension: TagDimensionKey, value: string) => {
    const current = filter.tagFilters[dimension] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const tagFilters = { ...filter.tagFilters };
    if (next.length === 0) {
      delete tagFilters[dimension];
    } else {
      tagFilters[dimension] = next;
    }
    onChange({ ...filter, tagFilters });
  };

  const clearDimension = (dimension: TagDimensionKey) => {
    if (!filter.tagFilters[dimension]) return;
    const tagFilters = { ...filter.tagFilters };
    delete tagFilters[dimension];
    onChange({ ...filter, tagFilters });
  };

  const toggleDifficulty = (d: Difficulty) => {
    const difficulties = filter.difficulties.includes(d)
      ? filter.difficulties.filter((x) => x !== d)
      : [...filter.difficulties, d];
    onChange({ ...filter, difficulties });
  };

  const toggleLanguage = (l: Language) => {
    const languages = filter.languages.includes(l)
      ? filter.languages.filter((x) => x !== l)
      : [...filter.languages, l];
    onChange({ ...filter, languages });
  };

  const clearAll = () => {
    onChange({
      ...DEFAULT_FILTER,
      primaryCategory: filter.primaryCategory,
      sortBy: filter.sortBy,
    });
  };

  const selectedTagCount = Object.values(filter.tagFilters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0
  );

  const activeCount =
    (filter.vibeSubcategory ? 1 : 0) + selectedTagCount + filter.difficulties.length + filter.languages.length;

  const selectedChips: SelectedChip[] = useMemo(() => {
    const chips: SelectedChip[] = [];
    for (const [dim, values] of Object.entries(filter.tagFilters)) {
      for (const value of values ?? []) {
        const dimension = dim as TagDimensionKey;
        chips.push({
          key: `tag-${dim}-${value}`,
          label: getTagLabel(dimension, value),
          onRemove: () => toggleTagValue(dimension, value),
        });
      }
    }
    if (filter.vibeSubcategory) {
      chips.push({
        key: 'vibe-sub',
        label: VIBE_SUBCATEGORY_LABELS[filter.vibeSubcategory],
        onRemove: () => setVibeSubcategory(null),
      });
    }
    filter.difficulties.forEach((d) => {
      chips.push({
        key: `difficulty-${d}`,
        label: d,
        onRemove: () => toggleDifficulty(d),
      });
    });
    filter.languages.forEach((l) => {
      chips.push({
        key: `language-${l}`,
        label: LANGUAGE_LABELS[l],
        onRemove: () => toggleLanguage(l),
      });
    });
    return chips;
  }, [filter]);

  const renderChipRow = (
    label: string,
    icon: React.ReactNode,
    children: React.ReactNode
  ) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-content-faint">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer',
            'transition-[color,background-color,transform] duration-[160ms] ease-out-strong active:scale-[0.97]',
            moreOpen || activeCount > 0
              ? 'bg-white/[0.08] text-content'
              : 'text-content-muted hover:text-content hover:bg-white/[0.05]'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>筛选</span>
          {activeCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.08] text-content">
              {activeCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-[160ms] ease-out-strong',
              moreOpen && 'rotate-180'
            )}
          />
        </button>

        {selectedChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                title="点击移除该筛选"
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs cursor-pointer',
                  'bg-white/[0.06] text-content-muted',
                  'transition-[color,background-color,transform] duration-[160ms] ease-out-strong active:scale-[0.97] hover:bg-white/[0.1]'
                )}
              >
                {chip.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs text-content-faint hover:text-error transition-colors cursor-pointer ml-1"
            >
              <Trash2 className="w-3 h-3" />
              清除全部
            </button>
          </div>
        )}
      </div>

      {moreMounted && (
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity,transform,visibility] ease-out-strong',
            moreVisible ? 'grid-rows-[1fr] opacity-100 translate-y-0 visible' : 'grid-rows-[0fr] opacity-0 -translate-y-1 invisible'
          )}
          style={{ transitionDuration: moreVisible ? '250ms' : '180ms' }}
          aria-hidden={!moreVisible}
        >
          <div className="overflow-hidden">
            <div className="p-4 md:p-5 bg-base-card border border-border rounded-xl grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {filter.primaryCategory === 'vibe' && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <div className="flex items-center gap-1.5 text-xs text-content-faint">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Vibe 细分</span>
                    <span className="text-content-faint/70">（仅 Vibe 知识大赏大类）</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip active={filter.vibeSubcategory === null} onClick={() => setVibeSubcategory(null)}>
                      <span>全部</span>
                      <span className="text-[10px] opacity-60">{vibeTotal}</span>
                    </FilterChip>
                    {ALL_VIBE_SUBCATEGORIES.map((sc) => {
                      const count = vibeCounts.get(sc) ?? 0;
                      if (count === 0 && filter.vibeSubcategory !== sc) return null;
                      return (
                        <FilterChip
                          key={sc}
                          active={filter.vibeSubcategory === sc}
                          onClick={() => setVibeSubcategory(filter.vibeSubcategory === sc ? null : sc)}
                          title={getTagDescription('vibeSubcategory', sc)}
                        >
                          <span>{VIBE_SUBCATEGORY_LABELS[sc]}</span>
                          {count > 0 && <span className="text-[10px] opacity-60">{count}</span>}
                        </FilterChip>
                      );
                    })}
                  </div>
                </div>
              )}

              {ALL_TAG_DIMENSIONS.map((dimension) => (
                <DimensionChips
                  key={dimension}
                  dimension={dimension}
                  selected={filter.tagFilters[dimension] ?? []}
                  onToggle={toggleTagValue}
                  onClear={clearDimension}
                  valueCounts={valueCounts}
                />
              ))}

              {renderChipRow(
                '难度',
                <Gauge className="w-3.5 h-3.5" />,
                ALL_DIFFICULTIES.map((d) => (
                  <FilterChip key={d} active={filter.difficulties.includes(d)} onClick={() => toggleDifficulty(d)}>
                    {d}
                  </FilterChip>
                ))
              )}

              {renderChipRow(
                '语言',
                <Globe className="w-3.5 h-3.5" />,
                LANGUAGE_OPTIONS.map((l) => (
                  <FilterChip key={l} active={filter.languages.includes(l)} onClick={() => toggleLanguage(l)}>
                    {LANGUAGE_LABELS[l]}
                  </FilterChip>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {FIRST_SCREEN_TAG_DIMENSIONS.length === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-content-faint">
          <Hash className="w-3.5 h-3.5" />
          暂无筛选项
        </div>
      )}
    </div>
  );
}
