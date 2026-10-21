// ============================================================
// WishDetail - 许愿详情组件（Modal）
// ============================================================
import { useState, useEffect } from 'react';
import {
  ThumbsUp,

  ExternalLink,
  Trash2,
  Pencil,
  User,
  UserCheck,
  Link2,
  Calendar,
} from 'lucide-react';
import type { Wish, PrimaryCategory } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { ClaimButton } from './ClaimButton';
import {
  WISH_STATUS_TEXT,
  WISH_STATUS_BADGE_COLOR,
  WISH_STATUS_HEX,
} from './wishConstants';
import { useWishStore } from '@/store/useWishStore';
import { toast } from '@/store/useToastStore';
import { PRIMARY_CATEGORY_LABELS, ALL_PRIMARY_CATEGORIES, getFreeTagColor } from '@/utils/constants';
import { formatRelativeTime, formatNumber } from '@/utils/format';
import { getCurrentUser } from '@/utils/userStorage';
import { cn } from '@/utils/cn';

/** WishDetail Props */
interface WishDetailProps {
  wish: Wish | null;
  open: boolean;
  onClose: () => void;
  isVoted: boolean;
  onVote: (id: string) => void;
}

/** 大类下拉选项 */
const primaryCategoryOptions = ALL_PRIMARY_CATEGORIES.map((c) => ({
  value: c,
  label: PRIMARY_CATEGORY_LABELS[c],
}));

/** WishDetail 组件 */
export function WishDetail({ wish, open, onClose, isVoted, onVote }: WishDetailProps) {
  const claimWish = useWishStore((s) => s.claimWish);
  const completeWish = useWishStore((s) => s.completeWish);
  const abandonClaim = useWishStore((s) => s.abandonClaim);
  const removeWish = useWishStore((s) => s.removeWish);
  const editWish = useWishStore((s) => s.editWish);

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 编辑表单状态
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrimaryCategory, setEditPrimaryCategory] = useState<PrimaryCategory>('vibe');
  const [editTags, setEditTags] = useState<string[]>([]);

  // 当 wish 变化时初始化编辑表单
  useEffect(() => {
    if (wish && showEdit) {
      setEditTitle(wish.title);
      setEditDesc(wish.description);
      setEditPrimaryCategory(wish.primaryCategory);
      setEditTags(wish.tags);
    }
  }, [wish, showEdit]);

  if (!wish) return null;

  const currentUser = getCurrentUser();
  const isAuthor = wish.authorName === currentUser.userName;

  /** 投票 */
  const handleVote = () => {
    onVote(wish.id);
  };

  /** 认领 */
  const handleClaim = (id: string) => {
    claimWish(id, currentUser.userName, currentUser.userAvatar);
    toast.success('认领成功！请尽快开始制作');
  };

  /** 提交成果 */
  const handleSubmitResult = (id: string, resultUrl: string) => {
    completeWish(id, resultUrl);
    toast.success('成果已提交，感谢你的贡献！');
  };

  /** 放弃认领 */
  const handleAbandon = (id: string) => {
    abandonClaim(id);
    toast.info('已放弃认领');
  };

  /** 删除 */
  const handleDelete = () => {
    removeWish(wish.id);
    toast.success('需求已删除');
    setShowDeleteConfirm(false);
    onClose();
  };

  /** 保存编辑 */
  const handleSaveEdit = () => {
    if (!editTitle.trim() || !editDesc.trim()) {
      toast.error('标题和描述不能为空');
      return;
    }
    editWish(wish.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      primaryCategory: editPrimaryCategory,
      tags: editTags,
    });
    toast.success('修改已保存');
    setShowEdit(false);
  };

  return (
    <>
      <Modal
        open={open && !showEdit && !showDeleteConfirm}
        onClose={onClose}
        title="需求详情"
        size="lg"
      >
        <div className="space-y-5">
          {/* 状态 + 分类 */}
          <div className="flex items-center justify-between gap-2">
            <Badge color={WISH_STATUS_BADGE_COLOR[wish.status]} size="md">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: WISH_STATUS_HEX[wish.status] }}
              />
              {WISH_STATUS_TEXT[wish.status]}
            </Badge>
            <Badge
              color="bg-white/[0.05] text-content-muted border-border"
              size="md"
            >
              {PRIMARY_CATEGORY_LABELS[wish.primaryCategory]}
            </Badge>
          </div>

          {/* 标题 */}
          <h2 className="text-xl font-semibold text-content leading-snug">
            {wish.title}
          </h2>

          {/* 描述 */}
          <p className="text-sm text-content-muted leading-relaxed whitespace-pre-wrap">
            {wish.description}
          </p>

          {/* 标签 */}
          {wish.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {wish.tags.map((tag) => (
                <Badge key={tag} color={getFreeTagColor(tag)} size="md">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* 提出者 + 时间 */}
          <div className="flex flex-wrap items-center gap-4 py-3 border-y border-border-subtle text-sm">
            <div className="flex items-center gap-2">
              <Avatar src={wish.authorAvatar} name={wish.authorName} size="sm" />
              <div className="flex flex-col">
                <span className="text-xs text-content-subtle">提出者</span>
                <span className="text-sm text-content">{wish.authorName}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-content-subtle">
              <Calendar className="w-4 h-4" />
              <span>{new Date(wish.createdAt).toLocaleDateString('zh-CN')}</span>
              <span className="text-content-faint">
                （{formatRelativeTime(wish.createdAt)}）
              </span>
            </div>
          </div>

          {/* 认领者信息 */}
          {wish.claimantName && wish.status !== 'open' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.03] border border-border-subtle">
              <UserCheck className="w-4 h-4 text-content-subtle" />
              <Avatar
                src={wish.claimantAvatar}
                name={wish.claimantName}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="text-xs text-content-subtle">认领者</span>
                <span className="text-sm text-content">{wish.claimantName}</span>
              </div>
            </div>
          )}

          {/* 成果链接 */}
          {wish.status === 'completed' && wish.resultUrl && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/15">
              <Link2 className="w-4 h-4 text-success" />
              <span className="text-sm text-content-muted">成果链接：</span>
              <a
                href={wish.resultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-success hover:underline truncate"
              >
                {wish.resultUrl}
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* 投票区 */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleVote}
              disabled={isVoted}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isVoted
                  ? 'bg-warning/15 text-warning border border-warning/30 cursor-default'
                  : 'border border-border text-content-muted hover:text-warning hover:border-warning/40 hover:bg-warning/5'
              )}
            >
              <ThumbsUp className={cn('w-4 h-4', isVoted && 'fill-current')} />
              {isVoted ? '已投票' : '投票支持'}
              <span className="ml-1 px-2 py-0.5 rounded-md bg-base-elevated text-content">
                {formatNumber(wish.votes)}
              </span>
            </button>

            {/* 作者操作 */}
            {isAuthor && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil className="w-4 h-4" />}
                  onClick={() => setShowEdit(true)}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="w-4 h-4" />}
                  className="text-error hover:text-error hover:bg-error/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  删除
                </Button>
              </div>
            )}
          </div>

          {/* 认领操作区 */}
          <div className="pt-4 border-t border-border-subtle">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-content-subtle" />
              <span className="text-sm text-content-muted">认领与制作</span>
            </div>
            <ClaimButton
              wish={wish}
              currentUser={currentUser}
              onClaim={handleClaim}
              onSubmitResult={handleSubmitResult}
              onAbandon={handleAbandon}
              onViewResult={(url) =>
                window.open(url, '_blank', 'noopener,noreferrer')
              }
              fullWidth
            />
            {!isAuthor && wish.status === 'open' && (
              <p className="mt-2 text-xs text-content-faint">
                认领后请尽快开始制作，完成后提交成果链接。
              </p>
            )}
            {isAuthor && (
              <p className="mt-2 text-xs text-content-faint">
                这是你提出的需求，等待社区成员认领制作。
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="编辑需求"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEdit(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-content-muted mb-1.5">
              需求标题
            </label>
            <Input
              value={editTitle}
              maxLength={80}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-muted mb-1.5">
              需求描述
            </label>
            <Textarea
              value={editDesc}
              rows={5}
              maxLength={1000}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-muted mb-1.5">
              所属大类
            </label>
            <Select
              options={primaryCategoryOptions}
              value={editPrimaryCategory}
              onChange={(e) => setEditPrimaryCategory(e.target.value as PrimaryCategory)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-muted mb-1.5">
              标签（每行一个）
            </label>
            <Textarea
              value={editTags.join('\n')}
              rows={3}
              placeholder="每行一个标签"
              onChange={(e) =>
                setEditTags(
                  e.target.value
                    .split('\n')
                    .map((t) => t.trim())
                    .filter(Boolean)
                )
              }
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认 */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="确认删除"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-content-muted leading-relaxed">
          确定要删除需求「{wish.title}」吗？此操作不可撤销。
        </p>
      </Modal>
    </>
  );
}