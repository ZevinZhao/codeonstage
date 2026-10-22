import type { Skill } from '@/types';

import { opusPromoSkills } from './promo';
import { opusEducationSkills } from './education';
import { opusMotionDesignSkills } from './motion-design';
import { opusNarrativeMvSkills } from './narrative-mv';
import { opusGameInteractiveSkills } from './game-interactive';
import { opusPostProductionSkills } from './post-production';
import { opusGeneralVideoSkills } from './general-video';
import { opusUncategorizedSkills } from './uncategorized';

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
