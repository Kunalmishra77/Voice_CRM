import React from 'react';
import { Card } from './Card';
import { cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
  variant?: 'teal' | 'orange' | 'blue' | 'purple' | 'zinc' | 'danger';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  className,
  variant = 'zinc',
  onClick
}) => {
  const variantStyles = {
    teal: "text-emerald-500",
    orange: "text-orange-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    zinc: "text-zinc-400",
    danger: "text-rose-500",
  };

  return (
    <Card 
      className={cn(
        "p-4 hover:border-zinc-400/30 transition-all duration-300 group flex flex-col justify-between h-[120px] bg-card rounded-xl", 
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={cn("transition-colors duration-300", variantStyles[variant])}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center text-[11px] font-semibold tracking-tight",
            trend.isUp ? "text-emerald-500" : "text-rose-500"
          )}>
            {trend.isUp ? <ArrowUpRight size={14} className="mr-0.5" /> : <ArrowDownRight size={14} className="mr-0.5" />}
            {trend.value}%
          </div>
        )}
      </div>
      
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5 truncate">
          {label}
        </p>
        <h3 className="text-2xl font-semibold text-foreground tracking-tight tabular-nums">
          {value}
        </h3>
      </div>
    </Card>
  );
};
