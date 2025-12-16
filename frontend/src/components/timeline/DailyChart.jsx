import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DailyChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const getBarColor = (day) => {
    // Weekdays in blue, weekends in gray
    if (day >= 1 && day <= 5) {
      return '#3b82f6'; // blue for weekdays
    }
    return '#9ca3af'; // gray for weekends
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dayName = payload[0].payload.dayName;
      const day = payload[0].payload.day;
      const isWeekend = day === 0 || day === 6;

      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900">{dayName}</p>
          <p className="text-sm text-blue-600 font-semibold">
            {payload[0].value.toLocaleString()} emails
          </p>
          {isWeekend && (
            <p className="text-xs text-gray-500 mt-1">Weekend</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dayName"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => value.substring(0, 3)} // Show first 3 letters
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Emails" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.day)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyChart;
