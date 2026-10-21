// ============================================================
// 许愿模块共享常量
// ============================================================
// 状态颜色按需求规格定义（不修改全局 constants.ts，避免影响其他模块）
//   open        -> 蓝色 #3b82f6
//   claimed     -> 橙色 #f59e0b
//   in-progress -> 紫色 #8b5cf6
//   completed   -> 绿色 #22c55e
import type { WishStatus } from '@/types';

/** 许愿状态中文标签 */
export const WISH_STATUS_TEXT: Record<WishStatus, string> = {
  open: '待认领',
  claimed: '已认领',
  'in-progress': '制作中',
  completed: '已完成',
};

/**
 * 许愿状态对应的 Badge 颜色类（Tailwind）
 * 使用 /10 透明度背景 + /20 边框，与项目其他 Badge 风格保持一致
 */
export const WISH_STATUS_BADGE_COLOR: Record<WishStatus, string> = {
  open: 'bg-info/10 text-info border-info/20',
  claimed: 'bg-warning/10 text-warning border-warning/20',
  'in-progress': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  completed: 'bg-success/10 text-success border-success/20',
};

/** 许愿状态对应的纯色 hex（用于状态点等需要纯色的场景） */
export const WISH_STATUS_HEX: Record<WishStatus, string> = {
  open: '#3b82f6',
  claimed: '#f59e0b',
  'in-progress': '#8b5cf6',
  completed: '#22c55e',
};