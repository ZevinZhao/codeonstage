import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, Star, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { GalleryMedia } from '@/components/skill/GalleryMedia';
import { StatusBadge } from './StatusBadge';
import { NoteEditor } from './NoteEditor';
import { getSkillById } from '@/data';
import { PRIMARY_CATEGORY_LABELS } from '@/utils/constants';
import { formatRelativeTime, formatNumber, truncate } from '@/utils/format';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useToastStore } from '@/store/useToastStore';
import type { Favorite } from '@/types';

interface FavoriteCardProps { favorite: Favorite; className?: string }

export function FavoriteCard({ favorite, className }: FavoriteCardProps) {
  const updateStatus = useFavoriteStore((state) => state.updateStatus);
  const updateNote = useFavoriteStore((state) => state.updateNote);
  const removeFavorite = useFavoriteStore((state) => state.removeFavorite);
  const showToast = useToastStore((state) => state.showToast);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const skill = getSkillById(favorite.skillId);

  const remove = () => {
    removeFavorite(favorite.skillId);
    setConfirmOpen(false);
    showToast('success', '已取消收藏');
  };

  if (!skill) return null;

  return (
    <>
      <article className={cn('group overflow-hidden rounded-[8px] border border-white/10 bg-[#0d0d0d] transition-colors hover:border-white/25', className)}>
        <div className="relative min-h-40 overflow-hidden bg-[#111]">
          <GalleryMedia media={skill.demoMedia ?? []} paused={false} fallback={<div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#303036,transparent_42%),#111113] px-8 text-center text-xl text-white/85">{skill.name}</div>} />
          <div className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-[10px] text-white/65 backdrop-blur-md">{PRIMARY_CATEGORY_LABELS[skill.primaryCategory]}</div>
          <button onClick={() => setConfirmOpen(true)} className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/65 p-2 text-white/50 opacity-0 backdrop-blur-md transition-all hover:text-white group-hover:opacity-100" aria-label="取消收藏"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/skills/${skill.id}`} className="inline-flex max-w-full items-center gap-1.5 text-base font-black text-white hover:text-white/75"><span className="truncate">{skill.name}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" /></Link>
              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-white/35"><span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{formatNumber(skill.stars)}</span><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeTime(favorite.addedAt)}</span></div>
            </div>
            <StatusBadge status={favorite.status} editable onChange={(status) => updateStatus(favorite.skillId, status)} />
          </div>
          <p className="min-h-10 text-xs leading-5 text-white/45">{truncate(skill.description, 92)}</p>
          <div className="mt-4"><NoteEditor value={favorite.note} onSave={(note) => updateNote(favorite.skillId, note)} /></div>
        </div>
      </article>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="取消收藏" size="sm" footer={<><Button variant="secondary" onClick={() => setConfirmOpen(false)}>保留</Button><Button variant="danger" onClick={remove}>确认取消</Button></>}><p className="text-sm leading-6 text-content-muted">取消收藏“{skill.name}”后，这张卡片里的使用心得也会一起删除。</p></Modal>
    </>
  );
}
