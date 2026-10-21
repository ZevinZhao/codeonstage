// ============================================================
// Header 顶部导航栏
// - 包含：首页、Skill大全、收藏库、许愿池
// - 当前页面高亮（useLocation 判断）
// - 移动端：汉堡菜单抽屉
// - Logo + 品牌名称"码上开演"
// - 搜索入口（跳转到 Skill 大全）
// ============================================================
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Heart, Gift, Search, Home, Menu, X } from 'lucide-react';
import { cn } from '@/utils/cn';

/** 导航菜单项 */
const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/skills', label: 'Skill大全', icon: Compass },
  { path: '/favorites', label: '收藏库', icon: Heart },
  { path: '/wishpool', label: '许愿池', icon: Gift },
];

/** 判断某个导航项是否处于激活状态 */
function isActiveNav(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') {
    // 首页精确匹配
    return pathname === '/';
  }
  // 其他路径前缀匹配（支持子路由高亮，如 /skills/:id 高亮 Skill大全）
  return pathname === itemPath || pathname.startsWith(itemPath + '/');
}

/** Header 组件 */
export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // mounted：渲染中（含退出动画期间）；visible：显示态
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // 路由变化时关闭移动端菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // 抽屉进出场编排（进入 300ms drawer 曲线 / 退出 200ms）
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

  // 移动端菜单打开时锁定 body 滚动
  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  /** 处理搜索入口点击 */
  const handleSearch = () => {
    navigate('/skills');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-[#0a0a0a]/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* 品牌字标：衬线 + 宽字距（与首页放映厅导航一致） */}
          <Link to="/" className="flex items-baseline gap-3 flex-shrink-0" aria-label="码上开演 首页">
            <span className="font-display text-xl leading-none tracking-[0.18em] text-content">
              码上开演
            </span>
            <span className="hidden text-[10px] uppercase tracking-[0.32em] text-content-faint lg:inline">
              Screening Room
            </span>
          </Link>

          {/* 桌面端导航菜单（首页式：无底色，激活小圆点） */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = isActiveNav(location.pathname, item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 py-2 text-sm transition-colors duration-200 active:scale-[0.97]',
                    isActive
                      ? 'font-medium text-content'
                      : 'text-content-subtle hover:text-content-muted'
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

          {/* 右侧：搜索 + 移动端菜单按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border-subtle text-content-subtle hover:text-content-muted hover:border-border-strong transition-colors active:scale-[0.97] text-sm max-w-[200px]"
              aria-label="搜索 Skill"
            >
              <Search className="w-4 h-4" strokeWidth={1.75} />
              <span>搜索 Skill...</span>
              <kbd className="hidden lg:inline-block ml-auto text-xs px-1.5 py-0.5 rounded bg-white/[0.04] border border-border-subtle">
                ⌘K
              </kbd>
            </button>

            {/* 移动端搜索图标按钮 */}
            <button
              onClick={handleSearch}
              className="sm:hidden p-2 rounded-lg text-content-muted hover:text-content hover:bg-white/[0.04] transition-colors active:scale-90"
              aria-label="搜索"
            >
              <Search className="w-5 h-5" strokeWidth={1.75} />
            </button>

            {/* 移动端汉堡菜单按钮 */}
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

      {/* ============================================================ */}
      {/* 移动端菜单抽屉：右滑抽屉 + drawer 曲线（emil-design-eng） */}
      {/* ============================================================ */}
      {menuMounted && (
        <div className={cn('fixed inset-0 z-50 md:hidden', !mobileMenuOpen && 'pointer-events-none')}>
          {/* 遮罩：纯 opacity 过渡 */}
          <div
            className={cn(
              'absolute inset-0 bg-black/60 backdrop-blur-sm',
              'transition-opacity ease-out-strong',
              menuVisible ? 'opacity-100' : 'opacity-0'
            )}
            style={{ transitionDuration: menuVisible ? '250ms' : '200ms' }}
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* 抽屉内容：translateX 百分比位移（适配任意宽度）+ iOS drawer 曲线 */}
          <div
            className={cn(
              'absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-base-surface border-l border-border overflow-y-auto',
              'transition-transform ease-drawer',
              menuVisible ? 'translate-x-0' : 'translate-x-full'
            )}
            style={{ transitionDuration: menuVisible ? '300ms' : '200ms' }}
          >
            {/* 头部（衬线字标，与桌面端一致） */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-border-subtle">
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-lg leading-none tracking-[0.18em] text-content">
                  码上开演
                </span>
                <span className="text-[9px] uppercase tracking-[0.32em] text-content-faint">
                  Screening Room
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
            {/* 导航项 */}
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
            {/* 底部装饰 */}
            <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-border-subtle text-xs text-content-faint text-center">
              AI 通过编码制作视频的 Skill 合集
            </div>
          </div>
        </div>
      )}
    </header>
  );
}