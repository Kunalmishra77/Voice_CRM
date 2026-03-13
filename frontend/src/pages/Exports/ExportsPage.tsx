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
  { value: 'CSV', label: 'CSV (Comman Separated)', icon: TableIcon },
  { value: 'XLSX', label: 'Excel Spreadsheet', icon: FileSpreadsheet },
  { value: 'JSON', label: 'Raw JSON Matrix', icon: FileJson },
];

const EXPORT_COLUMNS = [
  { id: 'name', label: 'Customer Name', checked: true },
  { id: 'phone', label: 'Phone Number', checked: true },
  { id: 'bucket', label: 'Lead Bucket', checked: true },
  { id: 'score', label: 'Intent Score', checked: true },
  { id: 'sentiment', label: 'Sentiment', checked: true },
  { id: 'concern', label: 'Primary Concern', checked: true },
  { id: 'summary', label: 'AI Summary', checked: true },
  { id: 'status', label: 'Operational Status', checked: true },
  { id: 'owner', label: 'Assigned Agent', checked: false },
  { id: 'created_at', label: 'Creation Node', checked: false },
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
      toast.error("No intelligence nodes found in current range.");
      return;
    }
    setIsModalOpen(true);
  };

  const handleGenerateFile = () => {
    setIsExtracting(true);
    
    // Simulate extraction delay
    setTimeout(() => {
      const filename = `Intelligence_Export_${format(new Date(), 'yyyyMMdd_HHmm')}.${selectedFormat.toLowerCase()}`;
      
      // Create fake blob for download
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
      toast.success("Extraction synchronized and file deployed.");
    }, 2500);
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic">Data Extraction</h1>
          <p className="text-zinc-500 font-medium mt-1">Export intelligence nodes for external auditing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Extraction Panel */}
        <div className="lg:col-span-7 flex flex-col">
          <SectionCard 
            title="Extraction Parameters" 
            subtitle="Configure your data payload."
            icon={<Database size={18} className="text-teal-500" />}
            className="flex-1 flex flex-col"
          >
            <div className="space-y-10 py-4 flex-1">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest pl-1">Target Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {EXPORT_FORMATS.map((f) => (
                    <button 
                      key={f.value}
                      onClick={() => setSelectedFormat(f.value)}
                      className={cn(
                        "flex flex-col items-center justify-center p-8 rounded-[2rem] border transition-all gap-4 group",
                        selectedFormat === f.value 
                          ? "bg-teal-500/5 border-teal-500 text-teal-600 shadow-xl shadow-teal-500/5 scale-[1.02]" 
                          : "bg-white dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-400 hover:border-zinc-300"
                      )}
                    >
                      <f.icon size={28} className={cn(selectedFormat === f.value ? "text-teal-500" : "text-zinc-300 group-hover:text-zinc-500")} />
                      <span className="text-[11px] font-black uppercase tracking-widest">{f.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest pl-1">Column Matrix</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {columns.map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => toggleColumn(c.id)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                        c.checked 
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white shadow-sm" 
                          : "bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/5 text-zinc-500 hover:border-teal-500/20"
                      )}
                    >
                      {c.checked ? <CheckCircle2 size={16} className="text-teal-500" /> : <Circle size={16} className="opacity-30" />}
                      <span className="text-xs font-bold uppercase tracking-tight">{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-black/5 dark:border-white/5 flex flex-col items-center mt-auto">
               <div className="w-full flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-teal-500 border border-black/5 dark:border-white/10 shadow-sm"><ShieldCheck size={24} /></div>
                     <div>
                        <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">Security Protocol Active</p>
                        <p className="text-[10px] font-medium text-zinc-500">Extraction logged in immutable audit trail.</p>
                     </div>
                  </div>
                  <Badge variant="zinc" className="text-xs tabular-nums font-black px-4 py-1 rounded-full bg-zinc-100 dark:bg-white/10 border-none">{leads?.length || 0} Nodes</Badge>
               </div>
               <Button 
                 variant="primary" 
                 className="w-full py-7 rounded-[2rem] shadow-2xl shadow-teal-500/20 text-base font-black uppercase tracking-[0.25em] h-auto"
                 onClick={handleInitiateExtraction}
               >
                 Initiate Extraction <ArrowRight size={20} className="ml-3" />
               </Button>
            </div>
          </SectionCard>
        </div>

        {/* Audit Trail */}
        <div className="lg:col-span-5 flex flex-col">
          <SectionCard 
            title="Audit Trail" 
            subtitle="Immutable extraction logs."
            icon={<History size={18} className="text-purple-500" />}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-4 space-y-4 min-h-[500px]">
              {history.length === 0 ? (
                <EmptyState icon={Clock} title="Trail Synchronized" description="No extraction logs detected in local vector." className="py-20" />
              ) : (
                history.map((job) => (
                  <div key={job.id} className="p-5 rounded-3xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/50 dark:border-white/5 flex items-center justify-between group hover:border-teal-500/30 transition-all">
                    <div className="flex items-center gap-5 min-w-0">
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0",
                         job.format === 'CSV' ? "bg-emerald-500" : job.format === 'XLSX' ? "bg-blue-500" : "bg-purple-500"
                       )}>
                         {job.format === 'CSV' ? <TableIcon size={20} /> : <FileSpreadsheet size={20} />}
                       </div>
                       <div className="min-w-0">
                          <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase truncate italic tracking-tight">{job.filename}</h4>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] font-bold text-zinc-400">{safeFormat(job.timestamp, 'MMM dd, HH:mm')}</span>
                             <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10" />
                             <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">{job.count} Nodes</span>
                          </div>
                       </div>
                    </div>
                    <Badge variant="zinc" className="text-[10px] font-black uppercase border-none opacity-50 bg-zinc-100 dark:bg-white/10 flex-shrink-0">{job.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Extraction Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !isExtracting && setIsModalOpen(false)} title="Finalize Data Handshake" className="max-w-lg">
         <div className="py-6 space-y-10">
            <div className="space-y-5">
               <h3 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.25em] pl-1">Extraction Preview</h3>
               <div className="p-6 rounded-[2rem] bg-zinc-50 dark:bg-zinc-900 border border-black/5 dark:border-white/10 space-y-4 shadow-inner">
                  {(leads || []).slice(0, 3).map((l, i) => (
                    <div key={i} className="flex items-center justify-between opacity-60 hover:opacity-100 transition-all group">
                       <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 uppercase tracking-tighter truncate w-40">{l['User Name']}</span>
                       <div className="h-px flex-1 bg-zinc-200 dark:bg-white/5 mx-4" />
                       <span className="text-xs font-black tabular-nums text-zinc-400">{l['Phone Number']}</span>
                    </div>
                  ))}
                  <div className="text-center pt-4">
                     <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.4em] italic opacity-50">... and {(leads?.length || 0) > 3 ? leads!.length - 3 : 0} more nodes ...</span>
                  </div>
               </div>
            </div>

            {isExtracting ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-8">
                 <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-teal-500/10 border-t-teal-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center text-teal-500"><Download size={32} /></div>
                 </div>
                 <div className="text-center">
                    <h3 className="text-lg font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-white italic">Extracting Vector Matrix</h3>
                    <p className="text-xs font-medium text-zinc-500 mt-3 italic">Writing {selectedFormat} node objects to local storage.</p>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                 <Button variant="primary" className="py-6 rounded-2xl shadow-xl shadow-teal-500/20 text-sm font-black uppercase tracking-widest h-auto" onClick={handleGenerateFile}>
                    <CheckCircle2 size={20} className="mr-3" /> Commit Extraction
                 </Button>
                 <Button variant="ghost" className="py-4 text-zinc-500 font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsModalOpen(false)}>
                    Abort Handshake
                 </Button>
              </div>
            )}
         </div>
      </Modal>
    </PageShell>
  );
};

export default ExportsPage;
