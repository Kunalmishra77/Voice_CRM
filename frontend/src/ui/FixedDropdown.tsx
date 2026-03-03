import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string;
  label: string;
}

interface FixedDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const FixedDropdown: React.FC<FixedDropdownProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select...",
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
    <div className={cn("relative z-10", className)} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 bg-zinc-100/50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100 flex items-center gap-2 transition-all hover:border-teal-500/30"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={12} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 z-[999] w-48 bg-white dark:bg-[#15151a] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1.5 backdrop-blur-xl"
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-colors",
                  value === option.value 
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400" 
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {option.label}
                {value === option.value && <Check size={12} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
