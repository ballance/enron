import { Link } from 'react-router-dom';
import useNetworkStore from '../../store/networkStore';

const NodeDetails = () => {
  const { selectedNode, setSelectedNode } = useNetworkStore();

  if (!selectedNode) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <p className="text-sm">Click a node to view details</p>
        </div>
      </div>
    );
  }

  const {
    id,
    email,
    name,
    sentCount,
    receivedCount,
    totalActivity,
    isCenter,
  } = selectedNode;

  const displayName = name || email?.split('@')[0] || 'Unknown';
  const activity = totalActivity || (sentCount + receivedCount);

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {displayName}
          </h3>
          <p className="text-sm text-gray-600 truncate">{email}</p>
          {isCenter && (
            <span className="inline-block mt-2 px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded">
              Center Node
            </span>
          )}
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close details"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <span className="text-sm text-gray-600">Total Activity</span>
          <span className="text-sm font-medium text-gray-900">
            {activity.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <span className="text-sm text-gray-600">Emails Sent</span>
          <span className="text-sm font-medium text-gray-900">
            {sentCount.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-200">
          <span className="text-sm text-gray-600">Emails Received</span>
          <span className="text-sm font-medium text-gray-900">
            {receivedCount.toLocaleString()}
          </span>
        </div>

        {sentCount > 0 && receivedCount > 0 && (
          <div className="flex items-center justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Sent/Received Ratio</span>
            <span className="text-sm font-medium text-gray-900">
              {(sentCount / receivedCount).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Activity Bar */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Activity Breakdown</h4>
        <div className="flex h-6 rounded overflow-hidden">
          <div
            className="bg-blue-500"
            style={{ width: `${(sentCount / activity) * 100}%` }}
            title={`Sent: ${sentCount}`}
          />
          <div
            className="bg-green-500"
            style={{ width: `${(receivedCount / activity) * 100}%` }}
            title={`Received: ${receivedCount}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Sent ({((sentCount / activity) * 100).toFixed(1)}%)</span>
          <span>Received ({((receivedCount / activity) * 100).toFixed(1)}%)</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <Link
          to={`/people/${id}`}
          className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          View Person Details
        </Link>
      </div>
    </div>
  );
};

export default NodeDetails;
