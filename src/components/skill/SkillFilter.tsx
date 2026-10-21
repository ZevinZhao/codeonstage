// ============================================================
// SkillFilter - 筛选区（新分类体系，全宽顶部布局）
// 首屏筛选：资源形态 / 画风 / 制作功能
//            （大类由 CategoryNav 横排导航承担，共同构成首屏四项筛选）
// 更多筛选折叠面板：Vibe 二级分类（仅选中"Vibe 知识大赏"大类时显示）
//   + 声音形式 / 输入方式 / 实现技术 / 使用平台 / 模型 + 难度 / 语言
// 动效：面板使用 mounted+visible 双状态（双 rAF 进入过渡），
//   grid-rows 高度过渡 + opacity，进入 250ms / 退出 180ms ease-out-strong
// ============================================================
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

/** 排序方式 */
export type SortBy = 'latest' | 'hot' | 'stars' | 'name';

/** 筛选状态（保持与 SkillListPage 联动的结构） */
export interface FilterState {
  /** 一级大类（单选，null 表示全部；由 CategoryNav 驱动） */
  primaryCategory: PrimaryCategory | null;
  /** Vibe 二级分类（单选，null 表示全部；仅 vibe 大类资源受影响） */
  vibeSubcategory: VibeSubcategory | null;
  /** 标签维度多选（维度内 OR，维度间 AND） */
  tagFilters: Partial<Record<TagDimensionKey, string[]>>;
  /** 难度（多选） */
  difficulties: Difficulty[];
  /** 语言（多选） */
  languages: Language[];
  /** 排序方式 */
  sortBy: SortBy;
}

/** 默认筛选状态 */
export const DEFAULT_FILTER: FilterState = {
  primaryCategory: null,
  vibeSubcategory: null,
  tagFilters: {},
  difficulties: [],
  languages: [],
  sortBy: 'hot',
};


/** 排序选项（供 SkillListPage 工具栏使用） */
export const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'hot', label: '最热' },
  { value: 'stars', label: 'Stars 最多' },
  { value: 'latest', label: '最新' },
  { value: 'name', label: '名称' },
];

/** 语言选项 */
const LANGUAGE_OPTIONS: Language[] = ['zh', 'en', 'zh-en'];

/** SkillFilter Props */
interface SkillFilterProps {
  /** 当前筛选状态 */
  filter: FilterState;
  /** 筛选状态变更回调 */
  onChange: (filter: FilterState) => void;
  /** 自定义类名 */
  className?: string;
}

/** 首屏标签维度：资源形态 / 画风 / 制作功能（首页与列表页共用） */
export const FIRST_SCREEN_TAG_DIMENSIONS = FIRST_SCREEN_FILTER_DIMENSIONS.filter(
  (d): d is TagDimensionKey => d !== 'primaryCategory'
);

/** 更多筛选中的标签维度（vibeSubcategory 单独渲染为单选区块） */
const MORE_TAG_DIMENSIONS = MORE_FILTER_DIMENSIONS.filter(
  (d): d is TagDimensionKey => d !== 'vibeSubcategory'
);

/** 面板内渲染的全部标签维度（原首屏三维度 + 更多维度，统一收入筛选面板） */
const ALL_TAG_DIMENSIONS = [...FIRST_SCREEN_TAG_DIMENSIONS, ...MORE_TAG_DIMENSIONS];

/** 已选回显条中的单个 chip */
interface SelectedChip {
  /** 唯一 key */
  key: string;
  /** 展示标签 */
  label: string;
  /** 移除回调 */
  onRemove: () => void;
}

/** SkillFilter 组件 */
export function SkillFilter({ filter, onChange, className }: SkillFilterProps) {
  const valueCounts = useDimensionValueCounts();

  // Vibe 二级分类计数（仅统计 vibe 大类资源）
  const vibeCounts = useMemo(() => {
    const counts = new Map<VibeSubcategory, number>();
    skills.forEach((s) => {
      if (s.primaryCategory !== 'vibe' || !s.vibeSubcategory) return;
      counts.set(s.vibeSubcategory, (counts.get(s.vibeSubcategory) || 0) + 1);
    });
    return counts;
  }, []);
  // vibe 大类资源总数（各二级之和，避免渲染期重复全量过滤）
  const vibeTotal = useMemo(
    () => [...vibeCounts.values()].reduce((sum, n) => sum + n, 0),
    [vibeCounts]
  );

  // ------------------ 更多筛选面板：双状态折叠动画 ------------------
  const [moreOpen, setMoreOpen] = useState(false);
  /** mounted：渲染中（含退出动画期间）；visible：展开态 */
  const [moreMounted, setMoreMounted] = useState(false);
  const [moreVisible, setMoreVisible] = useState(false);

  useEffect(() => {
    if (moreOpen) {
      setMoreMounted(true);
      // 双 rAF：先渲染收起态，再切换展开态以触发进入过渡
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setMoreVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    setMoreVisible(false);
    // 退出快于进入：180ms 后卸载面板
    const t = setTimeout(() => setMoreMounted(false), 180);
    return () => clearTimeout(t);
  }, [moreOpen]);

  // ------------------ 筛选操作 ------------------

  /** 更新 Vibe 二级分类（单选，再次点击取消） */
  const setVibeSubcategory = (vibeSubcategory: VibeSubcategory | null) => {
    onChange({ ...filter, vibeSubcategory });
  };

  /** 切换某个标签维度的取值 */
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

  /** 清除单个维度的全部选中 */
  const clearDimension = (dimension: TagDimensionKey) => {
    if (!filter.tagFilters[dimension]) return;
    const tagFilters = { ...filter.tagFilters };
    delete tagFilters[dimension];
    onChange({ ...filter, tagFilters });
  };

  /** 切换难度 */
  const toggleDifficulty = (d: Difficulty) => {
    const difficulties = filter.difficulties.includes(d)
      ? filter.difficulties.filter((x) => x !== d)
      : [...filter.difficulties, d];
    onChange({ ...filter, difficulties });
  };

  /** 切换语言 */
  const toggleLanguage = (l: Language) => {
    const languages = filter.languages.includes(l)
      ? filter.languages.filter((x) => x !== l)
      : [...filter.languages, l];
    onChange({ ...filter, languages });
  };

  /** 清除筛选区全部已选（保留大类与排序：大类由 CategoryNav 管理） */
  const clearAll = () => {
    onChange({
      ...DEFAULT_FILTER,
      primaryCategory: filter.primaryCategory,
      sortBy: filter.sortBy,
    });
  };

  // ------------------ 计数与回显 ------------------

  /** 当前选中的标签值总数 */
  const selectedTagCount = Object.values(filter.tagFilters).reduce(
    (sum, values) => sum + (values?.length ?? 0),
    0
  );


  /** 筛选区内激活的筛选条件总数（不含大类） */
  const activeCount =
    (filter.vibeSubcategory ? 1 : 0) + selectedTagCount + filter.difficulties.length + filter.languages.length;

  /** 已选回显 chips：标签 + Vibe 二级 + 难度 + 语言 */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  /** 渲染更多面板中的胶囊行（难度 / 语言等非标签维度） */
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
      {/* 顶部：筛选按钮 + 已选回显（紧凑入口，详细条件收进面板） */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer',
            'transition-[color,background-color,transform] duration-[160ms] ease-out-strong active:scale-[0.97]',
            moreOpen || activeCount > 0
              ? 'bg-accent-500/15 text-accent-300'
              : 'text-content-muted hover:text-content hover:bg-white/[0.05]'
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>筛选</span>
          {activeCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent-500/20 text-accent-200">
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

        {/* 已选条件回显：单项移除 + 全部清除 */}
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

      {/* ============================================================ */}
      {/* 筛选面板：mounted+visible 双状态，grid-rows 高度过渡 */}
      {/* 进入 250ms / 退出 180ms，均使用 ease-out-strong */}
      {/* ============================================================ */}
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
              {/* Vibe 二级分类：仅选中"Vibe 知识大赏"大类时显示并可用 */}
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

              {/* 全部标签维度：资源形态 / 画风 / 制作功能 / 声音形式 / 输入方式 / 实现技术 / 使用平台 / 模型 */}
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

              {/* 难度 */}
              {renderChipRow(
                '难度',
                <Gauge className="w-3.5 h-3.5" />,
                ALL_DIFFICULTIES.map((d) => (
                  <FilterChip key={d} active={filter.difficulties.includes(d)} onClick={() => toggleDifficulty(d)}>
                    {d}
                  </FilterChip>
                ))
              )}

              {/* 语言 */}
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

      {/* 首屏维度为空时的提示（数据缺失兜底） */}
      {FIRST_SCREEN_TAG_DIMENSIONS.length === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-content-faint">
          <Hash className="w-3.5 h-3.5" />
          暂无筛选项
        </div>
      )}
    </div>
  );
}