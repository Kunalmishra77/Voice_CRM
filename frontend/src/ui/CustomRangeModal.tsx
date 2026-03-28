import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Save, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { formatRangeLabel } from '../utils/dateRange';
import { format, subDays } from 'date-fns';

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

  // When opening, if dates are extreme (allTime), reset to something sensible
  useEffect(() => {
    if (isOpen) {
      if (initialFrom.startsWith('2000') || initialTo.startsWith('2100')) {
        const now = new Date();
        setFrom(format(subDays(now, 30), 'yyyy-MM-dd'));
        setTo(format(now, 'yyyy-MM-dd'));
      } else {
        setFrom(initialFrom);
        setTo(initialTo);
      }
    }
  }, [isOpen, initialFrom, initialTo]);

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
      title="Select Custom Range"
      className="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-wider ml-1">Start Date</label>
            <div className="relative group">
              <CalendarIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all hover:bg-secondary cursor-pointer appearance-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-background p-1.5 rounded-full border border-border shadow-sm">
              <ArrowRight size={14} className="text-muted-foreground rotate-90" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase text-muted-foreground/70 tracking-wider ml-1">End Date</label>
            <div className="relative group">
              <CalendarIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all hover:bg-secondary cursor-pointer appearance-none"
                required
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Button type="submit" variant="primary" className="w-full py-3 rounded-xl font-semibold shadow-lg shadow-primary/20">
            <Save size={16} className="mr-2" /> Apply Range
          </Button>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground text-sm font-medium" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};


