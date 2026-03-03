import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  overflowHidden?: boolean;
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  overflowHidden = true,
  showClose = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={showClose ? onClose : undefined}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-md glass-morphism rounded-[2.5rem] shadow-2xl p-8 border border-zinc-200/50 dark:border-white/10 flex flex-col max-h-[90vh]",
              overflowHidden && "overflow-hidden",
              className
            )}
          >
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h3 className="text-xl font-black tracking-tighter uppercase italic text-zinc-900 dark:text-zinc-100">{title}</h3>
              {showClose && (
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
