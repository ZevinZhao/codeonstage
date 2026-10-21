// ============================================================
// FavoriteCard 收藏卡片组件
// - 展示 Skill 信息（名称、分类、描述截断）
// - 状态标识（StatusBadge，可切换）
// - 使用心得（NoteEditor）
// - 收藏时间
// - 跳转到 Skill 详情
// - 取消收藏按钮（带 Modal 确认弹窗）
// ============================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Trash2, Star, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from './StatusBadge';
import { NoteEditor } from './NoteEditor';
import { getSkillById } from '@/data';
import {
  PRIMARY_CATEGORY_LABELS,
  flattenSkillTags,
  getTagBadgeColor,
} from '@/utils/constants';
import { formatRelativeTime, formatNumber, truncate } from '@/utils/format';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useToastStore } from '@/store/useToastStore';
import type { Favorite } from '@/types';

/** FavoriteCard Props */
interface FavoriteCardProps {
  /** 收藏数据 */
  favorite: Favorite;
  /** 自定义类名 */
  className?: string;
}

/** FavoriteCard 组件 */
export function FavoriteCard({ favorite, className }: FavoriteCardProps) {
  const updateStatus = useFavoriteStore((s) => s.updateStatus);
  const updateNote = useFavoriteStore((s) => s.updateNote);
  const removeFavorite = useFavoriteStore((s) => s.removeFavorite);
  const showToast = useToastStore((s) => s.showToast);

  // 删除确认弹窗
  const [confirmOpen, setConfirmOpen] = useState(false);

  const skill = getSkillById(favorite.skillId);

  /** 处理取消收藏（打开确认弹窗） */
  const handleRemoveClick = () => {
    setConfirmOpen(true);
  };

  /** 确认取消收藏 */
  const handleConfirmRemove = () => {
    removeFavorite(favorite.skillId);
    setConfirmOpen(false);
    showToast('success', '已取消收藏');
  };

  /** 处理状态切换 */
  const handleStatusChange = (status: typeof favorite.status) => {
    updateStatus(favorite.skillId, status);
    showToast('success', '状态已更新');
  };

  /** 处理心得保存 */
  const handleNoteSave = (note: string) => {
    updateNote(favorite.skillId, note);
  };

  /** 渲染删除确认弹窗 */
  const renderConfirmModal = () => (
    <Modal
      open={confirmOpen}
      onClose={() => setConfirmOpen(false)}
      title="确认取消收藏"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
            再想想
          </Button>
          <Button variant="danger" onClick={handleConfirmRemove} icon={<Trash2 className="w-4 h-4" />}>
            确认取消
          </Button>
        </>
      }
    >
      <p className="text-sm text-content-muted leading-relaxed">
        确定要取消收藏「{skill?.name ?? '该 Skill'}」吗？
        <br />
        相关使用心得将一并删除，此操作不可撤销。
      </p>
    </Modal>
  );

  // Skill 不存在的兜底
  if (!skill) {
    return (
      <>
        <Card className={cn('flex flex-col gap-3', className)}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-content-muted">该 Skill 已下架</span>
            <StatusBadge status={favorite.status} />
          </div>
          <div className="text-xs text-content-faint">
            收藏于 {formatRelativeTime(favorite.addedAt)}
          </div>
          <Button variant="danger" size="sm" onClick={handleRemoveClick} icon={<Trash2 className="w-3.5 h-3.5" />}>
            移除收藏
          </Button>
        </Card>
        {renderConfirmModal()}
      </>
    );
  }

  return (
    <>
      <Card className={cn('flex flex-col gap-3', className)}>
        {/* 头部：分类 + 状态 */}
        <div className="flex items-start justify-between gap-2">
          <Badge>
            {PRIMARY_CATEGORY_LABELS[skill.primaryCategory]}
          </Badge>
          <StatusBadge
            status={favorite.status}
            editable
            onChange={handleStatusChange}
          />
        </div>

        {/* 标题 + Stars */}
        <div>
          <Link
            to={`/skills/${skill.id}`}
            className="group inline-flex items-center gap-1.5 text-base font-medium text-content hover:text-white transition-colors"
          >
            {skill.name}
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <div className="flex items-center gap-3 mt-1 text-xs text-content-faint">
            <span className="inline-flex items-center gap-1">
              <Star className="w-3 h-3" />
              {formatNumber(skill.stars)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              收藏于 {formatRelativeTime(favorite.addedAt)}
            </span>
          </div>
        </div>

        {/* 描述截断 */}
        <p className="text-sm text-content-muted leading-relaxed">
          {truncate(skill.description, 100)}
        </p>

        {/* 标签 */}
        {flattenSkillTags(skill.tags).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {flattenSkillTags(skill.tags).slice(0, 4).map((t) => (
              <Badge key={`${t.dimension}-${t.value}`} color={getTagBadgeColor(t.dimension, t.value)}>
                {t.label}
              </Badge>
            ))}
          </div>
        )}

        {/* 使用心得 */}
        <div className="pt-2 border-t border-border">
          <NoteEditor value={favorite.note} onSave={handleNoteSave} />
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Link to={`/skills/${skill.id}`}>
            <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
              查看详情
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={handleRemoveClick}
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            取消收藏
          </Button>
        </div>
      </Card>
      {renderConfirmModal()}
    </>
  );
}