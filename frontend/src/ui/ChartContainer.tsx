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
 * Provides a stable parent for Recharts.
 * Uses a double-lock strategy (State + Intersection) to ensure
 * the browser has calculated dimensions before mounting the SVG.
 */
export const ChartContainer: React.FC<ChartContainerProps> = ({ 
  children, 
  height = 300, 
  className 
}) => {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerHeight = typeof height === 'number' ? `${height}px` : height;

  useEffect(() => {
    // 1. Initial short delay for DOM structure
    const timer = setTimeout(() => {
      // 2. Check if element is actually in DOM and has size
      if (containerRef.current && containerRef.current.offsetWidth > 0) {
        setIsReady(true);
      } else {
        // 3. Fallback: use a ResizeObserver to wait for layout
        const observer = new ResizeObserver((entries) => {
          if (entries[0].contentRect.width > 0) {
            setIsReady(true);
            observer.disconnect();
          }
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn("w-full relative overflow-hidden min-w-0 min-h-0", className)} 
      style={{ height: containerHeight, minHeight: containerHeight }}
    >
      {isReady && (
        <div className="absolute inset-0 w-full h-full animate-in fade-in duration-500">
          {children}
        </div>
      )}
    </div>
  );
};
