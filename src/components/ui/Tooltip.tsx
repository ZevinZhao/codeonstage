

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/utils/cn';


interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}


const positionStyles = {
  top: { cls: 'bottom-full left-1/2 -translate-x-1/2 mb-2', origin: 'center bottom' },
  bottom: { cls: 'top-full left-1/2 -translate-x-1/2 mt-2', origin: 'center top' },
  left: { cls: 'right-full top-1/2 -translate-y-1/2 mr-2', origin: 'right center' },
  right: { cls: 'left-full top-1/2 -translate-y-1/2 ml-2', origin: 'left center' },
};


const OPEN_DELAY = 400;

const INSTANT_WINDOW = 600;


let lastShownAt = 0;


export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const openTimer = useRef<number>(0);
  const pos = positionStyles[position];


  useEffect(() => () => window.clearTimeout(openTimer.current), []);

  const handleEnter = () => {
    window.clearTimeout(openTimer.current);
    const recentlyShown = Date.now() - lastShownAt < INSTANT_WINDOW;
    if (recentlyShown) {

      setVisible(true);
      lastShownAt = Date.now();
      return;
    }
    openTimer.current = window.setTimeout(() => {
      setVisible(true);
      lastShownAt = Date.now();
    }, OPEN_DELAY);
  };

  const handleLeave = () => {
    window.clearTimeout(openTimer.current);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      <div
        className={cn(
          'absolute z-50 px-2.5 py-1.5 text-xs text-content whitespace-nowrap',
          'bg-base-elevated border border-border rounded-lg shadow-card',
          'pointer-events-none',
          'transition-[transform,opacity] duration-[125ms] ease-out-strong',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.97]',
          pos.cls,
          className
        )}
        style={{ transformOrigin: pos.origin }}
        role="tooltip"
      >
        {content}
      </div>
    </div>
  );
}
