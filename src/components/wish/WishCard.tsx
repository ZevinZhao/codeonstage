// ============================================================
// WishCard - 许愿卡片组件
// ============================================================
import { ThumbsUp, ExternalLink, Clock, UserCheck } from 'lucide-react';
import type { Wish } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/utils/cn';
import { truncate, formatRelativeTime, formatNumber } from '@/utils/format';
import { PRIMARY_CATEGORY_LABELS, getFreeTagColor } from '@/utils/constants';
import {
  WISH_STATUS_TEXT,
  WISH_STATUS_BADGE_COLOR,
  WISH_STATUS_HEX,
} from './wishConstants';

/** WishCard Props */
interface WishCardProps {
  wish: Wish;
  /** 是否已投票 */
  isVoted: boolean;
  /** 点击投票 */
  onVote: (id: string) => void;
  /** 点击卡片（展开详情） */
  onClick?: (wish: Wish) => void;
  /** 点击查看成果链接 */
  onViewResult?: (url: string) => void;
}

/** WishCard 组件 */
export function WishCard({ wish, isVoted, onVote, onClick, onViewResult }: WishCardProps) {
  // 阻止冒泡：点击投票按钮 / 链接时不触发卡片点击
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const handleVote = (e: React.MouseEvent) => {
    stop(e);
    onVote(wish.id);
  };

  const handleViewResult = (e: React.MouseEvent) => {
    stop(e);
    if (onViewResult && wish.resultUrl) {
      onViewResult(wish.resultUrl);
    } else if (wish.resultUrl) {
      window.open(wish.resultUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card
      interactive
      onClick={() => onClick?.(wish)}
      className="h-full flex flex-col gap-3"
    >
      {/* 顶部：状态 + 分类 */}
      <div className="flex items-center justify-between gap-2">
        <Badge color={WISH_STATUS_BADGE_COLOR[wish.status]}>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
            style={{ backgroundColor: WISH_STATUS_HEX[wish.status] }}
          />
          {WISH_STATUS_TEXT[wish.status]}
        </Badge>
        <Badge>
          {PRIMARY_CATEGORY_LABELS[wish.primaryCategory]}
        </Badge>
      </div>

      {/* 标题 */}
      <h3 className="text-base font-semibold text-content leading-snug line-clamp-2">
        {wish.title}
      </h3>

      {/* 描述（截断） */}
      <p className="text-sm text-content-muted leading-relaxed line-clamp-3 flex-1">
        {truncate(wish.description, 120)}
      </p>

      {/* 标签 */}
      {wish.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {wish.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} color={getFreeTagColor(tag)}>
              {tag}
            </Badge>
          ))}
          {wish.tags.length > 4 && (
            <Badge color="bg-base-elevated text-content-subtle border-border">
              +{wish.tags.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* 认领者信息 */}
      {wish.claimantName && wish.status !== 'open' && (
        <div className="flex items-center gap-1.5 text-xs text-content-subtle">
          <UserCheck className="w-3.5 h-3.5 text-content-subtle" />
          <span>认领者</span>
          <Avatar
            src={wish.claimantAvatar}
            name={wish.claimantName}
            size="xs"
            className="!w-5 !h-5"
          />
          <span className="text-content-muted">{wish.claimantName}</span>
        </div>
      )}

      {/* 底部：作者 + 时间 + 投票 */}
      <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
        {/* 左：作者 + 时间 */}
        <div className="flex items-center gap-2 min-w-0">
          <Avatar src={wish.authorAvatar} name={wish.authorName} size="xs" />
          <span className="text-xs text-content-muted truncate max-w-[80px]">
            {wish.authorName}
          </span>
          <Tooltip content={new Date(wish.createdAt).toLocaleString('zh-CN')}>
            <span className="flex items-center gap-1 text-xs text-content-subtle">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(wish.createdAt)}
            </span>
          </Tooltip>
        </div>

        {/* 右：投票 + 成果链接 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {wish.status === 'completed' && wish.resultUrl && (
            <button
              onClick={handleViewResult}
              className="flex items-center gap-1 text-xs text-success hover:text-success/80 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              查看成果
            </button>
          )}
          <button
            onClick={handleVote}
            disabled={isVoted}
            aria-label={isVoted ? '已投票' : '投票'}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all',
              isVoted
                ? 'bg-warning/15 text-warning border border-warning/30 cursor-default'
                : 'border border-border text-content-subtle hover:text-warning hover:border-warning/40 hover:bg-warning/5'
            )}
          >
            <ThumbsUp className={cn('w-3.5 h-3.5', isVoted && 'fill-current')} />
            {formatNumber(wish.votes)}
          </button>
        </div>
      </div>
    </Card>
  );
}