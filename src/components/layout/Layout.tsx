

import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { ToastContainer } from '@/components/ui/Toast';


export function Layout() {
  const pathname = useLocation().pathname;
  const isGallery = pathname === '/skills' || pathname.startsWith('/skills/') || pathname === '/favorites' || pathname === '/wishpool' || pathname === '/gashapon';
  return (

    <div className="min-h-screen flex flex-col bg-hall-page">
      {!isGallery && <Header />}
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      {!isGallery && <Footer />}

      <ToastContainer />
    </div>
  );
}
