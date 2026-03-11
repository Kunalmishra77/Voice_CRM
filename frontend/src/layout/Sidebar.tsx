import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  Activity, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Command
} from 'lucide-react';
import { cn } from '../lib/utils';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calls', label: 'Calls', icon: PhoneCall },
  { path: '/call-insights', label: 'Insights', icon: Activity },
  { path: '/leads', label: 'Registry', icon: Users },
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
        "h-screen flex flex-col transition-all duration-300 bg-card border-r border-border sticky top-0 z-[50]",
        collapsed ? "w-16" : "w-48"
      )}
    >
      {/* Logo */}
      <div className="h-16 px-4 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center text-background shadow-sm shrink-0">
          <Command size={14} strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            VoiceAgent
          </h1>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 py-4 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) => cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-200 group relative text-[13px] font-medium",
              isActive 
                ? "bg-accent text-accent-foreground" 
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={16} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border hidden lg:block shrink-0 text-center">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
};
