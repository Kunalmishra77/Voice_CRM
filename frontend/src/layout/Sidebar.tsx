import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  Activity, 
  BarChart3, 
  Download, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  ListTodo,
  Radio
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from '../ui/Badge';

const NAV_ITEMS: { path: string; label: string; icon: any; badge?: string }[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calls', label: 'Calls', icon: PhoneCall },
  { path: '/live-calls', label: 'Live Calls', icon: Radio, badge: 'Live' },
  { path: '/call-insights', label: 'Call Insights', icon: Activity },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/exports', label: 'Exports', icon: Download },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "h-screen flex flex-col transition-all duration-500 bg-white/80 dark:bg-black/80 backdrop-blur-3xl border-r border-black/5 dark:border-white/10 sticky top-0 z-[50]",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo */}
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-teal-500 flex items-center justify-center text-white shadow-lg shrink-0">
          <Zap size={22} fill="currentColor" strokeWidth={0} />
        </div>
        {!collapsed && (
          <h1 className="text-xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 uppercase italic">
            Voice<span className="font-light text-zinc-500 text-sm">Agent</span>
          </h1>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1.5 py-4 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative",
              isActive 
                ? "bg-black/5 dark:bg-white/10 text-teal-600 dark:text-teal-400 font-bold" 
                : "text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={20} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-teal-600 dark:text-teal-400" : "text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors"
                  )}
                />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm tracking-tight">{item.label}</span>
                    {item.badge && (
                      <Badge variant="teal" size="xs" className="rounded-full px-1.5 py-0 min-w-[18px] h-[18px] animate-pulse">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                )}
                {isActive && (
                  <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-1.5 h-6 bg-teal-500 rounded-full shadow-[0_0_12px_rgba(20,184,166,0.8)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-black/5 dark:border-white/5 hidden lg:block">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
        >
          {collapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-3"><ChevronLeft size={20} /> <span className="text-xs font-black uppercase tracking-widest">Collapse</span></div>}
        </button>
      </div>
    </aside>
  );
};
