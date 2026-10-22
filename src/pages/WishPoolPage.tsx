import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Dices,
  Gift,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { Wish, WishStatus, PrimaryCategory } from '@/types';
import { useWishStore } from '@/store/useWishStore';
import { toast } from '@/store/useToastStore';
import { WishCard } from '@/components/wish/WishCard';
import { WishForm } from '@/components/wish/WishForm';
import { WishDetail } from '@/components/wish/WishDetail';
import { Button } from '@/components/ui/Button';

import { EmptyState } from '@/components/ui/EmptyState';
import { PRIMARY_CATEGORY_LABELS, ALL_PRIMARY_CATEGORIES } from '@/utils/constants';
import {
  hasVoted,
  markVoted,
  getVotedWishIds,
} from '@/utils/userStorage';
import { cn } from '@/utils/cn';
import { GallerySiteMenu } from '@/components/layout/GallerySiteMenu';

const PAGE_SIZE = 9;

const STATUS_FILTERS: { value: 'all' | WishStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待认领' },
  { value: 'claimed', label: '已认领' },
  { value: 'in-progress', label: '制作中' },
  { value: 'completed', label: '已完成' },
];

type SortBy = 'latest' | 'hottest' | 'completing';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'latest', label: '最新发布' },
  { value: 'hottest', label: '最热投票' },
  { value: 'completing', label: '即将完成' },
];

const primaryCategoryFilterOptions = [
  { value: 'all', label: '全部大类' },
  ...ALL_PRIMARY_CATEGORIES.map((c) => ({ value: c, label: PRIMARY_CATEGORY_LABELS[c] })),
];

export function WishPoolPage() {
  const wishes = useWishStore((s) => s.wishes);
  const voteWish = useWishStore((s) => s.voteWish);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | WishStatus>('all');
  const [primaryCategoryFilter, setPrimaryCategoryFilter] = useState<'all' | PrimaryCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('latest');

  const [page, setPage] = useState(1);

  const [votedIds, setVotedIds] = useState<Set<string>>(() => getVotedWishIds());

  const handleVote = useCallback(
    (id: string) => {
      if (hasVoted(id)) {
        toast.info('你已经投过票了');
        return;
      }
      voteWish(id);
      markVoted(id);
      setVotedIds(new Set(getVotedWishIds()));
      toast.success('投票成功！');
    },
    [voteWish]
  );

  const handleOpenDetail = useCallback((wish: Wish) => {
    const latest = useWishStore.getState().wishes.find((w) => w.id === wish.id);
    setSelectedWish(latest ?? wish);
    setDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedWish(null);
  }, []);

  const handleViewResult = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const stats = useMemo(() => {
    const total = wishes.length;
    const open = wishes.filter((w) => w.status === 'open').length;
    const inProgress = wishes.filter(
      (w) => w.status === 'claimed' || w.status === 'in-progress'
    ).length;
    const completed = wishes.filter((w) => w.status === 'completed').length;
    return { total, open, inProgress, completed };
  }, [wishes]);

  const filtered = useMemo(() => {
    let list = wishes.slice();

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(kw) ||
          w.description.toLowerCase().includes(kw)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((w) => w.status === statusFilter);
    }

    if (primaryCategoryFilter !== 'all') {
      list = list.filter((w) => w.primaryCategory === primaryCategoryFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'hottest') {
        return b.votes - a.votes;
      }
      const rank = (s: WishStatus) =>
        s === 'in-progress' ? 0 : s === 'claimed' ? 1 : s === 'open' ? 2 : 3;
      const ra = rank(a.status);
      const rb = rank(b.status);
      if (ra !== rb) return ra - rb;
      return b.votes - a.votes;
    });

    return list;
  }, [wishes, keyword, statusFilter, primaryCategoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageData = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const resetPage = () => setPage(1);

  const handleStatusChange = (v: 'all' | WishStatus) => {
    setStatusFilter(v);
    resetPage();
  };

  const handlePrimaryCategoryChange = (v: string) => {
    setPrimaryCategoryFilter(v as 'all' | PrimaryCategory);
    resetPage();
  };

  const handleSortChange = (v: string) => {
    setSortBy(v as SortBy);
    resetPage();
  };

  const handleClearKeyword = () => {
    setKeyword('');
    resetPage();
  };

  const selectedVoted = selectedWish ? votedIds.has(selectedWish.id) : false;
  const statusCounts: Record<'all' | WishStatus, number> = {
    all: stats.total,
    open: stats.open,
    claimed: wishes.filter((wish) => wish.status === 'claimed').length,
    'in-progress': wishes.filter((wish) => wish.status === 'in-progress').length,
    completed: stats.completed,
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <header className="sticky top-0 z-40 bg-[#080808]/95 px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-1.5">
          <GallerySiteMenu />
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusChange(f.value)}
              aria-pressed={statusFilter === f.value}
              className={cn(
                'flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] transition-colors active:scale-[0.97]',
                statusFilter === f.value
                  ? 'border-white/25 bg-white text-black'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white'
              )}
            >
              {f.label}<span className="tabular-nums opacity-55">{statusCounts[f.value]}</span>
            </button>
          ))}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex h-7 items-center rounded-full border border-white/10 bg-white/[0.04]">
              {searchOpen && <input autoFocus type="search" value={keyword} onChange={(event) => { setKeyword(event.target.value); resetPage(); }} placeholder="搜索需求" className="h-full w-28 bg-transparent pl-2.5 text-[11px] text-white placeholder:text-white/35 sm:w-40" />}
              <button type="button" onClick={() => { if (searchOpen && keyword) handleClearKeyword(); else setSearchOpen((open) => !open); }} className="flex h-7 w-7 items-center justify-center text-white/60 transition-colors hover:text-white" aria-label={searchOpen ? '关闭搜索' : '搜索需求'}>{searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}</button>
            </div>
            <select value={primaryCategoryFilter} onChange={(event) => handlePrimaryCategoryChange(event.target.value)} className="h-7 w-[82px] cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/70">{primaryCategoryFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <select value={sortBy} onChange={(event) => handleSortChange(event.target.value)} className="h-7 w-[74px] cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/70">{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <Link to="/gashapon" className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 hover:text-white" aria-label="扭蛋机"><Dices className="h-3.5 w-3.5" /></Link>
            <button type="button" onClick={() => setFormOpen(true)} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 text-[11px] font-black text-black hover:bg-white/85"><Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">提需求</span></button>
          </div>
        </div>
      </header>

      <main className="p-2 pb-10">
      {pageData.length === 0 ? (
        <EmptyState
          icon={<Gift className="w-12 h-12" strokeWidth={1.5} />}
          title={
            wishes.length === 0
              ? '还没有任何需求'
              : '没有符合条件的需求'
          }
          description={
            wishes.length === 0
              ? '来提出第一个需求吧，让社区帮你实现'
              : '试试调整筛选条件或搜索关键字'
          }
          action={
            wishes.length === 0 ? (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setFormOpen(true)}
              >
                提出第一个需求
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setKeyword('');
                  setStatusFilter('all');
                  setPrimaryCategoryFilter('all');
                  resetPage();
                }}
              >
                清除筛选
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {pageData.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                isVoted={votedIds.has(wish.id)}
                onVote={handleVote}
                onClick={handleOpenDetail}
                onViewResult={handleViewResult}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-2 rounded-lg border border-border text-content-muted hover:text-content hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="上一页"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={cn(
                    'min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium tabular-nums transition-colors duration-160 ease-out-strong active:scale-[0.97]',
                    p === currentPage
                      ? 'bg-content text-[#0a0a0a]'
                      : 'border border-border text-content-muted hover:text-content hover:border-border-strong'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-lg border border-border text-content-muted hover:text-content hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="下一页"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </>
      )}
      </main>

      <WishForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => resetPage()}
      />

      <WishDetail
        wish={selectedWish}
        open={detailOpen}
        onClose={handleCloseDetail}
        isVoted={selectedVoted}
        onVote={handleVote}
      />
    </div>
  );
}
