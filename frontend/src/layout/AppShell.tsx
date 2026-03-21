import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { cn } from '../lib/utils';

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[101] lg:relative lg:z-0 transform transition-transform duration-300 lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar onNavigate={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} isMobileMenuOpen={isMobileMenuOpen} />

        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth flex flex-col relative z-10">
          <main className="p-4 md:p-6 lg:p-8 flex-1 w-full max-w-[1920px] mx-auto">
            <Outlet />
          </main>
          <Footer />
        </div>

        {/* Global Premium Animated Mesh Background */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Extremely Optimized Blobs */}
          <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-float-slow dark:hidden will-change-transform opacity-60" />
          <div className="absolute bottom-[0%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-200/5 blur-[100px] animate-float-slower dark:hidden will-change-transform opacity-40" />

          {/* Dark Mode Blobs */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[150px] animate-float-slow hidden dark:block will-change-transform" />
          <div className="absolute bottom-[0%] right-[-15%] w-[50%] h-[50%] rounded-full bg-blue-900/5 blur-[130px] animate-float-slower hidden dark:block will-change-transform" />
          
          {/* Ultra-lightweight noise texture (Base64 optimized) */}
          <div className="absolute inset-0 bg-repeat opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0%200%20200%20200'%20xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter%20id='noiseFilter'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.65'%20numOctaves='3'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='100%25'%20height='100%25'%20filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        </div>
      </div>
    </div>
  );
};
