import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import ExportButton from '../components/common/ExportButton';
import { columnDefs } from '../utils/export';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [activeType, setActiveType] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['search', query, activeType],
    queryFn: async () => {
      if (!query || query.trim().length < 2) {
        return { people: [], threads: [], messages: [] };
      }
      const response = await api.get('/search', {
        params: { q: query, type: activeType, limit: 50 }
      });
      return response.data;
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const people = data?.people || [];
  const threads = data?.threads || [];
  const messages = data?.messages || [];

  const totalResults = people.length + threads.length + messages.length;

  const types = [
    { id: 'all', label: 'All', count: totalResults },
    { id: 'people', label: 'People', count: people.length },
    { id: 'threads', label: 'Threads', count: threads.length },
    { id: 'messages', label: 'Messages', count: messages.length },
  ];

  // Export callback - returns data based on current view
  const handleExport = () => {
    if (activeType === 'people' || (activeType === 'all' && people.length > 0)) {
      return { type: 'people', data: people };
    }
    if (activeType === 'threads' || (activeType === 'all' && threads.length > 0)) {
      return { type: 'threads', data: threads };
    }
    if (activeType === 'messages' || (activeType === 'all' && messages.length > 0)) {
      return { type: 'messages', data: messages };
    }
    // For 'all' type, combine all results
    if (activeType === 'all') {
      return {
        type: 'combined',
        data: {
          people,
          threads,
          messages,
        }
      };
    }
    return null;
  };

  // Get columns based on active type
  const getExportColumns = () => {
    if (activeType === 'people') return columnDefs.people;
    if (activeType === 'threads') return columnDefs.threads;
    if (activeType === 'messages') return columnDefs.messages;
    return columnDefs.people; // Default for 'all'
  };

  if (!query || query.trim().length < 2) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-gray-600">Enter a search query to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900">
            Search Results
          </h2>
          {totalResults > 0 && (
            <ExportButton
              onExport={(format) => {
                const result = handleExport();
                if (!result) return null;
                // For JSON with 'all' type, export combined object
                if (format === 'json' && result.type === 'combined') {
                  return result.data;
                }
                // For CSV or single type, return the data array
                return result.data;
              }}
              columns={getExportColumns()}
              filename={`enron-search-${query.replace(/\s+/g, '-')}`}
              disabled={totalResults === 0}
              variant="compact"
              label="Export Results"
            />
          )}
        </div>
        <p className="text-gray-600 mt-2">
          Found <span className="font-semibold">{totalResults}</span> results for "{query}"
        </p>
      </div>

      {/* Type Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-2">
          {types.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                activeType === type.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {type.label}
              {type.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                  {type.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Results */}
      {!isLoading && (
        <div className="flex-1 overflow-auto space-y-6">
          {/* People Results */}
          {(activeType === 'all' || activeType === 'people') && people.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                People ({people.length})
              </h3>
              <div className="space-y-2">
                {people.map((person) => (
                  <Link
                    key={person.id}
                    to={`/people/${person.id}`}
                    className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {person.name || person.email}
                        </div>
                        {person.name && (
                          <div className="text-sm text-gray-600">{person.email}</div>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-green-600">
                          <span className="font-medium">{person.sent_count}</span> sent
                        </div>
                        <div className="text-blue-600">
                          <span className="font-medium">{person.received_count}</span> received
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Threads Results */}
          {(activeType === 'all' || activeType === 'threads') && threads.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Threads ({threads.length})
              </h3>
              <div className="space-y-2">
                {threads.map((thread) => (
                  <Link
                    key={thread.id}
                    to={`/threads?selected=${thread.id}`}
                    className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="font-medium text-gray-900 mb-2">
                      {thread.original_subject || thread.subject_normalized || 'No Subject'}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{thread.message_count} messages</span>
                      <span>{thread.participant_count} participants</span>
                      <span>{formatDate(thread.start_date)} - {formatDate(thread.end_date)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Messages Results */}
          {(activeType === 'all' || activeType === 'messages') && messages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                Messages ({messages.length})
              </h3>
              <div className="space-y-2">
                {messages.map((message) => (
                  <Link
                    key={message.id}
                    to={`/threads?selected=${message.thread_id}`}
                    className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        {message.subject || 'No Subject'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(message.date)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      From: {message.sender_name || message.sender_email}
                    </div>
                    {message.body_preview && (
                      <div className="text-sm text-gray-500 line-clamp-2">
                        {message.body_preview}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!isLoading && totalResults === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-600">No results found for "{query}"</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try searching with different keywords
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
