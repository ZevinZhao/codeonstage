

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/store/useToastStore';
import type { ToastItem, ToastType } from '@/types';
import { cn } from '@/utils/cn';


const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle2; color: string }
> = {
  success: { icon: CheckCircle2, color: 'text-success' },
  error: { icon: XCircle, color: 'text-error' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
  info: { icon: Info, color: 'text-info' },
};


function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const config = typeConfig[toast.type];
  const Icon = config.icon;


  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    );
    return () => cancelAnimationFrame(raf);
  }, []);


  useEffect(() => {
    if (toast.leaving) setVisible(false);
  }, [toast.leaving]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-card-hover',
        'bg-base-surface border-border',

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
