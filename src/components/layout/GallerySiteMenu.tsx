import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Dices, Gift, Heart, Home, Menu } from 'lucide-react';
import { cn } from '@/utils/cn';

const menuItems = [
  { to: '/', label: '首页', icon: Home },
  { to: '/skills', label: 'Skill 大全', icon: Compass },
  { to: '/favorites', label: '收藏库', icon: Heart },
  { to: '/wishpool', label: '许愿池', icon: Gift },
  { to: '/gashapon', label: '扭蛋机', icon: Dices },
];

export function GallerySiteMenu() {
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-7 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-white/75 transition-colors hover:border-white/20 hover:text-white"
        aria-label="打开站点菜单"
        aria-expanded={open}
      >
        <Menu className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">码上开演</span>
      </button>

      {open && (
        <div className="absolute left-0 top-9 z-50 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#151515]/95 p-1.5 shadow-[0_18px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="px-2.5 pb-1.5 pt-1 text-[10px] tracking-[0.18em] text-white/35">码上开演</div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors',
                  active ? 'bg-white/[0.08] text-white' : 'text-white/65 hover:bg-white/[0.07] hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
