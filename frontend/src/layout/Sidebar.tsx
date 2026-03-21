import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../state/themeStore';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/calls', label: 'Calls', icon: PhoneCall },
  { path: '/call-insights', label: 'Insights', icon: Activity },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();

  return (
    <aside
      className={cn(
        "h-screen flex flex-col transition-all duration-500 ease-in-out sticky top-0 z-[50] border-r border-border/40 bg-background/60 backdrop-blur-2xl backdrop-saturate-150",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Premium Logo Area */}
      <div
        className={cn(
          "h-20 flex items-center shrink-0 transition-all duration-300 border-b border-border/30",
          collapsed ? "px-3 justify-center" : "px-6 gap-4"
        )}
      >
        <motion.div 
          whileHover={{ rotate: 5, scale: 1.05 }}
          className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20 p-1.5 shadow-sm"
        >
          <img
            src={theme === 'light' ? "/VMS-Logo.png" : "/VMS-Logo-light.png"}
            alt="VoiceCRM"
            className="w-full h-full object-contain"
          />
        </motion.div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold tracking-tight text-foreground/90">
              VoiceCRM
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
              Intelligence
            </span>
          </div>
        )}
      </div>

      {/* Navigation with Enhanced Visuals */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {!collapsed && (
          <div className="px-4 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              Main Menu
            </span>
          </div>
        )}
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            end={item.path === '/'}
            className={({ isActive }) => cn(
              "flex items-center gap-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden",
              collapsed ? "px-0 py-3 justify-center" : "px-4 py-2.5",
              isActive 
                ? "bg-primary/10 text-primary font-semibold" 
                : "text-muted-foreground/80 hover:bg-foreground/[0.03] hover:text-foreground"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={19} 
                  strokeWidth={isActive ? 2.5 : 2} 
                  className={cn(
                    "shrink-0 transition-all duration-300", 
                    isActive ? "text-primary" : "text-muted-foreground/60 group-hover:text-foreground"
                  )} 
                />
                {!collapsed && (
                  <span className={cn(
                    "text-[14px] tracking-tight truncate transition-transform duration-300",
                    isActive ? "translate-x-0" : "group-hover:translate-x-0.5"
                  )}>
                    {item.label}
                  </span>
                )}
                
                {isActive && (
                  <motion.div 
                    layoutId="active-highlight"
                    className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Edge-to-Edge Video Section */}
      {!collapsed && (
        <div className="mt-auto w-full border-t border-border/20 bg-slate-950/20 overflow-hidden">
          <div className="relative group h-28 flex items-center justify-center">
            {/* Dark base for blending */}
            <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />
            
            <video 
              src="/call-icon.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              className="relative z-10 w-full h-full object-cover mix-blend-screen opacity-90 transition-opacity group-hover:opacity-100"
            />
            
            {/* Subtle glass overlay */}
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Optimized Collapse Toggle */}
      <div className="p-4 shrink-0 hidden lg:flex justify-center border-t border-border/20">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 text-muted-foreground/40 hover:bg-primary/10 hover:text-primary active:scale-95",
            collapsed ? "justify-center px-0 w-10 h-10" : "w-full justify-start"
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : (
            <>
              <ChevronLeft size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
