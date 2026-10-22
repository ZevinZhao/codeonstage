

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, Pause, Play, Search, X } from 'lucide-react';
import { skills } from '@/data';
import {
  DEFAULT_FILTER,
  SORT_OPTIONS,
  type FilterState,
  type SortBy,
} from '@/components/skill/SkillFilter';
import { searchSkills } from '@/components/skill/SkillSearch';
import { CategoryNav } from '@/components/skill/CategoryNav';
import { MasonryWall } from '@/components/skill/MasonryWall';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { GallerySiteMenu } from '@/components/layout/GallerySiteMenu';
import type { PrimaryCategory, TagDimensionKey } from '@/types';


export function SkillListPage() {
  const [searchParams, setSearchParams] = useSearchParams();


  const initialCategory = searchParams.get('primaryCategory') as PrimaryCategory | null;
  const initialSearch = searchParams.get('search') ?? '';
  const initialSort = (searchParams.get('sort') as SortBy | null) ?? 'hot';
  const initialFeatured = searchParams.get('featured') === 'true';


  const [filter, setFilter] = useState<FilterState>({
    ...DEFAULT_FILTER,
    primaryCategory: initialCategory,
    sortBy: initialSort,
  });


  const [searchKeyword, setSearchKeyword] = useState(initialSearch);
  const [searchOpen, setSearchOpen] = useState(initialSearch.length > 0);
  const [previewsPaused, setPreviewsPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(80);
  const loadSentinelRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const cat = searchParams.get('primaryCategory') as PrimaryCategory | null;
    const sort = (searchParams.get('sort') as SortBy | null) ?? 'hot';
    const search = searchParams.get('search') ?? '';
    setFilter((prev) => ({ ...prev, primaryCategory: cat, sortBy: sort }));
    setSearchKeyword(search);
  }, [searchParams]);


  const filteredSkills = useMemo(() => {
    let result = [...skills];


    result = searchSkills(result, searchKeyword);


    if (filter.primaryCategory) {
      result = result.filter((s) => s.primaryCategory === filter.primaryCategory);
    }


    if (filter.vibeSubcategory) {
      result = result.filter((s) => s.vibeSubcategory === filter.vibeSubcategory);
    }


    const activeDimensions = Object.entries(filter.tagFilters) as Array<[TagDimensionKey, string[]]>;
    for (const [dimension, values] of activeDimensions) {
      if (values.length === 0) continue;
      result = result.filter((s) => {
        const tagValues = s.tags[dimension] as readonly string[] | undefined;
        return !!tagValues && values.some((v) => tagValues.includes(v));
      });
    }


    if (filter.difficulties.length > 0) {
      result = result.filter((s) => filter.difficulties.includes(s.difficulty));
    }


    if (filter.languages.length > 0) {
      result = result.filter((s) => filter.languages.includes(s.language));
    }


    if (initialFeatured) {
      result = result.filter((s) => s.featured);
    }


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

        result.sort((a, b) => {
          const scoreA = a.stars + (a.featured ? 500 : 0);
          const scoreB = b.stars + (b.featured ? 500 : 0);
          return scoreB - scoreA;
        });
        break;
    }



    result.sort((a, b) => {
      const mediaA = a.demoMedia && a.demoMedia.length > 0 ? 1 : 0;
      const mediaB = b.demoMedia && b.demoMedia.length > 0 ? 1 : 0;
      return mediaB - mediaA;
    });

    return result;
  }, [filter, searchKeyword, initialFeatured]);

  const visibleSkills = useMemo(
    () => filteredSkills.slice(0, visibleCount),
    [filteredSkills, visibleCount]
  );

  useEffect(() => {
    setVisibleCount(80);
  }, [filter.primaryCategory, filter.sortBy, searchKeyword, initialFeatured]);

  useEffect(() => {
    const sentinel = loadSentinelRef.current;
    if (!sentinel || visibleCount >= filteredSkills.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((count) => Math.min(count + 80, filteredSkills.length));
        }
      },
      { rootMargin: '800px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredSkills.length, visibleCount]);


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


  const handleFilterChange = (newFilter: FilterState) => {
    setFilter(newFilter);
    syncUrl({ category: newFilter.primaryCategory, sort: newFilter.sortBy });
  };


  const handleSearchChange = (keyword: string) => {
    setSearchKeyword(keyword);
    syncUrl({ search: keyword });
  };


  const handleCategorySelect = (category: PrimaryCategory | 'all') => {
    const primaryCategory = category === 'all' ? null : category;
    const vibeSubcategory =
      primaryCategory === 'vibe' ? filter.vibeSubcategory : null;
    handleFilterChange({ ...filter, primaryCategory, vibeSubcategory });
  };


  const handleSortChange = (sort: SortBy) => {
    handleFilterChange({ ...filter, sortBy: sort });
  };


  const handleClearSearch = () => {
    handleSearchChange('');
  };

  return (
    <div className="skills-gallery-page min-h-screen bg-[#050505]">
      <div className="w-full pb-8">
        <div className="sticky top-0 z-40 bg-[#080808]/95 px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <div className="flex min-w-0 items-center gap-1.5">
            <GallerySiteMenu />

            <CategoryNav
              activeCategory={filter.primaryCategory ?? 'all'}
              onSelect={handleCategorySelect}
              variant="gallery"
              className="min-w-0 flex-1"
            />

            <div className="flex shrink-0 items-center gap-1">
              <div className="flex h-7 items-center rounded-full border border-white/10 bg-white/[0.04]">
                {searchOpen && (
                  <input
                    autoFocus
                    type="search"
                    value={searchKeyword}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="搜索作品"
                    className="h-full w-28 bg-transparent pl-2.5 text-[11px] text-white placeholder:text-white/35 sm:w-40"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (searchOpen && searchKeyword) handleClearSearch();
                    else setSearchOpen((open) => !open);
                  }}
                  className="flex h-7 w-7 items-center justify-center text-white/60 transition-colors hover:text-white"
                  aria-label={searchOpen ? '关闭搜索' : '搜索作品'}
                >
                  {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                </button>
              </div>

              <select
                value={filter.sortBy}
                onChange={(event) => handleSortChange(event.target.value as SortBy)}
                className="h-7 w-[74px] cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/70 hover:text-white"
                aria-label="排序方式"
              >
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>

              <button
                type="button"
                onClick={() => setPreviewsPaused((paused) => !paused)}
                className="flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/65 transition-colors hover:text-white"
                aria-pressed={previewsPaused}
              >
                {previewsPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                <span className="hidden sm:inline">{previewsPaused ? '播放预览' : '暂停预览'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-2">
          {filteredSkills.length === 0 ? (
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
              <MasonryWall skills={visibleSkills} paused={previewsPaused} />
              <div ref={loadSentinelRef} className="h-px" aria-hidden="true" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
