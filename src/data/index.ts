// ============================================================
// 码上开演 · 数据统一出口
// ------------------------------------------------------------
// 合并存量 Vibe 数据（./skills，38 条，经 legacyMigration 迁移）
// 与 Opus 索引导入数据（./opus，scripts/generate-opus-skills-data.mjs 生成）。
// 对外仅暴露 skills / featuredSkills / getSkillById 三个 API。
// 注意：全项目请统一从 "@/data" 导入数据，勿直接引用 "@/data/skills"。
// ============================================================
import type { Skill } from '@/types';

import { skills as vibeSkills } from './skills';
import { opusSkills } from './opus';
import { DEMO_MEDIA } from './demo-media';

/** 全站 Skill 数据集（Vibe 存量 + Opus 索引导入） */
export const skills: Skill[] = [...vibeSkills, ...opusSkills];

// 效果展示媒体挂载：合并后统一注入，确保 Opus 数据同样可展示（见 SkillCard.tsx）
skills.forEach((s) => {
  const media = DEMO_MEDIA[s.id];
  if (media && media.length > 0) {
    s.demoMedia = media;
  }
});

/** 精选 Skill（新导入数据默认非精选，精选仍来自存量入口） */
export const featuredSkills: Skill[] = skills.filter((s) => s.featured);

/** 根据 ID 获取 Skill */
export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}
