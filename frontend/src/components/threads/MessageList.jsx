import { useState } from 'react';
import { useThreadMessages } from '../../hooks/useThreads';

const MessageList = ({ threadId, mailboxOwnerId = null }) => {
  const { data, isLoading, error } = useThreadMessages(threadId);
  const [expandedMessageId, setExpandedMessageId] = useState(null);

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

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
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
                  #{index + 1}
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
  );
};

export default MessageList;
