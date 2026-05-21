/**
 * Gets today's date in local timezone as "YYYY-MM-DD" format
 * This ensures we properly detect day boundaries regardless of user's timezone
 * @returns {string} Date string in "YYYY-MM-DD" format (local time)
 */
export function getLocalDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates date key format
 * @param {string} dateKey - Date string to validate
 * @returns {boolean} True if valid "YYYY-MM-DD" format
 */
export function isValidDateKey(dateKey) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateKey)) return false;
  
  const date = new Date(dateKey);
  return date instanceof Date && !isNaN(date);
}
