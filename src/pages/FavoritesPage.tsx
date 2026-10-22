import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Heart, Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { FavoriteCard } from '@/components/favorite/FavoriteCard';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { getSkillById } from '@/data';
import { FAVORITE_STATUS_LABELS, ALL_FAVORITE_STATUSES } from '@/utils/constants';
import type { FavoriteStatus } from '@/types';
import { GallerySiteMenu } from '@/components/layout/GallerySiteMenu';

type FilterStatus = 'all' | FavoriteStatus;
type SortMode = 'recent' | 'name';

export function FavoritesPage() {
  const favorites = useFavoriteStore((state) => state.favorites);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [sort, setSort] = useState<SortMode>('recent');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const counts = useMemo(() => {
    const result: Record<FavoriteStatus, number> = { wishlist: 0, trying: 0, frequent: 0, archived: 0 };
    favorites.forEach((favorite) => { result[favorite.status] += 1; });
    return result;
  }, [favorites]);

  const visibleFavorites = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return favorites
      .filter((favorite) => filter === 'all' || favorite.status === filter)
      .filter((favorite) => {
        if (!keyword) return true;
        const skill = getSkillById(favorite.skillId);
        return !!skill && `${skill.name} ${skill.description}`.toLowerCase().includes(keyword);
      })
      .slice()
      .sort((a, b) => {
        if (sort === 'name') return (getSkillById(a.skillId)?.name ?? '').localeCompare(getSkillById(b.skillId)?.name ?? '', 'zh-CN');
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      });
  }, [favorites, filter, search, sort]);

  const filters: Array<{ key: FilterStatus; label: string; count: number }> = [
    { key: 'all', label: '全部', count: favorites.length },
    ...ALL_FAVORITE_STATUSES.map((status) => ({ key: status, label: FAVORITE_STATUS_LABELS[status], count: counts[status] })),
  ];

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="sticky top-0 z-40 bg-[#080808]/95 px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-1.5">
          <GallerySiteMenu />
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
            {filters.map((item) => (
              <button key={item.key} type="button" onClick={() => setFilter(item.key)} className={cn('flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors', filter === item.key ? 'border-white/25 bg-white text-black' : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white')}>
                {item.label}<span className="tabular-nums opacity-55">{item.count}</span>
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex h-7 items-center rounded-full border border-white/10 bg-white/[0.04]">
              {searchOpen && <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索收藏" className="h-full w-28 bg-transparent pl-2.5 text-[11px] text-white placeholder:text-white/35 sm:w-40" />}
              <button type="button" onClick={() => { if (searchOpen && search) setSearch(''); else setSearchOpen((open) => !open); }} className="flex h-7 w-7 items-center justify-center text-white/60 transition-colors hover:text-white" aria-label={searchOpen ? '关闭搜索' : '搜索收藏'}>{searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}</button>
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="h-7 w-[84px] cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/70"><option value="recent">最近收藏</option><option value="name">名称排序</option></select>
          </div>
        </div>
      </header>

      <main className="p-2">
        {favorites.length === 0 ? (
          <EmptyState icon={<Heart className="h-11 w-11" strokeWidth={1.4} />} title="收藏库还是空的" description="在 Skill 画廊里点击卡片右上角的收藏按钮，就会出现在这里。" action={<Link to="/skills"><Button icon={<Compass className="h-4 w-4" />}>去逛 Skill</Button></Link>} />
        ) : visibleFavorites.length === 0 ? (
          <EmptyState icon={<Search className="h-10 w-10" />} title="没有匹配的收藏" description="换个关键词或状态试试。" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{visibleFavorites.map((favorite) => <FavoriteCard key={favorite.skillId} favorite={favorite} />)}</div>
        )}
      </main>
    </div>
  );
}
