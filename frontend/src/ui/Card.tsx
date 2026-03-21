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
        "rounded-2xl border transition-all duration-200",
        overflowHidden && "overflow-hidden",
        variant === 'glass' && "glass-morphism border-border/50",
        variant === 'panel' && "bg-card border-border",
        variant === 'raised' && "bg-card border-border shadow-[var(--shadow-card)]",
        innerGlow && "shadow-[var(--inner-glow)]",
        onClick && "cursor-pointer active:scale-[0.99] hover:shadow-[var(--shadow-elevated)] hover:border-primary/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
