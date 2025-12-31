-- Migration: Add attachment support
-- Date: 2025-12-29
-- Description: Adds tables for storing email attachments with SHA256 deduplication

-- Unique attachment files (deduplicated by content hash)
CREATE TABLE IF NOT EXISTS attachments (
    id SERIAL PRIMARY KEY,
    sha256_hash VARCHAR(64) UNIQUE NOT NULL,
    original_filename VARCHAR(500),
    mime_type VARCHAR(255),
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    is_inline BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table linking messages to attachments
-- Allows same file to be referenced by multiple messages (forwarded emails)
CREATE TABLE IF NOT EXISTS message_attachments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    attachment_id INTEGER NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
    filename VARCHAR(500),
    content_id VARCHAR(255),
    attachment_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, attachment_id, attachment_order)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attachments_hash ON attachments(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_attachments_mime ON attachments(mime_type);
CREATE INDEX IF NOT EXISTS idx_attachments_size ON attachments(file_size);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_attachment ON message_attachments(attachment_id);

-- Add has_attachments flag to messages for quick filtering (optional optimization)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_has_attachments ON messages(has_attachments) WHERE has_attachments = TRUE;

COMMENT ON TABLE attachments IS 'Unique attachment files, deduplicated by SHA256 hash';
COMMENT ON TABLE message_attachments IS 'Junction table linking messages to their attachments';
COMMENT ON COLUMN attachments.sha256_hash IS 'SHA256 hash of file content for deduplication';
COMMENT ON COLUMN attachments.storage_path IS 'Relative path from attachments root (sharded: ab/cd/hash)';
COMMENT ON COLUMN attachments.is_inline IS 'True for inline images (Content-Disposition: inline)';
COMMENT ON COLUMN message_attachments.content_id IS 'Content-ID for inline images (cid:xxx references)';
COMMENT ON COLUMN message_attachments.attachment_order IS 'Order of attachment within the message';
