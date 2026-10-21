// ============================================================
// WishPoolPage - 需求许愿池页面
// ============================================================
import { useState, useMemo, useCallback } from 'react';
import {
  Gift,
  Plus,

  Clock,
  CheckCircle2,
  Hammer,
  Inbox,
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
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { PRIMARY_CATEGORY_LABELS, ALL_PRIMARY_CATEGORIES } from '@/utils/constants';
import {
  hasVoted,
  markVoted,
  getVotedWishIds,
} from '@/utils/userStorage';
import { cn } from '@/utils/cn';

/** 每页数量 */
const PAGE_SIZE = 9;

/** 状态筛选选项 */
const STATUS_FILTERS: { value: 'all' | WishStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '待认领' },
  { value: 'claimed', label: '已认领' },
  { value: 'in-progress', label: '制作中' },
  { value: 'completed', label: '已完成' },
];

/** 排序方式 */
type SortBy = 'latest' | 'hottest' | 'completing';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'latest', label: '最新发布' },
  { value: 'hottest', label: '最热投票' },
  { value: 'completing', label: '即将完成' },
];

/** 大类下拉选项 */
const primaryCategoryFilterOptions = [
  { value: 'all', label: '全部大类' },
  ...ALL_PRIMARY_CATEGORIES.map((c) => ({ value: c, label: PRIMARY_CATEGORY_LABELS[c] })),
];

/** 许愿池页面 */
export function WishPoolPage() {
  const wishes = useWishStore((s) => s.wishes);
  const voteWish = useWishStore((s) => s.voteWish);

  // 弹窗状态
  const [formOpen, setFormOpen] = useState(false);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 筛选 / 搜索 / 排序
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WishStatus>('all');
  const [primaryCategoryFilter, setPrimaryCategoryFilter] = useState<'all' | PrimaryCategory>('all');
  const [sortBy, setSortBy] = useState<SortBy>('latest');

  // 分页
  const [page, setPage] = useState(1);

  // 已投票集合（用于驱动组件重渲染）
  const [votedIds, setVotedIds] = useState<Set<string>>(() => getVotedWishIds());

  /** 投票 */
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

  /** 打开详情 */
  const handleOpenDetail = useCallback((wish: Wish) => {
    // 取最新的 wish 数据（避免编辑后详情不更新）
    const latest = useWishStore.getState().wishes.find((w) => w.id === wish.id);
    setSelectedWish(latest ?? wish);
    setDetailOpen(true);
  }, []);

  /** 关闭详情 */
  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedWish(null);
  }, []);

  /** 查看成果 */
  const handleViewResult = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  /** 统计概览 */
  const stats = useMemo(() => {
    const total = wishes.length;
    const open = wishes.filter((w) => w.status === 'open').length;
    const inProgress = wishes.filter(
      (w) => w.status === 'claimed' || w.status === 'in-progress'
    ).length;
    const completed = wishes.filter((w) => w.status === 'completed').length;
    return { total, open, inProgress, completed };
  }, [wishes]);

  /** 过滤 + 排序后的列表 */
  const filtered = useMemo(() => {
    let list = wishes.slice();

    // 关键字搜索（标题 + 描述）
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.title.toLowerCase().includes(kw) ||
          w.description.toLowerCase().includes(kw)
      );
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      list = list.filter((w) => w.status === statusFilter);
    }

    // 资源类型筛选
    if (primaryCategoryFilter !== 'all') {
      list = list.filter((w) => w.primaryCategory === primaryCategoryFilter);
    }

    // 排序
    list.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'hottest') {
        return b.votes - a.votes;
      }
      // 即将完成：claimed/in-progress 优先，再按投票数
      const rank = (s: WishStatus) =>
        s === 'in-progress' ? 0 : s === 'claimed' ? 1 : s === 'open' ? 2 : 3;
      const ra = rank(a.status);
      const rb = rank(b.status);
      if (ra !== rb) return ra - rb;
      return b.votes - a.votes;
    });

    return list;
  }, [wishes, keyword, statusFilter, primaryCategoryFilter, sortBy]);

  /** 总页数 */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  /** 当前页数据 */
  const pageData = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  /** 重置筛选时回到第一页 */
  const resetPage = () => setPage(1);

  /** 状态筛选切换 */
  const handleStatusChange = (v: 'all' | WishStatus) => {
    setStatusFilter(v);
    resetPage();
  };

  /** 资源类型筛选切换 */
  const handlePrimaryCategoryChange = (v: string) => {
    setPrimaryCategoryFilter(v as 'all' | PrimaryCategory);
    resetPage();
  };

  /** 排序切换 */
  const handleSortChange = (v: string) => {
    setSortBy(v as SortBy);
    resetPage();
  };

  /** 清除搜索 */
  const handleClearKeyword = () => {
    setKeyword('');
    resetPage();
  };

  // 详情中选中的 wish 是否已投票
  const selectedVoted = selectedWish ? votedIds.has(selectedWish.id) : false;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      {/* 页头：眉标 + 衬线标题 + 胶片齿孔线（放映厅刊头语言） */}
      <PageHeader
        eyebrow="Wish Pool"
        title="需求许愿池"
        description="提出你想要的 Skill，让社区来实现"
        className="mb-6"
      />

      {/* 统计概览（安静化：数字为主角，图标灰阶） */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="总需求"
          value={stats.total}
          icon={<Inbox className="w-4 h-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="待认领"
          value={stats.open}
          icon={<Clock className="w-4 h-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="制作中"
          value={stats.inProgress}
          icon={<Hammer className="w-4 h-4" strokeWidth={1.75} />}
        />
        <StatCard
          label="已完成"
          value={stats.completed}
          icon={<CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />}
        />
      </section>

      {/* 操作栏：提需求 + 搜索 */}
      <section className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setFormOpen(true)}
        >
          提需求
        </Button>
        <SearchInput
          value={keyword}
          placeholder="搜索需求标题或描述..."
          onChange={(e) => {
            setKeyword(e.target.value);
            resetPage();
          }}
          onClear={handleClearKeyword}
          className="flex-1 sm:max-w-md"
        />
      </section>

      {/* 筛选栏 */}
      <section className="flex flex-wrap items-center gap-3 mb-6">
        {/* 状态筛选：分段控件（与收藏页筛选组统一） */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-border-subtle">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleStatusChange(f.value)}
              aria-pressed={statusFilter === f.value}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-160 ease-out-strong active:scale-[0.97]',
                statusFilter === f.value
                  ? 'bg-white/[0.08] text-content'
                  : 'text-content-subtle hover:text-content-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 资源类型筛选 */}
        <Select
          options={primaryCategoryFilterOptions}
          value={primaryCategoryFilter}
          className="min-w-[140px]"
          onChange={(e) => handlePrimaryCategoryChange(e.target.value)}
        />

        {/* 排序 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-content-subtle">排序</span>
          <Select
            options={SORT_OPTIONS}
            value={sortBy}
            className="min-w-[120px]"
            onChange={(e) => handleSortChange(e.target.value)}
          />
        </div>

        {/* 结果计数 */}
        <span className="ml-auto text-xs text-content-subtle">
          共 {filtered.length} 条
        </span>
      </section>

      {/* 列表区 */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* 分页 */}
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

      {/* 提需求弹窗 */}
      <WishForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => resetPage()}
      />

      {/* 详情弹窗 */}
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

/** 统计卡片（内部组件：安静化，数字为主角，图标灰阶） */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border-subtle bg-white/[0.02]">
      <div className="flex-shrink-0 text-content-faint">{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className="text-xl font-semibold text-content leading-none tabular-nums">
          {value}
        </span>
        <span className="text-xs text-content-subtle mt-1">{label}</span>
      </div>
    </div>
  );
}