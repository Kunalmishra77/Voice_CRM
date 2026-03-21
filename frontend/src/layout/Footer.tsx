import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="px-6 md:px-10 py-6 border-t border-border mt-auto flex items-center justify-between text-muted-foreground">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider leading-none">
          Powered by <span className="text-orange-500 font-bold">AI AGENTiX</span>
        </p>
        <span className="w-1 h-1 rounded-full bg-border" />
        <span className="text-[10px] font-medium">AI Lead Management</span>
      </div>
      <div className="text-[10px] font-medium tracking-tight opacity-40">v2.5.0</div>
    </footer>
  );
};
