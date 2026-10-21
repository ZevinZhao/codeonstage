// ============================================================
// PageHeader - 内页统一页头（以首页放映厅刊头为视觉基准）
// - 眉标：小号大写字距宽（与首页 "Screening Room" 同语言）
// - 标题：font-display 中文衬线 + 宽字距（与首页作品大标题一致）
// - 描述：中灰辅助信息
// - 胶片齿孔分隔线：film-divider 低亮度点缀
// - 入场：animate-fade-up（与首页信息区同节奏，reduced-motion 全局降级）
// ============================================================
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** PageHeader Props */
interface PageHeaderProps {
  /** 眉标小字（如 "Skill Library"，大写英文与首页 Screening Room 同语言） */
  eyebrow: string;
  /** 页面主标题（衬线展示） */
  title: string;
  /** 辅助描述 */
  description?: string;
  /** 右侧附加内容（操作按钮等） */
  actions?: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/** PageHeader 组件 - 内页统一刊头 */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 animate-fade-up', className)}>
      <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-content-faint">
        {eyebrow}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-[1.15] tracking-[0.06em] text-content md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-content-subtle">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}