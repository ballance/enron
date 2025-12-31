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
import hashlib
import os
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
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

    # MIME type to file extension mapping
    MIME_TO_EXT = {
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.ms-powerpoint': '.ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/bmp': '.bmp',
        'image/tiff': '.tiff',
        'text/plain': '.txt',
        'text/html': '.html',
        'text/csv': '.csv',
        'application/zip': '.zip',
        'application/x-zip-compressed': '.zip',
        'application/x-gzip': '.gz',
        'application/x-tar': '.tar',
        'application/octet-stream': '.bin',
        'message/rfc822': '.eml',
    }

    def __init__(self, attachments_dir: Optional[str] = None, max_attachment_size: int = 50 * 1024 * 1024):
        """
        Initialize the email parser.

        Args:
            attachments_dir: Directory to store extracted attachments. If None, attachments are not extracted.
            max_attachment_size: Maximum attachment size in bytes (default 50MB)
        """
        self.attachments_dir = Path(attachments_dir) if attachments_dir else None
        self.max_attachment_size = max_attachment_size
        self.attachment_hashes: Set[str] = set()  # Track seen hashes for deduplication

        self.stats = {
            'total': 0,
            'parsed': 0,
            'errors': 0,
            'missing_message_id': 0,
            'missing_date': 0,
            'attachments_extracted': 0,
            'attachments_deduplicated': 0,
            'attachments_skipped_size': 0,
            'attachment_errors': 0,
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

            # Extract attachments (if attachments_dir is configured)
            attachments = self._extract_attachments(msg, file_path)

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
                'attachments': attachments,
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

    def _extract_attachments(self, msg: Message, file_path: str) -> List[Dict[str, Any]]:
        """
        Extract attachments from email message.

        Handles:
        - Standard attachments (Content-Disposition: attachment)
        - Inline attachments (Content-Disposition: inline)
        - Unnamed attachments (generates filename from content hash)
        - Various encodings (base64, quoted-printable, 7bit, 8bit)

        Returns:
            List of attachment metadata dicts
        """
        if not self.attachments_dir:
            return []

        attachments = []
        attachment_order = 0

        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get('Content-Disposition', ''))

            # Skip multipart containers
            if part.get_content_maintype() == 'multipart':
                continue

            # Skip text/plain and text/html unless explicitly marked as attachment
            if content_type in ('text/plain', 'text/html'):
                if 'attachment' not in content_disposition.lower():
                    continue

            try:
                # Get payload (decode=True handles base64/quoted-printable)
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue

                # Check size limit
                if len(payload) > self.max_attachment_size:
                    self.stats['attachments_skipped_size'] += 1
                    logger.debug(f"Skipping large attachment ({len(payload)} bytes) in {file_path}")
                    continue

                # Compute SHA256 hash
                sha256_hash = hashlib.sha256(payload).hexdigest()

                # Get filename (multiple fallback strategies)
                filename = self._get_attachment_filename(part, sha256_hash, content_type)

                # Determine if inline
                is_inline = 'inline' in content_disposition.lower()
                content_id = part.get('Content-ID', '').strip('<>')

                # Check for deduplication
                if sha256_hash in self.attachment_hashes:
                    self.stats['attachments_deduplicated'] += 1
                    # Still record metadata, but don't write file again
                    storage_path = self._get_storage_path(sha256_hash)
                else:
                    # Write file to disk
                    storage_path = self._write_attachment(sha256_hash, payload)
                    self.attachment_hashes.add(sha256_hash)
                    self.stats['attachments_extracted'] += 1

                attachments.append({
                    'sha256_hash': sha256_hash,
                    'original_filename': filename,
                    'mime_type': content_type,
                    'file_size': len(payload),
                    'storage_path': storage_path,
                    'is_inline': is_inline,
                    'content_id': content_id if content_id else None,
                    'attachment_order': attachment_order
                })
                attachment_order += 1

            except Exception as e:
                logger.debug(f"Error extracting attachment from {file_path}: {e}")
                self.stats['attachment_errors'] += 1

        return attachments

    def _get_attachment_filename(self, part: Message, sha256_hash: str, content_type: str) -> str:
        """
        Get filename with multiple fallback strategies.

        Priority:
        1. Content-Disposition filename parameter
        2. Content-Type name parameter
        3. Generated from hash + guessed extension
        """
        # Try Content-Disposition filename
        filename = part.get_filename()
        if filename:
            return self._sanitize_filename(filename)

        # Try Content-Type name parameter
        name = part.get_param('name')
        if name:
            return self._sanitize_filename(name)

        # Generate filename from hash
        ext = self._guess_extension(content_type)
        return f"unnamed_{sha256_hash[:12]}{ext}"

    def _sanitize_filename(self, filename: str) -> str:
        """Remove path separators and dangerous characters."""
        if not filename:
            return "unnamed"

        # Handle encoded filenames
        if isinstance(filename, bytes):
            filename = filename.decode('utf-8', errors='ignore')

        # Remove path components
        filename = filename.replace('\\', '/').split('/')[-1]

        # Remove null bytes and control characters
        filename = ''.join(c for c in filename if ord(c) >= 32)

        # Remove potentially dangerous characters
        filename = re.sub(r'[<>:"|?*]', '_', filename)

        # Limit length (preserve extension)
        if len(filename) > 255:
            name, ext = os.path.splitext(filename)
            filename = name[:255-len(ext)] + ext

        return filename.strip() or "unnamed"

    def _guess_extension(self, content_type: str) -> str:
        """Map MIME type to file extension."""
        return self.MIME_TO_EXT.get(content_type, '.bin')

    def _get_storage_path(self, sha256_hash: str) -> str:
        """
        Generate storage path using hash-based sharding.

        Structure: ab/cd/abcdef1234567890...
        First 2 chars as first level, next 2 as second level.
        """
        return f"{sha256_hash[:2]}/{sha256_hash[2:4]}/{sha256_hash}"

    def _write_attachment(self, sha256_hash: str, content: bytes) -> str:
        """Write attachment to disk with sharded directory structure."""
        storage_path = self._get_storage_path(sha256_hash)
        full_path = self.attachments_dir / storage_path

        # Create parent directories
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file
        with open(full_path, 'wb') as f:
            f.write(content)

        return storage_path

    def print_stats(self):
        """Print parsing statistics."""
        logger.info("=" * 60)
        logger.info("Parsing Statistics:")
        logger.info(f"  Total emails: {self.stats['total']}")
        logger.info(f"  Successfully parsed: {self.stats['parsed']}")
        logger.info(f"  Errors: {self.stats['errors']}")
        logger.info(f"  Missing Message-ID: {self.stats['missing_message_id']}")
        logger.info(f"  Missing Date: {self.stats['missing_date']}")
        if self.attachments_dir:
            logger.info("Attachment Statistics:")
            logger.info(f"  Unique files extracted: {self.stats['attachments_extracted']}")
            logger.info(f"  Duplicates (reused): {self.stats['attachments_deduplicated']}")
            logger.info(f"  Skipped (too large): {self.stats['attachments_skipped_size']}")
            logger.info(f"  Extraction errors: {self.stats['attachment_errors']}")
            total_refs = self.stats['attachments_extracted'] + self.stats['attachments_deduplicated']
            logger.info(f"  Total attachment references: {total_refs}")
        logger.info("=" * 60)


class EnronExtractor:
    """Extracts emails from the Enron tarball."""

    def __init__(
        self,
        tarball_path: str,
        output_dir: str = "extracted_data",
        attachments_dir: Optional[str] = None,
        max_attachment_size: int = 50 * 1024 * 1024
    ):
        self.tarball_path = Path(tarball_path)
        self.output_dir = Path(output_dir)
        self.attachments_dir = Path(attachments_dir) if attachments_dir else None
        self.parser = EmailParser(
            attachments_dir=attachments_dir,
            max_attachment_size=max_attachment_size
        )

        # Create output directory
        self.output_dir.mkdir(exist_ok=True)

        # Create attachments directory if specified
        if self.attachments_dir:
            self.attachments_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Attachments will be saved to: {self.attachments_dir}")

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

    arg_parser = argparse.ArgumentParser(description='Extract Enron emails from tarball')
    arg_parser.add_argument(
        '--tarball',
        default='enron_mail_20150507.tar.gz',
        help='Path to the Enron email tarball'
    )
    arg_parser.add_argument(
        '--output',
        default='extracted_data',
        help='Output directory for extracted JSON files'
    )
    arg_parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of emails to extract (for testing)'
    )
    arg_parser.add_argument(
        '--batch-size',
        type=int,
        default=1000,
        help='Number of emails per output file'
    )
    arg_parser.add_argument(
        '--extract-attachments',
        action='store_true',
        help='Extract attachments to disk'
    )
    arg_parser.add_argument(
        '--attachments-dir',
        default='extracted_data/attachments',
        help='Directory for extracted attachments (default: extracted_data/attachments)'
    )
    arg_parser.add_argument(
        '--max-attachment-size',
        type=int,
        default=50 * 1024 * 1024,
        help='Maximum attachment size in bytes to extract (default: 50MB)'
    )

    args = arg_parser.parse_args()

    # Determine attachments_dir based on flags
    attachments_dir = args.attachments_dir if args.extract_attachments else None

    extractor = EnronExtractor(
        tarball_path=args.tarball,
        output_dir=args.output,
        attachments_dir=attachments_dir,
        max_attachment_size=args.max_attachment_size
    )
    extractor.extract_all(limit=args.limit, batch_size=args.batch_size)


if __name__ == '__main__':
    main()
