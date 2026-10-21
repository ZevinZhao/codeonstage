// ============================================================
// 交互动画组件
// - 动效规范（emil-design-eng）：
//   1. MagneticCard：spring 物理驱动（JS 写 transform，无 CSS 过渡，可中断保留速度）
//   2. ScrollReveal：500ms 强 ease-out，位移收敛（16px），含蓄不夸张
//   3. CursorGlow：spring 平滑跟随 + 降低透明度（装饰含蓄化）
//   4. Aurora：无限循环漂移（持续运动，合法的 ease-in-out 场景）
// ============================================================
import { type ReactNode } from 'react';
import {
  useScrollReveal,
  useCountUp,
  useMagneticHover,
  useSmoothFollow,
  prefersReducedMotion,
} from '@/hooks/useInteraction';

/** 滚动揭示容器：进入视口时淡入上移 */
export function ScrollReveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`${className} transition-[transform,opacity] duration-500 ease-out-strong ${
        visible
          ? 'opacity-100 translate-y-0'
          : prefersReducedMotion()
            ? 'opacity-0 translate-y-0'
            : 'opacity-0 translate-y-4'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** 数字递增显示 */
export function CountUp({
  value,
  duration = 1500,
  suffix = '',
  prefix = '',
  className = '',
}: {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal<HTMLSpanElement>({ threshold: 0.5 });
  const displayValue = useCountUp(value, duration, visible);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

/** 磁性悬浮卡片：spring 物理驱动 3D 倾斜（无 CSS 过渡，spring 直接写 transform） */
export function MagneticCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useMagneticHover<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`${className} will-change-transform`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

/** 流动极光背景 */
export function AuroraBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* 极光光带 1 */}
      <div
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-20 aurora-drift-1"
        style={{
          background: 'radial-gradient(circle, #8B5CF6, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
      {/* 极光光带 2 */}
      <div
        className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-15 aurora-drift-2"
        style={{
          background: 'radial-gradient(circle, #EC4899, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
      {/* 极光光带 3 */}
      <div
        className="absolute -bottom-1/4 left-1/3 w-1/2 h-1/2 rounded-full opacity-[0.12] aurora-drift-3"
        style={{
          background: 'radial-gradient(circle, #06B6D4, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />
      {/* 网格纹理 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}

/** 光标跟随光晕：spring 平滑跟随（果冻拖尾感），透明度克制 */
export function CursorGlow() {
  const ref = useSmoothFollow<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="fixed inset-0 pointer-events-none z-50 hidden md:block"
      id="cursor-glow"
      style={{
        background:
          'radial-gradient(circle 300px at var(--mx, 50%) var(--my, 50%), rgba(139,92,246,0.05), transparent 70%)',
      }}
    />
  );
}