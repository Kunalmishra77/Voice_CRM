import React from 'react';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  loading = false,
  ...props 
}, ref) => {
  const variants = {
    primary: "bg-teal-600 dark:bg-teal-500 text-white hover:bg-teal-700 dark:hover:bg-teal-600 shadow-sm",
    secondary: "bg-[#e5e5ea] dark:bg-[#2c2c2e] text-[#1c1c1e] dark:text-white hover:bg-[#d1d1d6] dark:hover:bg-[#3a3a3c]",
    ghost: "bg-transparent text-[#1c1c1e] dark:text-[#8e8e93] hover:bg-[#e5e5ea]/50 dark:hover:bg-[#2c2c2e]",
    outline: "bg-transparent border border-[#c7c7cc] dark:border-[#38383a] text-[#1c1c1e] dark:text-[#e5e5ea] hover:bg-[#f2f2f7] dark:hover:bg-[#1c1c1e]",
    danger: "bg-[#ff3b30] text-white hover:bg-[#d70015] shadow-sm",
  };

  const sizes = {
    sm: "h-9 px-4 text-xs font-semibold",
    md: "h-11 px-6 text-sm font-semibold",
    lg: "h-14 px-8 text-base font-semibold",
    icon: "h-10 w-10 flex items-center justify-center",
  };

  return (
    <button
      ref={ref}
      disabled={loading || props.disabled}
      className={cn(
        "rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer tracking-tight",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : children}
    </button>
  );
});

Button.displayName = 'Button';
