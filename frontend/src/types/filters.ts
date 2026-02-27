export type DatePreset = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfYearly' | 'yearly' | 'custom';

export interface DateRange {
  from: string; // ISO (YYYY-MM-DD)
  to: string;   // ISO (YYYY-MM-DD)
}

export interface DashboardFilters {
  preset: DatePreset;
  range: DateRange;
}
