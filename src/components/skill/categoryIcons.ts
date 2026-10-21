// ============================================================
// categoryIcons - 一级大类 Lucide 图标映射（共享）
// 与 utils/constants.ts 的 PRIMARY_CATEGORY_ICONS（字符串 key）对应，
// 供 CategoryNav / HomePage / SkillFilter 等展示大类图标时统一引用。
// ============================================================
import {
  Sparkles,
  Megaphone,
  GraduationCap,
  Wand2,
  Clapperboard,
  Gamepad2,
  Scissors,
  Video,
  CircleDashed,
  type LucideIcon,
} from 'lucide-react';
import type { PrimaryCategory } from '@/types';

/** 大类图标组件映射（按展示顺序，vibe 排第一位） */
export const PRIMARY_CATEGORY_ICON_MAP: Record<PrimaryCategory, LucideIcon> = {
  vibe: Sparkles,
  promo: Megaphone,
  education: GraduationCap,
  'motion-design': Wand2,
  'narrative-mv': Clapperboard,
  'game-interactive': Gamepad2,
  'post-production': Scissors,
  'general-video': Video,
  uncategorized: CircleDashed,
};

/** 获取大类图标组件（未知大类回退为 CircleDashed） */
export function getPrimaryCategoryIcon(category: PrimaryCategory): LucideIcon {
  return PRIMARY_CATEGORY_ICON_MAP[category] ?? CircleDashed;
}