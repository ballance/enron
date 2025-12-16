import { useState, useCallback } from 'react';
import useNetworkStore from '../../store/networkStore';

const NetworkControls = ({ onApplyFilters }) => {
  const {
    filters,
    setFilters,
    layoutSettings,
    setLayoutSettings,
    searchQuery,
    setSearchQuery,
    rotation,
    setRotation,
    reset,
  } = useNetworkStore();

  const [localFilters, setLocalFilters] = useState(filters);

  const handleApplyFilters = useCallback(() => {
    setFilters(localFilters);
    if (onApplyFilters) {
      onApplyFilters(localFilters);
    }
  }, [localFilters, setFilters, onApplyFilters]);

  const handleReset = useCallback(() => {
    reset();
    setLocalFilters({ minEmails: 5, limit: 500 });
    if (onApplyFilters) {
      onApplyFilters({ minEmails: 5, limit: 500 });
    }
  }, [reset, onApplyFilters]);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Controls</h3>
      </div>

      {/* Filters Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Filters</h4>

        {/* Minimum Emails */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Minimum Emails: {localFilters.minEmails}
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={localFilters.minEmails}
            onChange={(e) => setLocalFilters({ ...localFilters, minEmails: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>50</span>
          </div>
        </div>

        {/* Node Limit */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Node Limit: {localFilters.limit}
          </label>
          <input
            type="range"
            min="50"
            max="1000"
            step="50"
            value={localFilters.limit}
            onChange={(e) => setLocalFilters({ ...localFilters, limit: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50</span>
            <span>1000</span>
          </div>
        </div>

        {/* Apply Filters Button */}
        <button
          onClick={handleApplyFilters}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
      </div>

      {/* Layout Settings */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700">Layout Settings</h4>

        {/* Layout Type */}
        <div>
          <label htmlFor="layoutType" className="block text-sm text-gray-600 mb-2">Layout Type</label>
          <select
            id="layoutType"
            value={layoutSettings.type}
            onChange={(e) => setLayoutSettings({ type: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="force-directed">Force-Directed</option>
            <option value="circular">Circular</option>
          </select>
        </div>

        {/* Node Size */}
        <div>
          <label htmlFor="nodeSize" className="block text-sm text-gray-600 mb-2">Node Size By</label>
          <select
            id="nodeSize"
            value={layoutSettings.nodeSize}
            onChange={(e) => setLayoutSettings({ nodeSize: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="uniform">Uniform</option>
            <option value="activity">Total Activity</option>
            <option value="sent">Sent Emails</option>
            <option value="received">Received Emails</option>
          </select>
        </div>

        {/* Node Color */}
        <div>
          <label htmlFor="nodeColor" className="block text-sm text-gray-600 mb-2">Node Color By</label>
          <select
            id="nodeColor"
            value={layoutSettings.nodeColor}
            onChange={(e) => setLayoutSettings({ nodeColor: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="uniform">Uniform</option>
            <option value="activity">Activity Level</option>
          </select>
        </div>

        {/* Show Labels */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showLabels"
            checked={layoutSettings.showLabels}
            onChange={(e) => setLayoutSettings({ showLabels: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showLabels" className="ml-2 text-sm text-gray-600">
            Show Labels
          </label>
        </div>

        {/* Show Edge Labels */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showEdgeLabels"
            checked={layoutSettings.showEdgeLabels}
            onChange={(e) => setLayoutSettings({ showEdgeLabels: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="showEdgeLabels" className="ml-2 text-sm text-gray-600">
            Show Edge Labels
          </label>
        </div>
      </div>

      {/* 3D Navigation Help */}
      <div className="space-y-2 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700">3D Controls</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>🖱️ <strong>Left-click + drag:</strong> Rotate view</p>
          <p>🖱️ <strong>Right-click + drag:</strong> Pan view</p>
          <p>🖱️ <strong>Scroll wheel:</strong> Zoom in/out</p>
          <p>👆 <strong>Click node:</strong> Select & center camera</p>
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700">Search</h4>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Reset Button */}
      <div className="border-t pt-4">
        <button
          onClick={handleReset}
          className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
        >
          Reset All Settings
        </button>
      </div>
    </div>
  );
};

export default NetworkControls;
