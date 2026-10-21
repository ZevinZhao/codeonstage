// ============================================================
// Skill 列表页 - 浏览、搜索、筛选所有 Skill
// 布局：顶部筛选区（CategoryNav 大类 + SkillFilter 首屏三维度/更多筛选面板）
//       + 工具栏（结果数 / 排序 / 视图切换）
//       + 分页卡片流（每页 24 张 + 加载更多，避免 800 条全量渲染）
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Compass,
  Grid3x3,
  List as ListIcon,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { skills } from '@/data';
import { cn } from '@/utils/cn';
import { SkillCard } from '@/components/skill/SkillCard';
import {
  SkillFilter,
  DEFAULT_FILTER,
  SORT_OPTIONS,
  type FilterState,
  type SortBy,
} from '@/components/skill/SkillFilter';
import { SkillSearch, searchSkills } from '@/components/skill/SkillSearch';
import { CategoryNav } from '@/components/skill/CategoryNav';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import type { PrimaryCategory, TagDimensionKey } from '@/types';

/** 每页数量（加载更多每次追加的数量） */
const PAGE_SIZE = 24;

/** SkillListPage */
export function SkillListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // 从 URL query 参数初始化
  const initialCategory = searchParams.get('primaryCategory') as PrimaryCategory | null;
  const initialSearch = searchParams.get('search') ?? '';
  const initialSort = (searchParams.get('sort') as SortBy | null) ?? 'hot';
  const initialFeatured = searchParams.get('featured') === 'true';

  // 筛选状态
  const [filter, setFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    primaryCategory: initialCategory,
    sortBy: initialSort,
  });

  // 搜索词（已防抖）
  const [searchKeyword, setSearchKeyword] = useState(initialSearch);

  // 视图模式：网格 / 列表
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 已加载页数（加载更多时递增，筛选变更时归零）
  const [page, setPage] = useState(1);

  // 同步 URL 参数变化（如从首页跳转过来）
  useEffect(() => {
    const cat = searchParams.get('primaryCategory') as PrimaryCategory | null;
    const sort = (searchParams.get('sort') as SortBy | null) ?? 'hot';
    const search = searchParams.get('search') ?? '';
    setFilter((prev) => ({ ...prev, primaryCategory: cat, sortBy: sort }));
    setSearchKeyword(search);
    setPage(1);
  }, [searchParams]);

  // 筛选 + 搜索 + 排序后的结果（维度内 OR、维度间 AND）
  const filteredSkills = useMemo(() => {
    let result = [...skills];

    // 1. 搜索过滤
    result = searchSkills(result, searchKeyword);

    // 2. 一级大类过滤（单选）
    if (filter.primaryCategory) {
      result = result.filter((s) => s.primaryCategory === filter.primaryCategory);
    }

    // 2.1 Vibe 二级分类过滤（单选，仅 vibe 大类资源有值）
    if (filter.vibeSubcategory) {
      result = result.filter((s) => s.vibeSubcategory === filter.vibeSubcategory);
    }

    // 3. 标签维度过滤（维度内 OR，维度间 AND）
    const activeDimensions = Object.entries(filter.tagFilters) as Array<[TagDimensionKey, string[]]>;
    for (const [dimension, values] of activeDimensions) {
      if (values.length === 0) continue;
      result = result.filter((s) => {
        const tagValues = s.tags[dimension] as readonly string[] | undefined;
        return !!tagValues && values.some((v) => tagValues.includes(v));
      });
    }

    // 4. 难度过滤（多选，OR 关系）
    if (filter.difficulties.length > 0) {
      result = result.filter((s) => filter.difficulties.includes(s.difficulty));
    }

    // 5. 语言过滤（多选，OR 关系）
    if (filter.languages.length > 0) {
      result = result.filter((s) => filter.languages.includes(s.language));
    }

    // 6. 精选过滤
    if (initialFeatured) {
      result = result.filter((s) => s.featured);
    }

    // 7. 排序
    switch (filter.sortBy) {
      case 'stars':
        result.sort((a, b) => b.stars - a.stars);
        break;
      case 'latest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'hot':
      default:
        // 综合热度：stars + 精选加权
        result.sort((a, b) => {
          const scoreA = a.stars + (a.featured ? 500 : 0);
          const scoreB = b.stars + (b.featured ? 500 : 0);
          return scoreB - scoreA;
        });
        break;
    }

    // 8. 媒体优先分组：有视频/图片展示的排前，纯文字卡片沉底。
    //    叠加在所选排序之上（Array.sort 稳定，组内保持 stars/热度等原次序）
    result.sort((a, b) => {
      const mediaA = a.demoMedia && a.demoMedia.length > 0 ? 1 : 0;
      const mediaB = b.demoMedia && b.demoMedia.length > 0 ? 1 : 0;
      return mediaB - mediaA;
    });

    return result;
  }, [filter, searchKeyword, initialFeatured]);

  // 分页数据（仅渲染已加载部分，控制 DOM 数量）
  const totalPages = Math.ceil(filteredSkills.length / PAGE_SIZE);
  const pagedSkills = filteredSkills.slice(0, page * PAGE_SIZE);

  /** 同步筛选到 URL（大类 / 搜索词 / 排序） */
  const syncUrl = (next: { category?: PrimaryCategory | null; search?: string; sort?: SortBy }) => {
    const params: Record<string, string> = {};
    const category = next.category !== undefined ? next.category : filter.primaryCategory;
    const search = next.search !== undefined ? next.search : searchKeyword;
    const sort = next.sort !== undefined ? next.sort : filter.sortBy;
    if (category) params.primaryCategory = category;
    if (search) params.search = search;
    if (sort !== 'hot') params.sort = sort;
    if (initialFeatured) params.featured = 'true';
    setSearchParams(params, { replace: true });
  };

  /** 处理筛选变更：分页归零 + URL 同步 */
  const handleFilterChange = (newFilter: FilterState) => {
    setFilter(newFilter);
    setPage(1);
    syncUrl({ category: newFilter.primaryCategory, sort: newFilter.sortBy });
  };

  /** 处理搜索变更：分页归零 + URL 同步 */
  const handleSearchChange = (keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
    syncUrl({ search: keyword });
  };

  /** 处理大类导航切换：切到非 vibe 大类时联动清空 Vibe 二级筛选 */
  const handleCategorySelect = (category: PrimaryCategory | 'all') => {
    const primaryCategory = category === 'all' ? null : category;
    const vibeSubcategory =
      primaryCategory === 'vibe' ? filter.vibeSubcategory : null;
    handleFilterChange({ ...filter, primaryCategory, vibeSubcategory });
  };

  /** 处理排序变更 */
  const handleSortChange = (sort: SortBy) => {
    handleFilterChange({ ...filter, sortBy: sort });
  };

  /** 加载更多 */
  const handleLoadMore = () => {
    setPage((p) => p + 1);
  };

  /** 清除搜索 */
  const handleClearSearch = () => {
    handleSearchChange('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {/* ============================================================ */}
      {/* 顶部：标题+介绍（左）| 搜索（右） */}
      {/* ============================================================ */}
      <PageHeader
        eyebrow="Skill Library"
        title="Skill 大全"
        description="浏览、搜索、筛选所有 AI 编码视频制作 Skill"
        actions={
          <div className="w-full sm:w-72">
            <SkillSearch
              value={searchKeyword}
              onChange={handleSearchChange}
              resultCount={filteredSkills.length}
              onClear={handleClearSearch}
            />
          </div>
        }
        className="mb-4"
      />

      {/* ============================================================ */}
      {/* 分类导航（一级大类横排） */}
      {/* ============================================================ */}
      <div className="mb-3">
        <CategoryNav
          activeCategory={filter.primaryCategory ?? 'all'}
          onSelect={handleCategorySelect}
        />
      </div>

      {/* ============================================================ */}
      {/* 紧凑工具栏：筛选入口 + 结果数 + 排序 + 视图切换（无边框，间距分组） */}
      {/* ============================================================ */}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <SkillFilter filter={filter} onChange={handleFilterChange} />
          <span className="text-sm text-content-faint whitespace-nowrap">
            共 <span className="text-content-muted font-medium tabular-nums">{filteredSkills.length}</span> 个
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 排序 */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-content-faint" strokeWidth={1.75} />
            <Select
              options={SORT_OPTIONS}
              value={filter.sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortBy)}
              fullWidth={false}
              className="w-32 text-sm py-1.5"
              aria-label="排序方式"
            />
          </div>

          {/* 视图切换 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-md transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-accent-500/15 text-accent-300'
                  : 'text-content-faint hover:text-content hover:bg-white/[0.05]'
              )}
              aria-label="网格视图"
            >
              <Grid3x3 className="w-4 h-4" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded-md transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-accent-500/15 text-accent-300'
                  : 'text-content-faint hover:text-content hover:bg-white/[0.05]'
              )}
              aria-label="列表视图"
            >
              <ListIcon className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 卡片网格（stagger 级联入场，仅渲染已加载分页） */}
      {/* ============================================================ */}
      {pagedSkills.length === 0 ? (
        <EmptyState
          icon={<Compass className="w-12 h-12" strokeWidth={1.5} />}
          title="没有找到匹配的 Skill"
          description="尝试调整筛选条件或更换搜索关键词"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleFilterChange(DEFAULT_FILTER);
                handleClearSearch();
              }}
            >
              清除所有筛选
            </Button>
          }
        />
      ) : (
        <>
          <div
            className={cn(
              'stagger',
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                : 'flex flex-col gap-3'
            )}
          >
            {pagedSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                listView={viewMode === 'list'}
              />
            ))}
          </div>

          {/* 加载更多 / 分页 */}
          {page < totalPages && (
            <div className="flex justify-center mt-8">
              <Button
                variant="secondary"
                size="lg"
                onClick={handleLoadMore}
                icon={<ChevronDown className="w-4 h-4" />}
              >
                加载更多
                <span className="ml-1 text-content-subtle">
                  （{pagedSkills.length}/{filteredSkills.length}）
                </span>
              </Button>
            </div>
          )}

          {page >= totalPages && filteredSkills.length > PAGE_SIZE && (
            <div className="text-center mt-8 text-sm text-content-subtle">
              已展示全部 {filteredSkills.length} 个结果
            </div>
          )}
        </>
      )}
    </div>
  );
}