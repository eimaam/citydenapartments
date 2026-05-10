import React from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { cn } from '@citydenapartments/shared';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className={cn('flex-grow', !isHome && 'pt-24')}>{children}</main>
      <Footer />
    </div>
  );
};
