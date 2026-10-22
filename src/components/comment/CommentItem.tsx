import { useState } from 'react';
import { Heart, Trash2, ZoomIn } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { StarRating } from './StarRating';
import { formatRelativeTime } from '@/utils/format';
import { isCurrentUser } from '@/utils/currentUser';
import { useCommentStore } from '@/store/useCommentStore';
import { useToastStore } from '@/store/useToastStore';
import type { Comment } from '@/types';

interface CommentItemProps {
  comment: Comment;
  className?: string;
}

export function CommentItem({ comment, className }: CommentItemProps) {
  const likeComment = useCommentStore((s) => s.likeComment);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const showToast = useToastStore((s) => s.showToast);

  const [liked, setLiked] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isOwn = isCurrentUser(comment.userName);

  const handleLike = () => {
    if (liked) {
      showToast('info', '你已经点过赞了');
      return;
    }
    setLiked(true);
    likeComment(comment.id);
  };

  const handleConfirmDelete = () => {
    deleteComment(comment.id);
    setDeleteConfirmOpen(false);
    showToast('success', '评论已删除');
  };

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-xl bg-base-card border border-border',
        'hover:border-border-strong transition-colors',
        className
      )}
    >
      <Avatar src={comment.userAvatar} name={comment.userName} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          <span className="text-sm font-medium text-content">{comment.userName}</span>
          <span className="text-xs text-content-faint">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {isOwn && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-white/[0.06] text-content-muted border border-border">
              我
            </span>
          )}
          <div className="ml-auto">
            <StarRating value={comment.rating} readOnly size="sm" />
          </div>
        </div>

        {comment.content && (
          <p className="text-sm text-content-muted leading-relaxed whitespace-pre-wrap break-words mb-3">
            {comment.content}
          </p>
        )}

        {comment.works && comment.works.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {comment.works.map((work) => (
              <div
                key={work.id}
                className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-base-elevated cursor-zoom-in"
                onClick={() => work.imageUrl && setPreviewUrl(work.imageUrl)}
              >
                {work.imageUrl ? (
                  <img
                    src={work.imageUrl}
                    alt={work.description || '成品展示'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-content-faint text-xs">
                    无图
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {work.description && (
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-white text-xs truncate">
                    {work.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLike}
            className={cn(
              'inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md',
              'transition-[color,background-color] duration-200 ease-out-strong active:scale-95',
              liked
                ? 'text-error bg-error/10'
                : 'text-content-subtle hover:text-error hover:bg-error/5'
            )}
          >
            <Heart
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-[120ms] ease-out-strong',
                liked && 'fill-current scale-110'
              )}
            />
            <span className="tabular-nums">{comment.likes}</span>
          </button>

          {isOwn && (
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md text-content-subtle hover:text-error hover:bg-error/5 transition-colors"
              aria-label="删除评论"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
          )}
        </div>
      </div>

      <Modal
        open={previewUrl !== null}
        onClose={() => setPreviewUrl(null)}
        size="lg"
        title="成品展示"
      >
        {previewUrl && (
          <div className="rounded-lg overflow-hidden bg-base">
            <img src={previewUrl} alt="成品展示" className="w-full h-auto" />
          </div>
        )}
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="确认删除"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-base-elevated text-content border border-border hover:border-border-strong transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              确认删除
            </button>
          </>
        }
      >
        <p className="text-sm text-content-muted leading-relaxed">
          确定要删除这条评论吗？此操作不可撤销。
        </p>
      </Modal>
    </div>
  );
}
