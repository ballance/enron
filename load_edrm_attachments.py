#!/usr/bin/env python3
"""
Load EDRM attachments into the Enron email database.

This script:
1. Reads extracted EDRM data (emails and attachments JSON)
2. Matches EDRM emails with existing messages by subject/date/sender
3. Inserts attachments and links them to messages
"""

import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import psycopg2
from psycopg2.extras import execute_batch


def parse_email_from_string(email_str: str) -> Optional[str]:
    """Extract email address from a formatted string like 'Name <email@domain.com>'."""
    if not email_str:
        return None
    # Try to extract from angle brackets
    match = re.search(r'<([^>]+)>', email_str)
    if match:
        return match.group(1).lower()
    # Fall back to the whole string
    return email_str.strip().lower()


def parse_date(date_str: str) -> Optional[datetime]:
    """Parse EDRM date format."""
    if not date_str:
        return None
    try:
        # Format: 2001-05-30T16:13:31.0+00:00
        # Remove the .0 milliseconds part if present
        date_str = re.sub(r'\.\d+', '', date_str)
        return datetime.fromisoformat(date_str.replace('+00:00', ''))
    except ValueError:
        return None


def normalize_subject(subject: str) -> str:
    """Normalize subject for matching (lowercase, remove Re:/Fw:, trim)."""
    if not subject:
        return ""
    # Remove Re:, Fw:, Fwd: prefixes
    subject = re.sub(r'^(Re|Fw|Fwd):\s*', '', subject, flags=re.IGNORECASE)
    return subject.strip().lower()


class EDRMLoader:
    """Load EDRM attachments into the database."""

    def __init__(
        self,
        db_host: str = "localhost",
        db_port: int = 5434,
        db_name: str = "enron_emails",
        db_user: str = "enron",
        db_password: str = "enron_dev_password",
        attachments_base_dir: str = "extracted_edrm_data/attachments",
        target_attachments_dir: str = "extracted_data/attachments",
        verbose: bool = False
    ):
        self.conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_password
        )
        self.cur = self.conn.cursor()
        self.attachments_base_dir = Path(attachments_base_dir)
        self.target_attachments_dir = Path(target_attachments_dir)
        self.verbose = verbose

        # Statistics
        self.stats = {
            "emails_processed": 0,
            "emails_matched": 0,
            "emails_not_found": 0,
            "attachments_processed": 0,
            "attachments_inserted": 0,
            "attachments_linked": 0,
            "attachments_already_exist": 0,
            "errors": 0,
        }

        # Caches
        self.attachment_cache: Dict[str, int] = {}  # sha256 -> attachment_id
        self.email_match_cache: Dict[str, List[int]] = {}  # doc_id -> [message_ids]

        # Create target directory
        self.target_attachments_dir.mkdir(parents=True, exist_ok=True)

    def close(self):
        """Close database connection."""
        self.cur.close()
        self.conn.close()

    def load_existing_attachments(self):
        """Load existing attachments from database into cache."""
        self.cur.execute("SELECT id, sha256_hash FROM attachments")
        for row in self.cur:
            self.attachment_cache[row[1]] = row[0]
        print(f"Loaded {len(self.attachment_cache)} existing attachments from database")

    def find_matching_messages(
        self,
        subject: str,
        date: Optional[datetime],
        from_email: str
    ) -> List[int]:
        """Find messages matching the EDRM email criteria."""
        if not date or not from_email:
            return []

        # Normalize inputs
        from_email = from_email.lower()
        normalized_subject = normalize_subject(subject)

        # Build query - match by sender, approximate date (within 1 hour), and subject
        query = """
            SELECT DISTINCT m.id
            FROM messages m
            JOIN people p ON m.from_person_id = p.id
            WHERE LOWER(p.email) = %s
            AND m.date BETWEEN %s AND %s
            AND (
                LOWER(m.subject) = %s
                OR LOWER(m.subject) LIKE %s
            )
        """

        # Allow 12 hour window for date matching (timezone differences, PST vs UTC)
        date_start = date - timedelta(hours=12)
        date_end = date + timedelta(hours=12)

        params = (
            from_email,
            date_start,
            date_end,
            subject.lower() if subject else "",
            f"%{normalized_subject}%" if normalized_subject else "",
        )

        self.cur.execute(query, params)
        return [row[0] for row in self.cur.fetchall()]

    def get_or_create_attachment(
        self,
        sha256_hash: str,
        original_filename: str,
        mime_type: str,
        file_size: int,
        source_path: str,
        extension: str
    ) -> Optional[int]:
        """Get existing or create new attachment record."""
        # Check cache
        if sha256_hash in self.attachment_cache:
            return self.attachment_cache[sha256_hash]

        # Calculate storage path
        shard1 = sha256_hash[:2]
        shard2 = sha256_hash[2:4]
        storage_filename = f"{sha256_hash}{extension}"
        storage_path = f"{shard1}/{shard2}/{storage_filename}"
        full_target_path = self.target_attachments_dir / shard1 / shard2 / storage_filename

        # Copy file if not exists
        if not full_target_path.exists():
            full_target_path.parent.mkdir(parents=True, exist_ok=True)
            if Path(source_path).exists():
                shutil.copy2(source_path, full_target_path)
            else:
                if self.verbose:
                    print(f"  Source file not found: {source_path}")
                return None

        # Insert into database
        try:
            self.cur.execute("""
                INSERT INTO attachments (sha256_hash, original_filename, mime_type, file_size, storage_path)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (sha256_hash) DO UPDATE SET sha256_hash = attachments.sha256_hash
                RETURNING id
            """, (sha256_hash, original_filename, mime_type, file_size, storage_path))

            attachment_id = self.cur.fetchone()[0]
            self.attachment_cache[sha256_hash] = attachment_id
            self.stats["attachments_inserted"] += 1
            return attachment_id

        except Exception as e:
            self.stats["errors"] += 1
            if self.verbose:
                print(f"  Error inserting attachment: {e}")
            return None

    def link_attachment_to_message(
        self,
        message_id: int,
        attachment_id: int,
        filename: str,
        attachment_order: int
    ) -> bool:
        """Create link between message and attachment."""
        try:
            self.cur.execute("""
                INSERT INTO message_attachments (message_id, attachment_id, filename, attachment_order)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (message_id, attachment_id, attachment_order) DO NOTHING
            """, (message_id, attachment_id, filename, attachment_order))
            return True
        except Exception as e:
            if self.verbose:
                print(f"  Error linking attachment: {e}")
            return False

    def update_message_has_attachments(self, message_id: int):
        """Update the has_attachments flag on a message."""
        self.cur.execute("""
            UPDATE messages SET has_attachments = true WHERE id = %s
        """, (message_id,))

    def load(self, emails_json: str, attachments_json: str):
        """Load EDRM data into the database."""
        print(f"Loading EDRM data...")

        # Load JSON files
        with open(emails_json) as f:
            emails = json.load(f)
        with open(attachments_json) as f:
            attachments = json.load(f)

        print(f"  {len(emails)} emails, {len(attachments)} attachments")

        # Load existing attachments
        self.load_existing_attachments()

        # Build attachment lookup by parent_doc_id
        attachments_by_parent: Dict[str, List[dict]] = {}
        for att in attachments:
            parent = att.get("parent_doc_id", "")
            if parent:
                if parent not in attachments_by_parent:
                    attachments_by_parent[parent] = []
                attachments_by_parent[parent].append(att)

        # Process emails with attachments
        for email in emails:
            if not email.get("has_attachments"):
                continue

            self.stats["emails_processed"] += 1

            # Parse email data
            doc_id = email["doc_id"]
            subject = email.get("subject", "")
            date = parse_date(email.get("date_sent", ""))
            from_email = parse_email_from_string(email.get("from_addr", ""))

            # Find matching messages in database
            message_ids = self.find_matching_messages(subject, date, from_email)

            if not message_ids:
                self.stats["emails_not_found"] += 1
                if self.verbose:
                    print(f"  No match for: {subject[:50]}... ({from_email}, {date})")
                continue

            self.stats["emails_matched"] += 1

            # Get attachments for this email
            email_attachments = attachments_by_parent.get(doc_id, [])

            if not email_attachments:
                continue

            # Process each attachment
            for order, att in enumerate(email_attachments, 1):
                self.stats["attachments_processed"] += 1

                sha256_hash = att.get("sha256_hash", "")
                if not sha256_hash:
                    continue

                attachment_id = self.get_or_create_attachment(
                    sha256_hash=sha256_hash,
                    original_filename=att.get("filename", ""),
                    mime_type=att.get("mime_type", "application/octet-stream"),
                    file_size=att.get("file_size", 0),
                    source_path=att.get("storage_path", ""),
                    extension=att.get("extension", "")
                )

                if not attachment_id:
                    continue

                # Link to all matching messages
                for message_id in message_ids:
                    if self.link_attachment_to_message(
                        message_id=message_id,
                        attachment_id=attachment_id,
                        filename=att.get("filename", ""),
                        attachment_order=order
                    ):
                        self.stats["attachments_linked"] += 1
                        self.update_message_has_attachments(message_id)

            # Commit periodically
            if self.stats["emails_processed"] % 100 == 0:
                self.conn.commit()
                print(f"  Processed {self.stats['emails_processed']} emails...")

        # Final commit
        self.conn.commit()
        print("Done!")

    def print_stats(self):
        """Print loading statistics."""
        print("\n" + "=" * 60)
        print("EDRM Loading Statistics")
        print("=" * 60)
        print(f"Emails processed:       {self.stats['emails_processed']:,}")
        print(f"Emails matched:         {self.stats['emails_matched']:,}")
        print(f"Emails not found:       {self.stats['emails_not_found']:,}")
        print(f"Attachments processed:  {self.stats['attachments_processed']:,}")
        print(f"Attachments inserted:   {self.stats['attachments_inserted']:,}")
        print(f"Attachments linked:     {self.stats['attachments_linked']:,}")
        print(f"Errors:                 {self.stats['errors']:,}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Load EDRM attachments into the Enron database"
    )
    parser.add_argument(
        "--emails-json",
        default="extracted_edrm_data/edrm_emails.json",
        help="Path to extracted emails JSON"
    )
    parser.add_argument(
        "--attachments-json",
        default="extracted_edrm_data/edrm_attachments.json",
        help="Path to extracted attachments JSON"
    )
    parser.add_argument(
        "--attachments-dir",
        default="extracted_edrm_data/attachments",
        help="Directory containing extracted attachment files"
    )
    parser.add_argument(
        "--target-dir",
        default="extracted_data/attachments",
        help="Target directory for attachment files"
    )
    parser.add_argument(
        "--db-host",
        default="localhost",
        help="Database host"
    )
    parser.add_argument(
        "--db-port",
        type=int,
        default=5434,
        help="Database port"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output"
    )

    args = parser.parse_args()

    loader = EDRMLoader(
        db_host=args.db_host,
        db_port=args.db_port,
        attachments_base_dir=args.attachments_dir,
        target_attachments_dir=args.target_dir,
        verbose=args.verbose
    )

    try:
        loader.load(args.emails_json, args.attachments_json)
        loader.print_stats()
    finally:
        loader.close()


if __name__ == "__main__":
    main()
