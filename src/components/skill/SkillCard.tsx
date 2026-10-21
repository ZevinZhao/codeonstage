// ============================================================
// SkillCard - 作品展示卡（四层结构：封面 → 名称 → 说明 → 辅助信息）
// - 封面统一容器比例，无素材时文字封面（避免随意配图）
// - 标签最多 2 个，中性灰阶（完整分类与标签放详情页）
// - 英文仓库名降权为次级小字（等宽体，区别于中文名称）
// - 收藏/精选用琥珀强调色标识激活态
// ============================================================
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Sparkles } from 'lucide-react';
import type { Skill } from '@/types';
import { cn } from '@/utils/cn';
import { formatNumber, truncate } from '@/utils/format';
import {
  flattenSkillTags,
  getTagLabel,
} from '@/utils/constants';
import { PRIMARY_CATEGORY_ICON_MAP } from './categoryIcons';
import { MediaPreview } from './MediaPreview';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { toast } from '@/store/useToastStore';

/** 从 GitHub sourceUrl 提取仓库名 */
function getRepoName(sourceUrl: string): string | null {
  const match = sourceUrl.match(/github\.com\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}

/** SkillCard Props */
interface SkillCardProps {
  skill: Skill;
  listView?: boolean;
  className?: string;
}

/** 中性标签样式（卡片上标签统一中性色，状态标签才用颜色） */
const NEUTRAL_TAG = 'bg-white/[0.05] text-content-subtle';

/** SkillCard 组件（memo：skill/listView/className 未变化时跳过重渲） */
export const SkillCard = memo(function SkillCard({ skill, listView = false, className }: SkillCardProps) {
  const navigate = useNavigate();
  const isFavorited = useFavoriteStore((s) => s.isFavorited(skill.id));
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);

  const handleNavigate = () => navigate(`/skills/${skill.id}`);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willFavorite = !isFavorited;
    toggleFavorite(skill.id);
    toast.success(willFavorite ? '已加入收藏' : '已取消收藏');
  };

  const hasMedia = !!skill.demoMedia && skill.demoMedia.length > 0;
  const flatTags = flattenSkillTags(skill.tags);
  const repoName = getRepoName(skill.sourceUrl);
  const showRepoName = repoName && repoName !== skill.name;

  // 首个平台标签（底部辅助信息）
  const firstPlatform = skill.tags.platforms[0];
  const platformLabel = firstPlatform ? getTagLabel('platforms', firstPlatform) : null;

  // 分类图标（文字封面用）
  const CategoryIcon = PRIMARY_CATEGORY_ICON_MAP[skill.primaryCategory];

  // 列表视图：横向布局
  if (listView) {
    return (
      <div
        onClick={handleNavigate}
        className={cn(
          'group relative bg-base-card border border-border rounded-xl p-4',
          'cursor-pointer hover:border-border-strong hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98]',
          'transition-[transform,border-color,box-shadow] duration-200 ease-out-strong flex items-start gap-4',
          className
        )}
      >
        {/* 收藏按钮 */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            'flex-shrink-0 p-2 rounded-lg transition-colors',
            isFavorited
              ? 'text-accent-500 bg-accent-500/10 hover:bg-accent-500/20'
              : 'text-content-faint hover:text-accent-500 hover:bg-accent-500/5'
          )}
          aria-label={isFavorited ? '取消收藏' : '添加收藏'}
        >
          <Heart className={cn('w-4 h-4', isFavorited && 'fill-current')} />
        </button>

        {/* 缩略媒体区：有媒体展示预览，无媒体文字封面 */}
        {hasMedia ? (
          <MediaPreview
            media={skill.demoMedia!}
            height="h-20"
            autoPlay
            showControls={false}
            rounded
            className="w-32 flex-shrink-0"
          />
        ) : (
          <div className="w-32 h-20 flex-shrink-0 rounded-xl bg-base-elevated flex items-center justify-center">
            {CategoryIcon && <CategoryIcon className="w-6 h-6 text-content-faint" />}
          </div>
        )}

        {/* 主内容 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-content mb-0.5 group-hover:text-white transition-colors truncate">
            {skill.name}
          </h3>
          {showRepoName && (
            <p className="text-xs text-content-faint mb-1 truncate font-mono">{repoName}</p>
          )}
          <p className="text-sm text-content-muted line-clamp-2 mb-2">
            {truncate(skill.description, 100)}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-faint">
            {platformLabel && <span>{platformLabel}</span>}
            {platformLabel && <span>·</span>}
            <span>{skill.difficulty}</span>
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-warning" />
              {formatNumber(skill.stars)}
            </span>
            {flatTags.slice(0, 2).map((t) => (
              <span
                key={`${t.dimension}-${t.value}`}
                className={cn('inline-flex items-center px-1.5 py-0.5 rounded', NEUTRAL_TAG)}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 网格视图：四层结构（封面 → 名称 → 说明 → 辅助信息）
  return (
    <div
      onClick={handleNavigate}
      className={cn(
        'group relative bg-base-card border border-border rounded-xl',
        'cursor-pointer hover:border-border-strong hover:shadow-card-hover hover:-translate-y-0.5 active:scale-[0.98]',
        'transition-[transform,border-color,box-shadow] duration-200 ease-out-strong flex flex-col h-full overflow-hidden',
        className
      )}
    >
      {/* 第一层：大封面（统一比例 h-44） */}
      <div className="relative w-full h-44 flex-shrink-0 overflow-hidden">
        {hasMedia ? (
          <MediaPreview
            media={skill.demoMedia!}
            height="h-44"
            autoPlay
            showControls={false}
            rounded={false}
            className="w-full h-full"
          />
        ) : (
          // 无素材时统一文字封面（分类图标 + 名称，避免随意配图）
          <div className="w-full h-full bg-gradient-to-br from-base-elevated to-base-card flex flex-col items-center justify-center gap-2">
            {CategoryIcon && <CategoryIcon className="w-8 h-8 text-content-faint" />}
            <span className="text-sm text-content-subtle text-center px-4 line-clamp-2">
              {skill.name}
            </span>
          </div>
        )}
        {/* 精选标识（琥珀色，弱化角标） */}
        {skill.featured && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-accent-300 text-[10px] font-medium">
            <Sparkles className="w-2.5 h-2.5" />
            精选
          </span>
        )}
        {/* 收藏按钮（琥珀色标识已收藏） */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-lg backdrop-blur-sm transition-colors',
            isFavorited
              ? 'text-accent-500 bg-black/40 hover:bg-black/60'
              : 'text-content-muted bg-black/30 hover:text-accent-400 hover:bg-black/50'
          )}
          aria-label={isFavorited ? '取消收藏' : '添加收藏'}
        >
          <Heart className={cn('w-4 h-4', isFavorited && 'fill-current')} />
        </button>
      </div>

      {/* 第二~四层：内容区 */}
      <div className="flex flex-col flex-1 p-4">
        {/* 主标题（易懂的名称） */}
        <h3 className="text-base font-medium text-content mb-0.5 group-hover:text-white transition-colors line-clamp-1">
          {skill.name}
        </h3>

        {/* 次级小字（英文仓库名，降权，等宽体） */}
        {showRepoName && (
          <p className="text-xs text-content-faint mb-1.5 line-clamp-1 font-mono">{repoName}</p>
        )}

        {/* 一句话说明 */}
        <p className="text-sm text-content-muted line-clamp-2 mb-3 flex-1">
          {truncate(skill.description, 80)}
        </p>

        {/* 标签（最多 2 个，中性色） */}
        {flatTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {flatTags.slice(0, 2).map((t) => (
              <span
                key={`${t.dimension}-${t.value}`}
                className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs', NEUTRAL_TAG)}
              >
                {t.label}
              </span>
            ))}
          </div>
        )}

        {/* 底部辅助信息：平台 · 难度 · Stars */}
        <div className="flex items-center gap-2 text-xs text-content-faint pt-3 border-t border-border-subtle">
          {platformLabel && <span className="truncate">{platformLabel}</span>}
          {platformLabel && <span>·</span>}
          <span>{skill.difficulty}</span>
          <span className="ml-auto flex items-center gap-0.5">
            <Star className="w-3 h-3 text-warning" />
            {formatNumber(skill.stars)}
          </span>
        </div>
      </div>
    </div>
  );
});