

import { cn } from '@/utils/cn';


interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}


const sizeStyles = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
};


function getInitials(name: string): string {
  if (!name) return '?';

  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.charAt(0);
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}


function getColor(name: string): string {
  const colors = [
    'bg-brand-500/20 text-brand-300',
    'bg-violet-500/20 text-violet-300',
    'bg-success/20 text-success',
    'bg-warning/20 text-warning',
    'bg-info/20 text-info',
    'bg-pink-500/20 text-pink-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}


export function Avatar({ src, name = '', size = 'md', className }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0',
        sizeStyles[size],
        !src && getColor(name),
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium">{getInitials(name)}</span>
      )}
    </div>
  );
}
