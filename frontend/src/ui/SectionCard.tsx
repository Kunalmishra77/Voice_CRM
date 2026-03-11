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
    sm: "p-4",
    md: "p-5 md:p-6",
    lg: "p-8",
  };

  return (
    <Card 
      overflowHidden={overflowHidden} 
      className={cn(
        "flex flex-col bg-card rounded-xl border border-border",
        paddingStyles[padding], 
        className
      )}
    >
      {(title || subtitle || headerActions || icon) && (
        <div className="flex items-center justify-between mb-5 shrink-0 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            {icon && <div className="flex-shrink-0 text-muted-foreground">{icon}</div>}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
