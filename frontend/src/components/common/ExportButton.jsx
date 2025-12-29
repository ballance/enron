import { useState, useRef, useEffect } from 'react';
import { exportToCSV, exportToJSON, getTimestamp } from '../../utils/export';

/**
 * Download icon SVG
 */
function DownloadIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

/**
 * Spinner icon for loading state
 */
function SpinnerIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

/**
 * Export button with format dropdown
 *
 * @param {Object} props
 * @param {Function} props.onExport - Callback function (format) => data to export
 * @param {Object} props.columns - Column definitions for CSV { csv: columns, json?: boolean }
 * @param {string} props.filename - Base filename (without extension)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.variant - 'primary' | 'compact' | 'icon'
 * @param {string[]} props.formats - Available formats ['csv', 'json']
 */
export default function ExportButton({
  onExport,
  columns,
  filename = 'export',
  disabled = false,
  variant = 'primary',
  formats = ['csv', 'json'],
  label = 'Export',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format) => {
    setIsExporting(true);
    setIsOpen(false);

    try {
      const data = await onExport(format);

      if (!data) {
        console.warn('No data to export');
        return;
      }

      const timestampedFilename = `${filename}-${getTimestamp()}`;

      if (format === 'csv') {
        if (Array.isArray(data)) {
          exportToCSV(data, columns, timestampedFilename);
        } else if (data.nodes && data.edges) {
          // Network graph - export as two files
          exportToCSV(data.nodes, columns.nodes, `${timestampedFilename}-nodes`);
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500));
          exportToCSV(data.edges, columns.edges, `${timestampedFilename}-edges`);
        }
      } else if (format === 'json') {
        exportToJSON(data, timestampedFilename);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Single format - no dropdown needed
  if (formats.length === 1) {
    return (
      <button
        onClick={() => handleExport(formats[0])}
        disabled={disabled || isExporting}
        className={getButtonClassName(variant, disabled || isExporting)}
        title={`Export as ${formats[0].toUpperCase()}`}
      >
        {isExporting ? <SpinnerIcon /> : <DownloadIcon />}
        {variant !== 'icon' && (
          <span>{isExporting ? 'Exporting...' : label}</span>
        )}
      </button>
    );
  }

  // Multiple formats - show dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={getButtonClassName(variant, disabled || isExporting)}
        title="Export data"
      >
        {isExporting ? <SpinnerIcon /> : <DownloadIcon />}
        {variant !== 'icon' && (
          <>
            <span>{isExporting ? 'Exporting...' : label}</span>
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {formats.includes('csv') && (
              <button
                onClick={() => handleExport('csv')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span className="text-green-600 font-mono text-xs">.csv</span>
                <span>CSV File</span>
              </button>
            )}
            {formats.includes('json') && (
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <span className="text-blue-600 font-mono text-xs">.json</span>
                <span>JSON File</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get button className based on variant
 */
function getButtonClassName(variant, disabled) {
  const base = 'transition-colors flex items-center gap-2';

  if (disabled) {
    return `${base} bg-gray-300 text-gray-500 cursor-not-allowed rounded-md py-2 px-4`;
  }

  switch (variant) {
    case 'compact':
      return `${base} bg-green-600 text-white py-1.5 px-3 text-sm rounded-md hover:bg-green-700`;
    case 'icon':
      return `${base} p-2 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded`;
    case 'primary':
    default:
      return `${base} bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700`;
  }
}

/**
 * Compact export icon button for inline use
 */
export function ExportIconButton({ onExport, columns, filename, disabled, formats = ['csv', 'json'] }) {
  return (
    <ExportButton
      onExport={onExport}
      columns={columns}
      filename={filename}
      disabled={disabled}
      variant="icon"
      formats={formats}
      label=""
    />
  );
}
