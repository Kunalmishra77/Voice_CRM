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
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border border-border bg-accent">
        <Icon size={32} className="text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold text-foreground tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {btnText && btnAction && (
        <Button variant="primary" onClick={btnAction} className="rounded-xl px-6">
          {btnText}
        </Button>
      )}
    </div>
  );
};
