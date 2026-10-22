import type { WishStatus } from '@/types';

export const WISH_STATUS_TEXT: Record<WishStatus, string> = {
  open: '待认领',
  claimed: '已认领',
  'in-progress': '制作中',
  completed: '已完成',
};

export const WISH_STATUS_BADGE_COLOR: Record<WishStatus, string> = {
  open: 'bg-info/10 text-info border-info/20',
  claimed: 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  completed: 'bg-success/10 text-success border-success/20',
};

export const WISH_STATUS_HEX: Record<WishStatus, string> = {
  open: '#3b82f6',
  claimed: '#f59e0b',
  'in-progress': '#8b5cf6',
  completed: '#22c55e',
};
