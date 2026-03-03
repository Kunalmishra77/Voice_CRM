import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  ctaText, 
  onCtaClick,
  className,
  actionLabel,
  onAction
}) => {
  const btnText = ctaText || actionLabel;
  const btnAction = onCtaClick || onAction;

  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center mb-6 border border-zinc-200/50 dark:border-white/5">
        <Icon size={40} className="text-zinc-300 dark:text-zinc-700" />
      </div>
      <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic mb-2">
        {title}
      </h3>
      <p className="text-sm font-medium text-zinc-500 max-w-sm mb-8 leading-relaxed">
        {description}
      </p>
      {btnText && btnAction && (
        <Button 
          variant="primary" 
          onClick={btnAction}
          className="rounded-2xl px-8"
        >
          {btnText}
        </Button>
      )}
    </div>
  );
};
