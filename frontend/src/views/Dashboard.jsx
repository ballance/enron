import React from 'react';
import { useStats, useTopSenders, useTopReceivers } from '../hooks/useAnalytics';
import StatsCard from '../components/dashboard/StatsCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ExportIconButton } from '../components/common/ExportButton';
import { columnDefs } from '../utils/export';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: topSendersData, isLoading: sendersLoading } = useTopSenders(10);
  const { data: topReceiversData, isLoading: receiversLoading } = useTopReceivers(10);

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total People"
          value={stats?.totalPeople}
          subtitle="Unique email addresses"
        />
        <StatsCard
          title="Total Messages"
          value={stats?.totalMessages}
          subtitle="Emails in dataset"
        />
        <StatsCard
          title="Total Threads"
          value={stats?.totalThreads}
          subtitle="Conversation threads"
        />
      </div>

      {/* Date Range */}
      {stats?.dateRange && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Dataset Range:</span>{' '}
            {new Date(stats.dateRange.earliest).toLocaleDateString()} to{' '}
            {new Date(stats.dateRange.latest).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Senders Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Email Senders</h3>
            {topSendersData?.data?.length > 0 && (
              <ExportIconButton
                onExport={() => topSendersData.data}
                columns={columnDefs.topSenders}
                filename="enron-top-senders"
              />
            )}
          </div>
          {sendersLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSendersData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="email"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent_count" fill="#3b82f6" name="Sent" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Receivers Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Email Receivers</h3>
            {topReceiversData?.data?.length > 0 && (
              <ExportIconButton
                onExport={() => topReceiversData.data}
                columns={columnDefs.topReceivers}
                filename="enron-top-receivers"
              />
            )}
          </div>
          {receiversLoading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topReceiversData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="email"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="received_count" fill="#10b981" name="Received" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
