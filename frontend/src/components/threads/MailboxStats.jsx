import { useMailboxStats } from '../../hooks/useThreads';

const MailboxStats = ({ personId }) => {
  const { data: stats, isLoading } = useMailboxStats(personId);

  if (!personId) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Inbox Threads',
      value: stats.inbox_threads,
      icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      color: 'text-blue-600'
    },
    {
      label: 'Sent Threads',
      value: stats.sent_threads,
      icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
      color: 'text-green-600'
    },
    {
      label: 'Total Threads',
      value: stats.total_threads,
      icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
      color: 'text-purple-600'
    },
    {
      label: 'Messages Received',
      value: stats.received_messages,
      icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
      color: 'text-orange-600'
    },
    {
      label: 'Messages Sent',
      value: stats.sent_messages,
      icon: 'M17 8l4 4m0 0l-4 4m4-4H3',
      color: 'text-teal-600'
    }
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="bg-white border rounded-lg p-3 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-1">
            <svg
              className={`w-4 h-4 ${stat.color}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={stat.icon}
              />
            </svg>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
          <div className={`text-2xl font-bold ${stat.color}`}>
            {stat.value?.toLocaleString() || 0}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MailboxStats;
