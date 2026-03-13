import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse an ISO date string. Returns current date if invalid.
 */
export function safeParseISO(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? d : new Date();
  } catch (e) {
    return new Date();
  }
}

/**
 * Safely format a date. Returns fallback if date is invalid.
 */
export function safeFormat(date: Date | string | number | null | undefined, formatStr: string, fallback: string = 'N/A'): string {
  if (!date) return fallback;
  try {
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      d = parseISO(date);
    } else {
      d = new Date(date);
    }
    
    return isValid(d) ? format(d, formatStr) : fallback;
  } catch (e) {
    return fallback;
  }
}
