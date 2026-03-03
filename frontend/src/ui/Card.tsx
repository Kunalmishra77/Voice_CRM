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
  innerGlow = true,
  overflowHidden = true,
  onClick,
  ...props 
}) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "rounded-3xl border border-black/5 dark:border-white/10 transition-all duration-300",
        overflowHidden && "overflow-hidden",
        variant === 'glass' && "bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-2xl shadow-sm",
        variant === 'panel' && "bg-white dark:bg-[#1c1c1e] shadow-sm",
        variant === 'raised' && "bg-white dark:bg-[#2c2c2e] shadow-premium",
        innerGlow && "shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
