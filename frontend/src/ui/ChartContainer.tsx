import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

interface ChartContainerProps {
  children: React.ReactNode;
  height?: number | string;
  className?: string;
}

/**
 * ChartContainer
 * ──────────────
 * Provides a robust, responsive container for Recharts.
 * Solves the "width/height is 0" issues by ensuring parent has dimensions.
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  height = 300,
  className
}) => {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Recharts needs a slight delay or an explicit mount signal 
  // to correctly calculate parent dimensions.
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const containerHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div 
      ref={containerRef}
      className={cn("w-full relative overflow-hidden min-w-[1px] min-h-[1px]", className)} 
      style={{ height: containerHeight, minHeight: containerHeight }}
    >
      {isReady && (
        <div className="absolute inset-0 w-full h-full animate-in fade-in duration-500 min-w-0 min-h-0">
          {children}
        </div>
      )}
    </div>
  );
};
