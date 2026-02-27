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
  subDays,
  subWeeks,
  subMonths,
  subYears,
  isValid,
  parseISO
} from 'date-fns';
import { DatePreset, DateRange } from '../types/filters';

export const getRangeFromPreset = (
  preset: DatePreset, 
  now: Date = new Date(), 
  timezone: string = 'Asia/Kolkata'
): DateRange => {
  // Simple implementation for now (standard JS Date)
  // date-fns doesn't have native TZ support but we can work with standard dates for UTC-safe logic.
  
  let from: Date;
  let to: Date = endOfToday();

  switch (preset) {
    case 'daily':
      from = startOfToday();
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
      // Roughly last 6 months
      from = subMonths(startOfMonth(now), 5);
      to = endOfMonth(now);
      break;
    case 'yearly':
      from = startOfYear(now);
      to = endOfYear(now);
      break;
    case 'custom':
    default:
      from = subWeeks(now, 1);
      to = now;
      break;
  }

  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd')
  };
};

export const getLabel = (preset: DatePreset, range: DateRange): string => {
  if (preset === 'custom') {
    return \\ to \\;
  }
  
  const labels: Record<DatePreset, string> = {
    daily: 'Today',
    weekly: 'This Week',
    monthly: 'This Month',
    quarterly: 'This Quarter',
    halfYearly: 'Last 6 Months',
    yearly: 'This Year',
    custom: 'Custom Range'
  };
  
  return labels[preset];
};

export const isValidDateRange = (range: DateRange): boolean => {
  return isValid(parseISO(range.from)) && isValid(parseISO(range.to));
};
