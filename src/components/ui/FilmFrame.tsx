

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';


interface FilmFrameProps {
  children: ReactNode;

  className?: string;
}


export function FilmFrame({ children, className }: FilmFrameProps) {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-[#0b0b0c]',

        'shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_32px_rgba(0,0,0,0.35)]',
        className
      )}
    >

      <div className="film-band" aria-hidden="true" />

      <div className="bg-black">{children}</div>

      <div className="film-band" aria-hidden="true" />
    </figure>
  );
}
