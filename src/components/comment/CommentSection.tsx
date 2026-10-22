import { useMemo, useState } from 'react';
import { MessageSquare, Send, Flame, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

import { StarRating } from './StarRating';
import { WorkUpload } from './WorkUpload';
import { CommentItem } from './CommentItem';
import { useCommentStore } from '@/store/useCommentStore';
import { useToastStore } from '@/store/useToastStore';
import { getCurrentUser, setCurrentUser } from '@/utils/currentUser';
import type { WorkShowcase } from '@/types';

type SortMode = 'latest' | 'hot';

interface CommentSectionProps {
  skillId: string;
  className?: string;
  showHeader?: boolean;
  showOverview?: boolean;
}

export function CommentSection({
  skillId,
  className,
  showHeader = true,
  showOverview = true,
}: CommentSectionProps) {
  const comments = useCommentStore((s) => s.comments);
  const addComment = useCommentStore((s) => s.addComment);
  const showToast = useToastStore((s) => s.showToast);

  const currentUser = getCurrentUser();
  const [userName, setUserName] = useState(currentUser.userName);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [works, setWorks] = useState<WorkShowcase[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('latest');

  const skillComments = useMemo(() => {
    const list = comments.filter((c) => c.skillId === skillId);
    if (sortMode === 'latest') {
      return [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return [...list].sort((a, b) => {
      if (b.likes !== a.likes) return b.likes - a.likes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [comments, skillId, sortMode]);

  const stats = useMemo(() => {
    const total = skillComments.length;
    if (total === 0) {
      return { avg: 0, total, distribution: [0, 0, 0, 0, 0] };
    }
    const distribution = [0, 0, 0, 0, 0]; // 1星 ~ 5星
    let sum = 0;
    for (const c of skillComments) {
      sum += c.rating;
      const idx = Math.min(Math.max(Math.round(c.rating), 1), 5) - 1;
      distribution[idx] += 1;
    }
    return { avg: sum / total, total, distribution };
  }, [skillComments]);

  const handleSubmit = () => {
    const trimmedName = userName.trim() || '匿名用户';
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      showToast('warning', '请输入评论内容');
      return;
    }
    if (trimmedContent.length < 5) {
      showToast('warning', '评论内容至少 5 个字');
      return;
    }

    setSubmitting(true);

    try {
      setCurrentUser({ userName: trimmedName, userAvatar: '' });

      addComment({
        skillId,
        userName: trimmedName,
        userAvatar: '',
        content: trimmedContent,
        rating,
        works: works.length > 0 ? works : undefined,
      });

      setContent('');
      setRating(5);
      setWorks([]);
      showToast('success', '评论发表成功！');
    } catch {
      showToast('error', '评论发表失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = content.trim().length >= 5 && !submitting;

  return (
    <section className={cn('w-full', className)}>
      {showHeader && (
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-content-subtle" />
          <h2 className="text-lg font-semibold text-content">评论区</h2>
          <span className="text-sm text-content-subtle">({stats.total})</span>
        </div>
      )}

      {showOverview && stats.total > 0 && (
        <Card className="mb-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="flex items-center gap-3 sm:pr-6">
              <div className="text-3xl font-bold text-content tabular-nums">
                {stats.avg.toFixed(1)}
              </div>
              <div>
                <StarRating value={stats.avg} readOnly size="sm" />
                <div className="text-xs text-content-faint mt-1">
                  共 {stats.total} 条评论
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star - 1];
                const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-content-subtle w-8 flex-shrink-0">{star}星</span>
                    <div className="flex-1 h-1.5 rounded-full bg-base-elevated overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white/25 transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-content-faint w-6 text-right tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <h3 className="text-sm font-medium text-content mb-3">发表评论</h3>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="sm:w-48">
              <label className="block text-xs text-content-subtle mb-1.5">用户名</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="匿名用户"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-xs text-content-subtle mb-1.5">评分</label>
              <StarRating value={rating} onChange={setRating} size="md" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-content-subtle mb-1.5">
              评论内容 <span className="text-content-faint">（至少 5 个字）</span>
            </label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享你的使用体验、优缺点、适用场景..."
              rows={4}
              maxLength={1000}
              className="min-h-[100px]"
            />
            <div className="text-right text-xs text-content-faint mt-1">
              {content.length}/1000
            </div>
          </div>

          <div>
            <label className="block text-xs text-content-subtle mb-1.5">
              成品展示 <span className="text-content-faint">（可选）</span>
            </label>
            <WorkUpload works={works} onChange={setWorks} />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
              icon={!submitting ? <Send className="w-4 h-4" /> : undefined}
            >
              发表评论
            </Button>
          </div>
        </div>
      </Card>

      {stats.total > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setSortMode('latest')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              sortMode === 'latest'
                ? 'bg-base-elevated text-content border border-border'
                : 'text-content-subtle hover:text-content-muted'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            最新
          </button>
          <button
            type="button"
            onClick={() => setSortMode('hot')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
              sortMode === 'hot'
                ? 'bg-base-elevated text-content border border-border'
                : 'text-content-subtle hover:text-content-muted'
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            最热
          </button>
        </div>
      )}

      {skillComments.length === 0 ? (
        <EmptyState
          title="暂无评论"
          description="成为第一个分享使用体验的人吧！"
        />
      ) : (
        <div className="space-y-3">
          {skillComments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </section>
  );
}
