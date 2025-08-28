/**
 * Utility functions for consistent date handling across the application
 * This ensures that dates are handled in local timezone, not UTC
 */

/**
 * Formats a Date object to YYYY-MM-DD format using local timezone
 * This is the correct way to format dates for database operations
 */
export const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date string to YYYY-MM-DD format using local timezone
 * This is used when we have a date string and need to format it consistently
 * Handles the case where the date string might be interpreted as UTC
 */
export const formatDateStringForDB = (dateString: string): string => {
  // If the date string is already in YYYY-MM-DD format, return it as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // For other formats, parse as local date to avoid UTC conversion issues
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.error('Invalid date string:', dateString);
    return dateString; // Return original if invalid
  }
  
  return formatDateForDB(date);
};

/**
 * Checks if two dates are the same day in local timezone
 */
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return formatDateForDB(date1) === formatDateForDB(date2);
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
