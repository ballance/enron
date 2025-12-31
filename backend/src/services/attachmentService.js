import pool from '../config/database.js';

/**
 * Get attachment by ID
 * @param {number} attachmentId - Attachment ID
 * @returns {Promise<Object|null>} Attachment data or null
 */
export const getAttachmentById = async (attachmentId) => {
  const query = `
    SELECT
      id,
      sha256_hash,
      original_filename,
      mime_type,
      file_size,
      storage_path,
      is_inline,
      created_at
    FROM attachments
    WHERE id = $1
  `;

  const result = await pool.query(query, [attachmentId]);
  return result.rows[0] || null;
};

/**
 * Get all attachments for a message
 * @param {number} messageId - Message ID
 * @returns {Promise<Array>} List of attachments
 */
export const getMessageAttachments = async (messageId) => {
  const query = `
    SELECT
      a.id,
      a.sha256_hash,
      ma.filename,
      a.mime_type,
      a.file_size,
      a.is_inline,
      ma.content_id,
      ma.attachment_order
    FROM message_attachments ma
    JOIN attachments a ON ma.attachment_id = a.id
    WHERE ma.message_id = $1
    ORDER BY ma.attachment_order
  `;

  const result = await pool.query(query, [messageId]);
  return result.rows;
};

/**
 * Get attachment statistics
 * @returns {Promise<Object>} Attachment statistics
 */
export const getAttachmentStats = async () => {
  const query = `
    SELECT
      COUNT(*)::int as total_unique_files,
      (SELECT COUNT(*)::int FROM message_attachments) as total_references,
      COALESCE(SUM(file_size), 0)::bigint as total_size_bytes,
      COUNT(CASE WHEN is_inline THEN 1 END)::int as inline_count
    FROM attachments
  `;

  const result = await pool.query(query);
  const stats = result.rows[0];

  // Get top MIME types
  const mimeQuery = `
    SELECT
      mime_type,
      COUNT(*)::int as count,
      COALESCE(SUM(file_size), 0)::bigint as total_size
    FROM attachments
    GROUP BY mime_type
    ORDER BY count DESC
    LIMIT 10
  `;

  const mimeResult = await pool.query(mimeQuery);

  return {
    ...stats,
    top_mime_types: mimeResult.rows
  };
};

/**
 * Get messages with attachments (paginated)
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} Paginated messages with attachment counts
 */
export const getMessagesWithAttachments = async (page = 1, limit = 50) => {
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(DISTINCT m.id)::int as count
    FROM messages m
    WHERE m.has_attachments = true
  `;

  const countResult = await pool.query(countQuery);
  const total = countResult.rows[0].count;

  const dataQuery = `
    SELECT
      m.id,
      m.message_id,
      m.subject,
      m.date,
      p.email as from_email,
      p.name as from_name,
      COUNT(ma.id)::int as attachment_count,
      COALESCE(SUM(a.file_size), 0)::bigint as total_attachment_size
    FROM messages m
    JOIN people p ON m.from_person_id = p.id
    JOIN message_attachments ma ON m.id = ma.message_id
    JOIN attachments a ON ma.attachment_id = a.id
    WHERE m.has_attachments = true
    GROUP BY m.id, m.message_id, m.subject, m.date, p.email, p.name
    ORDER BY m.date DESC
    LIMIT $1 OFFSET $2
  `;

  const dataResult = await pool.query(dataQuery, [limit, offset]);

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Search attachments by filename
 * @param {string} search - Search term
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {Promise<Object>} Paginated attachments
 */
export const searchAttachments = async (search, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  const countQuery = `
    SELECT COUNT(*)::int as count
    FROM attachments
    WHERE original_filename ILIKE $1
  `;

  const countResult = await pool.query(countQuery, [searchPattern]);
  const total = countResult.rows[0].count;

  const dataQuery = `
    SELECT
      a.id,
      a.sha256_hash,
      a.original_filename,
      a.mime_type,
      a.file_size,
      a.is_inline,
      a.created_at,
      (SELECT COUNT(*)::int FROM message_attachments WHERE attachment_id = a.id) as reference_count
    FROM attachments a
    WHERE a.original_filename ILIKE $1
    ORDER BY a.original_filename
    LIMIT $2 OFFSET $3
  `;

  const dataResult = await pool.query(dataQuery, [searchPattern, limit, offset]);

  return {
    data: dataResult.rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};
