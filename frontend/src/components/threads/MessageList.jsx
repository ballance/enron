import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useThreadMessages } from '../../hooks/useThreads';
import { getAttachmentDownloadUrl, formatFileSize } from '../../hooks/useAttachments';

// Memoized message item component to prevent unnecessary re-renders
const MessageItem = memo(({
  message,
  messageNumber,
  isExpanded,
  isFromMailboxOwner,
  onToggleExpand,
  formatDate,
  truncateBody,
  getFileIcon,
  getMimeIcon
}) => {
  return (
    <div
      className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow ${
        isFromMailboxOwner
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-gray-200'
      }`}
    >
      {/* Message header */}
      <div className={`p-4 border-b ${
        isFromMailboxOwner ? 'bg-blue-100' : 'bg-gray-50'
      }`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-gray-900">
                {message.sender_name || message.sender_email || 'Unknown Sender'}
              </div>
              {isFromMailboxOwner && (
                <span className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded">
                  You
                </span>
              )}
            </div>
            {message.sender_email && message.sender_name && (
              <div className="text-sm text-gray-600">{message.sender_email}</div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            #{messageNumber}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {formatDate(message.date)}
        </div>
      </div>

      {/* Message subject */}
      {message.subject && (
        <div className="px-4 pt-3">
          <div className="text-sm font-medium text-gray-700">
            Subject: {message.subject}
          </div>
        </div>
      )}

      {/* Real Attachments (downloadable) */}
      {message.realAttachments && message.realAttachments.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="text-sm font-medium text-green-700">
              {message.realAttachments.length} Attachment{message.realAttachments.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {message.realAttachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm"
              >
                <span className="text-lg">{getMimeIcon(att.mime_type)}</span>
                <span className="flex-1 text-gray-700 font-mono truncate" title={att.filename}>
                  {att.filename}
                </span>
                <span className="text-xs text-gray-500">
                  {formatFileSize(att.file_size)}
                </span>
                <a
                  href={getAttachmentDownloadUrl(att.id)}
                  download={att.filename}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  title={`Download ${att.filename}`}
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text Reference Attachments (some may have matched files) */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {message.attachments.length} Referenced File{message.attachments.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {message.attachments.map((att, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  att.matched
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
                title={att.matched ? `Matched to: ${att.matchedFilename}` : 'File referenced in email body but not found in database'}
              >
                <span className="text-lg">{att.matched ? getMimeIcon(att.mime_type) : getFileIcon(att.type)}</span>
                <span className="flex-1 text-gray-700 font-mono truncate" title={att.matched ? att.matchedFilename : att.filename}>
                  {att.filename}
                </span>
                {att.matched && att.file_size && (
                  <span className="text-xs text-gray-500">
                    {formatFileSize(att.file_size)}
                  </span>
                )}
                <span className="text-xs text-gray-500 uppercase">{att.extension}</span>
                {att.matched ? (
                  <a
                    href={getAttachmentDownloadUrl(att.attachmentId)}
                    download={att.matchedFilename}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    title={`Download ${att.matchedFilename}`}
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                    Reference Only
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message body */}
      <div className="p-4">
        <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
          {isExpanded ? message.body : truncateBody(message.body)}
        </div>

        {message.body && message.body.length > 200 && (
          <button
            onClick={() => onToggleExpand(message.id)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Reply indicator */}
      {message.in_reply_to && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply to previous message
          </div>
        </div>
      )}
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

const MessageList = ({ threadId, mailboxOwnerId = null }) => {
  const [page, setPage] = useState(1);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const { data, isLoading, error } = useThreadMessages(threadId, page);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Leave room for pagination controls (about 80px)
        setContainerHeight(Math.max(400, rect.height - 80));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const truncateBody = useCallback((body, maxLength = 200) => {
    if (!body) return '';
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength) + '...';
  }, []);

  const getFileIcon = useCallback((type) => {
    const iconMap = {
      'document': '\uD83D\uDCC4',
      'spreadsheet': '\uD83D\uDCCA',
      'image': '\uD83D\uDDBC\uFE0F',
      'archive': '\uD83D\uDCE6',
      'presentation': '\uD83D\uDCCA',
      'email': '\uD83D\uDCE7',
      'other': '\uD83D\uDCCE'
    };
    return iconMap[type] || '\uD83D\uDCCE';
  }, []);

  const getMimeIcon = useCallback((mimeType) => {
    if (!mimeType) return '\uD83D\uDCC4';
    if (mimeType.startsWith('image/')) return '\uD83D\uDDBC\uFE0F';
    if (mimeType.startsWith('video/')) return '\uD83C\uDFAC';
    if (mimeType.startsWith('audio/')) return '\uD83C\uDFB5';
    if (mimeType.includes('pdf')) return '\uD83D\uDCC4';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\uD83D\uDCCA';
    if (mimeType.includes('zip') || mimeType.includes('gzip')) return '\uD83D\uDDC4\uFE0F';
    if (mimeType.includes('word') || mimeType.includes('document')) return '\uD83D\uDCC4';
    return '\uD83D\uDCC4';
  }, []);

  const handleToggleExpand = useCallback((messageId) => {
    setExpandedMessageId(prev => prev === messageId ? null : messageId);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error loading messages: {error.message}
      </div>
    );
  }

  const messages = data?.messages || [];

  if (messages.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No messages found
      </div>
    );
  }

  const pagination = data?.pagination || {};
  const { total = 0, totalPages = 1 } = pagination;

  // Virtualized row renderer
  const Row = ({ index, style }) => {
    const message = messages[index];

    // Guard against undefined message (race condition)
    if (!message) {
      return <div style={style} />;
    }

    const messageNumber = (page - 1) * 100 + index + 1;
    const isExpanded = expandedMessageId === message.id;
    const isFromMailboxOwner = mailboxOwnerId && message.from_person_id === mailboxOwnerId;

    return (
      <div style={{ ...style, paddingBottom: '16px', paddingRight: '8px' }}>
        <MessageItem
          message={message}
          messageNumber={messageNumber}
          isExpanded={isExpanded}
          isFromMailboxOwner={isFromMailboxOwner}
          onToggleExpand={handleToggleExpand}
          formatDate={formatDate}
          truncateBody={truncateBody}
          getFileIcon={getFileIcon}
          getMimeIcon={getMimeIcon}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* Stats header */}
      {total > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-900">
              Showing {messages.length} of {total.toLocaleString()} messages
            </span>
            {totalPages > 1 && (
              <span className="text-blue-700">
                Page {page} of {totalPages}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Virtualized Messages */}
      <div className="flex-1 min-h-0">
        <List
          height={containerHeight}
          itemCount={messages.length}
          itemSize={280} // Estimated average height per message
          width="100%"
          overscanCount={3} // Render 3 extra items above/below viewport
        >
          {Row}
        </List>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white border-t rounded-b-lg flex-shrink-0">
          <button
            onClick={() => {
              setPage(Math.max(1, page - 1));
              setExpandedMessageId(null);
            }}
            disabled={page === 1}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            {page > 2 && (
              <>
                <button
                  onClick={() => setPage(1)}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                >
                  1
                </button>
                {page > 3 && <span className="text-gray-400">...</span>}
              </>
            )}
            {page > 1 && (
              <button
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
              >
                {page - 1}
              </button>
            )}
            <span className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">
              {page}
            </span>
            {page < totalPages && (
              <button
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
              >
                {page + 1}
              </button>
            )}
            {page < totalPages - 1 && (
              <>
                {page < totalPages - 2 && <span className="text-gray-400">...</span>}
                <button
                  onClick={() => setPage(totalPages)}
                  className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setPage(Math.min(totalPages, page + 1));
              setExpandedMessageId(null);
            }}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageList;
