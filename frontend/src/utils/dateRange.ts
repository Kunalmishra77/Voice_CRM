import { 
  format, 
  startOfToday, 
  endOfToday, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  subMonths,
  subDays,
  parseISO
} from 'date-fns';

export type DatePreset = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfYearly' | 'yearly' | 'allTime' | 'custom';

export interface DateRange {
  from: string; // ISO (YYYY-MM-DD)
  to: string;   // ISO (YYYY-MM-DD)
}

/**
 * Returns date range for a preset.
 * We calculate this based on the current date in Asia/Kolkata.
 * Since we don't have date-fns-tz, we use the local time and assume the UI is used in the target region
 * or standard UTC offsets are handled by the system clock.
 */
export const getRangeFromPreset = (preset: DatePreset, now: Date = new Date()): DateRange => {
  let from: Date;
  let to: Date = endOfToday();

  switch (preset) {
    case 'daily':
      from = startOfToday();
      to = endOfToday();
      break;
    case 'weekly':
      // User requested "before 7 days data from today"
      from = subDays(now, 6); // Total 7 days including today
      to = endOfToday();
      break;
    case 'monthly':
      // User requested "this month" to show like that
      from = startOfMonth(now);
      to = endOfMonth(now);
      break;
    case 'quarterly':
      from = startOfQuarter(now);
      to = endOfQuarter(now);
      break;
    case 'halfYearly':
      from = startOfMonth(subMonths(now, 5));
      to = endOfMonth(now);
      break;
    case 'yearly':
      from = startOfYear(now);
      to = endOfYear(now);
      break;
    case 'allTime':
      from = new Date(0); // epoch = '1970-01-01' — matches null-timestamp sentinel
      to = new Date(2100, 11, 31);
      break;
    case 'custom':
    default:
      from = subDays(now, 6);
      to = endOfToday();
      break;
  }

  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd')
  };
};

export const formatRangeLabel = (preset: DatePreset, from: string, to: string): string => {
  const labels: Record<DatePreset, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    halfYearly: 'Half-yearly',
    yearly: 'Yearly',
    allTime: 'All-time',
    custom: 'Custom Range'
  };
  
  if (preset === 'allTime') return 'All-time';
  
  const presetLabel = labels[preset];
  try {
    const fromDate = parseISO(from);
    const toDate = parseISO(to);
    
    // Formatting: 01 Feb – 07 Feb
    const fromStr = format(fromDate, 'dd MMM');
    const toStr = format(toDate, 'dd MMM');
    
    // If years are different or not current, might need more detail, 
    // but sticking to requested format.
    return `${presetLabel} (${fromStr} – ${toStr})`;
  } catch {
    return presetLabel;
  }
};

// Legacy support
export const getLabelForRange = (preset: DatePreset, range: DateRange): string => {
  return formatRangeLabel(preset, range.from, range.to);
};
