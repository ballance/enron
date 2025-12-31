import pool from '../config/database.js';
import { parseAttachments } from '../utils/attachmentParser.js';

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
 * @param {number} threadId - Thread ID
 * @param {number} limit - Maximum number of messages to return (default 1000)
 * @returns {Object} Tree structure with metadata
 */
export async function getThreadTree(threadId, limit = 1000) {
  // First get the total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM messages
    WHERE thread_id = $1
  `;
  const countResult = await pool.query(countQuery, [threadId]);
  const totalMessages = parseInt(countResult.rows[0].total);

  // If thread is too large, return early with warning
  if (totalMessages > limit) {
    return {
      error: 'THREAD_TOO_LARGE',
      message: `This thread has ${totalMessages.toLocaleString()} messages. Tree view is limited to ${limit.toLocaleString()} messages to prevent browser crashes.`,
      totalMessages,
      limit
    };
  }

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
    LIMIT $2
  `;

  const result = await pool.query(query, [threadId, limit]);
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

  return {
    tree: roots,
    totalMessages,
    displayedMessages: messages.length,
    truncated: totalMessages > limit
  };
}

/**
 * Get chronological list of messages in a thread
 * @param {number} threadId - Thread ID
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Messages per page (default 100)
 * @returns {Object} Paginated messages with metadata
 */
export async function getThreadMessages(threadId, page = 1, limit = 100) {
  const offset = (page - 1) * limit;

  // Get total count of unique messages (deduplicated by sender + body content)
  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT DISTINCT ON (from_person_id, md5(body))
        id
      FROM messages
      WHERE thread_id = $1
    ) unique_msgs
  `;
  const countResult = await pool.query(countQuery, [threadId]);
  const totalMessages = parseInt(countResult.rows[0].total);

  // Deduplicate messages by sender + body content hash, keeping the earliest copy
  const query = `
    SELECT
      m.id,
      m.message_id,
      m.from_person_id,
      m.subject,
      m.body,
      m.date,
      m.in_reply_to,
      m.has_attachments,
      p.email as sender_email,
      p.name as sender_name
    FROM (
      SELECT DISTINCT ON (from_person_id, md5(body))
        id, message_id, from_person_id, subject, body, date, in_reply_to, has_attachments
      FROM messages
      WHERE thread_id = $1
      ORDER BY from_person_id, md5(body), date ASC
    ) m
    LEFT JOIN people p ON m.from_person_id = p.id
    ORDER BY m.date ASC
    LIMIT $2 OFFSET $3
  `;

  const result = await pool.query(query, [threadId, limit, offset]);

  // Get message IDs that have attachments
  const messageIds = result.rows
    .filter(m => m.has_attachments)
    .map(m => m.id);

  // Fetch real attachments from database if any messages have them
  let attachmentsByMessage = {};
  if (messageIds.length > 0) {
    const attachmentsQuery = `
      SELECT
        ma.message_id,
        a.id,
        ma.filename,
        a.mime_type,
        a.file_size,
        a.is_inline
      FROM message_attachments ma
      JOIN attachments a ON ma.attachment_id = a.id
      WHERE ma.message_id = ANY($1)
      ORDER BY ma.attachment_order
    `;
    const attachmentsResult = await pool.query(attachmentsQuery, [messageIds]);

    // Group attachments by message_id
    attachmentsResult.rows.forEach(att => {
      if (!attachmentsByMessage[att.message_id]) {
        attachmentsByMessage[att.message_id] = [];
      }
      attachmentsByMessage[att.message_id].push({
        id: att.id,
        filename: att.filename,
        mime_type: att.mime_type,
        file_size: att.file_size,
        is_inline: att.is_inline
      });
    });
  }

  // Parse text attachments and collect unique filenames for matching
  const parsedByMessage = {};
  const allFilenames = new Set();

  result.rows.forEach(msg => {
    const parsed = parseAttachments(msg.body);
    parsedByMessage[msg.id] = parsed;
    parsed.forEach(att => allFilenames.add(att.filename.toLowerCase()));
  });

  // Try to match text references to actual files in the database
  // Optimized: Build Map for O(1) lookup instead of O(n*m) nested loops
  const matchedFiles = new Map();
  if (allFilenames.size > 0) {
    const filenameArray = Array.from(allFilenames);
    const matchQuery = `
      SELECT id, original_filename, mime_type, file_size
      FROM attachments
      WHERE LOWER(original_filename) = ANY($1)
         OR LOWER(original_filename) LIKE ANY($2)
    `;
    const likePatterns = filenameArray.map(f => `%${f}`);

    try {
      const matchResult = await pool.query(matchQuery, [filenameArray, likePatterns]);

      // Build lookup maps: exact match and suffix match
      matchResult.rows.forEach(row => {
        const lowerName = row.original_filename.toLowerCase();
        const fileData = {
          id: row.id,
          filename: row.original_filename,
          mime_type: row.mime_type,
          file_size: row.file_size
        };

        // Store by exact lowercase name
        matchedFiles.set(lowerName, fileData);

        // Also store by base filename (last part after any path separators)
        const baseName = lowerName.split(/[/\\]/).pop();
        if (baseName && !matchedFiles.has(baseName)) {
          matchedFiles.set(baseName, fileData);
        }
      });
    } catch (err) {
      console.error('Error matching text attachments:', err);
    }
  }

  // Combine parsed text attachments with real database attachments
  const messagesWithAttachments = result.rows.map(msg => {
    // Enhance text attachments with matched file info (O(1) Map lookup)
    const enhancedAttachments = parsedByMessage[msg.id].map(att => {
      const lowerFilename = att.filename.toLowerCase();
      // Try exact match first, then base filename match
      const match = matchedFiles.get(lowerFilename) || matchedFiles.get(lowerFilename.split(/[/\\]/).pop());
      if (match) {
        return {
          ...att,
          matched: true,
          attachmentId: match.id,
          matchedFilename: match.filename,
          mime_type: match.mime_type,
          file_size: match.file_size
        };
      }
      return att;
    });

    return {
      ...msg,
      attachments: enhancedAttachments,  // Text markers (now with matches)
      realAttachments: attachmentsByMessage[msg.id] || []  // Actual file attachments
    };
  });

  return {
    messages: messagesWithAttachments,
    pagination: {
      page,
      limit,
      total: totalMessages,
      totalPages: Math.ceil(totalMessages / limit)
    }
  };
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

  // Optimized: Use CTE to precompute aggregates once instead of 3 correlated subqueries per row
  const query = `
    WITH thread_stats AS (
      SELECT
        m.thread_id,
        COUNT(*) FILTER (WHERE m.from_person_id = $1) as sent_count,
        COUNT(DISTINCT mr.message_id) FILTER (WHERE mr.person_id = $1) as received_count,
        MAX(m.date) as last_message_date
      FROM messages m
      LEFT JOIN message_recipients mr ON mr.message_id = m.id
      GROUP BY m.thread_id
    )
    SELECT DISTINCT
      t.id,
      t.subject_normalized,
      t.participant_count,
      t.message_count,
      t.start_date,
      t.end_date,
      root_msg.subject as original_subject,
      COALESCE(ts.sent_count, 0) as sent_count,
      COALESCE(ts.received_count, 0) as received_count,
      ts.last_message_date
    FROM threads t
    ${joinClause}
    LEFT JOIN messages root_msg ON t.root_message_id = root_msg.id
    LEFT JOIN thread_stats ts ON ts.thread_id = t.id
    ${whereClause}
    GROUP BY t.id, root_msg.subject, ts.sent_count, ts.received_count, ts.last_message_date
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
