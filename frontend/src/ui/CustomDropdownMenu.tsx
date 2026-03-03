import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

// --- Menu Version (Trigger/Items) ---

interface CustomDropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'right';
}

export const CustomDropdownMenu: React.FC<CustomDropdownMenuProps> = ({ 
  trigger, 
  children, 
  className,
  align = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={cn(
              "absolute z-[100] min-w-[200px] bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1.5",
              align === 'right' ? "right-0" : "left-0"
            )}
          >
            <div onClick={() => setIsOpen(false)}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  children, 
  onClick, 
  icon,
  className 
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors",
        "text-zinc-600 dark:text-zinc-400",
        "hover:bg-black/5 dark:hover:bg-white/10",
        "hover:text-zinc-900 dark:hover:text-zinc-100",
        className
      )}
    >
      {icon && <span className="opacity-70">{icon}</span>}
      {children}
    </button>
  );
};

// --- Select Version (Options/Value) ---

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option",
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={cn("relative z-[100] min-w-[140px]", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-[#f2f2f7] dark:bg-white/5 border border-transparent rounded-xl px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-all",
          "text-zinc-900 dark:text-zinc-100 hover:bg-[#e5e5ea] dark:hover:bg-white/10"
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={14} className={cn("transition-transform duration-200 text-zinc-400", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute z-[999] w-full mt-1 bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden p-1"
          >
            <div className="max-h-60 overflow-y-auto no-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all",
                    value === option.value 
                      ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20" 
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-zinc-100"
                  )}
                >
                  {option.label}
                  {value === option.value && <Check size={12} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDropdown;
