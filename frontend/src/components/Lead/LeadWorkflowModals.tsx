import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { FixedDropdown } from '../../ui/FixedDropdown';
import { dataApi, type LeadInsightRow } from '../../data/api';
import { useGlobalFilters } from '../../state/globalFiltersStore';

interface LeadWorkflowModalsProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadInsightRow | null;
  type: 'Converted' | 'NotInterested' | 'Closed' | null;
}

export const LeadWorkflowModals: React.FC<LeadWorkflowModalsProps> = ({
  isOpen,
  onClose,
  lead,
  type
}) => {
  const queryClient = useQueryClient();
  const { dateRange, datePreset } = useGlobalFilters();
  const [form, setForm] = useState({ reason: '', note: '' });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { lead: LeadInsightRow; status: 'Converted' | 'NotInterested' | 'Closed'; reason: string; note: string }) => 
      dataApi.updateLeadStatus({
        lead: data.lead,
        status: data.status,
        reason: data.reason,
        note: data.note,
        range: { ...dateRange, preset: datePreset }
      }),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['leads-explorer'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-funnel'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stage'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-call-pulse'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-call-trend'] });
        queryClient.invalidateQueries({ queryKey: ['call-insight-detail'] });
        toast.success(`Saved ✅ ${type === 'Converted' ? 'Converted' : 'Unconverted'}`);
        onClose();
        setForm({ reason: '', note: '' });
      } else {
        toast.error(res.message || 'Operation failed');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type || !lead) return;
    
    if (!form.reason) {
      toast.error("Reason required", { description: "Please select a reason from the dropdown." });
      return;
    }
    if (form.note.length < 10) {
      toast.error("Note too short", { description: "Please provide at least 10 characters of context." });
      return;
    }

    updateStatusMutation.mutate({
      lead,
      status: type,
      reason: form.reason,
      note: form.note
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'Converted' ? 'Mark as Converted' : 'Mark as Unconverted'}
      overflowHidden={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
              {type === 'Converted' ? 'Conversion Reason' : 'Unconverted Reason'}
            </label>
            <FixedDropdown
              options={type === 'Converted' ? [
                { value: 'Order Confirmed', label: 'Order Confirmed' },
                { value: 'Price Accepted', label: 'Price Accepted' },
                { value: 'Quote Approved', label: 'Quote Approved' },
                { value: 'Site Visit Scheduled', label: 'Site Visit Scheduled' },
                { value: 'Advance Paid', label: 'Advance Paid' },
                { value: 'Purchase Order Received', label: 'Purchase Order Received' },
                { value: 'Other', label: 'Other' },
              ] : [
                { value: 'No Budget', label: 'No Budget' },
                { value: 'Not Interested', label: 'Not Interested' },
                { value: 'Competitor Chosen', label: 'Competitor Chosen' },
                { value: 'No Response', label: 'No Response' },
                { value: 'Invalid Lead', label: 'Invalid Lead' },
                { value: 'Requirement Mismatch', label: 'Requirement Mismatch' },
                { value: 'Other', label: 'Other' },
              ]}
              value={form.reason}
              onChange={(v) => setForm({ ...form, reason: v })}
              placeholder="Select reason..."
              className="w-full h-14 rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest pl-1">
              {type === 'Converted' ? 'Conversion Note' : 'Internal Note'}
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Add at least 10 characters of context..."
              className="w-full h-32 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 resize-none"
              required
            />
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <Button type="submit" variant={type === 'Converted' ? 'primary' : 'danger'} className="w-full py-5 rounded-2xl shadow-xl" loading={updateStatusMutation.isPending}>
            <Save size={18} className="mr-2" /> Confirm {type === 'Converted' ? 'Conversion' : 'Decision'}
          </Button>
          <Button type="button" variant="ghost" className="w-full text-zinc-500 py-4" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};
