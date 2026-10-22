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

export function getPrimaryCategoryIcon(category: PrimaryCategory): LucideIcon {
  return PRIMARY_CATEGORY_ICON_MAP[category] ?? CircleDashed;
}
