import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  History,
  ShieldCheck,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  Filter,
  Columns,
  Search,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Circle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { useExportStore } from '../../state/exportStore';
import { dataProvider } from '../../data/dataProvider';
import { cn, safeFormat } from '../../lib/utils';

const EXPORT_FORMATS = [
  { value: 'CSV', label: 'CSV (Comma Separated)', icon: TableIcon },
  { value: 'XLSX', label: 'Excel Spreadsheet', icon: FileSpreadsheet },
  { value: 'JSON', label: 'JSON Format', icon: FileJson },
];

const EXPORT_COLUMNS = [
  { id: 'name', label: 'Customer Name', checked: true },
  { id: 'phone', label: 'Phone Number', checked: true },
  { id: 'bucket', label: 'Lead Bucket', checked: true },
  { id: 'score', label: 'Intent Score', checked: true },
  { id: 'sentiment', label: 'Sentiment', checked: true },
  { id: 'concern', label: 'Primary Concern', checked: true },
  { id: 'summary', label: 'AI Summary', checked: true },
  { id: 'status', label: 'Status', checked: true },
  { id: 'owner', label: 'Assigned Agent', checked: false },
  { id: 'created_at', label: 'Created Date', checked: false },
];

const ExportsPage: React.FC = () => {
  const { dateRange } = useGlobalFilters();
  const { history, addJob } = useExportStore();
  const [selectedFormat, setSelectedFormat] = useState('CSV');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [columns, setColumns] = useState(EXPORT_COLUMNS);

  const { data: leads } = useQuery({
    queryKey: ['export-preview-leads', dateRange],
    queryFn: () => dataProvider.getLeads({ range: dateRange }),
  });

  const toggleColumn = (id: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const handleInitiateExtraction = () => {
    if (!leads || leads.length === 0) {
      toast.error("No leads found in the selected date range.");
      return;
    }
    setIsModalOpen(true);
  };

  const handleGenerateFile = () => {
    setIsExtracting(true);

    // Generate file with slight delay for UX
    setTimeout(() => {
      const filename = `Leads_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.${selectedFormat.toLowerCase()}`;

      // Create downloadable file
      const blob = new Blob([JSON.stringify(leads || [], null, 2)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addJob({
        format: selectedFormat as any,
        count: leads?.length || 0,
        status: 'COMPLETED',
        filename
      });

      setIsExtracting(false);
      setIsModalOpen(false);
      toast.success("Export completed and file downloaded.");
    }, 2500);
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Data Export</h1>
          <p className="text-muted-foreground font-medium mt-1">Export your lead data for reporting and analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Export Panel */}
        <div className="lg:col-span-7 flex flex-col">
          <SectionCard
            title="Export Settings"
            subtitle="Configure your export."
            icon={<Database size={18} className="text-primary" />}
            className="flex-1 flex flex-col"
          >
            <div className="space-y-10 py-4 flex-1">
              <div className="space-y-4">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider pl-1">Export Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {EXPORT_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setSelectedFormat(f.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-8 rounded-2xl border transition-all gap-4 group cursor-pointer",
                        selectedFormat === f.value
                          ? "bg-primary/5 border-primary shadow-sm scale-[1.02]"
                          : "bg-card border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      <f.icon size={28} className={cn(selectedFormat === f.value ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground")} />
                      <span className={cn("text-[11px] font-bold uppercase tracking-wider", selectedFormat === f.value ? "text-primary" : "")}>{f.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider pl-1">Columns to Include</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {columns.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => toggleColumn(c.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                        c.checked
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card border-border text-muted-foreground hover:border-primary/20"
                      )}
                    >
                      {c.checked ? <CheckCircle2 size={16} /> : <Circle size={16} className="opacity-30" />}
                      <span className="text-xs font-semibold">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border flex flex-col items-center mt-auto">
               <div className="w-full flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary border border-border shadow-sm"><ShieldCheck size={24} /></div>
                     <div>
                        <p className="text-sm font-bold text-foreground tracking-tight">Ready to Export</p>
                        <p className="text-[10px] font-medium text-muted-foreground">Export will be logged in history.</p>
                     </div>
                  </div>
                  <Badge variant="zinc" className="text-xs tabular-nums font-bold px-4 py-1 rounded-full bg-accent border-none">{leads?.length || 0} Leads</Badge>
               </div>
               <Button
                 variant="primary"
                 className="w-full py-7 rounded-2xl shadow-lg text-base font-bold h-auto"
                 onClick={handleInitiateExtraction}
               >
                 Export Data <ArrowRight size={20} className="ml-3" />
               </Button>
            </div>
          </SectionCard>
        </div>

        {/* Export History */}
        <div className="lg:col-span-5 flex flex-col">
          <SectionCard
            title="Export History"
            subtitle="Previous exports."
            icon={<History size={18} className="text-purple-500" />}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-4 space-y-4 min-h-[500px]">
              {history.length === 0 ? (
                <EmptyState icon={Clock} title="No Exports Yet" description="Your export history will appear here." className="py-20" />
              ) : (
                history.map((job) => (
                  <div key={job.id} className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between group hover:border-primary/20 transition-all shadow-sm">
                    <div className="flex items-center gap-5 min-w-0">
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm flex-shrink-0",
                         job.format === 'CSV' ? "bg-emerald-500" : job.format === 'XLSX' ? "bg-blue-500" : "bg-purple-500"
                       )}>
                         {job.format === 'CSV' ? <TableIcon size={20} /> : <FileSpreadsheet size={20} />}
                       </div>
                       <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground truncate tracking-tight">{job.filename}</h4>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] font-medium text-muted-foreground">{safeFormat(job.timestamp, 'MMM dd, HH:mm')}</span>
                             <div className="w-1.5 h-1.5 rounded-full bg-border" />
                             <span className="text-[10px] font-bold text-primary">{job.count} Leads</span>
                          </div>
                       </div>
                    </div>
                    <Badge variant="zinc" className="text-[10px] font-semibold border-none opacity-60 bg-accent flex-shrink-0">{job.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Export Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !isExtracting && setIsModalOpen(false)} title="Confirm Export" className="max-w-lg">
         <div className="py-6 space-y-10">
            <div className="space-y-5">
               <h3 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider pl-1">Export Preview</h3>
               <div className="p-6 rounded-2xl bg-accent border border-border space-y-4">
                  {(leads || []).slice(0, 3).map((l, i) => (
                    <div key={i} className="flex items-center justify-between opacity-60 hover:opacity-100 transition-all group">
                       <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground truncate w-40">{l['User Name']}</span>
                       <div className="h-px flex-1 bg-border mx-4" />
                       <span className="text-xs font-bold tabular-nums text-muted-foreground">{l['Phone Number']}</span>
                    </div>
                  ))}
                  <div className="text-center pt-4">
                     <span className="text-[10px] font-medium text-muted-foreground opacity-50">... and {(leads?.length || 0) > 3 ? leads!.length - 3 : 0} more leads ...</span>
                  </div>
               </div>
            </div>

            {isExtracting ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-8">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/10 animate-spin" style={{ borderTopColor: 'var(--brand-500)' }} />
                    <div className="absolute inset-0 flex items-center justify-center text-primary"><Download size={32} /></div>
                 </div>
                 <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">Generating Export...</h3>
                    <p className="text-xs font-medium text-muted-foreground mt-3">Preparing {selectedFormat} file for download.</p>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                 <Button variant="primary" className="py-6 rounded-2xl shadow-lg text-sm font-bold h-auto" onClick={handleGenerateFile}>
                    <CheckCircle2 size={20} className="mr-3" /> Download Export
                 </Button>
                 <Button variant="ghost" className="py-4 text-muted-foreground font-medium" onClick={() => setIsModalOpen(false)}>
                    Cancel
                 </Button>
              </div>
            )}
         </div>
      </Modal>
    </PageShell>
  );
};

export default ExportsPage;
