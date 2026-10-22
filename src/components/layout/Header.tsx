

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Heart, Gift, Search, Home, Menu, X, Dices } from 'lucide-react';
import { cn } from '@/utils/cn';


const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/skills', label: 'Skill大全', icon: Compass },
  { path: '/favorites', label: '收藏库', icon: Heart },
  { path: '/wishpool', label: '许愿池', icon: Gift },
  { path: '/gashapon', label: '扭蛋机', icon: Dices },
];


function isActiveNav(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') {

    return pathname === '/';
  }

  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}


export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);


  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);


  useEffect(() => {
    if (mobileMenuOpen) {
      setMenuMounted(true);
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setMenuVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    setMenuVisible(false);
    const t = setTimeout(() => setMenuMounted(false), 200);
    return () => clearTimeout(t);
  }, [mobileMenuOpen]);


  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);


  const handleSearch = () => {
    navigate('/skills');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080808]/95 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl">
      <div className="w-full px-3 sm:px-5">
        <div className="flex h-12 items-center justify-between gap-4">

          <Link to="/" className="flex flex-shrink-0 items-baseline" aria-label="码上开演 首页">
            <span className="font-display text-base leading-none tracking-[0.18em] text-content sm:text-lg">
              码上开演
            </span>
          </Link>


          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = isActiveNav(location.pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-full px-3 text-xs transition-colors duration-200 active:scale-[0.97]',
                    isActive
                      ? 'border border-white/15 bg-white/[0.08] font-medium text-content'
                      : 'text-content-subtle hover:bg-white/[0.04] hover:text-content-muted'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-content/80" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>


          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              className="hidden h-7 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[11px] text-content-subtle transition-colors hover:border-white/20 hover:text-content-muted active:scale-[0.97] sm:flex"
              aria-label="搜索 Skill"
            >
              <Search className="w-4 h-4" strokeWidth={1.75} />
              <span>搜索 Skill</span>
              <kbd className="hidden lg:inline-block ml-auto text-xs px-1.5 py-0.5 rounded bg-white/[0.04] border border-border-subtle">
                ⌘K
              </kbd>
            </button>


            <button
              onClick={handleSearch}
              className="sm:hidden p-2 rounded-lg text-content-muted hover:text-content hover:bg-white/[0.04] transition-colors active:scale-90"
              aria-label="搜索"
            >
              <Search className="w-5 h-5" strokeWidth={1.75} />
            </button>


            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-content-muted hover:text-content hover:bg-white/[0.04] transition-colors active:scale-90"
              aria-label="打开菜单"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>




      {menuMounted && (
        <div className={cn('fixed inset-0 z-50 md:hidden', !mobileMenuOpen && 'pointer-events-none')}>

          <div
            className={cn(
              'absolute inset-0 bg-black/60 backdrop-blur-sm',
              'transition-opacity ease-out-strong',
              menuVisible ? 'opacity-100' : 'opacity-0'
            )}
            style={{ transitionDuration: menuVisible ? '250ms' : '200ms' }}
            onClick={() => setMobileMenuOpen(false)}
          />

          <div
            className={cn(
              'absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-base-surface overflow-y-auto',
              'transition-transform ease-drawer',
              menuVisible ? 'translate-x-0' : 'translate-x-full'
            )}
            style={{ transitionDuration: menuVisible ? '300ms' : '200ms' }}
          >

            <div className="flex h-12 items-center justify-between px-5">
              <div className="flex items-baseline">
                <span className="font-display text-lg leading-none tracking-[0.18em] text-content">
                  码上开演
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-content-subtle hover:text-content hover:bg-white/[0.04] transition-colors active:scale-90"
                aria-label="关闭菜单"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <nav className="p-3 flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = isActiveNav(location.pathname, item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors active:scale-[0.98]',
                      isActive
                        ? 'text-content bg-white/[0.06]'
                        : 'text-content-muted hover:text-content hover:bg-white/[0.03]'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={cn('w-5 h-5', isActive ? 'text-content' : 'text-content-subtle')} strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-5 text-center text-xs text-content-faint">
              AI 通过编码制作视频的 Skill 合集
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
