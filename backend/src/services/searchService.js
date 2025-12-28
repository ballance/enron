import pool from '../config/database.js';

/**
 * Search across people, threads, and messages
 * @param {string} query - Search query
 * @param {string} type - 'all', 'people', 'threads', or 'messages'
 * @param {number} limit - Max results per type
 * @returns {Promise<Object>} Search results
 */
export async function search(query, type = 'all', limit = 10) {
  if (!query || query.trim().length < 2) {
    return { people: [], threads: [], messages: [] };
  }

  const searchTerm = `%${query.toLowerCase()}%`;
  const results = {};

  if (type === 'all' || type === 'people') {
    const peopleQuery = `
      SELECT
        id,
        email,
        name,
        sent_count,
        received_count
      FROM people
      WHERE LOWER(email) LIKE $1
         OR LOWER(name) LIKE $1
      ORDER BY (sent_count + received_count) DESC
      LIMIT $2
    `;
    const peopleResult = await pool.query(peopleQuery, [searchTerm, limit]);
    results.people = peopleResult.rows;
  }

  if (type === 'all' || type === 'threads') {
    const threadsQuery = `
      SELECT DISTINCT
        t.id,
        t.subject_normalized,
        t.participant_count,
        t.message_count,
        t.start_date,
        t.end_date,
        m.subject as original_subject
      FROM threads t
      LEFT JOIN messages m ON t.root_message_id = m.id
      WHERE LOWER(t.subject_normalized) LIKE $1
         OR LOWER(m.subject) LIKE $1
      ORDER BY t.message_count DESC
      LIMIT $2
    `;
    const threadsResult = await pool.query(threadsQuery, [searchTerm, limit]);
    results.threads = threadsResult.rows;
  }

  if (type === 'all' || type === 'messages') {
    // Convert search query to tsquery format (handles multi-word searches)
    const tsQuery = query.trim().split(/\s+/).join(' & ');
    const messagesQuery = `
      SELECT
        m.id,
        m.message_id,
        m.subject,
        m.date,
        m.thread_id,
        p.email as sender_email,
        p.name as sender_name,
        SUBSTRING(m.body, 1, 200) as body_preview,
        ts_rank(m.body_tsv, to_tsquery('english', $1)) as rank
      FROM messages m
      LEFT JOIN people p ON m.from_person_id = p.id
      WHERE LOWER(m.subject) LIKE $2
         OR m.body_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC, m.date DESC
      LIMIT $3
    `;
    const messagesResult = await pool.query(messagesQuery, [tsQuery, searchTerm, limit]);
    results.messages = messagesResult.rows;
  }

  return results;
}

/**
 * Autocomplete suggestions for search
 * @param {string} query - Partial search query
 * @param {number} limit - Max suggestions
 * @returns {Promise<Array>} Suggestions
 */
export async function autocomplete(query, limit = 5) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = `%${query.toLowerCase()}%`;

  // Search people only for autocomplete
  const peopleQuery = `
    SELECT
      id,
      email,
      name,
      'person' as type,
      (sent_count + received_count) as relevance
    FROM people
    WHERE LOWER(email) LIKE $1
       OR LOWER(name) LIKE $1
    ORDER BY relevance DESC
    LIMIT $2
  `;

  // Also search thread subjects
  const threadsQuery = `
    SELECT DISTINCT
      t.id,
      COALESCE(m.subject, t.subject_normalized) as text,
      'thread' as type,
      t.message_count as relevance
    FROM threads t
    LEFT JOIN messages m ON t.root_message_id = m.id
    WHERE LOWER(t.subject_normalized) LIKE $1
       OR LOWER(m.subject) LIKE $1
    ORDER BY relevance DESC
    LIMIT $2
  `;

  const [peopleResult, threadsResult] = await Promise.all([
    pool.query(peopleQuery, [searchTerm, limit]),
    pool.query(threadsQuery, [searchTerm, limit])
  ]);

  // Combine and format results
  const suggestions = [
    ...peopleResult.rows.map(p => ({
      id: p.id,
      type: 'person',
      text: p.name || p.email,
      subtext: p.name ? p.email : null,
      relevance: p.relevance
    })),
    ...threadsResult.rows.map(t => ({
      id: t.id,
      type: 'thread',
      text: t.text || 'No Subject',
      relevance: t.relevance
    }))
  ];

  // Sort by relevance and limit
  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}
