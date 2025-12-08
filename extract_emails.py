#!/usr/bin/env python3
"""
Enron Email Extraction Pipeline

Extracts and parses emails from the Enron email dataset tarball,
producing structured JSON output for later database loading.
"""

import email
from email.message import Message
import json
import tarfile
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from email.utils import parseaddr, parsedate_to_datetime
from email.header import Header
from datetime import datetime
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class EmailParser:
    """Parses individual email files into structured data."""

    def __init__(self):
        self.stats = {
            'total': 0,
            'parsed': 0,
            'errors': 0,
            'missing_message_id': 0,
            'missing_date': 0
        }

    @staticmethod
    def _header_to_str(value) -> str:
        """
        Convert email header value to string, handling Header objects.

        Args:
            value: Header value (could be str, Header object, or None)

        Returns:
            String representation, or empty string if None
        """
        if value is None:
            return ''
        if isinstance(value, Header):
            return str(value)
        return value

    def parse_email_file(self, content: bytes, file_path: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single email file into structured data.

        Args:
            content: Raw email content as bytes
            file_path: Path to the email file for reference

        Returns:
            Dictionary with parsed email data or None if parsing fails
        """
        self.stats['total'] += 1

        try:
            # Parse email using Python's email library
            msg = email.message_from_bytes(content)

            # Extract basic headers
            message_id = self._header_to_str(msg.get('Message-ID')).strip()
            if not message_id:
                self.stats['missing_message_id'] += 1
                # Generate a fallback ID based on file path
                message_id = f"<missing-{hash(file_path)}@enron.com>"

            # Parse date
            date_str = msg.get('Date')
            try:
                date = parsedate_to_datetime(date_str) if date_str else None
            except Exception as e:
                logger.debug(f"Date parse error for {file_path}: {e}")
                date = None
                self.stats['missing_date'] += 1

            # Parse sender
            from_header = self._header_to_str(msg.get('From'))
            from_name, from_address = parseaddr(from_header)

            # Parse recipients
            to_addresses = self._parse_addresses(self._header_to_str(msg.get('To')))
            cc_addresses = self._parse_addresses(self._header_to_str(msg.get('Cc')))
            bcc_addresses = self._parse_addresses(self._header_to_str(msg.get('Bcc')))

            # Extract threading headers
            in_reply_to = self._header_to_str(msg.get('In-Reply-To')).strip()
            references = self._parse_references(self._header_to_str(msg.get('References')))

            # Extract X-headers (Enron-specific metadata)
            x_from = self._header_to_str(msg.get('X-From')).strip()
            x_to = self._header_to_str(msg.get('X-To')).strip()
            x_cc = self._header_to_str(msg.get('X-cc')).strip()
            x_bcc = self._header_to_str(msg.get('X-bcc')).strip()
            x_folder = self._header_to_str(msg.get('X-Folder')).strip()
            x_origin = self._header_to_str(msg.get('X-Origin')).strip()
            x_filename = self._header_to_str(msg.get('X-FileName')).strip()

            # Extract body
            body = self._extract_body(msg)

            # Parse file path to extract mailbox info
            path_parts = Path(file_path).parts
            mailbox_owner = path_parts[1] if len(path_parts) > 1 else None
            folder_name = path_parts[2] if len(path_parts) > 2 else None

            parsed_data = {
                'message_id': message_id,
                'date': date.isoformat() if date else None,
                'timestamp': date.timestamp() if date else None,
                'from_address': from_address.lower() if from_address else None,
                'from_name': from_name,
                'to_addresses': to_addresses,
                'cc_addresses': cc_addresses,
                'bcc_addresses': bcc_addresses,
                'subject': self._header_to_str(msg.get('Subject')).strip(),
                'in_reply_to': in_reply_to if in_reply_to else None,
                'references': references,
                'body': body,
                'mailbox_owner': mailbox_owner,
                'folder_name': folder_name,
                'file_path': file_path,
                # Enron-specific fields
                'x_from': x_from,
                'x_to': x_to,
                'x_cc': x_cc,
                'x_bcc': x_bcc,
                'x_folder': x_folder,
                'x_origin': x_origin,
                'x_filename': x_filename,
            }

            self.stats['parsed'] += 1
            return parsed_data

        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Error parsing {file_path}: {e}")
            return None

    def _parse_addresses(self, header: str) -> List[Dict[str, str]]:
        """Parse email addresses from a header."""
        if not header:
            return []

        addresses = []
        for name, addr in email.utils.getaddresses([header]):
            if addr:
                addresses.append({
                    'name': name.strip(),
                    'address': addr.lower().strip()
                })
        return addresses

    def _parse_references(self, references: str) -> List[str]:
        """Parse References header into list of message IDs."""
        if not references:
            return []

        # References can be space or newline separated
        refs = re.findall(r'<[^>]+>', references)
        return [ref.strip() for ref in refs]

    def _extract_body(self, msg: Message) -> str:
        """Extract the text body from an email message."""
        if msg.is_multipart():
            # Get all text/plain parts
            parts = []
            for part in msg.walk():
                if part.get_content_type() == 'text/plain':
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            parts.append(payload.decode('utf-8', errors='ignore'))
                    except Exception as e:
                        logger.debug(f"Error decoding part: {e}")
            return '\n'.join(parts)
        else:
            # Single part message
            try:
                payload = msg.get_payload(decode=True)
                if payload:
                    return payload.decode('utf-8', errors='ignore')
            except Exception as e:
                logger.debug(f"Error decoding body: {e}")

        return ""

    def print_stats(self):
        """Print parsing statistics."""
        logger.info("=" * 60)
        logger.info("Parsing Statistics:")
        logger.info(f"  Total emails: {self.stats['total']}")
        logger.info(f"  Successfully parsed: {self.stats['parsed']}")
        logger.info(f"  Errors: {self.stats['errors']}")
        logger.info(f"  Missing Message-ID: {self.stats['missing_message_id']}")
        logger.info(f"  Missing Date: {self.stats['missing_date']}")
        logger.info("=" * 60)


class EnronExtractor:
    """Extracts emails from the Enron tarball."""

    def __init__(self, tarball_path: str, output_dir: str = "extracted_data"):
        self.tarball_path = Path(tarball_path)
        self.output_dir = Path(output_dir)
        self.parser = EmailParser()

        # Create output directory
        self.output_dir.mkdir(exist_ok=True)

    def extract_all(self, limit: Optional[int] = None, batch_size: int = 1000):
        """
        Extract all emails from the tarball.

        Args:
            limit: Maximum number of emails to extract (None for all)
            batch_size: Number of emails to write per JSON file
        """
        logger.info(f"Opening tarball: {self.tarball_path}")

        with tarfile.open(self.tarball_path, 'r:gz') as tar:
            # Filter to only email files (numbered files)
            members = [m for m in tar.getmembers() if m.isfile() and re.match(r'.*\d+\.$', m.name)]

            total_files = len(members)
            logger.info(f"Found {total_files} email files")

            if limit:
                members = members[:limit]
                logger.info(f"Limited to {limit} emails")

            batch = []
            batch_num = 0

            for idx, member in enumerate(members, 1):
                try:
                    # Extract file content
                    f = tar.extractfile(member)
                    if f is None:
                        continue

                    content = f.read()

                    # Parse email
                    parsed = self.parser.parse_email_file(content, member.name)
                    if parsed:
                        batch.append(parsed)

                    # Write batch to file
                    if len(batch) >= batch_size:
                        self._write_batch(batch, batch_num)
                        batch_num += 1
                        batch = []

                    # Progress logging
                    if idx % 10000 == 0:
                        logger.info(f"Processed {idx:,} / {len(members):,} emails")

                except Exception as e:
                    logger.error(f"Error processing {member.name}: {e}")

            # Write remaining batch
            if batch:
                self._write_batch(batch, batch_num)

        self.parser.print_stats()
        logger.info(f"Extraction complete. Data saved to {self.output_dir}/")

    def _write_batch(self, batch: List[Dict], batch_num: int):
        """Write a batch of emails to a JSON file."""
        output_file = self.output_dir / f"emails_batch_{batch_num:04d}.json"
        with open(output_file, 'w') as f:
            json.dump(batch, f, indent=2)
        logger.info(f"Wrote batch {batch_num} ({len(batch)} emails) to {output_file}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description='Extract Enron emails from tarball')
    parser.add_argument(
        '--tarball',
        default='enron_mail_20150507.tar.gz',
        help='Path to the Enron email tarball'
    )
    parser.add_argument(
        '--output',
        default='extracted_data',
        help='Output directory for extracted JSON files'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of emails to extract (for testing)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=1000,
        help='Number of emails per output file'
    )

    args = parser.parse_args()

    extractor = EnronExtractor(args.tarball, args.output)
    extractor.extract_all(limit=args.limit, batch_size=args.batch_size)


if __name__ == '__main__':
    main()
