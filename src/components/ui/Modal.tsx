

import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';


interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}


const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};


export function Modal({ open, onClose, title, children, footer, size = 'md', className }: ModalProps) {


  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);


  useEffect(() => {
    if (open) {
      setMounted(true);

      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 160);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps


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

        !open && 'pointer-events-none'
      )}
      aria-hidden={!open}
    >

      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm',
          'transition-opacity ease-out-strong',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDuration: visible ? '200ms' : '150ms' }}
        onClick={onClose}
      />

      <div
        className={cn(
          'relative w-full bg-base-surface border border-border shadow-card-hover',

          'rounded-none sm:rounded-2xl',
          'transition-[transform,opacity] ease-out-strong flex flex-col max-h-[100vh] sm:max-h-[90vh]',
          visible ? 'scale-100 opacity-100' : 'scale-[0.96] opacity-0',
          sizeStyles[size],
          className
        )}
        style={{ transitionDuration: visible ? '200ms' : '150ms' }}
      >

        {title && (
          <div className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6">
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

        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-content-subtle hover:text-content hover:bg-base-elevated transition-colors active:scale-90 z-10"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 px-4 pb-4 pt-2 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
