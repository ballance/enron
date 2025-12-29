/**
 * Export utilities for CSV and JSON downloads
 */

/**
 * Escape a value for CSV format
 * @param {any} value - Value to escape
 * @returns {string} - CSV-safe string
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert an array of objects to CSV string
 * @param {Array<Object>} data - Array of objects to convert
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @returns {string} - CSV formatted string
 */
export function toCSV(data, columns) {
  if (!data || data.length === 0) {
    return columns.map(c => escapeCSV(c.label)).join(',');
  }

  // Header row
  const header = columns.map(c => escapeCSV(c.label)).join(',');

  // Data rows
  const rows = data.map(row =>
    columns.map(col => escapeCSV(row[col.key])).join(',')
  );

  return [header, ...rows].join('\n');
}

/**
 * Trigger a file download in the browser
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - MIME type (e.g., 'text/csv', 'application/json')
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 * @param {Array<Object>} data - Data to export
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @param {string} filename - Filename (without extension)
 */
export function exportToCSV(data, columns, filename) {
  const csv = toCSV(data, columns);
  const sanitizedFilename = sanitizeFilename(filename);
  downloadFile(csv, `${sanitizedFilename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export data as JSON file
 * @param {any} data - Data to export
 * @param {string} filename - Filename (without extension)
 */
export function exportToJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const sanitizedFilename = sanitizeFilename(filename);
  downloadFile(json, `${sanitizedFilename}.json`, 'application/json');
}

/**
 * Sanitize filename by removing/replacing invalid characters
 * @param {string} filename - Raw filename
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

/**
 * Generate a timestamp string for filenames
 * @returns {string} - Timestamp in YYYYMMDD-HHMMSS format
 */
export function getTimestamp() {
  const now = new Date();
  return now.toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .substring(0, 15);
}

// Column definitions for common data types
export const columnDefs = {
  people: [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'sent_count', label: 'Sent Count' },
    { key: 'received_count', label: 'Received Count' },
  ],

  messages: [
    { key: 'id', label: 'ID' },
    { key: 'message_id', label: 'Message ID' },
    { key: 'subject', label: 'Subject' },
    { key: 'date', label: 'Date' },
    { key: 'sender_email', label: 'Sender Email' },
    { key: 'sender_name', label: 'Sender Name' },
    { key: 'body_preview', label: 'Body Preview' },
  ],

  threads: [
    { key: 'id', label: 'ID' },
    { key: 'subject_normalized', label: 'Subject' },
    { key: 'participant_count', label: 'Participants' },
    { key: 'message_count', label: 'Messages' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
  ],

  networkNodes: [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'sentCount', label: 'Sent Count' },
    { key: 'receivedCount', label: 'Received Count' },
    { key: 'totalActivity', label: 'Total Activity' },
  ],

  networkEdges: [
    { key: 'source', label: 'Source ID' },
    { key: 'sourceEmail', label: 'Source Email' },
    { key: 'target', label: 'Target ID' },
    { key: 'targetEmail', label: 'Target Email' },
    { key: 'value', label: 'Email Count' },
  ],

  topSenders: [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'sent_count', label: 'Sent Count' },
  ],

  topReceivers: [
    { key: 'id', label: 'ID' },
    { key: 'email', label: 'Email' },
    { key: 'name', label: 'Name' },
    { key: 'received_count', label: 'Received Count' },
  ],
};
