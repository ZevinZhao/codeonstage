

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';


interface PageHeaderProps {

  eyebrow: string;

  title: string;

  description?: string;

  actions?: ReactNode;

  className?: string;
}


export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 animate-fade-up', className)}>
      <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-content-faint">
        {eyebrow}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-[1.15] tracking-[0.06em] text-content md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-content-subtle">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
