// ============================================================
// 码上开演 · Opus 索引数据合并导出
// ------------------------------------------------------------
// 本文件由 scripts/generate-opus-skills-data.mjs 自动生成，请勿手工编辑。
// 数据来源：Opus 5.5 前端动画视频 Skills 索引（2026-10-20 采集），共 545 条。
// ============================================================
import type { Skill } from '@/types';

import { opusPromoSkills } from './promo';
import { opusEducationSkills } from './education';
import { opusMotionDesignSkills } from './motion-design';
import { opusNarrativeMvSkills } from './narrative-mv';
import { opusGameInteractiveSkills } from './game-interactive';
import { opusPostProductionSkills } from './post-production';
import { opusGeneralVideoSkills } from './general-video';
import { opusUncategorizedSkills } from './uncategorized';

/** Opus 5.5 前端动画视频 Skills 索引导入的数据（共 545 条） */
export const opusSkills: Skill[] = [
  ...opusPromoSkills,
  ...opusEducationSkills,
  ...opusMotionDesignSkills,
  ...opusNarrativeMvSkills,
  ...opusGameInteractiveSkills,
  ...opusPostProductionSkills,
  ...opusGeneralVideoSkills,
  ...opusUncategorizedSkills,
];
