import { useState, useRef, useEffect, type ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Option {
  value: string;
  label: string;
  icon?: ElementType;
}

interface DropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  icon?: ElementType;
}

export const CustomDropdown = ({ options, value, onChange, placeholder, className, icon: Icon }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative min-w-[160px]", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full glass-morphism inner-glow rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold text-zinc-200 flex items-center gap-2.5 hover:bg-white/[0.05] transition-all text-left shadow-2xl",
          isOpen && "border-indigo-500/50 ring-2 ring-indigo-500/10"
        )}
      >
        {Icon && <Icon size={14} className="text-indigo-400" />}
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={14} className={cn("absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform text-zinc-500", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 6, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute z-[100] w-full mt-1 glass-morphism rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 overflow-hidden border-white/[0.08]"
          >
            <div className="max-h-[320px] overflow-y-auto no-scrollbar space-y-0.5">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all",
                    value === option.value 
                      ? "bg-indigo-500/20 text-indigo-300" 
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {option.icon && <option.icon size={14} className={cn(value === option.value ? "text-indigo-300" : "text-zinc-500")} />}
                    {option.label}
                  </div>
                  {value === option.value && (
                    <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                      <Check size={14} strokeWidth={3} className="text-indigo-400" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
