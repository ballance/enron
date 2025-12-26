import { useState } from 'react';
import { useThreadMessages } from '../../hooks/useThreads';

const MessageList = ({ threadId, mailboxOwnerId = null }) => {
  const [page, setPage] = useState(1);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const { data, isLoading, error } = useThreadMessages(threadId, page);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateBody = (body, maxLength = 200) => {
    if (!body) return '';
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength) + '...';
  };

  const getFileIcon = (type) => {
    const iconMap = {
      'document': '📄',
      'spreadsheet': '📊',
      'image': '🖼️',
      'archive': '📦',
      'presentation': '📊',
      'email': '📧',
      'other': '📎'
    };
    return iconMap[type] || '📎';
  };

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

  return (
    <div className="flex flex-col h-full">
      {/* Stats header */}
      {total > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => {
          const messageNumber = (page - 1) * 100 + index + 1;
        const isExpanded = expandedMessageId === message.id;
        const isFromMailboxOwner = mailboxOwnerId && message.from_person_id === mailboxOwnerId;

        return (
          <div
            key={message.id}
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

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {message.attachments.length} Attachment{message.attachments.length > 1 ? 's' : ''} Referenced
                  </span>
                </div>
                <div className="space-y-1">
                  {message.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                      title="Attachment files not available in dataset"
                    >
                      <span className="text-lg">{getFileIcon(att.type)}</span>
                      <span className="flex-1 text-gray-700 font-mono truncate">{att.filename}</span>
                      <span className="text-xs text-gray-500 uppercase">{att.extension}</span>
                      <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                        Reference Only
                      </span>
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
                  onClick={() => setExpandedMessageId(isExpanded ? null : message.id)}
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
      })}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white border-t rounded-b-lg">
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
