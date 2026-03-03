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

export type DatePreset = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfYearly' | 'yearly' | 'custom';

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

  // Basic adjustment for Asia/Kolkata if needed could be done here, 
  // but usually browser local time is what the user expects for "Today".

  switch (preset) {
    case 'daily':
      from = startOfToday();
      to = endOfToday();
      break;
    case 'weekly':
      from = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      to = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case 'monthly':
      from = startOfMonth(now);
      to = endOfMonth(now);
      break;
    case 'quarterly':
      from = startOfQuarter(now);
      to = endOfQuarter(now);
      break;
    case 'halfYearly':
      // From 6 months ago (start of month) to end of current month
      from = startOfMonth(subMonths(now, 5));
      to = endOfMonth(now);
      break;
    case 'yearly':
      from = startOfYear(now);
      to = endOfYear(now);
      break;
    case 'custom':
    default:
      from = subDays(now, 6);
      to = now;
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
    custom: 'Custom Range'
  };
  
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
