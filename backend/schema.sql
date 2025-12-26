-- Enron Email Conversation Graph Schema
-- PostgreSQL database schema optimized for graph queries and conversation analysis

-- Drop existing tables (if re-running)
DROP TABLE IF EXISTS message_recipients CASCADE;
DROP TABLE IF EXISTS message_references CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS threads CASCADE;

-- People table: unique email addresses
CREATE TABLE people (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(500),
    -- Aggregated stats (can be computed or maintained)
    sent_count INTEGER DEFAULT 0,
    received_count INTEGER DEFAULT 0,
    first_seen_at TIMESTAMP,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table: core email data
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(500) UNIQUE NOT NULL,
    from_person_id INTEGER REFERENCES people(id),
    subject TEXT,
    body TEXT,
    date TIMESTAMP,
    timestamp DOUBLE PRECISION,

    -- Threading fields
    in_reply_to VARCHAR(500), -- Will be FK to messages(message_id) after all loaded

    -- Mailbox metadata
    mailbox_owner VARCHAR(255),
    folder_name VARCHAR(500),
    file_path TEXT,

    -- Enron-specific X-headers
    x_from TEXT,
    x_to TEXT,
    x_cc TEXT,
    x_bcc TEXT,
    x_folder TEXT,
    x_origin VARCHAR(255),
    x_filename VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message recipients: to/cc/bcc relationships
CREATE TABLE message_recipients (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES people(id),
    recipient_type VARCHAR(10) NOT NULL CHECK (recipient_type IN ('to', 'cc', 'bcc')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, person_id, recipient_type)
);

-- Message references: full reference chain for threading
CREATE TABLE message_references (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    referenced_message_id VARCHAR(500) NOT NULL,
    reference_order INTEGER NOT NULL, -- Order in the References header
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Threads: conversation groupings
CREATE TABLE threads (
    id SERIAL PRIMARY KEY,
    root_message_id INTEGER REFERENCES messages(id),
    subject_normalized TEXT,
    participant_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add thread_id to messages after threads table exists
ALTER TABLE messages ADD COLUMN thread_id INTEGER REFERENCES threads(id);

-- Indexes for performance

-- People indexes
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_name ON people(name);

-- Messages indexes
CREATE INDEX idx_messages_message_id ON messages(message_id);
CREATE INDEX idx_messages_from_person ON messages(from_person_id);
CREATE INDEX idx_messages_date ON messages(date);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_in_reply_to ON messages(in_reply_to);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_mailbox_owner ON messages(mailbox_owner);
CREATE INDEX idx_messages_subject ON messages(subject); -- For thread detection
CREATE INDEX idx_messages_date_from ON messages(date, from_person_id); -- Composite for timeline queries

-- Full-text search on subject and body
-- Note: tsvector has 1MB limit, some Enron emails exceed this
-- We'll add these indexes later with filtered content if needed
-- CREATE INDEX idx_messages_subject_fts ON messages USING gin(to_tsvector('english', subject));
-- CREATE INDEX idx_messages_body_fts ON messages USING gin(to_tsvector('english', body));

-- Recipients indexes
CREATE INDEX idx_recipients_message ON message_recipients(message_id);
CREATE INDEX idx_recipients_person ON message_recipients(person_id);
CREATE INDEX idx_recipients_type ON message_recipients(recipient_type);
CREATE INDEX idx_recipients_person_type ON message_recipients(person_id, recipient_type);

-- References indexes
CREATE INDEX idx_references_message ON message_references(message_id);
CREATE INDEX idx_references_referenced ON message_references(referenced_message_id);

-- Threads indexes
CREATE INDEX idx_threads_root_message ON threads(root_message_id);
CREATE INDEX idx_threads_subject ON threads(subject_normalized);
CREATE INDEX idx_threads_dates ON threads(start_date, end_date);

-- Helpful views

-- View: Message with sender and recipients
CREATE VIEW v_message_details AS
SELECT
    m.id,
    m.message_id,
    m.subject,
    m.date,
    p_from.email as from_email,
    p_from.name as from_name,
    m.body,
    m.in_reply_to,
    m.thread_id,
    m.mailbox_owner,
    m.folder_name
FROM messages m
LEFT JOIN people p_from ON m.from_person_id = p_from.id;

-- View: Conversation threads with stats
CREATE VIEW v_thread_stats AS
SELECT
    t.id as thread_id,
    t.subject_normalized,
    t.message_count,
    t.participant_count,
    t.start_date,
    t.end_date,
    EXTRACT(EPOCH FROM (t.end_date - t.start_date)) / 3600 as duration_hours,
    m_root.message_id as root_message_id,
    p_root.email as started_by
FROM threads t
LEFT JOIN messages m_root ON t.root_message_id = m_root.id
LEFT JOIN people p_root ON m_root.from_person_id = p_root.id;

-- View: Email network (person-to-person)
CREATE VIEW v_email_network AS
SELECT
    p_from.email as from_email,
    p_to.email as to_email,
    mr.recipient_type,
    COUNT(*) as email_count,
    MIN(m.date) as first_email,
    MAX(m.date) as last_email
FROM messages m
JOIN people p_from ON m.from_person_id = p_from.id
JOIN message_recipients mr ON m.id = mr.message_id
JOIN people p_to ON mr.person_id = p_to.id
GROUP BY p_from.email, p_to.email, mr.recipient_type;

-- Utility functions

-- Function: Normalize subject for thread detection
CREATE OR REPLACE FUNCTION normalize_subject(subject TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Remove Re:, Fwd:, etc and trim whitespace
    RETURN LOWER(TRIM(
        regexp_replace(subject, '^(re:|fwd:|fw:|\s)+', '', 'gi')
    ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get thread depth (how many replies)
CREATE OR REPLACE FUNCTION get_thread_depth(msg_id INTEGER)
RETURNS INTEGER AS $$
WITH RECURSIVE thread_tree AS (
    SELECT id, in_reply_to, 0 as depth
    FROM messages
    WHERE id = msg_id

    UNION ALL

    SELECT m.id, m.in_reply_to, tt.depth + 1
    FROM messages m
    JOIN thread_tree tt ON m.in_reply_to = (
        SELECT message_id FROM messages WHERE id = tt.id
    )
)
SELECT MAX(depth) FROM thread_tree;
$$ LANGUAGE sql;

-- Function: Get all people in a thread
CREATE OR REPLACE FUNCTION get_thread_participants(thread_id_param INTEGER)
RETURNS TABLE(email VARCHAR, name VARCHAR, message_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.email,
        p.name,
        COUNT(m.id) as message_count
    FROM messages m
    JOIN people p ON m.from_person_id = p.id
    WHERE m.thread_id = thread_id_param
    GROUP BY p.email, p.name
    ORDER BY message_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE people IS 'Unique email addresses and associated names';
COMMENT ON TABLE messages IS 'Core email message data';
COMMENT ON TABLE message_recipients IS 'To/CC/BCC relationships';
COMMENT ON TABLE message_references IS 'Email reference chains for threading';
COMMENT ON TABLE threads IS 'Conversation thread groupings';
COMMENT ON VIEW v_message_details IS 'Denormalized view of messages with sender info';
COMMENT ON VIEW v_thread_stats IS 'Thread statistics and metadata';
COMMENT ON VIEW v_email_network IS 'Person-to-person email frequency matrix';
