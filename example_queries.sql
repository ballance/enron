-- Enron Email Graph: Example Queries
-- Run these queries to explore the conversation graph

-- =============================================================================
-- 1. BASIC STATISTICS
-- =============================================================================

-- Overview of the dataset
SELECT
    (SELECT COUNT(*) FROM people) as total_people,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(*) FROM threads) as total_threads,
    (SELECT MIN(date) FROM messages) as earliest_email,
    (SELECT MAX(date) FROM messages) as latest_email;

-- Most active senders
SELECT
    email,
    sent_count,
    received_count,
    sent_count + received_count as total_activity
FROM people
ORDER BY sent_count DESC
LIMIT 20;

-- Most active recipients
SELECT
    email,
    received_count,
    sent_count
FROM people
ORDER BY received_count DESC
LIMIT 20;

-- =============================================================================
-- 2. CONVERSATION THREADS
-- =============================================================================

-- Largest conversation threads
SELECT
    t.id,
    t.subject_normalized,
    t.message_count,
    t.participant_count,
    t.start_date,
    t.end_date,
    EXTRACT(EPOCH FROM (t.end_date - t.start_date)) / 3600 as duration_hours
FROM threads t
ORDER BY t.message_count DESC
LIMIT 20;

-- View a specific thread's messages
-- (Replace thread_id with actual value from above query)
SELECT
    m.date,
    p.email as sender,
    m.subject,
    LEFT(m.body, 100) as body_preview
FROM messages m
JOIN people p ON m.from_person_id = p.id
WHERE m.thread_id = 1  -- Change this ID
ORDER BY m.date;

-- Threads with the most participants
SELECT
    t.subject_normalized,
    t.participant_count,
    t.message_count,
    t.start_date,
    t.end_date
FROM threads t
ORDER BY t.participant_count DESC
LIMIT 20;

-- =============================================================================
-- 3. EMAIL NETWORK ANALYSIS
-- =============================================================================

-- Who emails whom most frequently (using built-in view)
SELECT
    from_email,
    to_email,
    recipient_type,
    email_count,
    first_email,
    last_email
FROM v_email_network
ORDER BY email_count DESC
LIMIT 20;

-- Find mutual email relationships (people who email each other)
SELECT
    LEAST(a.from_email, a.to_email) as person1,
    GREATEST(a.from_email, a.to_email) as person2,
    a.email_count as person1_to_person2,
    b.email_count as person2_to_person1,
    a.email_count + b.email_count as total_emails
FROM v_email_network a
JOIN v_email_network b ON
    a.from_email = b.to_email AND
    a.to_email = b.from_email AND
    a.recipient_type = 'to' AND
    b.recipient_type = 'to'
WHERE a.from_email < a.to_email  -- Avoid duplicates
ORDER BY total_emails DESC
LIMIT 20;

-- Find people who are frequently CC'd together
SELECT
    p1.email as person1,
    p2.email as person2,
    COUNT(*) as times_ccd_together
FROM message_recipients mr1
JOIN message_recipients mr2 ON
    mr1.message_id = mr2.message_id AND
    mr1.person_id < mr2.person_id AND
    mr1.recipient_type = 'cc' AND
    mr2.recipient_type = 'cc'
JOIN people p1 ON mr1.person_id = p1.id
JOIN people p2 ON mr2.person_id = p2.id
GROUP BY p1.email, p2.email
ORDER BY times_ccd_together DESC
LIMIT 20;

-- =============================================================================
-- 4. REPLY CHAINS / THREADING
-- =============================================================================

-- Find emails that are part of reply chains
SELECT
    m1.message_id as original_message,
    p1.email as original_sender,
    m1.subject as original_subject,
    m1.date as original_date,
    COUNT(m2.id) as direct_replies
FROM messages m1
JOIN people p1 ON m1.from_person_id = p1.id
LEFT JOIN messages m2 ON m2.in_reply_to = m1.message_id
GROUP BY m1.message_id, p1.email, m1.subject, m1.date
HAVING COUNT(m2.id) > 0
ORDER BY direct_replies DESC
LIMIT 20;

-- Trace a full reply chain (recursive)
-- Find the root of a conversation and all its descendants
WITH RECURSIVE reply_chain AS (
    -- Start with a message (change the message_id)
    SELECT
        m.id,
        m.message_id,
        m.subject,
        m.date,
        m.in_reply_to,
        p.email as sender,
        0 as depth
    FROM messages m
    JOIN people p ON m.from_person_id = p.id
    WHERE m.message_id = '<8012132.1075853083164.JavaMail.evans@thyme>'  -- Change this

    UNION ALL

    -- Find all replies
    SELECT
        m.id,
        m.message_id,
        m.subject,
        m.date,
        m.in_reply_to,
        p.email as sender,
        rc.depth + 1 as depth
    FROM messages m
    JOIN people p ON m.from_person_id = p.id
    JOIN reply_chain rc ON m.in_reply_to = rc.message_id
    WHERE rc.depth < 10  -- Prevent infinite loops
)
SELECT
    depth,
    date,
    sender,
    subject,
    message_id
FROM reply_chain
ORDER BY date;

-- =============================================================================
-- 5. TEMPORAL ANALYSIS
-- =============================================================================

-- Email volume by day
SELECT
    DATE(date) as day,
    COUNT(*) as email_count
FROM messages
WHERE date IS NOT NULL
GROUP BY DATE(date)
ORDER BY day;

-- Email volume by hour of day
SELECT
    EXTRACT(HOUR FROM date) as hour,
    COUNT(*) as email_count
FROM messages
WHERE date IS NOT NULL
GROUP BY EXTRACT(HOUR FROM date)
ORDER BY hour;

-- Email volume by day of week
SELECT
    TO_CHAR(date, 'Day') as day_of_week,
    COUNT(*) as email_count
FROM messages
WHERE date IS NOT NULL
GROUP BY TO_CHAR(date, 'Day'), EXTRACT(DOW FROM date)
ORDER BY EXTRACT(DOW FROM date);

-- =============================================================================
-- 6. CONTENT SEARCH
-- =============================================================================

-- Full-text search in subject
SELECT
    m.date,
    p.email as sender,
    m.subject,
    ts_rank(to_tsvector('english', m.subject), query) as relevance
FROM messages m
JOIN people p ON m.from_person_id = p.id,
     to_tsquery('english', 'meeting & schedule') as query
WHERE to_tsvector('english', m.subject) @@ query
ORDER BY relevance DESC
LIMIT 20;

-- Full-text search in body
SELECT
    m.date,
    p.email as sender,
    m.subject,
    LEFT(m.body, 200) as body_preview,
    ts_rank(to_tsvector('english', m.body), query) as relevance
FROM messages m
JOIN people p ON m.from_person_id = p.id,
     to_tsquery('english', 'contract | agreement') as query
WHERE to_tsvector('english', m.body) @@ query
ORDER BY relevance DESC
LIMIT 20;

-- =============================================================================
-- 7. SOCIAL NETWORK METRICS
-- =============================================================================

-- Degree centrality: count of unique people each person communicates with
SELECT
    p.email,
    COUNT(DISTINCT
        CASE
            WHEN m.from_person_id = p.id THEN mr.person_id
            WHEN mr.person_id = p.id THEN m.from_person_id
        END
    ) as unique_connections,
    p.sent_count,
    p.received_count
FROM people p
LEFT JOIN messages m ON m.from_person_id = p.id
LEFT JOIN message_recipients mr ON mr.message_id = m.id
GROUP BY p.id, p.email, p.sent_count, p.received_count
ORDER BY unique_connections DESC
LIMIT 20;

-- Find "brokers" - people who connect different groups
-- (People who communicate with many others but those others don't communicate with each other)
SELECT
    p.email,
    COUNT(DISTINCT mr.person_id) as direct_contacts,
    p.sent_count + p.received_count as total_emails
FROM people p
JOIN messages m ON m.from_person_id = p.id
JOIN message_recipients mr ON mr.message_id = m.id
GROUP BY p.id, p.email
HAVING COUNT(DISTINCT mr.person_id) > 10
ORDER BY direct_contacts DESC
LIMIT 20;

-- =============================================================================
-- 8. MAILBOX ANALYSIS
-- =============================================================================

-- Which mailboxes have the most emails?
SELECT
    mailbox_owner,
    COUNT(*) as email_count,
    COUNT(DISTINCT from_person_id) as unique_senders,
    MIN(date) as earliest,
    MAX(date) as latest
FROM messages
WHERE mailbox_owner IS NOT NULL
GROUP BY mailbox_owner
ORDER BY email_count DESC
LIMIT 20;

-- Folder distribution for a specific user
SELECT
    folder_name,
    COUNT(*) as email_count
FROM messages
WHERE mailbox_owner = 'blair-l'  -- Change this
GROUP BY folder_name
ORDER BY email_count DESC;

-- =============================================================================
-- 9. ADVANCED GRAPH QUERIES
-- =============================================================================

-- Find the shortest path between two people (using email chains)
-- This finds if person A ever replied to person B
WITH RECURSIVE email_path AS (
    -- Start from person A's emails
    SELECT
        m.id,
        m.from_person_id,
        m.message_id,
        m.in_reply_to,
        1 as hops,
        ARRAY[m.from_person_id] as path
    FROM messages m
    JOIN people p ON m.from_person_id = p.id
    WHERE p.email = 'lynn.blair@enron.com'  -- Change: Person A

    UNION ALL

    -- Follow reply chains
    SELECT
        m2.id,
        m2.from_person_id,
        m2.message_id,
        m2.in_reply_to,
        ep.hops + 1,
        ep.path || m2.from_person_id
    FROM email_path ep
    JOIN messages m2 ON m2.in_reply_to = (
        SELECT message_id FROM messages WHERE id = ep.id
    )
    WHERE ep.hops < 5
      AND NOT m2.from_person_id = ANY(ep.path)  -- Prevent cycles
)
SELECT DISTINCT
    ep.hops,
    p.email as reached_person,
    ep.path
FROM email_path ep
JOIN people p ON ep.from_person_id = p.id
WHERE p.email = 'britt.davis@enron.com'  -- Change: Person B
ORDER BY ep.hops
LIMIT 1;

-- Identify email "communities" - groups of people who email each other frequently
SELECT
    p1.email as person,
    ARRAY_AGG(DISTINCT p2.email ORDER BY p2.email) as frequent_contacts
FROM messages m
JOIN people p1 ON m.from_person_id = p1.id
JOIN message_recipients mr ON mr.message_id = m.id
JOIN people p2 ON mr.person_id = p2.id
WHERE p1.sent_count > 5
GROUP BY p1.email
HAVING COUNT(DISTINCT p2.id) >= 5
ORDER BY p1.email;

-- =============================================================================
-- 10. USING BUILT-IN FUNCTIONS
-- =============================================================================

-- Get all participants in a specific thread
SELECT * FROM get_thread_participants(1);  -- Change thread_id

-- Normalize a subject line
SELECT normalize_subject('Re: Fwd: RE: Meeting Tomorrow');

-- =============================================================================
-- TIPS
-- =============================================================================

-- To connect to the database:
--   docker-compose exec postgres psql -U enron -d enron_emails

-- To run a query from this file:
--   docker-compose exec postgres psql -U enron -d enron_emails -f /path/to/query.sql

-- To export results to CSV:
--   \copy (SELECT * FROM people) TO '/tmp/people.csv' CSV HEADER

-- To see query execution plan:
--   EXPLAIN ANALYZE SELECT ...

-- To see table sizes:
--   SELECT
--       schemaname,
--       tablename,
--       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
