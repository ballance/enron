import pool from '../config/database.js';

/**
 * Get paginated list of people
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Number of results per page
 * @param {Object} filters - Optional filters (minSent, minReceived, sortBy)
 * @returns {Promise<Object>} Paginated people data
 */
export const getPeople = async (page = 1, limit = 50, filters = {}) => {
  const offset = (page - 1) * limit;
  const { minSent, minReceived, sortBy = 'sent_count' } = filters;

  // Build WHERE clause
  const conditions = [];
  const params = [limit, offset];
  let paramIndex = 3;

  if (minSent) {
    conditions.push(`sent_count >= $${paramIndex}`);
    params.push(minSent);
    paramIndex++;
  }

  if (minReceived) {
    conditions.push(`received_count >= $${paramIndex}`);
    params.push(minReceived);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sortBy
  const validSortFields = ['sent_count', 'received_count', 'email', 'id'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'sent_count';
  const sortOrder = ['email', 'id'].includes(sortField) ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*)::int as count FROM people ${whereClause}`,
    params.slice(2) // Only filter params, not limit/offset
  );

  const total = countResult.rows[0].count;

  // Get paginated data
  const dataResult = await pool.query(
    `SELECT
      id,
      email,
      name,
      sent_count,
      received_count,
      first_seen_at,
      last_seen_at
    FROM people
    ${whereClause}
    ORDER BY ${sortField} ${sortOrder}
    LIMIT $1 OFFSET $2`,
    params
  );

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get person by ID
 * @param {number} id - Person ID
 * @returns {Promise<Object|null>} Person details or null if not found
 */
export const getPersonById = async (id) => {
  const result = await pool.query(
    `SELECT
      id,
      email,
      name,
      sent_count,
      received_count,
      first_seen_at,
      last_seen_at
    FROM people
    WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

/**
 * Get person's email activity over time
 * @param {number} personId - Person ID
 * @param {string} granularity - 'day', 'week', or 'month'
 * @returns {Promise<Array>} Activity data points
 */
export async function getPersonActivity(personId, granularity = 'week') {
  const granularityMap = {
    'day': 'DATE(date)',
    'week': 'DATE_TRUNC(\'week\', date)',
    'month': 'DATE_TRUNC(\'month\', date)'
  };

  const dateGroup = granularityMap[granularity] || granularityMap.week;

  const query = `
    SELECT
      ${dateGroup} as period,
      COUNT(CASE WHEN from_person_id = $1 THEN 1 END)::int as sent,
      COUNT(CASE WHEN mr.person_id = $1 THEN 1 END)::int as received
    FROM messages m
    LEFT JOIN message_recipients mr ON mr.message_id = m.id
    WHERE m.from_person_id = $1 OR mr.person_id = $1
    GROUP BY period
    ORDER BY period ASC
  `;

  const result = await pool.query(query, [personId]);
  return result.rows;
}

/**
 * Get person's top contacts
 * @param {number} personId - Person ID
 * @param {number} limit - Number of contacts to return
 * @returns {Promise<Array>} Top contacts with email counts
 */
export async function getPersonContacts(personId, limit = 20) {
  const query = `
    SELECT
      p.id,
      p.email,
      p.name,
      COUNT(DISTINCT CASE
        WHEN m.from_person_id = $1 AND mr.person_id = p.id THEN m.id
      END)::int as emails_to_them,
      COUNT(DISTINCT CASE
        WHEN m.from_person_id = p.id AND mr.person_id = $1 THEN m.id
      END)::int as emails_from_them,
      COUNT(DISTINCT m.id)::int as total_emails
    FROM people p
    INNER JOIN (
      SELECT DISTINCT
        CASE
          WHEN m.from_person_id = $1 THEN mr.person_id
          WHEN mr.person_id = $1 THEN m.from_person_id
        END as contact_id,
        m.id as message_id
      FROM messages m
      LEFT JOIN message_recipients mr ON mr.message_id = m.id
      WHERE m.from_person_id = $1 OR mr.person_id = $1
    ) contacts ON contacts.contact_id = p.id
    LEFT JOIN messages m ON m.id = contacts.message_id
    LEFT JOIN message_recipients mr ON mr.message_id = m.id
    WHERE p.id != $1
    GROUP BY p.id, p.email, p.name
    ORDER BY total_emails DESC
    LIMIT $2
  `;

  const result = await pool.query(query, [personId, limit]);
  return result.rows;
}

/**
 * Get threads a person participated in
 * @param {number} personId - Person ID
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} Paginated threads
 */
export async function getPersonThreads(personId, page = 1, limit = 50) {
  const offset = (page - 1) * limit;

  const query = `
    SELECT DISTINCT
      t.id,
      t.subject_normalized,
      t.participant_count,
      t.message_count,
      t.start_date,
      t.end_date,
      root_msg.subject as original_subject,
      COUNT(DISTINCT CASE WHEN m.from_person_id = $1 THEN m.id END)::int as sent_count,
      COUNT(DISTINCT CASE WHEN mr.person_id = $1 THEN m.id END)::int as received_count
    FROM threads t
    INNER JOIN messages m ON m.thread_id = t.id
    LEFT JOIN message_recipients mr ON mr.message_id = m.id
    LEFT JOIN messages root_msg ON t.root_message_id = root_msg.id
    WHERE m.from_person_id = $1 OR mr.person_id = $1
    GROUP BY t.id, root_msg.subject
    ORDER BY t.end_date DESC
    LIMIT $2 OFFSET $3
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT t.id)::int as total
    FROM threads t
    INNER JOIN messages m ON m.thread_id = t.id
    LEFT JOIN message_recipients mr ON mr.message_id = m.id
    WHERE m.from_person_id = $1 OR mr.person_id = $1
  `;

  const [threadsResult, countResult] = await Promise.all([
    pool.query(query, [personId, limit, offset]),
    pool.query(countQuery, [personId])
  ]);

  return {
    threads: threadsResult.rows,
    pagination: {
      page,
      limit,
      total: countResult.rows[0].total,
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  };
}
