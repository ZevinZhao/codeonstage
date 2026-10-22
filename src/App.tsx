import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { SkillListPage } from '@/pages/SkillListPage';
import { SkillDetailPage } from '@/pages/SkillDetailPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { WishPoolPage } from '@/pages/WishPoolPage';
import { GashaponPage } from '@/pages/GashaponPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'skills', element: <SkillListPage /> },
      { path: 'skills/:id', element: <SkillDetailPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'wishpool', element: <WishPoolPage /> },
      { path: 'gashapon', element: <GashaponPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
