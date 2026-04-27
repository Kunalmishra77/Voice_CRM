import React, { useState } from 'react';
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
  Search,
  Clock,
  Loader2,
  Circle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { PageShell } from '../../ui/PageShell';
import { SectionCard } from '../../ui/SectionCard';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { useGlobalFilters } from '../../state/globalFiltersStore';
import { useExportStore } from '../../state/exportStore';
import { dataProvider } from '../../data/dataProvider';
import { cn, safeFormat } from '../../lib/utils';

const EXPORT_FORMATS = [
  { value: 'CSV',  label: 'CSV (Comma Separated)', icon: TableIcon },
  { value: 'XLSX', label: 'Excel Spreadsheet',      icon: FileSpreadsheet },
  { value: 'JSON', label: 'JSON Format',             icon: FileJson },
];

// Exact DB column names → friendly header labels
const DB_COLUMNS: { key: string; label: string }[] = [
  { key: 'Leadid',          label: 'Lead ID' },
  { key: 'name',            label: 'Customer Name' },
  { key: 'mobile_number',   label: 'Phone Number' },
  { key: 'status',          label: 'Call Status' },
  { key: 'call_date_time',  label: 'Call Date & Time' },
  { key: 'Duration',        label: 'Duration (sec)' },
  { key: 'Summary',         label: 'Conversation Summary' },
  { key: 'Sentiment',       label: 'Sentiment' },
  { key: 'Type of Lead',    label: 'Lead Type' },
  { key: 'callback_time',   label: 'Requested Callback/Demo Time' },
  { key: 'callback_pending',label: 'Callback Pending' },
  { key: 'recording_url',   label: 'Recording URL' },
];

/** Extract only raw DB fields from a lead row */
function extractDbRow(lead: any): Record<string, any> {
  const row: Record<string, any> = {};
  for (const col of DB_COLUMNS) {
    // The backend spreads all DB columns into the response object
    row[col.label] = lead[col.key] ?? lead[col.key.toLowerCase()] ?? '';
  }
  return row;
}

function generateCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n');
}

function downloadBlob(content: string | ArrayBuffer, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const ExportsPage: React.FC = () => {
  const { dateRange } = useGlobalFilters();
  const { history, addJob } = useExportStore();
  const [selectedFormat, setSelectedFormat] = useState('CSV');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ['export-preview-leads', dateRange],
    queryFn: () => dataProvider.getLeads({ range: dateRange }),
  });

  const handleInitiateExtraction = () => {
    if (!leads || leads.length === 0) {
      toast.error('No leads found in the selected date range.');
      return;
    }
    setIsModalOpen(true);
  };

  const handleGenerateFile = () => {
    if (!leads?.length) return;
    setIsExtracting(true);

    setTimeout(() => {
      try {
        const rows = leads.map(extractDbRow);
        const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
        const filename = `Leads_Export_${timestamp}.${selectedFormat.toLowerCase()}`;

        if (selectedFormat === 'CSV') {
          const csv = generateCSV(rows);
          downloadBlob(csv, filename, 'text/csv;charset=utf-8;');

        } else if (selectedFormat === 'XLSX') {
          const ws = XLSX.utils.json_to_sheet(rows);
          // Auto-fit column widths
          const colWidths = Object.keys(rows[0]).map(key => ({
            wch: Math.max(key.length, ...rows.slice(0, 50).map(r => String(r[key] ?? '').length))
          }));
          ws['!cols'] = colWidths;
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Leads');
          const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          downloadBlob(xlsxBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        } else if (selectedFormat === 'JSON') {
          const json = JSON.stringify(rows, null, 2);
          downloadBlob(json, filename, 'application/json');
        }

        addJob({ format: selectedFormat as any, count: leads.length, status: 'COMPLETED', filename });
        toast.success(`Export complete — ${leads.length} leads downloaded.`);
      } catch (err) {
        toast.error('Export failed. Please try again.');
        console.error(err);
      } finally {
        setIsExtracting(false);
        setIsModalOpen(false);
      }
    }, 1200);
  };

  return (
    <PageShell>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Data Export</h1>
          <p className="text-muted-foreground font-medium mt-1">Export your lead data exactly as stored in the database.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Export Panel */}
        <div className="lg:col-span-7 flex flex-col">
          <SectionCard
            title="Export Settings"
            subtitle="All 12 database columns are included."
            icon={<Database size={18} className="text-primary" />}
            className="flex-1 flex flex-col"
          >
            <div className="space-y-10 py-4 flex-1">
              {/* Format Selector */}
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

              {/* Columns Preview */}
              <div className="space-y-4">
                <label className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider pl-1">Columns Exported (all DB fields)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DB_COLUMNS.map((col) => (
                    <div key={col.key} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border">
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{col.label}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{col.key}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border flex flex-col items-center mt-auto">
              <div className="w-full flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-primary border border-border shadow-sm">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground tracking-tight">Ready to Export</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Exact database values, no transformation.</p>
                  </div>
                </div>
                <Badge variant="zinc" className="text-xs tabular-nums font-bold px-4 py-1 rounded-full bg-accent border-none">
                  {isLoading ? '...' : `${leads?.length || 0} Leads`}
                </Badge>
              </div>
              <Button
                variant="primary"
                className="w-full py-7 rounded-2xl shadow-lg text-base font-bold h-auto"
                onClick={handleInitiateExtraction}
                disabled={isLoading}
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
                        {job.format === 'CSV' ? <TableIcon size={20} /> : job.format === 'XLSX' ? <FileSpreadsheet size={20} /> : <FileJson size={20} />}
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

      {/* Confirm Modal */}
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
                <span className="text-[10px] font-medium text-muted-foreground opacity-50">
                  ... and {Math.max(0, (leads?.length || 0) - 3)} more leads ...
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
              <Database size={14} className="text-primary shrink-0" />
              <p className="text-xs font-semibold text-primary">
                {leads?.length || 0} leads · {DB_COLUMNS.length} columns · {selectedFormat} format
              </p>
            </div>
          </div>

          {isExtracting ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-primary/10 animate-spin" style={{ borderTopColor: 'var(--brand-500)' }} />
                <div className="absolute inset-0 flex items-center justify-center text-primary"><Download size={32} /></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-foreground">Generating {selectedFormat} file...</h3>
                <p className="text-xs font-medium text-muted-foreground mt-3">Preparing {leads?.length} rows for download.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Button variant="primary" className="py-6 rounded-2xl shadow-lg text-sm font-bold h-auto" onClick={handleGenerateFile}>
                <CheckCircle2 size={20} className="mr-3" /> Download {selectedFormat}
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
