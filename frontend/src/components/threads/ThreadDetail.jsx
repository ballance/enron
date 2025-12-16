import { useState } from 'react';
import { useThread, useThreadParticipants } from '../../hooks/useThreads';
import ThreadTree from './ThreadTree';
import MessageList from './MessageList';

const ThreadDetail = ({ threadId, mailboxOwnerId = null }) => {
  const [activeTab, setActiveTab] = useState('tree');
  const { data: thread, isLoading, error } = useThread(threadId);
  const { data: participantsData } = useThreadParticipants(threadId);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error loading thread: {error.message}
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="p-4 text-center text-gray-500">
        Thread not found
      </div>
    );
  }

  const participants = participantsData?.participants || [];

  const tabs = [
    { id: 'tree', label: 'Tree View', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'list', label: 'Messages', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'participants', label: 'Participants', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' }
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Thread header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {thread.original_subject || thread.subject_normalized || 'No Subject'}
        </h2>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{thread.message_count} messages</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{thread.participant_count} participants</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDate(thread.start_date)} - {formatDate(thread.end_date)}</span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'tree' && (
          <div className="h-full">
            <ThreadTree threadId={threadId} />
          </div>
        )}

        {activeTab === 'list' && (
          <div className="h-full overflow-y-auto p-4">
            <MessageList threadId={threadId} mailboxOwnerId={mailboxOwnerId} />
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {participant.name || participant.email}
                    </div>
                    {participant.name && (
                      <div className="text-sm text-gray-600">{participant.email}</div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {participant.message_count} {participant.message_count === 1 ? 'message' : 'messages'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadDetail;
