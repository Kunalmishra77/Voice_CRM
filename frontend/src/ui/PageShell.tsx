import React from 'react';
import { cn } from '../lib/utils';

export const PageShell: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => {
  return (
    <div className={cn("w-full h-full flex flex-col pt-2 pb-12 max-w-[1600px] mx-auto animate-fade-up", className)}>
      {children}
    </div>
  );
};
