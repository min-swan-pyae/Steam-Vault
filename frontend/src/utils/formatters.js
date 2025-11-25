/**
 * Formatting Utilities
 * 
 * Common formatting functions used across the application.
 * Extracted to eliminate code duplication.
 */

/**
 * Format a number as a percentage
 * @param {number|string|null|undefined} value - Value to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted percentage or fallback
 */
export const formatPercent = (value, decimals = 1) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(decimals)}%`;
};

/**
 * Format a number with thousands separators
 * @param {number|string|null|undefined} value - Value to format
 * @returns {string} Formatted number or fallback
 */
export const formatNumber = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
};

/**
 * Format a K/D ratio
 * @param {number|null|undefined} value - K/D ratio value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted K/D or fallback
 */
export const formatKD = (value, decimals = 2) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(decimals);
};

/**
 * Format seconds as MM:SS or HH:MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

/**
 * Format a date/timestamp to relative time (e.g., "2 hours ago")
 * @param {Date|string|number|object} date - Date to format (supports Firestore timestamps)
 * @returns {string} Relative time string
 */
export const formatTimeAgo = (date) => {
  if (!date) return 'Never';
  
  let targetDate;
  
  // Handle Firestore Timestamp objects
  if (date && typeof date === 'object' && (date._seconds || date.seconds)) {
    const seconds = date._seconds || date.seconds;
    targetDate = new Date(seconds * 1000);
  } else {
    targetDate = new Date(date);
  }
  
  const now = new Date();
  const diffMs = now - targetDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

/**
 * Format a date to local string
 * @param {Date|string|number|object} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}) => {
  if (!date) return 'N/A';
  
  let targetDate;
  
  // Handle Firestore Timestamp objects
  if (date && typeof date === 'object' && (date._seconds || date.seconds)) {
    const seconds = date._seconds || date.seconds;
    targetDate = new Date(seconds * 1000);
  } else {
    targetDate = new Date(date);
  }
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return targetDate.toLocaleDateString(undefined, defaultOptions);
};

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return 'N/A';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text || '';
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format currency (USD by default)
 * @param {number} value - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD') => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};
