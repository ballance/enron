import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {value !== undefined ? value.toLocaleString() : '...'}
          </p>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-50 rounded-full">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}
