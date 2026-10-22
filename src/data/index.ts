import type { Skill } from '@/types';

import { skills as vibeSkills } from './skills';
import { opusSkills } from './opus';
import { DEMO_MEDIA } from './demo-media';

export const skills: Skill[] = [...vibeSkills, ...opusSkills];

skills.forEach((s) => {
  const media = DEMO_MEDIA[s.id];
  if (media && media.length > 0) {
    s.demoMedia = media;
  }
});

export const featuredSkills: Skill[] = skills.filter((s) => s.featured);

export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}
