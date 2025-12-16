import pool from '../config/database.js';

/**
 * Get overall statistics for the Enron email dataset
 * @returns {Promise<Object>} Overall statistics
 */
export const getOverallStats = async () => {
  // Get counts from all tables in parallel
  const [peopleResult, messagesResult, threadsResult, dateRangeResult] = await Promise.all([
    pool.query('SELECT COUNT(*)::int as count FROM people'),
    pool.query('SELECT COUNT(*)::int as count FROM messages'),
    pool.query('SELECT COUNT(*)::int as count FROM threads'),
    pool.query('SELECT MIN(date)::date as min, MAX(date)::date as max FROM messages WHERE date IS NOT NULL')
  ]);

  return {
    totalPeople: peopleResult.rows[0].count,
    totalMessages: messagesResult.rows[0].count,
    totalThreads: threadsResult.rows[0].count,
    dateRange: {
      earliest: dateRangeResult.rows[0].min,
      latest: dateRangeResult.rows[0].max
    }
  };
};

/**
 * Get top email senders
 * @param {number} limit - Number of results to return (default: 20, max: 100)
 * @returns {Promise<Array>} Top senders
 */
export const getTopSenders = async (limit = 20) => {
  const safeLimit = Math.min(limit, 100);

  const result = await pool.query(
    `SELECT
      email,
      sent_count,
      received_count,
      sent_count + received_count as total_activity
    FROM people
    WHERE sent_count > 0
    ORDER BY sent_count DESC
    LIMIT $1`,
    [safeLimit]
  );

  return result.rows;
};

/**
 * Get top email receivers
 * @param {number} limit - Number of results to return (default: 20, max: 100)
 * @returns {Promise<Array>} Top receivers
 */
export const getTopReceivers = async (limit = 20) => {
  const safeLimit = Math.min(limit, 100);

  const result = await pool.query(
    `SELECT
      email,
      received_count,
      sent_count,
      sent_count + received_count as total_activity
    FROM people
    WHERE received_count > 0
    ORDER BY received_count DESC
    LIMIT $1`,
    [safeLimit]
  );

  return result.rows;
};
