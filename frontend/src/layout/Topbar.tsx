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
  Filter,
  Menu
} from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../state/themeStore';
import { CustomDropdownMenu, DropdownMenuItem } from '../ui/CustomDropdownMenu';
import { useGlobalFilters } from '../state/globalFiltersStore';
import { type DatePreset, formatRangeLabel } from '../utils/dateRange';
import { CustomRangeModal } from '../ui/CustomRangeModal';

interface TopbarProps {
  onMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
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
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'halfYearly', label: 'Half-Yearly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handlePresetChange = (preset: DatePreset) => {
    if (preset === 'custom') {
      setIsRangeModalOpen(true);
    } else {
      setDatePreset(preset);
      toast.success(`Range updated to ${preset}`);
    }
  };

  return (
    <header className="h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-[40] bg-white/80 dark:bg-black/80 backdrop-blur-3xl border-b border-black/5 dark:border-white/10">
      {/* Mobile Menu Trigger */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onMenuClick} 
        className="lg:hidden mr-2 text-zinc-500"
      >
        <Menu size={20} />
      </Button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl hidden md:block">
        <form onSubmit={handleSearch} className="relative group">
          <SearchIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-teal-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search calls, leads or phone..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border-none rounded-2xl py-2.5 pl-12 pr-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-zinc-400"
          />
        </form>
      </div>

      {/* Global Filters */}
      <div className="flex items-center gap-2 md:gap-3 md:px-6">
        <CustomDropdownMenu
          align="left"
          trigger={
            <Button variant="secondary" size="sm" className="rounded-2xl flex items-center gap-2 px-3 md:px-4 bg-zinc-100 dark:bg-white/5 border border-black/5 dark:border-white/10 hover:border-teal-500/30 transition-all">
              <Calendar size={14} className="text-teal-500" />
              <span className="text-[11px] md:text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
                {formatRangeLabel(datePreset, dateRange.from, dateRange.to)}
              </span>
              <ChevronDown size={14} className="text-zinc-400 hidden sm:block" />
            </Button>
          }
        >
          <div className="p-1 min-w-[180px]">
            <div className="px-3 py-2 text-[10px] font-black uppercase text-zinc-400 tracking-widest">Select Range</div>
            {datePresets.map((preset) => (
              <DropdownMenuItem 
                key={preset.value} 
                onClick={() => handlePresetChange(preset.value)}
                className={datePreset === preset.value ? "text-teal-500 bg-teal-500/5" : ""}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </div>
        </CustomDropdownMenu>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </Button>

          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 relative">
            <Bell size={18} />
            <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black shadow-sm" />
          </Button>
        </div>
        
        <div className="hidden sm:block w-px h-6 bg-black/5 dark:bg-white/10 mx-1 md:mx-2" />

        {/* Profile Section */}
        <CustomDropdownMenu
          trigger={
            <div className="flex items-center gap-2 md:gap-3 p-1 rounded-2xl cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
               <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-sm group-hover:scale-105 transition-transform duration-300">
                  VA
               </div>
               <div className="hidden lg:flex flex-col items-start pr-2">
                  <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 leading-none">Super Admin</span>
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">Command Center</span>
               </div>
               <ChevronDown size={12} className="text-zinc-400 mr-1" />
            </div>
          }
        >
          <DropdownMenuItem onClick={() => navigate('/settings')} icon={<UserIcon size={14} />}>
            My Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} icon={<Settings size={14} />}>
            System Settings
          </DropdownMenuItem>
          <div className="h-px bg-black/5 dark:bg-white/10 my-1" />
          <DropdownMenuItem onClick={() => toast.error("Sign out simulated.")} icon={<LogOut size={14} />} className="text-red-500">
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
