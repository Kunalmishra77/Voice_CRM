import { useState } from 'react';
import { LayoutDashboard, MessageSquare, Database, Moon, Sun, Sparkles, UserCircle } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useDarkMode } from '../hooks/use-dark-mode';

export const Layout = () => {
  const [isDark, setIsDark] = useDarkMode();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/leads', icon: Database, label: 'Leads Hub' },
    { to: '/live-inbox', icon: MessageSquare, label: 'Live Inbox' },
  ];

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-base))] text-[hsl(var(--text-main))] font-sans antialiased flex">
      {/* Premium Sidebar */}
      <aside className="w-[260px] h-screen surface-panel border-r border-[hsl(var(--border-subtle))] flex flex-col shadow-2xl z-50 shrink-0">
        <div className="h-16 px-6 border-b border-[hsl(var(--border-subtle))] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm inner-glow">
             <Sparkles size={16} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
             <span className="font-bold text-base tracking-tight text-[hsl(var(--text-main))]">IndiaGrain</span>
             <span className="text-[10px] font-medium text-orange-500 uppercase tracking-widest">Premium CRM</span>
          </div>
        </div>
        
        <nav className="p-4 space-y-1.5 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold relative group",
                isActive 
                  ? "text-[hsl(var(--accent-main))] bg-[hsl(var(--accent-dim))] border border-[hsl(var(--accent-glow))]" 
                  : "text-[hsl(var(--text-muted))] border border-transparent hover:text-[hsl(var(--text-main))] hover:bg-[hsl(var(--bg-surface-hover))]"
              )}
            >
              <item.icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[hsl(var(--border-subtle))]">
          <div className="flex items-center justify-between p-3 rounded-xl surface-card border border-[hsl(var(--border-strong))]">
            <div className="flex items-center gap-2">
              <UserCircle size={20} className="text-[hsl(var(--text-muted))]" />
              <span className="text-xs font-bold text-[hsl(var(--text-main))]">Agent View</span>
            </div>
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 text-[hsl(var(--text-muted))] hover:text-[hsl(var(--accent-main))] transition-colors"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0">
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
           <div className="max-w-[1600px] w-full mx-auto">
             <Outlet />
           </div>
        </main>
        
        {/* Footer Constraint */}
        <footer className="h-12 border-t border-[hsl(var(--border-subtle))] surface-panel flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--text-dim))] shrink-0">
          Powered by <span className="text-[hsl(var(--accent-main))] ml-1.5 tracking-tight">AI Agentix</span>
        </footer>
      </div>
    </div>
  );
};
