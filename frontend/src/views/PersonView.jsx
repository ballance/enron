import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePerson, usePersonActivity, usePersonContacts, usePersonThreads } from '../hooks/usePeople';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PersonView() {
  const { id } = useParams();
  const personId = parseInt(id);
  const [activeTab, setActiveTab] = useState('overview');
  const [activityGranularity, setActivityGranularity] = useState('week');

  const { data: person, isLoading: personLoading } = usePerson(personId);
  const { data: activityData } = usePersonActivity(personId, activityGranularity);
  const { data: contactsData } = usePersonContacts(personId, 10);
  const { data: threadsData } = usePersonThreads(personId, 1);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (personLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Person not found
      </div>
    );
  }

  const activity = activityData?.activity || [];
  const contacts = contactsData?.contacts || [];
  const threads = threadsData?.threads || [];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'threads', label: 'Threads' }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {person.name || person.email}
            </h2>
            {person.name && (
              <p className="text-gray-600 mt-1">{person.email}</p>
            )}
          </div>
          <Link
            to="/threads"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            View Mailbox
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Emails Sent</div>
          <div className="text-3xl font-bold text-green-600">
            {person.sent_count?.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Emails Received</div>
          <div className="text-3xl font-bold text-blue-600">
            {person.received_count?.toLocaleString() || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">First Seen</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDate(person.first_seen_at)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Last Seen</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatDate(person.last_seen_at)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Top Contacts */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Contacts</h3>
              <div className="space-y-3">
                {contacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <Link
                        to={`/people/${contact.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {contact.name || contact.email}
                      </Link>
                      {contact.name && (
                        <div className="text-sm text-gray-600">{contact.email}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {contact.total_emails} emails
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Threads */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Threads</h3>
              <div className="space-y-3">
                {threads.slice(0, 5).map((thread) => (
                  <div key={thread.id} className="p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                    <div className="font-medium text-gray-900 line-clamp-1">
                      {thread.original_subject || thread.subject_normalized || 'No Subject'}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-600">
                      <span>{thread.message_count} messages</span>
                      <span>{formatDate(thread.end_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Email Activity Over Time</h3>
              <select
                value={activityGranularity}
                onChange={(e) => setActivityGranularity(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            {activity.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={activity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sent" stroke="#10b981" name="Sent" />
                  <Line type="monotone" dataKey="received" stroke="#3b82f6" name="Received" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-12">No activity data available</div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">All Contacts</h3>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <Link
                      to={`/people/${contact.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {contact.name || contact.email}
                    </Link>
                    {contact.name && (
                      <div className="text-sm text-gray-600">{contact.email}</div>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-gray-600">
                      <span className="text-green-600 font-medium">{contact.emails_to_them}</span> sent
                    </div>
                    <div className="text-gray-600">
                      <span className="text-blue-600 font-medium">{contact.emails_from_them}</span> received
                    </div>
                    <div className="text-gray-600">
                      <span className="font-medium">{contact.total_emails}</span> total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'threads' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">All Threads</h3>
            <div className="space-y-2">
              {threads.map((thread) => (
                <div key={thread.id} className="p-4 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-gray-900 mb-2">
                    {thread.original_subject || thread.subject_normalized || 'No Subject'}
                  </div>
                  <div className="flex gap-6 text-sm text-gray-600">
                    <span>{thread.message_count} messages</span>
                    <span>{thread.participant_count} participants</span>
                    <span className="text-green-600">{thread.sent_count} sent</span>
                    <span className="text-blue-600">{thread.received_count} received</span>
                    <span>{formatDate(thread.end_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
