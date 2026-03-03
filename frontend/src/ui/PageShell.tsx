import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const PageShell: React.FC<PageShellProps> = ({ 
  children, 
  className,
  maxWidth = 'full' 
}) => {
  const maxWidthClasses = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1600px]',
    full: 'max-w-full',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "p-8 pt-6 space-y-8",
        maxWidthClasses[maxWidth],
        "mx-auto w-full",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
