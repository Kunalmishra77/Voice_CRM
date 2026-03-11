import React from 'react';
import { cn } from '../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'zinc' | 'secondary' | 'teal';
  size?: 'xs' | 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'sm',
  className,
  ...props 
}) => {
  const variants = {
    default: "bg-accent text-foreground",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 border",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 border",
    danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 border",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 border",
    zinc: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20 border",
    secondary: "bg-secondary text-secondary-foreground",
    teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 border",
  };

  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2.5 py-0.5",
    md: "text-sm px-3 py-1",
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
