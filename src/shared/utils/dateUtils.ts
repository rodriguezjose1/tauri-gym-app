/**
 * Utility functions for consistent date handling across the application
 * This ensures that dates are handled in local timezone, not UTC
 */

/**
 * Formats a Date object to YYYY-MM-DD format using local timezone
 * This is the correct way to format dates for database operations
 * Throws RangeError for invalid Date values or years outside 0001-9999.
 */
export const formatDateForDB = (date: Date): string => {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new RangeError('Fecha inválida');
  }
  const year = date.getFullYear();
  if (year < 1 || year > 9999) throw new RangeError('Año fuera del rango 0001-9999');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${String(year).padStart(4, '0')}-${month}-${day}`;
};

/**
 * Formats a date string to YYYY-MM-DD format using local timezone
 * Accepts YYYY-MM-DD or YYYY-MM-DD[T or space]HH:mm[:ss[.SSS]][Z or +/-HH:mm].
 * Date-only values retain their calendar day; timestamps use the local timezone.
 * Throws RangeError for malformed/ambiguous strings, impossible dates or times.
 */
export const formatDateStringForDB = (dateString: string): string => {
  // Accept calendar dates and ISO/SQLite timestamps, never ambiguous locale formats.
  const match = typeof dateString === 'string' && /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(dateString);
  if (!match) throw new RangeError('Fecha inválida');
  const [, yearText, monthText, dayText, hour, minute, second, , offset] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new RangeError('Fecha de calendario inválida');
  }
  // Do not let Date silently normalize February 30 or 24:00 to another day.
  if (hour === undefined) return dateString;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second ?? 0) > 59
    || (offset && offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59))) {
    throw new RangeError('Hora o zona horaria inválida');
  }
  return formatDateForDB(new Date(dateString.replace(' ', 'T')));
};

/** Rendering boundary: malformed persisted dates are omitted, never repaired. */
export const tryFormatDateStringForDB = (dateString: string): string | null => {
  try {
    return formatDateStringForDB(dateString);
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
};

/**
 * Checks if two dates are the same day in local timezone
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  if (!(date1 instanceof Date) || !(date2 instanceof Date)
    || !Number.isFinite(date1.getTime()) || !Number.isFinite(date2.getTime())) return false;
  return date1.getFullYear() === date2.getFullYear()
    && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
};

/**
 * Checks if a date is today in local timezone
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return isSameDay(date, today);
};

/**
 * Gets the current date in YYYY-MM-DD format using local timezone
 */
export const getCurrentDateString = (): string => {
  return formatDateForDB(new Date());
};
