import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search as SearchIcon,
  Sun,
  Moon,
  ChevronDown,
  Calendar,
  Settings,
  LogOut,
  User as UserIcon,
  Menu,
  PhoneCall,
  Users,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../state/themeStore';
import { CustomDropdownMenu, DropdownMenuItem } from '../ui/CustomDropdownMenu';
import { useGlobalFilters } from '../state/globalFiltersStore';
import { type DatePreset, formatRangeLabel } from '../utils/dateRange';
import { CustomRangeModal } from '../ui/CustomRangeModal';
import { cn } from '../lib/utils';
import { useProfile } from '../state/profileStore';
import { useAuth } from '../state/authStore';

interface TopbarProps {
  onMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useProfile();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    datePreset,
    dateRange,
    setDatePreset,
    setDateRange,
    searchQuery,
    setSearchQuery
  } = useGlobalFilters();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(3);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
    if (localSearch.trim() && !location.pathname.includes('/leads')) {
      navigate(`/leads`);
    }
  };

  const datePresets: { value: DatePreset; label: string }[] = [
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'Last 7 Days' },
    { value: 'monthly', label: 'This Month' },
    { value: 'quarterly', label: 'This Quarter' },
    { value: 'halfYearly', label: 'Last 6 Months' },
    { value: 'yearly', label: 'This Year' },
    { value: 'allTime', label: 'All-time' },
    { value: 'custom', label: 'Custom Range...' },
  ];

  const handlePresetChange = (preset: DatePreset) => {
    if (preset === 'custom') {
      setIsRangeModalOpen(true);
    } else {
      setDatePreset(preset);
      toast.success(`Range updated to ${preset}`);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Successfully signed out.");
    navigate('/login');
  };

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const avatarColor = localStorage.getItem('voicecrm-avatar-color') || 'var(--brand-700)';

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-[40] bg-background/80 backdrop-blur-xl border-b border-border">
      {/* Mobile Menu */}
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden mr-2 text-muted-foreground">
        <Menu size={20} />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-lg hidden md:block">
        <form onSubmit={handleSearch} className="relative group flex items-center">
          <SearchIcon size={15} className="absolute left-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search leads, calls, insights..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 focus:bg-card transition-all placeholder:text-muted-foreground"
          />
        </form>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-3 ml-auto">
        {/* Date Range Picker */}
        <CustomDropdownMenu
          align="right"
          trigger={
            <Button variant="outline" size="sm" className="rounded-xl flex items-center gap-2 px-3.5 h-9 bg-card hover:bg-accent border-border shadow-sm transition-all text-muted-foreground hover:text-foreground">
              <Calendar size={14} className="text-primary" />
              <span className="text-sm font-medium hidden sm:inline">
                {formatRangeLabel(datePreset, dateRange.from, dateRange.to)}
              </span>
            </Button>
          }
        >
          <div className="p-1 min-w-[180px]">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Timeframe</div>
            {datePresets.map((preset) => (
              <DropdownMenuItem
                key={preset.value}
                onClick={() => handlePresetChange(preset.value)}
                className={datePreset === preset.value ? "bg-accent text-primary font-semibold" : "text-muted-foreground"}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </div>
        </CustomDropdownMenu>

        <div className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-xl hover:bg-accent">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </Button>

          <CustomDropdownMenu
            align="right"
            trigger={
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative h-9 w-9 rounded-xl hover:bg-accent">
                <Bell size={16} />
                {notifCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 bg-primary shadow-sm">
                    {notifCount}
                  </div>
                )}
              </Button>
            }
          >
            <div className="p-1 min-w-[280px]">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Notifications</span>
                <button onClick={() => { setNotifCount(0); toast.success("All notifications cleared"); }} className="text-[10px] font-medium text-primary hover:underline">Mark all read</button>
              </div>
              {[
                { icon: PhoneCall, color: 'text-emerald-500', bg: 'bg-emerald-500/10', title: 'New call completed', desc: 'AI agent finished call with a lead', time: '2m ago' },
                { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Hot lead detected', desc: 'High intent score identified', time: '15m ago' },
                { icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-500/10', title: 'Task due soon', desc: 'Follow-up call scheduled today', time: '1h ago' },
              ].map((n, i) => (
                <div key={i} onClick={() => { setNotifCount(prev => Math.max(0, prev - 1)); navigate(i === 0 ? '/calls' : i === 1 ? '/leads' : '/tasks'); }} className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", n.bg, n.color)}>
                    <n.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.desc}</p>
                    <p className="text-[9px] text-muted-foreground mt-1 opacity-50">{n.time}</p>
                  </div>
                  {i < notifCount && <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" />}
                </div>
              ))}
            </div>
          </CustomDropdownMenu>
        </div>

        <div className="hidden sm:block w-px h-6 bg-border mx-1" />

        {/* Profile */}
        <CustomDropdownMenu
          align="right"
          trigger={
            <div className="flex items-center gap-2.5 p-1.5 rounded-xl cursor-pointer hover:bg-accent transition-colors group">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ background: avatarColor }}
              >
                {initials}
              </div>
              <div className="hidden lg:flex flex-col items-start pr-1">
                <span className="text-sm font-semibold text-foreground leading-none">{profile.name}</span>
                <span className="text-[10px] text-muted-foreground">{profile.role}</span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground hidden lg:block" />
            </div>
          }
        >
          <div className="px-3 py-3 flex items-center gap-3 border-b border-border mb-1">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ background: avatarColor }}
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{profile.name}</p>
              <p className="text-[10px] text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <DropdownMenuItem onClick={() => navigate('/profile')} icon={<UserIcon size={14} />}>
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} icon={<Settings size={14} />}>
            Settings
          </DropdownMenuItem>
          <div className="h-px bg-border my-1" />
          <DropdownMenuItem onClick={handleLogout} icon={<LogOut size={14} />} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
            Sign Out
          </DropdownMenuItem>
        </CustomDropdownMenu>
      </div>

      <CustomRangeModal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
        initialFrom={dateRange.from}
        initialTo={dateRange.to}
        onApply={(from, to) => setDateRange({ from, to })}
      />
    </header>
  );
};
