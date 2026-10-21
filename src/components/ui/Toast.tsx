// ============================================================
// Toast 组件 - 全局提示（基于 Zustand Store）
// - 动效规范（emil-design-eng / Sonner 原则）：
//   1. 使用 CSS transitions 而非 keyframes（Toast 高频触发，需可中断重定向）
//   2. translateY 百分比：以自身高度位移，适配任意内容高度
//   3. 退出快于进入（进入 300ms 优雅、退出 180ms 干脆）
//   4. 进入从 scale(0.97) 起步，绝不用 scale(0)
// ============================================================
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';
import type { ToastItem, ToastType } from '@/types';
import { cn } from '@/utils/cn';

/** 类型图标与颜色映射 */
const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; color: string }
> = {
  success: { icon: CheckCircle2, color: 'text-success' },
  error: { icon: XCircle, color: 'text-error' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
  info: { icon: Info, color: 'text-info' },
};

/** 单条 Toast：入场（挂载后切显示态）+ 退场（leaving 标记驱动） */
function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const config = typeConfig[toast.type];
  const Icon = config.icon;

  // 挂载后切换到显示态（双 rAF 确保初始态已提交，transition 才会触发）
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  // leaving 标记 → 播放退场
  useEffect(() => {
    if (toast.leaving) setVisible(false);
  }, [toast.leaving]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-card-hover',
        'bg-base-surface border-border',
        // transition（非 keyframes）：可中断、可重定向
        'transition-[transform,opacity] ease-out-strong',
        visible ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-full scale-[0.97] opacity-0'
      )}
      style={{ transitionDuration: visible ? '300ms' : '180ms' }}
      role="status"
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.color)} />
      <p className="flex-1 text-sm text-content leading-relaxed">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-content-subtle hover:text-content transition-colors active:scale-90 flex-shrink-0"
        aria-label="关闭"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Toast 容器组件 */
export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>,
    document.body
  );
}