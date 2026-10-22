

import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/utils/cn';


interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}


export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="mb-4 text-content-faint">
        {icon || <Inbox className="w-12 h-12" strokeWidth={1.5} />}
      </div>
      <h3 className="text-base font-medium text-content-muted mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-content-subtle max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
