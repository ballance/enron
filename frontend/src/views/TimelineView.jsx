import { useState } from 'react';
import {
  useEmailVolume,
  useHourlyActivity,
  useDailyActivity,
  useActivityHeatmap
} from '../hooks/useTimeline';
import EmailVolumeChart from '../components/timeline/EmailVolumeChart';
import HourlyChart from '../components/timeline/HourlyChart';
import DailyChart from '../components/timeline/DailyChart';
import ActivityHeatmap from '../components/timeline/ActivityHeatmap';

export default function TimelineView() {
  const [activeTab, setActiveTab] = useState('volume');
  const [granularity, setGranularity] = useState('day');

  // Fetch all timeline data
  const { data: volumeData, isLoading: volumeLoading } = useEmailVolume({ granularity });
  const { data: hourlyData, isLoading: hourlyLoading } = useHourlyActivity();
  const { data: dailyData, isLoading: dailyLoading } = useDailyActivity();
  const { data: heatmapData, isLoading: heatmapLoading } = useActivityHeatmap();

  const tabs = [
    { id: 'volume', label: 'Email Volume', icon: '📈' },
    { id: 'heatmap', label: 'Activity Heatmap', icon: '🔥' },
    { id: 'hourly', label: 'Hourly Pattern', icon: '🕐' },
    { id: 'daily', label: 'Daily Pattern', icon: '📅' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'volume':
        return (
          <div className="space-y-4">
            {/* Granularity Controls */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Granularity:</label>
              <div className="flex gap-2">
                {['day', 'week', 'month'].map(g => (
                  <button
                    key={g}
                    onClick={() => setGranularity(g)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      granularity === g
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {volumeLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-96">
                <EmailVolumeChart data={volumeData?.data} granularity={granularity} />
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>This chart shows email volume over time. Use the brush at the bottom to zoom into specific time periods.</p>
              <p className="mt-1">Total data points: {volumeData?.data?.length || 0}</p>
            </div>
          </div>
        );

      case 'heatmap':
        return (
          <div className="space-y-4">
            {heatmapLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-auto">
                <ActivityHeatmap data={heatmapData?.data} />
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>This heatmap shows email activity patterns across hours (columns) and days of the week (rows).</p>
              <p className="mt-1">Darker colors indicate higher email volume. Hover over cells to see exact counts.</p>
            </div>
          </div>
        );

      case 'hourly':
        return (
          <div className="space-y-4">
            {hourlyLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-96">
                <HourlyChart data={hourlyData?.data} />
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>This chart shows total email activity by hour of the day (0-23).</p>
              <p className="mt-1">
                <span className="inline-block w-3 h-3 bg-blue-600 mr-1"></span>
                Business hours (9 AM - 5 PM) are highlighted in blue.
              </p>
            </div>
          </div>
        );

      case 'daily':
        return (
          <div className="space-y-4">
            {dailyLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="h-96">
                <DailyChart data={dailyData?.data} />
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>This chart shows total email activity by day of the week.</p>
              <p className="mt-1">
                <span className="inline-block w-3 h-3 bg-blue-600 mr-1"></span>
                Weekdays are highlighted in blue,
                <span className="inline-block w-3 h-3 bg-gray-400 mx-1"></span>
                weekends in gray.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Timeline & Activity</h2>
        <p className="text-gray-600 mt-1">
          Temporal patterns and activity analysis of email communications
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-lg shadow p-6 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}
