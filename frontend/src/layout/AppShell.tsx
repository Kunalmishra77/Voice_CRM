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
          {/* Ultra-Smooth Large Blobs */}
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary/5 blur-[160px] animate-float-slow dark:hidden will-change-transform" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-200/5 blur-[140px] animate-float-slower dark:hidden will-change-transform" />

          {/* Dark Mode Blobs - Deeper and Clearer */}
          <div className="absolute top-[-25%] left-[-15%] w-[80%] h-[80%] rounded-full bg-primary/[0.03] blur-[180px] animate-float-slow hidden dark:block will-change-transform" />
          <div className="absolute bottom-[-15%] right-[-15%] w-[70%] h-[70%] rounded-full bg-blue-900/[0.03] blur-[160px] animate-float-slower hidden dark:block will-change-transform" />
        </div>
      </div>
    </div>
  );
};
