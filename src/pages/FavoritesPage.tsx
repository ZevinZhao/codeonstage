// ============================================================
// FavoritesPage 个人收藏库页面
// - 页面标题"我的收藏库"
// - 统计面板：总收藏数、各状态数量
// - 筛选栏：按状态筛选、排序（收藏时间/名称）
// - 搜索框：搜索收藏的 Skill
// - 收藏列表：FavoriteCard 网格展示
// - 空状态：还没有收藏任何 Skill
// ============================================================
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Compass, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FavoriteCard } from '@/components/favorite/FavoriteCard';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { getSkillById } from '@/data';
import {
  FAVORITE_STATUS_LABELS,
  ALL_FAVORITE_STATUSES,
} from '@/utils/constants';
import type { FavoriteStatus } from '@/types';

/** 筛选状态：all 或具体状态 */
type FilterStatus = 'all' | FavoriteStatus;
/** 排序模式 */
type SortMode = 'recent' | 'name';

/** 状态颜色（用于统计卡片高亮） */
const statusAccent: Record<FavoriteStatus, string> = {
  wishlist: 'text-info',
  trying: 'text-warning',
  frequent: 'text-success',
  archived: 'text-content-subtle',
};

/** FavoritesPage 页面 */
export function FavoritesPage() {
  const favorites = useFavoriteStore((s) => s.favorites);

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [search, setSearch] = useState('');

  /** 各状态数量统计 */
  const stats = useMemo(() => {
    const result: Record<FavoriteStatus, number> = {
      wishlist: 0,
      trying: 0,
      frequent: 0,
      archived: 0,
    };
    for (const f of favorites) {
      result[f.status] += 1;
    }
    return result;
  }, [favorites]);

  /** 经过筛选 + 搜索 + 排序的列表 */
  const visibleFavorites = useMemo(() => {
    let list = favorites;

    // 状态筛选
    if (filter !== 'all') {
      list = list.filter((f) => f.status === filter);
    }

    // 搜索：匹配 Skill 名称或描述
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter((f) => {
        const skill = getSkillById(f.skillId);
        if (!skill) return false;
        return (
          skill.name.toLowerCase().includes(kw) ||
          skill.description.toLowerCase().includes(kw)
        );
      });
    }

    // 排序
    const sorted = [...list];
    if (sort === 'recent') {
      sorted.sort(
        (a, b) =>
          new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );
    } else {
      // 按名称
      sorted.sort((a, b) => {
        const sa = getSkillById(a.skillId)?.name ?? '';
        const sb = getSkillById(b.skillId)?.name ?? '';
        return sa.localeCompare(sb, 'zh-CN');
      });
    }

    return sorted;
  }, [favorites, filter, search, sort]);

  /** 筛选选项 */
  const filterOptions: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: favorites.length },
    ...ALL_FAVORITE_STATUSES.map((s) => ({
      key: s as FilterStatus,
      label: FAVORITE_STATUS_LABELS[s],
      count: stats[s],
    })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {/* 页头：眉标 + 衬线标题 + 胶片齿孔线（放映厅刊头语言） */}
      <PageHeader
        eyebrow="My Favorites"
        title="我的收藏库"
        description="管理你收藏的 Skill，记录使用心得，跟踪试用状态"
        className="mb-6"
      />

      {favorites.length === 0 ? (
        // 空状态
        <EmptyState
          icon={<Heart className="w-12 h-12" strokeWidth={1.5} />}
          title="还没有收藏任何 Skill"
          description="去 Skill 大全中发现感兴趣的资源，点击收藏即可加入收藏库"
          action={
            <Link to="/skills">
              <Button icon={<Compass className="w-4 h-4" />}>浏览 Skill 大全</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* 统计面板（安静化：数字为主角，图标灰阶） */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <Card padding="sm" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-border-subtle flex items-center justify-center text-content-subtle">
                <Heart className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-xl font-semibold text-content tabular-nums">
                  {favorites.length}
                </div>
                <div className="text-xs text-content-subtle">总收藏</div>
              </div>
            </Card>
            {ALL_FAVORITE_STATUSES.map((s) => (
              <Card key={s} padding="sm" className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg bg-white/[0.03] border border-border-subtle flex items-center justify-center text-sm font-semibold tabular-nums',
                    statusAccent[s]
                  )}
                >
                  {stats[s]}
                </div>
                <div>
                  <div className="text-sm font-medium text-content">
                    {FAVORITE_STATUS_LABELS[s]}
                  </div>
                  <div className="text-xs text-content-subtle">
                    {stats[s] > 0 ? `${Math.round((stats[s] / favorites.length) * 100)}%` : '—'}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* 筛选 + 搜索 + 排序 */}
          <div className="flex flex-col lg:flex-row gap-3 mb-6">
            {/* 状态筛选：分段控件（与其他页筛选组统一） */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-border-subtle overflow-x-auto scrollbar-hide">
              {filterOptions.map((opt) => {
                const active = filter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFilter(opt.key)}
                    aria-pressed={active}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors duration-160 ease-out-strong active:scale-[0.97]',
                      active
                        ? 'bg-white/[0.08] text-content'
                        : 'text-content-subtle hover:text-content-muted'
                    )}
                  >
                    {opt.label}
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded-md tabular-nums',
                        active
                          ? 'bg-white/[0.08] text-content'
                          : 'bg-white/[0.04] text-content-faint'
                      )}
                    >
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 搜索 + 排序 */}
            <div className="flex items-center gap-2 lg:ml-auto">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
                placeholder="搜索收藏的 Skill..."
                className="w-full sm:w-64"
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-content-faint">排序</span>
                <Select
                  options={[
                    { value: 'recent', label: '收藏时间' },
                    { value: 'name', label: '名称' },
                  ]}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  fullWidth={false}
                  className="text-sm"
                  aria-label="排序方式"
                />
              </div>
            </div>
          </div>

          {/* 收藏列表 */}
          {visibleFavorites.length === 0 ? (
            <EmptyState
              icon={<Search className="w-10 h-10" strokeWidth={1.5} />}
              title={search.trim() ? '没有匹配的收藏' : '该状态下暂无收藏'}
              description={
                search.trim()
                  ? '试试更换关键词或清除筛选'
                  : '切换其他状态筛选查看'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleFavorites.map((favorite) => (
                <FavoriteCard key={favorite.skillId} favorite={favorite} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}