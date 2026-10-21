// ============================================================
// Layout 整体布局
// - Header + 内容区 + Footer
// - 全局 Toast 容器
// ============================================================
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastContainer } from '@/components/ui/Toast';

/** Layout 组件 - Header + 内容区 + Footer + Toast */
export function Layout() {
  return (
    // 放映厅内页背景：与首页同源的近黑柔和渐变（自顶部展开）
    <div className="min-h-screen flex flex-col bg-hall-page">
      <Header />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <Footer />
      {/* 全局 Toast 提示容器 */}
      <ToastContainer />
    </div>
  );
}