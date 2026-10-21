// ============================================================
// FilmFrame - 胶片边框容器（首页胶卷语言的克制延伸）
// - 上下细齿孔带 + 近黑底 + 细边框 + 上缘细高光（轻微曲面暗示）
// - 仅用于作品媒体展示区（让视频/图片成为焦点，边框退后）
// - 静止无动画；齿孔为低亮度点缀，不影响内容观看
// ============================================================
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** FilmFrame Props */
interface FilmFrameProps {
  children: ReactNode;
  /** 自定义类名 */
  className?: string;
}

/** FilmFrame 组件 - 胶片边框媒体容器 */
export function FilmFrame({ children, className }: FilmFrameProps) {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-[#0b0b0c]',
        // 上缘细高光 + 轻投影：暗示轻微曲面、建立层次（均很克制）
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_32px_rgba(0,0,0,0.35)]',
        className
      )}
    >
      {/* 上齿孔带 */}
      <div className="film-band" aria-hidden="true" />
      {/* 画面区：纯黑底衬托媒体原始比例 */}
      <div className="bg-black">{children}</div>
      {/* 下齿孔带 */}
      <div className="film-band" aria-hidden="true" />
    </figure>
  );
}