import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatRangeLabel } from '../utils/dateRange';

interface CustomRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFrom: string;
  initialTo: string;
  onApply: (from: string, to: string) => void;
}

export const CustomRangeModal: React.FC<CustomRangeModalProps> = ({
  isOpen,
  onClose,
  initialFrom,
  initialTo,
  onApply
}) => {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(from) > new Date(to)) {
      toast.error("Invalid range", { description: "From date cannot be after To date." });
      return;
    }

    onApply(from, to);
    onClose();
    
    const label = formatRangeLabel('custom', from, to);
    toast.success("Range updated", { description: label });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Custom Analytics Range"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">From Date</label>
            <input 
              type="date" 
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">To Date</label>
            <input 
              type="date" 
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <Button type="submit" variant="primary" className="w-full py-4 rounded-2xl">
            <Save size={18} className="mr-2" /> Apply Range
          </Button>
          <Button type="button" variant="ghost" className="w-full text-zinc-500" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
