import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from 'date-fns';

/**
 * Formats a date to a readable format
 * @param date - Date string or Date object
 * @param formatString - Optional format string (default: "MMM yyyy")
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string, formatString = 'MMM yyyy'): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, formatString);
  } catch {
    return 'Invalid date';
  }
};

/**
 * Formats a date for display in profiles (e.g., "Jan 2023")
 */
export const formatProfileDate = (date: Date | string): string => {
  return formatDate(date, 'MMM yyyy');
};

/**
 * Formats a full date (e.g., "January 15, 2023")
 */
export const formatFullDate = (date: Date | string): string => {
  return formatDate(date, 'MMMM d, yyyy');
};



/**
 * Formats a date range for work experience or projects
 * @param startDate - Start date
 * @param endDate - End date (null/undefined for current)
 * @returns Formatted date range (e.g., "Jan 2020 - Present" or "Jan 2020 - Dec 2022")
 */
export const formatDateRange = (
  startDate: Date | string,
  endDate?: Date | string | null
): string => {
  const start = formatProfileDate(startDate);
  if (!endDate) {
    return `${start} - Present`;
  }
  const end = formatProfileDate(endDate);
  return `${start} - ${end}`;
};


/**
 * Formats relative time (e.g., "2 hours ago", "3 days ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return '';
  }
};

/**
 * format date-time into am, pm readable format
 * @param time - ISO datetime format
 * @returns - formats to e.g 12:30am, 12:20pm
 */

export const formatTime = (time: Date | string): string => {
  try {
    return format(new Date(time), "hh:mm a")
  } catch (error) {
    return ''
  }
}

/**
 * Formats ISO date string for datetime input
 */
export const formatForInput = (date: Date | string): string => {
  return formatDate(date, 'yyyy-MM-dd');
};

/**
 * Checks if a date is in the future
 */
export const isFutureDate = (date: Date | string): boolean => {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return dateObj > new Date();
  } catch {
    return false;
  }
};
