import pool from '../config/database.js';

/**
 * Get network graph data
 * @param {Object} filters - Filters (minEmails, limit)
 * @returns {Promise<Object>} Network graph with nodes and edges
 */
export const getNetworkGraph = async (filters = {}) => {
  const { minEmails = 5, limit = 500 } = filters;
  const safeLimit = Math.min(limit, 1000);

  // Get top people by activity
  const peopleResult = await pool.query(
    `SELECT
      id,
      email,
      name,
      sent_count,
      received_count,
      sent_count + received_count as total_activity
    FROM people
    WHERE sent_count + received_count >= $1
    ORDER BY total_activity DESC
    LIMIT $2`,
    [minEmails, safeLimit]
  );

  const people = peopleResult.rows;
  const personIds = people.map(p => p.id);

  if (personIds.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Get edges between these people using v_email_network view
  const edgesResult = await pool.query(
    `SELECT
      p1.id as from_person_id,
      p2.id as to_person_id,
      COUNT(*)::int as email_count
    FROM messages m
    JOIN people p1 ON m.from_person_id = p1.id
    JOIN message_recipients mr ON m.id = mr.message_id
    JOIN people p2 ON mr.person_id = p2.id
    WHERE p1.id = ANY($1)
      AND p2.id = ANY($1)
      AND p1.id != p2.id
      AND mr.recipient_type = 'to'
    GROUP BY p1.id, p2.id
    HAVING COUNT(*) >= 2
    ORDER BY email_count DESC
    LIMIT 5000`,
    [personIds]
  );

  // Transform to graph format
  const nodes = people.map(person => ({
    id: person.id,
    email: person.email,
    name: person.name || person.email.split('@')[0],
    sentCount: person.sent_count,
    receivedCount: person.received_count,
    totalActivity: person.total_activity
  }));

  const edges = edgesResult.rows.map(edge => ({
    source: edge.from_person_id,
    target: edge.to_person_id,
    value: edge.email_count
  }));

  return {
    nodes,
    edges,
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length
    }
  };
};

/**
 * Get ego network for a specific person
 * @param {number} personId - Person ID
 * @param {Object} options - Options (depth, minEmails)
 * @returns {Promise<Object>} Ego network graph
 */
export const getPersonNetwork = async (personId, options = {}) => {
  const { depth = 1, minEmails = 1 } = options;

  // Get the center person
  const centerResult = await pool.query(
    `SELECT id, email, name, sent_count, received_count
    FROM people
    WHERE id = $1`,
    [personId]
  );

  if (centerResult.rows.length === 0) {
    throw new Error('Person not found');
  }

  const centerPerson = centerResult.rows[0];

  // Get directly connected people (1-hop)
  const connectedResult = await pool.query(
    `SELECT DISTINCT
      p.id,
      p.email,
      p.name,
      p.sent_count,
      p.received_count,
      p.sent_count + p.received_count as total_activity
    FROM people p
    WHERE p.id IN (
      -- People this person sent to
      SELECT DISTINCT mr.person_id
      FROM messages m
      JOIN message_recipients mr ON m.id = mr.message_id
      WHERE m.from_person_id = $1
        AND mr.recipient_type = 'to'

      UNION

      -- People who sent to this person
      SELECT DISTINCT m.from_person_id
      FROM messages m
      JOIN message_recipients mr ON m.id = mr.message_id
      WHERE mr.person_id = $1
        AND mr.recipient_type = 'to'
    )
    AND p.sent_count + p.received_count >= $2
    ORDER BY total_activity DESC
    LIMIT 100`,
    [personId, minEmails]
  );

  const connectedPeople = connectedResult.rows;
  const allPeople = [centerPerson, ...connectedPeople];
  const allPersonIds = allPeople.map(p => p.id);

  // Get edges between these people
  const edgesResult = await pool.query(
    `SELECT
      m.from_person_id,
      mr.person_id as to_person_id,
      COUNT(*)::int as email_count
    FROM messages m
    JOIN message_recipients mr ON m.id = mr.message_id
    WHERE m.from_person_id = ANY($1)
      AND mr.person_id = ANY($1)
      AND mr.recipient_type = 'to'
    GROUP BY m.from_person_id, mr.person_id
    HAVING COUNT(*) >= $2`,
    [allPersonIds, minEmails]
  );

  // Transform to graph format
  const nodes = allPeople.map(person => ({
    id: person.id,
    email: person.email,
    name: person.name || person.email.split('@')[0],
    sentCount: person.sent_count,
    receivedCount: person.received_count,
    isCenter: person.id === personId
  }));

  const edges = edgesResult.rows.map(edge => ({
    source: edge.from_person_id,
    target: edge.to_person_id,
    value: edge.email_count
  }));

  return {
    nodes,
    edges,
    centerNode: nodes[0],
    stats: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      depth
    }
  };
};
