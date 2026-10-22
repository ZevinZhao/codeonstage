import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { ALL_PRIMARY_CATEGORIES, PRIMARY_CATEGORY_LABELS } from '@/utils/constants';
import { PRIMARY_CATEGORY_ICON_MAP } from './categoryIcons';
import { LayoutGrid } from 'lucide-react';
import type { PrimaryCategory } from '@/types';
import { skills } from '@/data';

interface CategoryNavProps {
  activeCategory?: PrimaryCategory | 'all';
  onSelect?: (category: PrimaryCategory | 'all') => void;
  showAll?: boolean;
  className?: string;
  variant?: 'default' | 'gallery';
}

const primaryCategoryCounts: Record<string, number> = skills.reduce((acc, s) => {
  acc[s.primaryCategory] = (acc[s.primaryCategory] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

const navItemMotion =
  'transition-[color,background-color,border-color,box-shadow,transform] duration-[160ms] ease-out-strong active:scale-[0.97]';

const galleryCategoryLabels: Partial<Record<PrimaryCategory, string>> = {
  vibe: 'Vibe',
  promo: '宣传',
  education: '教学',
  'motion-design': '动效',
  'narrative-mv': '叙事',
  'game-interactive': '游戏',
  'post-production': '后期',
  'general-video': '通用',
  uncategorized: '待分类',
};

export function CategoryNav({
  activeCategory = 'all',
  onSelect,
  showAll = true,
  className,
  variant = 'default',
}: CategoryNavProps) {
  const navigate = useNavigate();

  const handleClick = (category: PrimaryCategory | 'all') => {
    if (onSelect) {
      onSelect(category);
    } else {
      const query = category === 'all' ? '' : `?primaryCategory=${category}`;
      navigate(`/skills${query}`);
    }
  };

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
          'flex-shrink-0 inline-flex items-center',
          variant === 'gallery'
            ? 'h-7 gap-1.5 px-2.5 rounded-full border text-[11px] bg-white/[0.04]'
            : 'gap-2 px-3 py-2 rounded-lg text-sm',
          'whitespace-nowrap cursor-pointer',
          navItemMotion,
          isActive
            ? variant === 'gallery'
              ? 'border-white/20 bg-white/[0.12] text-content font-medium shadow-[0_0_0_1px_rgba(255,255,255,0.04)]'
              : 'bg-white/[0.08] text-content font-medium'
            : variant === 'gallery'
              ? 'border-white/[0.08] text-content-muted hover:border-white/[0.16] hover:text-content hover:bg-white/[0.07]'
              : 'text-content-muted hover:text-content hover:bg-white/[0.05]'
        )}
      >
        {variant !== 'gallery' && (
          <span className={cn('flex-shrink-0', isActive ? 'opacity-100' : 'opacity-60')}>{icon}</span>
        )}
        <span>{variant === 'gallery' && key !== 'all' ? galleryCategoryLabels[key as PrimaryCategory] ?? label : label}</span>
        <span
          className={cn(
            'text-[10px] tabular-nums tracking-[0.04em]',
            isActive ? 'text-content/70' : 'text-content-faint'
          )}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className={cn('relative', className)} role="navigation" aria-label="作品分类">
      <div className={cn('flex items-center overflow-x-auto scrollbar-hide', variant === 'gallery' ? 'gap-1' : 'gap-2 pb-2')}>
        <div className={cn('flex items-center min-w-min', variant === 'gallery' ? 'gap-1' : 'gap-2')}>
          {showAll && renderItem('all', '全部', skills.length, <LayoutGrid className="w-4 h-4" />)}
          {ALL_PRIMARY_CATEGORIES.map((c) => {
            const count = primaryCategoryCounts[c] || 0;
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
      {variant !== 'gallery' && <div className="hidden sm:block absolute right-0 top-0 bottom-2 w-8 pointer-events-none bg-gradient-to-l from-base to-transparent" />}
    </div>
  );
}
