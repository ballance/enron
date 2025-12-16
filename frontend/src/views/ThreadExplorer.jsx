import { useState } from 'react';
import ThreadList from '../components/threads/ThreadList';
import ThreadDetail from '../components/threads/ThreadDetail';
import PersonSelector from '../components/threads/PersonSelector';
import MailboxThreadList from '../components/threads/MailboxThreadList';
import MailboxStats from '../components/threads/MailboxStats';

export default function ThreadExplorer() {
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [mailboxMode, setMailboxMode] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [mailboxView, setMailboxView] = useState('all');

  const handlePersonSelect = (person) => {
    setSelectedPerson(person);
    setMailboxMode(!!person);
    setSelectedThreadId(null);
  };

  const mailboxViews = [
    { id: 'inbox', label: 'Inbox', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'sent', label: 'Sent', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
    { id: 'all', label: 'All Mail', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900">Thread Explorer</h2>
        <p className="text-gray-600 mt-1">
          {mailboxMode
            ? 'Browse a specific person\'s mailbox'
            : 'Browse email conversations and explore thread structures'
          }
        </p>
      </div>

      {/* Mailbox selector */}
      <div className="mb-4">
        <PersonSelector
          onSelect={handlePersonSelect}
          selectedPerson={selectedPerson}
        />
      </div>

      {/* Mailbox stats */}
      {mailboxMode && selectedPerson && (
        <div className="mb-4">
          <MailboxStats personId={selectedPerson.id} />
        </div>
      )}

      {/* Mailbox view tabs */}
      {mailboxMode && selectedPerson && (
        <div className="mb-4 bg-white rounded-lg shadow p-2">
          <div className="flex gap-2">
            {mailboxViews.map((view) => (
              <button
                key={view.id}
                onClick={() => {
                  setMailboxView(view.id);
                  setSelectedThreadId(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  mailboxView === view.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={view.icon} />
                </svg>
                {view.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main content - split view */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left panel - Thread list */}
        <div className="w-96 flex-shrink-0 bg-white rounded-lg shadow overflow-hidden">
          {mailboxMode && selectedPerson ? (
            <MailboxThreadList
              personId={selectedPerson.id}
              view={mailboxView}
              onSelectThread={setSelectedThreadId}
              selectedThreadId={selectedThreadId}
            />
          ) : (
            <ThreadList
              onSelectThread={setSelectedThreadId}
              selectedThreadId={selectedThreadId}
            />
          )}
        </div>

        {/* Right panel - Thread detail */}
        <div className="flex-1 min-w-0">
          {selectedThreadId ? (
            <ThreadDetail
              threadId={selectedThreadId}
              mailboxOwnerId={selectedPerson?.id}
            />
          ) : (
            <div className="h-full bg-white rounded-lg shadow flex items-center justify-center">
              <div className="text-center text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                <p className="text-lg font-medium mb-1">No thread selected</p>
                <p className="text-sm">Select a thread from the list to view its details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
