import React from 'react';
import { cn } from '../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'panel' | 'raised';
  innerGlow?: boolean;
  overflowHidden?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  variant = 'panel', 
  innerGlow = false,
  overflowHidden = true,
  onClick,
  ...props 
}) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-xl border transition-all duration-200",
        overflowHidden && "overflow-hidden",
        variant === 'glass' && "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border-border",
        variant === 'panel' && "bg-card border-border shadow-sm",
        variant === 'raised' && "bg-card border-border shadow-premium",
        innerGlow && "shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]",
        onClick && "cursor-pointer active:scale-[0.99] hover:border-zinc-300 dark:hover:border-zinc-700",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
