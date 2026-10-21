// ============================================================
// LoadingSpinner 组件 - 加载动画
// ============================================================
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

/** LoadingSpinner Props */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

/** 尺寸映射 */
const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

/** LoadingSpinner 组件 */
export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Loader2 className={cn(sizeStyles[size], 'animate-spin text-content-subtle')} />
      {label && <span className="text-sm text-content-muted">{label}</span>}
    </div>
  );
}

/** 全屏加载 */
export function FullScreenLoader({ label = '加载中...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}