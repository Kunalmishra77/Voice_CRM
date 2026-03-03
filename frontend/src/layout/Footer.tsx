import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="px-10 py-8 border-t border-zinc-200/50 dark:border-white/5 mt-auto flex items-center justify-between text-zinc-500 dark:text-zinc-600">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Powered by <span className="text-zinc-900 dark:text-zinc-100 font-bold uppercase italic tracking-tighter">AI Agentix</span></p>
        <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-800" />
        <span className="text-[10px] font-bold">Intelligence Ops Platform</span>
      </div>
      <div className="text-[10px] font-bold tracking-tight uppercase italic opacity-30 group-hover:opacity-100 transition-opacity">v2.4.8-india-grain</div>
    </footer>
  );
};
