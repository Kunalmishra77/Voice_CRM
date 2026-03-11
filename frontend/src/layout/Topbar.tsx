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
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'Last 7 Days' },
    { value: 'monthly', label: 'This Month' },
    { value: 'quarterly', label: 'This Quarter' },
    { value: 'halfYearly', label: 'Last 6 Months' },
    { value: 'yearly', label: 'This Year' },
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

  return (
    <header className="h-16 px-4 md:px-8 flex items-center justify-between sticky top-0 z-[40] bg-background border-b border-border">
      {/* Mobile Menu Trigger */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onMenuClick} 
        className="lg:hidden mr-2 text-muted-foreground"
      >
        <Menu size={20} />
      </Button>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl hidden md:block">
        <form onSubmit={handleSearch} className="relative group flex items-center">
          <SearchIcon size={15} className="absolute left-3 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <input 
            type="text" 
            placeholder="Search queries, nodes, identities..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-accent/50 border border-border rounded-lg py-2 pl-9 pr-4 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring focus:bg-background transition-all placeholder:text-muted-foreground shadow-sm"
          />
        </form>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto">
        <CustomDropdownMenu
          align="right"
          trigger={
            <Button variant="outline" size="sm" className="rounded-lg flex items-center gap-2 px-3 h-9 bg-card hover:bg-accent border-border shadow-sm transition-all text-muted-foreground hover:text-foreground">
              <Calendar size={14} />
              <span className="text-sm font-medium">
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
                className={datePreset === preset.value ? "bg-accent text-foreground" : "text-muted-foreground"}
              >
                {preset.label}
              </DropdownMenuItem>
            ))}
          </div>
        </CustomDropdownMenu>

        <div className="hidden sm:flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground h-9 w-9 rounded-lg">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </Button>

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative h-9 w-9 rounded-lg">
            <Bell size={16} />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full border border-background" />
          </Button>
        </div>
        
        <div className="hidden sm:block w-px h-5 bg-border mx-1" />

        {/* Profile Section */}
        <CustomDropdownMenu
          align="right"
          trigger={
            <div className="flex items-center gap-2 p-1 rounded-lg cursor-pointer hover:bg-accent transition-colors group">
               <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center text-background text-xs font-bold shadow-sm">
                  VA
               </div>
               <div className="hidden lg:flex flex-col items-start pr-1">
                  <span className="text-sm font-semibold text-foreground leading-none">Admin</span>
               </div>
               <ChevronDown size={14} className="text-muted-foreground" />
            </div>
          }
        >
          <DropdownMenuItem onClick={() => navigate('/settings')} icon={<UserIcon size={14} />}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')} icon={<Settings size={14} />}>
            Settings
          </DropdownMenuItem>
          <div className="h-px bg-border my-1" />
          <DropdownMenuItem onClick={() => toast.error("Sign out disabled in demo.")} icon={<LogOut size={14} />} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
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
