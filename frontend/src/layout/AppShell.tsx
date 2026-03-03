import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Footer } from './Footer';
import { Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../lib/utils';

export const AppShell: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden selection:bg-teal-500/20 selection:text-teal-600 dark:selection:text-teal-400 relative">
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop fixed, Mobile Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[101] lg:relative lg:z-0 transform transition-transform duration-500 lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar onNavigate={() => setIsMobileMenuOpen(false)} />
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} isMobileMenuOpen={isMobileMenuOpen} />
        
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth flex flex-col">
          <main className="p-4 md:p-8 flex-1 w-full max-w-[1920px] mx-auto">
            <Outlet />
          </main>
          <Footer />
        </div>

        {/* Background Gradients */}
        <div className="fixed top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-teal-500/10 blur-[100px] md:blur-[150px] -z-10 rounded-full opacity-30 pointer-events-none translate-x-1/2 -translate-y-1/2" />
        <div className="fixed bottom-0 left-0 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-emerald-400/10 blur-[80px] md:blur-[120px] -z-10 rounded-full opacity-20 pointer-events-none -translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
};
