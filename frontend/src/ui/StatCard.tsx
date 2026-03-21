import React, { useEffect, useRef, useState } from 'react';
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

/** Animated counter that counts up from 0 to target */
const AnimatedNumber: React.FC<{ value: number | string }> = ({ value }) => {
  const [display, setDisplay] = useState(0);
  const numValue = typeof value === 'string' ? parseInt(value, 10) : value;

  useEffect(() => {
    if (isNaN(numValue) || numValue === 0) {
      setDisplay(numValue || 0);
      return;
    }
    let start = 0;
    const end = numValue;
    const duration = 600;
    const step = Math.max(1, Math.floor(end / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [numValue]);

  if (typeof value === 'string' && isNaN(parseInt(value, 10))) {
    return <>{value}</>;
  }
  return <>{display.toLocaleString()}</>;
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  trend,
  className,
  variant = 'zinc',
  onClick
}) => {
  const iconColors = {
    teal: "text-primary",
    orange: "text-orange-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    zinc: "text-zinc-400 dark:text-zinc-500",
    danger: "text-rose-500",
  };

  const iconBgs = {
    teal: "bg-[var(--brand-50)] dark:bg-primary/20",
    orange: "bg-orange-50 dark:bg-orange-500/10",
    blue: "bg-blue-50 dark:bg-blue-500/10",
    purple: "bg-purple-50 dark:bg-purple-500/10",
    zinc: "bg-zinc-100 dark:bg-secondary",
    danger: "bg-rose-50 dark:bg-rose-500/10",
  };

  return (
    <Card
      className={cn(
        "p-4 transition-all duration-300 group flex flex-col justify-between h-[120px] bg-card rounded-2xl hover:shadow-[var(--shadow-elevated)]",
        onClick && "cursor-pointer active:scale-[0.98] hover:border-primary/20",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", iconBgs[variant])}>
          <Icon size={18} strokeWidth={2} className={iconColors[variant]} />
        </div>

        {trend && (
          <div className={cn(
            "flex items-center text-[11px] font-semibold tracking-tight px-1.5 py-0.5 rounded-md",
            trend.isUp ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400"
          )}>
            {trend.isUp ? <ArrowUpRight size={13} className="mr-0.5" /> : <ArrowDownRight size={13} className="mr-0.5" />}
            {trend.value}%
          </div>
        )}
      </div>

      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5 truncate">
          {label}
        </p>
        <h3 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
          <AnimatedNumber value={value} />
        </h3>
      </div>
    </Card>
  );
};
