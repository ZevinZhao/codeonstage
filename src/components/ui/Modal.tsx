// ============================================================
// Modal 组件 - 模态框
// - 进出场动画（emil-design-eng）：进入 200ms 强 ease-out，退出 150ms（退出快于进入）
// - 模态框保持 transform-origin: center（Emil 例外条款：modal 不锚定触发器）
// ============================================================
import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Modal Props */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/** 尺寸映射 */
const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/** Modal 组件 */
export function Modal({ open, onClose, title, children, footer, size = 'md', className }: ModalProps) {
  // mounted：是否渲染（退出动画期间仍保持挂载）
  // visible：是否处于显示态（驱动进出场过渡）
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  // open 变化 → 进出场编排
  useEffect(() => {
    if (open) {
      setMounted(true);
      // 双 rAF：确保隐藏态样式先提交，再切换到显示态触发过渡
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 160);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC 关闭 + 锁定滚动
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4',
        // 退出动画期间禁止交互
        !open && 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      {/* 遮罩层：纯 opacity 过渡（reduced-motion 友好） */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm',
          'transition-opacity ease-out-strong',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDuration: visible ? '200ms' : '150ms' }}
        onClick={onClose}
      />
      {/* 模态框内容：scale(0.96) 起步（不从 0 开始），origin 保持 center */}
      <div
        className={cn(
          'relative w-full bg-base-surface border border-border shadow-card-hover',
          // 移动端：全屏圆角较小；桌面端：圆角较大
          'rounded-none sm:rounded-2xl',
          'transition-[transform,opacity] ease-out-strong flex flex-col max-h-[100vh] sm:max-h-[90vh]',
          visible ? 'scale-100 opacity-100' : 'scale-[0.96] opacity-0',
          sizeStyles[size],
          className
        )}
        style={{ transitionDuration: visible ? '200ms' : '150ms' }}
      >
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-content">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-content-subtle hover:text-content hover:bg-base-elevated transition-colors active:scale-90"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {/* 无标题时也显示关闭按钮 */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-content-subtle hover:text-content hover:bg-base-elevated transition-colors active:scale-90 z-10"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">{children}</div>
        {/* 底部 */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}