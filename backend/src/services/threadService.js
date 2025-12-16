import pool from '../config/database.js';

/**
 * Get paginated list of threads with sorting
 */
export async function getThreads(page = 1, limit = 50, sortBy = 'message_count') {
  const offset = (page - 1) * limit;

  // Validate sort column
  const validSortColumns = {
    'message_count': 'message_count DESC',
    'participant_count': 'participant_count DESC',
    'start_date': 'start_date DESC',
    'end_date': 'end_date DESC'
  };

  const orderBy = validSortColumns[sortBy] || validSortColumns.message_count;

  const query = `
    SELECT
      t.id,
      t.subject_normalized,
      t.participant_count,
      t.message_count,
      t.start_date,
      t.end_date,
      m.subject as original_subject
    FROM threads t
    LEFT JOIN messages m ON t.root_message_id = m.id
    WHERE t.message_count > 1
    ORDER BY ${orderBy}
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM threads
    WHERE message_count > 1
  `;

  const [threadsResult, countResult] = await Promise.all([
    pool.query(query, [limit, offset]),
    pool.query(countQuery)
  ]);

  return {
    threads: threadsResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  };
}

/**
 * Get thread details by ID
 */
export async function getThreadById(threadId) {
  const query = `
    SELECT
      t.id,
      t.subject_normalized,
      t.participant_count,
      t.message_count,
      t.start_date,
      t.end_date,
      m.subject as original_subject,
      m.body as first_message_body
    FROM threads t
    LEFT JOIN messages m ON t.root_message_id = m.id
    WHERE t.id = $1
  `;

  const result = await pool.query(query, [threadId]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Get hierarchical tree structure of messages in a thread
 */
export async function getThreadTree(threadId) {
  const query = `
    SELECT
      m.id,
      m.message_id,
      m.from_person_id,
      m.subject,
      m.date,
      m.in_reply_to,
      p.email as sender_email,
      p.name as sender_name
    FROM messages m
    LEFT JOIN people p ON m.from_person_id = p.id
    WHERE m.thread_id = $1
    ORDER BY m.date ASC
  `;

  const result = await pool.query(query, [threadId]);
  const messages = result.rows;

  // Build a map of message_id -> message
  const messageMap = new Map();
  messages.forEach(msg => {
    messageMap.set(msg.message_id, {
      ...msg,
      children: []
    });
  });

  // Build the tree structure
  const roots = [];
  messages.forEach(msg => {
    const node = messageMap.get(msg.message_id);

    if (msg.in_reply_to && messageMap.has(msg.in_reply_to)) {
      // This is a reply, add it to its parent's children
      const parent = messageMap.get(msg.in_reply_to);
      parent.children.push(node);
    } else {
      // This is a root message
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Get chronological list of messages in a thread
 */
export async function getThreadMessages(threadId) {
  const query = `
    SELECT
      m.id,
      m.message_id,
      m.from_person_id,
      m.subject,
      m.body,
      m.date,
      m.in_reply_to,
      p.email as sender_email,
      p.name as sender_name
    FROM messages m
    LEFT JOIN people p ON m.from_person_id = p.id
    WHERE m.thread_id = $1
    ORDER BY m.date ASC
  `;

  const result = await pool.query(query, [threadId]);
  return result.rows;
}

/**
 * Get list of participants in a thread
 */
export async function getThreadParticipants(threadId) {
  const query = `
    SELECT DISTINCT
      p.id,
      p.email,
      p.name,
      COUNT(m.id) as message_count
    FROM messages m
    JOIN people p ON m.from_person_id = p.id
    WHERE m.thread_id = $1
    GROUP BY p.id, p.email, p.name
    ORDER BY message_count DESC
  `;

  const result = await pool.query(query, [threadId]);
  return result.rows;
}

/**
 * Get threads for a specific person's mailbox
 * @param {number} personId - The person's ID
 * @param {string} view - 'inbox', 'sent', or 'all'
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @param {string} sortBy - Sort column
 */
export async function getMailboxThreads(personId, view = 'all', page = 1, limit = 50, sortBy = 'end_date') {
  const offset = (page - 1) * limit;

  // Validate sort column
  const validSortColumns = {
    'message_count': 't.message_count DESC',
    'participant_count': 't.participant_count DESC',
    'start_date': 't.start_date DESC',
    'end_date': 't.end_date DESC'
  };

  const orderBy = validSortColumns[sortBy] || validSortColumns.end_date;

  // Build query based on view type
  let whereClause = '';
  let joinClause = '';

  if (view === 'inbox') {
    // Threads where person received messages (not sent by them)
    joinClause = `
      INNER JOIN messages m ON m.thread_id = t.id
      INNER JOIN message_recipients mr ON mr.message_id = m.id
    `;
    whereClause = `
      WHERE mr.person_id = $1
      AND t.message_count > 1
      AND EXISTS (
        SELECT 1 FROM messages m2
        WHERE m2.thread_id = t.id
        AND m2.from_person_id != $1
      )
    `;
  } else if (view === 'sent') {
    // Threads where person sent messages
    joinClause = `
      INNER JOIN messages m ON m.thread_id = t.id
    `;
    whereClause = `
      WHERE m.from_person_id = $1
      AND t.message_count > 1
    `;
  } else {
    // All threads person participated in
    joinClause = `
      INNER JOIN messages m ON m.thread_id = t.id
      LEFT JOIN message_recipients mr ON mr.message_id = m.id
    `;
    whereClause = `
      WHERE (m.from_person_id = $1 OR mr.person_id = $1)
      AND t.message_count > 1
    `;
  }

  const query = `
    SELECT DISTINCT
      t.id,
      t.subject_normalized,
      t.participant_count,
      t.message_count,
      t.start_date,
      t.end_date,
      root_msg.subject as original_subject,
      (
        SELECT COUNT(*)
        FROM messages m_sent
        WHERE m_sent.thread_id = t.id
        AND m_sent.from_person_id = $1
      ) as sent_count,
      (
        SELECT COUNT(*)
        FROM messages m_recv
        INNER JOIN message_recipients mr_recv ON mr_recv.message_id = m_recv.id
        WHERE m_recv.thread_id = t.id
        AND mr_recv.person_id = $1
      ) as received_count,
      (
        SELECT m_last.date
        FROM messages m_last
        WHERE m_last.thread_id = t.id
        ORDER BY m_last.date DESC
        LIMIT 1
      ) as last_message_date
    FROM threads t
    ${joinClause}
    LEFT JOIN messages root_msg ON t.root_message_id = root_msg.id
    ${whereClause}
    GROUP BY t.id, root_msg.subject
    ORDER BY ${orderBy}
    LIMIT $2 OFFSET $3
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT t.id) as total
    FROM threads t
    ${joinClause}
    ${whereClause}
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
      total: parseInt(countResult.rows[0].total),
      totalPages: Math.ceil(countResult.rows[0].total / limit)
    }
  };
}

/**
 * Get mailbox statistics for a person
 */
export async function getMailboxStats(personId) {
  const query = `
    SELECT
      COUNT(DISTINCT CASE
        WHEN mr.person_id = $1 THEN m.thread_id
      END) as inbox_threads,
      COUNT(DISTINCT CASE
        WHEN m.from_person_id = $1 THEN m.thread_id
      END) as sent_threads,
      COUNT(DISTINCT CASE
        WHEN m.from_person_id = $1 OR mr.person_id = $1 THEN m.thread_id
      END) as total_threads,
      COUNT(CASE
        WHEN mr.person_id = $1 THEN m.id
      END) as received_messages,
      COUNT(CASE
        WHEN m.from_person_id = $1 THEN m.id
      END) as sent_messages
    FROM messages m
    LEFT JOIN message_recipients mr ON mr.message_id = m.id
    WHERE m.from_person_id = $1 OR mr.person_id = $1
  `;

  const result = await pool.query(query, [personId]);
  return result.rows[0];
}
