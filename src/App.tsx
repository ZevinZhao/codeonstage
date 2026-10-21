// ============================================================
// App 根组件 - 路由配置
// ------------------------------------------------------------
// 首页「放映厅」为全屏沉浸式布局（100dvh 无滚动），
// 独立于通用 Layout（Header/Footer）；其余页面走 Layout。
// ============================================================
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { SkillListPage } from '@/pages/SkillListPage';
import { SkillDetailPage } from '@/pages/SkillDetailPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { WishPoolPage } from '@/pages/WishPoolPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

/** 路由配置 */
const router = createBrowserRouter([
  // 首页放映厅：独立全屏布局（自带放映厅导航，无全局 Header/Footer）
  { path: '/', element: <HomePage /> },
  // 其余页面：通用布局（Header + 内容 + Footer）
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'skills', element: <SkillListPage /> },
      { path: 'skills/:id', element: <SkillDetailPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'wishpool', element: <WishPoolPage /> },
      // 404 兜底路由：所有未匹配路径都展示 NotFoundPage
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

/** App 根组件 */
export function App() {
  return <RouterProvider router={router} />;
}