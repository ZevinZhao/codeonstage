// ============================================================
// CategoryNav - 一级大类横排导航（承担首屏筛选中的"大类"维度）
// - 全部 + 9 大类（Vibe 知识大赏排第一位）
// - 每个大类带图标与数量徽章
// - 选中态 + 按压反馈（active:scale-[0.97] + 160ms ease-out-strong）
// ============================================================
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { ALL_PRIMARY_CATEGORIES, PRIMARY_CATEGORY_LABELS } from '@/utils/constants';
import { PRIMARY_CATEGORY_ICON_MAP } from './categoryIcons';
import { LayoutGrid } from 'lucide-react';
import type { PrimaryCategory } from '@/types';
import { skills } from '@/data';

/** CategoryNav Props */
interface CategoryNavProps {
  /** 当前选中的大类 */
  activeCategory?: PrimaryCategory | 'all';
  /** 点击大类回调（不传则默认跳转到列表页） */
  onSelect?: (category: PrimaryCategory | 'all') => void;
  /** 是否显示 "全部" 选项 */
  showAll?: boolean;
  /** 自定义类名 */
  className?: string;
}

/** 计算每个大类下的 Skill 数量（模块级缓存，数据为静态常量） */
const primaryCategoryCounts: Record<string, number> = skills.reduce((acc, s) => {
  acc[s.primaryCategory] = (acc[s.primaryCategory] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

/** 单个导航胶囊的公共动效类（按压反馈 + 指定过渡属性，禁 transition-all） */
const navItemMotion =
  'transition-[color,background-color,border-color,box-shadow,transform] duration-[160ms] ease-out-strong active:scale-[0.97]';

/** CategoryNav 组件 */
export function CategoryNav({
  activeCategory = 'all',
  onSelect,
  showAll = true,
  className,
}: CategoryNavProps) {
  const navigate = useNavigate();

  /** 处理大类点击 */
  const handleClick = (category: PrimaryCategory | 'all') => {
    if (onSelect) {
      onSelect(category);
    } else {
      // 默认行为：跳转到列表页并带上大类参数
      const query = category === 'all' ? '' : `?primaryCategory=${category}`;
      navigate(`/skills${query}`);
    }
  };

  /** 渲染大类项（带图标 + 数量徽章） */
  const renderItem = (
    key: PrimaryCategory | 'all',
    label: string,
    count: number,
    icon: React.ReactNode
  ) => {
    const isActive = activeCategory === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => handleClick(key)}
        aria-pressed={isActive}
        className={cn(
          'flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          'whitespace-nowrap cursor-pointer',
          navItemMotion,
          isActive
            ? 'bg-accent-500/15 text-accent-300 font-medium'
            : 'text-content-muted hover:text-content hover:bg-white/[0.05]'
        )}
      >
        <span className={cn('flex-shrink-0', isActive ? 'opacity-100' : 'opacity-60')}>{icon}</span>
        <span>{label}</span>
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded-md tabular-nums',
            isActive ? 'bg-accent-500/20 text-accent-200' : 'bg-white/[0.05] text-content-faint'
          )}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className={cn('relative', className)}>
      {/* 横向滚动容器，隐藏滚动条 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-2 min-w-min">
          {showAll && renderItem('all', '全部', skills.length, <LayoutGrid className="w-4 h-4" />)}
          {ALL_PRIMARY_CATEGORIES.map((c) => {
            const count = primaryCategoryCounts[c] || 0;
            // 未收录的大类不展示，避免导航出现空项（当前选中除外）
            if (count === 0 && activeCategory !== c) return null;
            const Icon = PRIMARY_CATEGORY_ICON_MAP[c];
            return renderItem(
              c,
              PRIMARY_CATEGORY_LABELS[c],
              count,
              <Icon className="w-4 h-4" />
            );
          })}
        </div>
      </div>
      {/* 右侧渐隐提示（暗示可横向滚动） */}
      <div className="hidden sm:block absolute right-0 top-0 bottom-2 w-8 pointer-events-none bg-gradient-to-l from-base to-transparent" />
    </div>
  );
}