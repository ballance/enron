import pool from '../config/database.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get email volume over time
 * @param {Object} options - Options (granularity, startDate, endDate)
 * @returns {Promise<Array>} Email counts grouped by time period
 */
export const getEmailVolume = async (options = {}) => {
  const { granularity = 'day', startDate, endDate } = options;

  let dateGrouping;
  let dateLabel;

  switch (granularity) {
    case 'week':
      dateGrouping = "DATE_TRUNC('week', date)";
      dateLabel = "DATE_TRUNC('week', date)::date";
      break;
    case 'month':
      dateGrouping = "DATE_TRUNC('month', date)";
      dateLabel = "DATE_TRUNC('month', date)::date";
      break;
    case 'day':
    default:
      dateGrouping = "DATE(date)";
      dateLabel = "DATE(date)";
  }

  const params = [];
  let whereClause = "WHERE date >= '1990-01-01' AND date <= '2010-01-01'";

  if (startDate && endDate) {
    whereClause = 'WHERE date >= $1 AND date <= $2';
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClause = "WHERE date >= $1 AND date <= '2010-01-01'";
    params.push(startDate);
  } else if (endDate) {
    whereClause = "WHERE date >= '1990-01-01' AND date <= $1";
    params.push(endDate);
  }

  const query = `
    SELECT
      ${dateLabel} as date,
      COUNT(*)::int as count
    FROM messages
    ${whereClause}
    GROUP BY ${dateGrouping}
    ORDER BY date
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Get hourly email activity (0-23 hours)
 * @param {Object} options - Options (startDate, endDate)
 * @returns {Promise<Array>} Email counts by hour
 */
export const getHourlyActivity = async (options = {}) => {
  const { startDate, endDate } = options;

  const params = [];
  let whereClause = "WHERE date >= '1990-01-01' AND date <= '2010-01-01'";

  if (startDate && endDate) {
    whereClause = 'WHERE date >= $1 AND date <= $2';
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClause = "WHERE date >= $1 AND date <= '2010-01-01'";
    params.push(startDate);
  } else if (endDate) {
    whereClause = "WHERE date >= '1990-01-01' AND date <= $1";
    params.push(endDate);
  }

  const query = `
    SELECT
      EXTRACT(HOUR FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago')::int as hour,
      COUNT(*)::int as count
    FROM messages
    ${whereClause}
    GROUP BY EXTRACT(HOUR FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago')
    ORDER BY hour
  `;

  const result = await pool.query(query, params);
  const hourMap = new Map(result.rows.map(row => [row.hour, row.count]));

  // Fill in missing hours with 0 counts
  const allHours = [];
  for (let hour = 0; hour < 24; hour++) {
    allHours.push({
      hour,
      count: hourMap.get(hour) || 0
    });
  }

  return allHours;
};

/**
 * Get daily email activity (Sunday-Saturday)
 * @param {Object} options - Options (startDate, endDate)
 * @returns {Promise<Array>} Email counts by day of week
 */
export const getDailyActivity = async (options = {}) => {
  const { startDate, endDate } = options;

  const params = [];
  let whereClause = "WHERE date >= '1990-01-01' AND date <= '2010-01-01'";

  if (startDate && endDate) {
    whereClause = 'WHERE date >= $1 AND date <= $2';
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClause = "WHERE date >= $1 AND date <= '2010-01-01'";
    params.push(startDate);
  } else if (endDate) {
    whereClause = "WHERE date >= '1990-01-01' AND date <= $1";
    params.push(endDate);
  }

  const query = `
    SELECT
      EXTRACT(DOW FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago')::int as day,
      COUNT(*)::int as count
    FROM messages
    ${whereClause}
    GROUP BY EXTRACT(DOW FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago')
    ORDER BY day
  `;

  const result = await pool.query(query, params);
  const dayMap = new Map(result.rows.map(row => [row.day, row.count]));

  // Fill in missing days with 0 counts
  const allDays = [];
  for (let day = 0; day < 7; day++) {
    allDays.push({
      day,
      dayName: DAY_NAMES[day],
      count: dayMap.get(day) || 0
    });
  }

  return allDays;
};

/**
 * Get activity heatmap (24 hours x 7 days)
 * @param {Object} options - Options (startDate, endDate)
 * @returns {Promise<Array>} Email counts by hour and day of week
 */
export const getActivityHeatmap = async (options = {}) => {
  const { startDate, endDate } = options;

  const params = [];
  let whereClause = "WHERE date >= '1990-01-01' AND date <= '2010-01-01'";

  if (startDate && endDate) {
    whereClause = 'WHERE date >= $1 AND date <= $2';
    params.push(startDate, endDate);
  } else if (startDate) {
    whereClause = "WHERE date >= $1 AND date <= '2010-01-01'";
    params.push(startDate);
  } else if (endDate) {
    whereClause = "WHERE date >= '1990-01-01' AND date <= $1";
    params.push(endDate);
  }

  const query = `
    SELECT
      EXTRACT(HOUR FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago')::int as hour,
      EXTRACT(DOW FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago')::int as day,
      COUNT(*)::int as count
    FROM messages
    ${whereClause}
    GROUP BY EXTRACT(HOUR FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago'),
             EXTRACT(DOW FROM date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago')
    ORDER BY hour, day
  `;

  const result = await pool.query(query, params);

  // Create a map for quick lookup
  const heatmapMap = new Map();
  result.rows.forEach(row => {
    const key = `${row.hour}-${row.day}`;
    heatmapMap.set(key, row.count);
  });

  // Fill in all 168 hour-day combinations (24 hours x 7 days)
  const heatmap = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let day = 0; day < 7; day++) {
      const key = `${hour}-${day}`;
      heatmap.push({
        hour,
        day,
        dayName: DAY_NAMES[day],
        count: heatmapMap.get(key) || 0
      });
    }
  }

  return heatmap;
};
