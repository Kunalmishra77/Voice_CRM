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

/**
 * StatCard
 * ────────
 * Optimized for high-density dashboard layouts.
 * Layout: [Icon] ... [Trend]
 *         [Label]
 *         [Value]
 */
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
    teal: "text-emerald-500 bg-emerald-500/10",
    orange: "text-orange-500 bg-orange-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    purple: "text-purple-500 bg-purple-500/10",
    zinc: "text-zinc-400 bg-zinc-500/10",
    danger: "text-rose-500 bg-rose-500/10",
  };

  return (
    <Card 
      className={cn(
        "p-4 hover:border-teal-500/30 transition-all duration-300 group flex flex-col justify-between h-[140px]", 
        onClick && "cursor-pointer active:scale-95",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2 rounded-xl border border-transparent", variantStyles[variant])}>
          <Icon size={16} />
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-lg",
            trend.isUp ? "text-emerald-500" : "text-rose-500"
          )}>
            {trend.isUp ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
            {trend.value}%
          </div>
        )}
      </div>
      
      <div>
        <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-1 group-hover:text-teal-500 transition-colors truncate">
          {label}
        </p>
        <h3 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter tabular-nums">
          {value}
        </h3>
      </div>
    </Card>
  );
};
