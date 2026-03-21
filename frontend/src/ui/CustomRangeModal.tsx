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
      title="Custom Date Range"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground pl-1">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl p-3.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground pl-1">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl p-3.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <Button type="submit" variant="primary" className="w-full py-3.5 rounded-xl">
            <Save size={16} className="mr-2" /> Apply Range
          </Button>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
