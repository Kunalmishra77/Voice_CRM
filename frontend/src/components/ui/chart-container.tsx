import { useState, useEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  height?: number | string;
  minHeight?: number;
}

/**
 * A robust wrapper for Recharts to prevent the "width/height is -1" error
 * by ensuring the container has actual dimensions before rendering children.
 */
export const ChartContainer = ({ children, height = 300, minHeight = 300 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full relative" 
      style={{ 
        height: typeof height === 'number' ? `${height}px` : height,
        minHeight: `${minHeight}px` 
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 ? (
        children
      ) : (
        <div className="absolute inset-0 skeleton-pulse rounded-2xl" />
      )}
    </div>
  );
};
