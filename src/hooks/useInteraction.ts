// ============================================================
// 交互动画 Hooks
// - 动效规范（emil-design-eng）：
//   1. 装饰性鼠标交互必须用 spring 物理插值（直接跟随显得"人造"）
//   2. spring 中断时保留速度（可反向、可打断），优于 CSS transition
//   3. prefers-reduced-motion 时禁用位移类装饰交互
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';

/** 是否偏好减少动效 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 滚动揭示 Hook — 基于 IntersectionObserver
 * 元素进入视口时触发动画
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string; once?: boolean }
) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const { threshold = 0.15, once = true } = options || {};
  const rootMargin = options?.rootMargin ?? '0px 0px -80px 0px';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, visible };
}

/**
 * 数字递增 Hook
 * 元素进入视口时数字从 0 递增到目标值（easeOutExpo）
 */
export function useCountUp(target: number, duration = 1500, start = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!start) return;

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(target * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, start]);

  return value;
}

/**
 * 二维 spring 状态（胡克定律 + 阻尼，半隐式欧拉积分）
 * 中断时保留速度 → 平滑反向，这是 spring 相对 CSS transition 的核心优势
 */
interface SpringState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  raf: number;
  running: boolean;
}

const SPRING_EPSILON = 0.01;

/** 步进一帧并写回元素（write 回调由调用方提供） */
function springStep(s: SpringState, write: (x: number, y: number) => void) {
  const k = 100; // stiffness（emil-design-eng 推荐物理参数）
  const c = 10; // damping
  const m = 1; // mass
  const dt = 1 / 60;

  // 半隐式欧拉：先更新速度，再更新位置
  const ax = (-k * (s.x - s.tx) - c * s.vx) / m;
  const ay = (-k * (s.y - s.ty) - c * s.vy) / m;
  s.vx += ax * dt;
  s.vy += ay * dt;
  s.x += s.vx * dt;
  s.y += s.vy * dt;

  write(s.x, s.y);

  // 收敛判定：位移与速度都足够小则停止 rAF（空闲零开销）
  const settled =
    Math.abs(s.x - s.tx) < SPRING_EPSILON &&
    Math.abs(s.y - s.ty) < SPRING_EPSILON &&
    Math.abs(s.vx) < SPRING_EPSILON &&
    Math.abs(s.vy) < SPRING_EPSILON;
  if (settled) {
    s.running = false;
    return;
  }
  s.raf = requestAnimationFrame(() => springStep(s, write));
}

/**
 * 磁性悬浮 Hook — spring 驱动的 3D 倾斜
 * 鼠标位置设为目标角度，spring 插值逼近（带惯性与回弹，装饰性交互）
 */
export function useMagneticHover<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const state = useRef<SpringState>({
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, running: false,
  });

  const write = useCallback((rx: number, ry: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(800px) rotateX(${rx.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) translateZ(4px)`;
  }, []);

  const startLoop = useCallback(() => {
    const s = state.current;
    if (s.running) return;
    s.running = true;
    s.raf = requestAnimationFrame(() => springStep(s, write));
  }, [write]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const s = state.current;
    // 目标角度：离中心越远倾斜越大（±8deg 封顶）
    s.tx = (y / rect.height) * 8;
    s.ty = (x / rect.width) * 8;
    startLoop();
  }, [startLoop]);

  const handleMouseLeave = useCallback(() => {
    const s = state.current;
    // 目标归零：spring 以保留的速度平滑回弹（而非 CSS 硬过渡）
    s.tx = 0;
    s.ty = 0;
    startLoop();
  }, [startLoop]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(state.current.raf);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return ref;
}

/**
 * 平滑跟随 Hook — spring 插值的光标跟随（CursorGlow 用）
 * 不直接更新目标值，而是让 spring 逼近（有拖尾的"果冻感"）
 */
export function useSmoothFollow<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const state = useRef<SpringState>({
    x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, raf: 0, running: false,
  });

  const write = useCallback((x: number, y: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--mx', `${x.toFixed(1)}px`);
    el.style.setProperty('--my', `${y.toFixed(1)}px`);
  }, []);

  const startLoop = useCallback(() => {
    const s = state.current;
    if (s.running) return;
    s.running = true;
    s.raf = requestAnimationFrame(() => springStep(s, write));
  }, [write]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const s = state.current;

    const handler = (e: MouseEvent) => {
      s.tx = e.clientX;
      s.ty = e.clientY;
      startLoop();
    };
    window.addEventListener('mousemove', handler);
    return () => {
      window.removeEventListener('mousemove', handler);
      cancelAnimationFrame(s.raf);
    };
  }, [startLoop]);

  return ref;
}