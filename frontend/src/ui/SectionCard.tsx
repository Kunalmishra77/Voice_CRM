import React from 'react';
import { Card } from './Card';
import { cn } from '../lib/utils';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  overflowHidden?: boolean;
  icon?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * SectionCard
 * ───────────
 * A high-level layout component for dashboard sections.
 * Optimized for flexible height alignment.
 */
export const SectionCard: React.FC<SectionCardProps> = ({ 
  title, 
  subtitle, 
  children, 
  className,
  headerActions,
  overflowHidden = true,
  icon,
  padding = 'md'
}) => {
  const paddingStyles = {
    none: "p-0",
    sm: "p-4 md:p-5",
    md: "p-6 md:p-7",
    lg: "p-8 md:p-10",
  };

  return (
    <Card 
      overflowHidden={overflowHidden} 
      className={cn(
        "flex flex-col",
        paddingStyles[padding], 
        className
      )}
    >
      {(title || subtitle || headerActions || icon) && (
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-start gap-3 md:gap-4">
            {icon && <div className="mt-1 flex-shrink-0">{icon}</div>}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm md:text-base font-black text-zinc-900 dark:text-zinc-100 tracking-tight uppercase italic truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[10px] md:text-xs font-medium text-zinc-500 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerActions && <div className="flex-shrink-0 ml-4">{headerActions}</div>}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {children}
      </div>
    </Card>
  );
};
