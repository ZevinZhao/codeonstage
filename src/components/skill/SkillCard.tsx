

import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Heart, Sparkles } from 'lucide-react';
import type { Skill } from '@/types';
import { cn } from '@/utils/cn';
import { formatNumber, truncate } from '@/utils/format';

import { PRIMARY_CATEGORY_ICON_MAP } from './categoryIcons';
import { MediaPreview } from './MediaPreview';
import { GalleryMedia } from './GalleryMedia';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { toast } from '@/store/useToastStore';


function getRepoName(sourceUrl: string): string | null {
  const match = sourceUrl.match(/github\.com\/[^/]+\/([^/]+)/);
  return match ? match[1] : null;
}


interface SkillCardProps {
  skill: Skill;
  listView?: boolean;
  className?: string;
}


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
  const repoName = getRepoName(skill.sourceUrl);
  const showRepoName = repoName && repoName !== skill.name;
  const CategoryIcon = PRIMARY_CATEGORY_ICON_MAP[skill.primaryCategory];


  if (listView) {
    return (
      <div
        onClick={handleNavigate}
        className={cn(
          'group relative flex items-center gap-4 p-3 rounded-xl',
          'cursor-pointer hover:bg-white/[0.03] transition-colors duration-200',
          className
        )}
      >

        <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-black">
          {hasMedia ? (
            <MediaPreview
              media={skill.demoMedia!}
              height="h-16"
              autoPlay
              showControls={false}
              rounded={false}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {CategoryIcon && <CategoryIcon className="w-5 h-5 text-content-faint" />}
            </div>
          )}
        </div>


        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-content truncate group-hover:text-white transition-colors">
            {skill.name}
          </h3>
          <p className="text-xs text-content-faint line-clamp-1 mt-0.5">
            {truncate(skill.description, 80)}
          </p>
        </div>


        <div className="flex items-center gap-1 text-xs text-content-faint flex-shrink-0">
          <Star className="w-3 h-3" strokeWidth={1.75} />
          {formatNumber(skill.stars)}
        </div>


        <button
          onClick={handleToggleFavorite}
          className={cn(
            'flex-shrink-0 p-1.5 rounded-lg transition-all duration-200',
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
            isFavorited ? 'text-content' : 'text-content-faint hover:text-content'
          )}
          aria-label={isFavorited ? '取消收藏' : '添加收藏'}
        >
          <Heart className={cn('w-4 h-4', isFavorited && 'fill-current')} />
        </button>
      </div>
    );
  }


  return (
    <div
      onClick={handleNavigate}
      className={cn(
        'group relative bg-base-card border border-border rounded-xl overflow-hidden',
        'cursor-pointer hover:border-border-strong hover:shadow-card-hover',
        'transition-[border-color,box-shadow] duration-200 ease-out-strong flex flex-col h-full',
        className
      )}
    >

      <div className="relative w-full h-52 flex-shrink-0 overflow-hidden bg-black">
        {hasMedia ? (
          <MediaPreview
            media={skill.demoMedia!}
            height="h-52"
            autoPlay
            showControls={false}
            rounded={false}
            className="w-full h-full transition-transform duration-500 ease-out-strong group-hover:scale-[1.03]"
          />
        ) : (

          <div className="w-full h-full flex items-center justify-center px-6">
            <span className="text-lg font-display text-content/90 text-center line-clamp-2 tracking-[0.04em]">
              {skill.name}
            </span>
          </div>
        )}


        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />


        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          <p className="text-sm text-content/90 line-clamp-2 leading-relaxed">
            {truncate(skill.description, 100)}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-content/60">
            <span>{skill.difficulty}</span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3" strokeWidth={1.75} />
              {formatNumber(skill.stars)}
            </span>
          </div>
        </div>


        <button
          onClick={handleToggleFavorite}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-lg backdrop-blur-sm transition-all duration-200',
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
            isFavorited
              ? 'text-content bg-white/20'
              : 'text-content/70 bg-black/40 hover:text-content hover:bg-white/20'
          )}
          aria-label={isFavorited ? '取消收藏' : '添加收藏'}
        >
          <Heart className={cn('w-4 h-4', isFavorited && 'fill-current')} />
        </button>


        {skill.featured && (
          <span className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-content text-[10px] font-medium opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <Sparkles className="w-2.5 h-2.5" />
            精选
          </span>
        )}
      </div>


      <div className="p-4">
        <h3 className="text-base font-medium text-content line-clamp-1 group-hover:text-white transition-colors">
          {skill.name}
        </h3>
        {showRepoName && (
          <p className="text-xs text-content-faint mt-1 line-clamp-1 font-mono">{repoName}</p>
        )}
      </div>
    </div>
  );
});

export const GallerySkillCard = memo(function GallerySkillCard({
  skill,
  paused,
  className,
}: {
  skill: Skill;
  paused: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const isFavorited = useFavoriteStore((s) => s.isFavorited(skill.id));
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);
  const hasMedia = !!skill.demoMedia && skill.demoMedia.length > 0;
  const authorInitial = skill.author === '社区' ? '社' : skill.author.slice(0, 1).toUpperCase();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const willFavorite = !isFavorited;
    toggleFavorite(skill.id);
    toast.success(willFavorite ? '已加入收藏' : '已取消收藏');
  };

  return (
    <article
      onClick={() => navigate(`/skills/${skill.id}`)}
      className={cn(
        'group relative overflow-hidden rounded-[7px] border border-white/[0.1] bg-[#111] cursor-pointer',
        'transition-[border-color,box-shadow] duration-200 hover:border-white/30 hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)]',
        className
      )}
    >
      <GalleryMedia
        media={hasMedia ? skill.demoMedia! : []}
        paused={paused}
        fallback={
          <div className="absolute inset-0 flex min-h-44 items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#303036,transparent_42%),#111113] px-6">
            <span className="font-display text-center text-xl leading-tight tracking-[0.05em] text-white/90">
              {skill.name}
            </span>
          </div>
        }
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <button
        type="button"
        onClick={handleToggleFavorite}
        className={cn(
          'absolute right-2 top-2 rounded-full border border-white/20 bg-black/55 p-1.5 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20',
          'opacity-0 group-hover:opacity-100',
          isFavorited && 'bg-white/20 opacity-100'
        )}
        aria-label={isFavorited ? '取消收藏' : '添加收藏'}
      >
        <Heart className={cn('h-3.5 w-3.5', isFavorited && 'fill-current')} />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-2 p-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/55 text-[9px] text-white backdrop-blur-md">
          {authorInitial}
        </span>
        <div className="min-w-0 translate-y-1 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <h3 className="truncate text-xs leading-tight text-white">{skill.name}</h3>
          <p className="mt-0.5 truncate text-[9px] text-white/55">{skill.author}</p>
        </div>
      </div>
    </article>
  );
});
