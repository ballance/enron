#!/usr/bin/env python3
"""
Load extracted Enron emails into PostgreSQL database.

Reads JSON files from the extraction output and loads them into the
normalized PostgreSQL schema for graph analysis.
"""

import json
import logging
import psycopg2
from psycopg2.extras import execute_batch
from pathlib import Path
from typing import Dict, List, Optional, Set
import argparse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class PostgresLoader:
    """Loads extracted email data into PostgreSQL."""

    def __init__(self, db_name: str = None, db_user: str = None,
                 db_host: str = None, db_port: int = None, db_password: str = None):
        self.db_name = db_name or os.getenv('POSTGRES_DB', 'enron_emails')
        self.db_user = db_user or os.getenv('POSTGRES_USER', 'enron')
        self.db_host = db_host or os.getenv('POSTGRES_HOST', 'localhost')
        self.db_port = db_port or int(os.getenv('POSTGRES_PORT', '5432'))
        self.db_password = db_password or os.getenv('POSTGRES_PASSWORD')
        self.conn = None
        self.people_cache: Dict[str, int] = {}  # email -> person_id
        self.attachment_cache: Dict[str, int] = {}  # sha256_hash -> attachment_id

        self.stats = {
            'people': 0,
            'messages': 0,
            'recipients': 0,
            'references': 0,
            'batches': 0,
            'attachments': 0,
            'attachment_refs': 0,
            'attachments_deduplicated': 0,
        }

    def connect(self):
        """Connect to PostgreSQL database."""
        try:
            self.conn = psycopg2.connect(
                dbname=self.db_name,
                user=self.db_user,
                password=self.db_password,
                host=self.db_host,
                port=self.db_port
            )
            logger.info(f"Connected to database: {self.db_name}@{self.db_host}:{self.db_port}")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")

    def get_or_create_person(self, email: str, name: str = None) -> int:
        """
        Get person ID by email, creating if not exists.

        Args:
            email: Email address
            name: Person's name (optional)

        Returns:
            Person ID
        """
        if not email:
            return None

        email = email.lower().strip()

        # Check cache
        if email in self.people_cache:
            return self.people_cache[email]

        cur = self.conn.cursor()

        # Try to get existing
        cur.execute("SELECT id FROM people WHERE email = %s", (email,))
        row = cur.fetchone()

        if row:
            person_id = row[0]
        else:
            # Insert new person
            cur.execute(
                """
                INSERT INTO people (email, name)
                VALUES (%s, %s)
                RETURNING id
                """,
                (email, name if name else None)
            )
            person_id = cur.fetchone()[0]
            self.stats['people'] += 1

        cur.close()
        self.people_cache[email] = person_id
        return person_id

    def get_or_create_attachment(self, attachment_data: Dict) -> int:
        """
        Get attachment ID by SHA256 hash, creating if not exists.

        Args:
            attachment_data: Dict with sha256_hash, original_filename, mime_type, etc.

        Returns:
            Attachment ID
        """
        sha256_hash = attachment_data.get('sha256_hash')
        if not sha256_hash:
            return None

        # Check cache
        if sha256_hash in self.attachment_cache:
            self.stats['attachments_deduplicated'] += 1
            return self.attachment_cache[sha256_hash]

        cur = self.conn.cursor()

        # Try to get existing
        cur.execute("SELECT id FROM attachments WHERE sha256_hash = %s", (sha256_hash,))
        row = cur.fetchone()

        if row:
            attachment_id = row[0]
            self.stats['attachments_deduplicated'] += 1
        else:
            # Insert new attachment
            cur.execute(
                """
                INSERT INTO attachments (
                    sha256_hash, original_filename, mime_type,
                    file_size, storage_path, is_inline
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    sha256_hash,
                    attachment_data.get('original_filename'),
                    attachment_data.get('mime_type'),
                    attachment_data.get('file_size'),
                    attachment_data.get('storage_path'),
                    attachment_data.get('is_inline', False)
                )
            )
            attachment_id = cur.fetchone()[0]
            self.stats['attachments'] += 1

        cur.close()
        self.attachment_cache[sha256_hash] = attachment_id
        return attachment_id

    def load_batch(self, batch_file: Path):
        """
        Load a batch of emails from a JSON file.

        Args:
            batch_file: Path to batch JSON file
        """
        logger.info(f"Loading batch: {batch_file}")

        with open(batch_file, 'r') as f:
            emails = json.load(f)

        cur = self.conn.cursor()

        for email_data in emails:
            try:
                # Get or create sender
                from_person_id = self.get_or_create_person(
                    email_data.get('from_address'),
                    email_data.get('from_name')
                )

                # Check if message has attachments
                attachments = email_data.get('attachments', [])
                has_attachments = len(attachments) > 0

                # Insert message
                cur.execute(
                    """
                    INSERT INTO messages (
                        message_id, from_person_id, subject, body, date, timestamp,
                        in_reply_to, mailbox_owner, folder_name, file_path,
                        x_from, x_to, x_cc, x_bcc, x_folder, x_origin, x_filename,
                        has_attachments
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    RETURNING id
                    """,
                    (
                        email_data['message_id'],
                        from_person_id,
                        email_data.get('subject'),
                        email_data.get('body'),
                        email_data.get('date'),
                        email_data.get('timestamp'),
                        email_data.get('in_reply_to'),
                        email_data.get('mailbox_owner'),
                        email_data.get('folder_name'),
                        email_data.get('file_path'),
                        email_data.get('x_from'),
                        email_data.get('x_to'),
                        email_data.get('x_cc'),
                        email_data.get('x_bcc'),
                        email_data.get('x_folder'),
                        email_data.get('x_origin'),
                        email_data.get('x_filename'),
                        has_attachments
                    )
                )
                message_db_id = cur.fetchone()[0]
                self.stats['messages'] += 1

                # Insert recipients (to)
                for recipient in email_data.get('to_addresses', []):
                    person_id = self.get_or_create_person(
                        recipient.get('address'),
                        recipient.get('name')
                    )
                    if person_id:
                        cur.execute(
                            """
                            INSERT INTO message_recipients (message_id, person_id, recipient_type)
                            VALUES (%s, %s, 'to')
                            ON CONFLICT (message_id, person_id, recipient_type) DO NOTHING
                            """,
                            (message_db_id, person_id)
                        )
                        self.stats['recipients'] += 1

                # Insert recipients (cc)
                for recipient in email_data.get('cc_addresses', []):
                    person_id = self.get_or_create_person(
                        recipient.get('address'),
                        recipient.get('name')
                    )
                    if person_id:
                        cur.execute(
                            """
                            INSERT INTO message_recipients (message_id, person_id, recipient_type)
                            VALUES (%s, %s, 'cc')
                            ON CONFLICT (message_id, person_id, recipient_type) DO NOTHING
                            """,
                            (message_db_id, person_id)
                        )
                        self.stats['recipients'] += 1

                # Insert recipients (bcc)
                for recipient in email_data.get('bcc_addresses', []):
                    person_id = self.get_or_create_person(
                        recipient.get('address'),
                        recipient.get('name')
                    )
                    if person_id:
                        cur.execute(
                            """
                            INSERT INTO message_recipients (message_id, person_id, recipient_type)
                            VALUES (%s, %s, 'bcc')
                            ON CONFLICT (message_id, person_id, recipient_type) DO NOTHING
                            """,
                            (message_db_id, person_id)
                        )
                        self.stats['recipients'] += 1

                # Insert references
                for idx, ref_msg_id in enumerate(email_data.get('references', [])):
                    cur.execute(
                        """
                        INSERT INTO message_references (message_id, referenced_message_id, reference_order)
                        VALUES (%s, %s, %s)
                        """,
                        (message_db_id, ref_msg_id, idx)
                    )
                    self.stats['references'] += 1

                # Insert attachments
                for att_data in attachments:
                    attachment_id = self.get_or_create_attachment(att_data)
                    if attachment_id:
                        cur.execute(
                            """
                            INSERT INTO message_attachments (
                                message_id, attachment_id, filename,
                                content_id, attachment_order
                            ) VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (message_id, attachment_id, attachment_order) DO NOTHING
                            """,
                            (
                                message_db_id,
                                attachment_id,
                                att_data.get('original_filename'),
                                att_data.get('content_id'),
                                att_data.get('attachment_order', 0)
                            )
                        )
                        self.stats['attachment_refs'] += 1

            except psycopg2.IntegrityError as e:
                # Duplicate message_id, skip
                logger.debug(f"Skipping duplicate: {email_data.get('message_id')}")
                self.conn.rollback()
                continue
            except Exception as e:
                logger.error(f"Error loading email {email_data.get('message_id')}: {e}")
                self.conn.rollback()
                continue

        cur.close()
        self.conn.commit()
        self.stats['batches'] += 1

        logger.info(f"Batch complete. Progress: {self.stats['messages']:,} messages, "
                   f"{self.stats['people']:,} people")

    def load_all_batches(self, data_dir: str = "extracted_data"):
        """
        Load all batch files from the extraction directory.

        Args:
            data_dir: Directory containing batch JSON files
        """
        data_path = Path(data_dir)

        if not data_path.exists():
            logger.error(f"Data directory not found: {data_dir}")
            return

        batch_files = sorted(data_path.glob("emails_batch_*.json"))

        if not batch_files:
            logger.error(f"No batch files found in {data_dir}")
            return

        logger.info(f"Found {len(batch_files)} batch files")

        for batch_file in batch_files:
            self.load_batch(batch_file)

        logger.info("All batches loaded!")

    def build_threads(self):
        """
        Build conversation threads from messages.
        Uses in_reply_to chains and subject matching.
        """
        logger.info("Building conversation threads...")

        cur = self.conn.cursor()

        # Strategy 1: Group by normalized subject
        cur.execute("""
            INSERT INTO threads (subject_normalized, message_count, start_date, end_date)
            SELECT
                normalize_subject(subject) as subj_norm,
                COUNT(*) as msg_count,
                MIN(date) as start_date,
                MAX(date) as end_date
            FROM messages
            WHERE subject IS NOT NULL AND subject != ''
            GROUP BY normalize_subject(subject)
            HAVING COUNT(*) >= 1
            ON CONFLICT DO NOTHING
        """)

        threads_created = cur.rowcount
        logger.info(f"Created {threads_created} threads by subject")

        # Update messages with thread_id
        cur.execute("""
            UPDATE messages m
            SET thread_id = t.id
            FROM threads t
            WHERE normalize_subject(m.subject) = t.subject_normalized
        """)

        messages_updated = cur.rowcount
        logger.info(f"Updated {messages_updated} messages with thread_id")

        # Update thread stats
        cur.execute("""
            UPDATE threads t
            SET
                message_count = subq.msg_count,
                participant_count = subq.participant_count,
                start_date = subq.start_date,
                end_date = subq.end_date,
                root_message_id = subq.root_msg_id
            FROM (
                SELECT
                    m.thread_id,
                    COUNT(DISTINCT m.id) as msg_count,
                    COUNT(DISTINCT m.from_person_id) as participant_count,
                    MIN(m.date) as start_date,
                    MAX(m.date) as end_date,
                    (SELECT id FROM messages WHERE thread_id = m.thread_id ORDER BY date LIMIT 1) as root_msg_id
                FROM messages m
                WHERE m.thread_id IS NOT NULL
                GROUP BY m.thread_id
            ) subq
            WHERE t.id = subq.thread_id
        """)

        cur.close()
        self.conn.commit()

        logger.info("Thread building complete!")

    def update_people_stats(self):
        """Update aggregated statistics in people table."""
        logger.info("Updating people statistics...")

        cur = self.conn.cursor()

        # Update sent counts and dates
        cur.execute("""
            UPDATE people p
            SET
                sent_count = subq.sent_count,
                first_seen_at = subq.first_sent,
                last_seen_at = subq.last_sent
            FROM (
                SELECT
                    from_person_id,
                    COUNT(*) as sent_count,
                    MIN(date) as first_sent,
                    MAX(date) as last_sent
                FROM messages
                WHERE from_person_id IS NOT NULL
                GROUP BY from_person_id
            ) subq
            WHERE p.id = subq.from_person_id
        """)

        # Update received counts
        cur.execute("""
            UPDATE people p
            SET received_count = subq.received_count
            FROM (
                SELECT
                    person_id,
                    COUNT(*) as received_count
                FROM message_recipients
                GROUP BY person_id
            ) subq
            WHERE p.id = subq.person_id
        """)

        cur.close()
        self.conn.commit()

        logger.info("People statistics updated!")

    def print_stats(self):
        """Print loading statistics and database summary."""
        logger.info("=" * 60)
        logger.info("Loading Statistics:")
        logger.info(f"  Batches processed: {self.stats['batches']}")
        logger.info(f"  People created: {self.stats['people']:,}")
        logger.info(f"  Messages loaded: {self.stats['messages']:,}")
        logger.info(f"  Recipients: {self.stats['recipients']:,}")
        logger.info(f"  References: {self.stats['references']:,}")
        if self.stats['attachments'] > 0 or self.stats['attachment_refs'] > 0:
            logger.info("Attachment Statistics:")
            logger.info(f"  Unique attachments: {self.stats['attachments']:,}")
            logger.info(f"  Attachment references: {self.stats['attachment_refs']:,}")
            logger.info(f"  Deduplicated: {self.stats['attachments_deduplicated']:,}")
        logger.info("=" * 60)

        # Query database for summary
        cur = self.conn.cursor()

        cur.execute("SELECT COUNT(*) FROM people")
        total_people = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM messages")
        total_messages = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM threads")
        total_threads = cur.fetchone()[0]

        cur.execute("SELECT MIN(date), MAX(date) FROM messages WHERE date IS NOT NULL")
        date_range = cur.fetchone()

        # Check if attachments table exists and get stats
        try:
            cur.execute("SELECT COUNT(*) FROM attachments")
            total_attachments = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM message_attachments")
            total_attachment_refs = cur.fetchone()[0]
            cur.execute("SELECT COALESCE(SUM(file_size), 0) FROM attachments")
            total_size = cur.fetchone()[0]
        except:
            total_attachments = 0
            total_attachment_refs = 0
            total_size = 0

        cur.close()

        logger.info("Database Summary:")
        logger.info(f"  Total people: {total_people:,}")
        logger.info(f"  Total messages: {total_messages:,}")
        logger.info(f"  Total threads: {total_threads:,}")
        if total_attachments > 0:
            logger.info(f"  Unique attachments: {total_attachments:,}")
            logger.info(f"  Attachment references: {total_attachment_refs:,}")
            logger.info(f"  Total attachment size: {total_size / (1024*1024):.2f} MB")
        if date_range[0]:
            logger.info(f"  Date range: {date_range[0]} to {date_range[1]}")
        logger.info("=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Load Enron emails into PostgreSQL')
    parser.add_argument(
        '--db-name',
        default='enron_emails',
        help='Database name'
    )
    parser.add_argument(
        '--db-user',
        help='Database user (default: from .env or "enron")'
    )
    parser.add_argument(
        '--db-password',
        help='Database password (default: from .env)'
    )
    parser.add_argument(
        '--db-host',
        help='Database host (default: from .env or "localhost")'
    )
    parser.add_argument(
        '--data-dir',
        default='extracted_data',
        help='Directory containing extracted JSON files'
    )
    parser.add_argument(
        '--skip-threads',
        action='store_true',
        help='Skip thread building step'
    )

    args = parser.parse_args()

    loader = PostgresLoader(
        db_name=args.db_name,
        db_user=args.db_user,
        db_password=args.db_password,
        db_host=args.db_host
    )

    try:
        loader.connect()
        loader.load_all_batches(args.data_dir)

        if not args.skip_threads:
            loader.build_threads()

        loader.update_people_stats()
        loader.print_stats()

    except KeyboardInterrupt:
        logger.info("\nInterrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise
    finally:
        loader.close()


if __name__ == '__main__':
    main()
