import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Phone,
  ClipboardList,
  Flame,
  Trash2,
  XCircle,
  Filter
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
import { useNotificationStore, type CRMNotification } from '../state/notificationStore';

interface TopbarProps {
  onMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useProfile();
  const { logout, user: authUser } = useAuth();
  const isEmployee = authUser?.role === 'employee';

  // Use real auth data for display; fall back to profile store only for phone/bio/etc.
  const displayName = authUser?.name || profile.name;
  const displayEmail = authUser?.email || profile.email;
  const displayRole = authUser?.role === 'admin' ? 'Admin' : authUser?.role === 'employee' ? 'Employee' : profile.role;
  const navigate = useNavigate();
  const location = useLocation();
  const {
    datePreset,
    dateRange,
    setDatePreset,
    setDateRange,
    searchQuery,
    setSearchQuery,
    leadType,
    setLeadType,
  } = useGlobalFilters();

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);

  const { notifications, markRead, markAllRead, clearAll } = useNotificationStore();
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

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

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
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

        {/* Lead Type Filter */}
        <CustomDropdownMenu
          align="right"
          trigger={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "rounded-xl flex items-center gap-2 px-3.5 h-9 bg-card hover:bg-accent border-border shadow-sm transition-all",
                leadType !== 'all' ? "border-primary/40 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Filter size={13} className={leadType !== 'all' ? 'text-primary' : 'text-muted-foreground'} />
              <span className="text-sm font-medium hidden sm:inline">
                {leadType === 'all' ? 'All Leads' : leadType === 'eligible' ? 'Eligible' : leadType === 'non-eligible' ? 'Non-Eligible' : 'Not Interested'}
              </span>
              {leadType !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Button>
          }
        >
          <div className="p-1 min-w-[160px]">
            <div className="px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">Lead Type</div>
            {([
              { value: 'all' as const, label: 'All Leads' },
              { value: 'eligible' as const, label: 'Eligible' },
              { value: 'non-eligible' as const, label: 'Non-Eligible' },
              { value: 'not-interested' as const, label: 'Not Interested' },
            ]).map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => { setLeadType(opt.value); toast.success(`Showing ${opt.label}`); }}
                className={leadType === opt.value ? 'bg-accent text-primary font-semibold' : 'text-muted-foreground'}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </div>
        </CustomDropdownMenu>

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
                {unreadCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1 bg-primary shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </Button>
            }
          >
            <div className="p-1 min-w-[320px] max-w-[360px]">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                  Notifications {unreadCount > 0 && <span className="text-primary">({unreadCount})</span>}
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={() => { markAllRead(); toast.success("All marked as read"); }} className="text-[10px] font-medium text-primary hover:underline cursor-pointer">Mark all read</button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={() => { clearAll(); toast.success("Notifications cleared"); }} className="text-[10px] font-medium text-muted-foreground hover:text-rose-500 hover:underline cursor-pointer flex items-center gap-0.5">
                      <Trash2 size={9} /> Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell size={20} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-[11px] font-medium text-muted-foreground">No notifications yet</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">Alerts will appear as calls and tasks update</p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => {
                    const cfg = NOTIF_ICON_MAP[n.type] || NOTIF_ICON_MAP.system;
                    return (
                      <div
                        key={n.id}
                        onClick={() => { markRead(n.id); if (n.route) navigate(n.route); }}
                        className={cn(
                          "flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group",
                          !n.read && "bg-primary/[0.03]"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg, cfg.color)}>
                          <cfg.icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-xs text-foreground truncate", !n.read ? "font-bold" : "font-medium")}>{n.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{n.description}</p>
                          <p className="text-[9px] text-muted-foreground mt-1 opacity-50">{formatNotifTime(n.time)}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full mt-2 shrink-0 bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" />}
                      </div>
                    );
                  })
                )}
              </div>
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
                <span className="text-sm font-semibold text-foreground leading-none">{displayName}</span>
                <span className="text-[10px] text-muted-foreground">{displayRole}</span>
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
              <p className="text-sm font-semibold text-foreground">{displayName}</p>
              <p className="text-[10px] text-muted-foreground">{displayEmail}</p>
            </div>
          </div>
          <DropdownMenuItem onClick={() => navigate('/profile')} icon={<UserIcon size={14} />}>
            My Profile
          </DropdownMenuItem>
          {!isEmployee && (
            <DropdownMenuItem onClick={() => navigate('/settings')} icon={<Settings size={14} />}>
              Settings
            </DropdownMenuItem>
          )}
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

/* ── Notification helpers ─────────────────────────────────── */

const NOTIF_ICON_MAP: Record<CRMNotification['type'], { icon: typeof Bell; color: string; bg: string }> = {
  hot_lead:       { icon: Flame,          color: 'text-rose-500',    bg: 'bg-rose-500/10' },
  call_completed: { icon: CheckCircle2,   color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  call_active:    { icon: PhoneCall,      color: 'text-blue-500',    bg: 'bg-blue-500/10' },
  task_due:       { icon: ClipboardList,  color: 'text-amber-500',   bg: 'bg-amber-500/10' },
  task_overdue:   { icon: AlertTriangle,  color: 'text-rose-500',    bg: 'bg-rose-500/10' },
  bulk_complete:  { icon: CheckCircle2,   color: 'text-primary',     bg: 'bg-primary/10' },
  system:         { icon: Bell,           color: 'text-muted-foreground', bg: 'bg-accent' },
};

function formatNotifTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return '';
  }
}
