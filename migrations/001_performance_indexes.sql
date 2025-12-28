-- Performance indexes migration
-- Run: psql -d enron_emails -f migrations/001_performance_indexes.sql

-- Composite index for thread queries (getThreadTree, getThreadMessages)
-- Optimizes: SELECT * FROM messages WHERE thread_id = ? ORDER BY date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread_date
ON messages(thread_id, date);

-- Composite index for network graph queries
-- Optimizes: JOIN on person_id with message_id lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipients_person_message
ON message_recipients(person_id, message_id);

-- Index for analytics queries ordering by activity
-- Optimizes: ORDER BY sent_count DESC, received_count DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_activity
ON people(sent_count DESC, received_count DESC);

-- Full-text search on message body
-- Add tsvector column and populate it
ALTER TABLE messages ADD COLUMN IF NOT EXISTS body_tsv tsvector;
UPDATE messages SET body_tsv = to_tsvector('english', LEFT(COALESCE(body, ''), 500000))
WHERE body_tsv IS NULL;

-- Create GIN index for full-text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_body_fts
ON messages USING gin(body_tsv);

-- Analyze tables to update statistics after index creation
ANALYZE messages;
ANALYZE message_recipients;
ANALYZE people;
