#!/usr/bin/env python3
"""
Extract attachments from EDRM Enron Email Dataset v2 XML format.

The EDRM XML format stores emails and attachments with:
- XML metadata file describing all documents
- Native files in native_XXX/ directories
- Relationship encoded in DocID (email.1, email.2 = attachments)
"""

import argparse
import hashlib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime


@dataclass
class Attachment:
    """Represents an extracted attachment."""
    doc_id: str
    filename: str
    extension: str
    file_size: int
    mime_type: str
    md5_hash: str  # From EDRM metadata
    sha256_hash: str = ""  # Computed during extraction
    storage_path: str = ""
    parent_doc_id: str = ""  # The email this belongs to


@dataclass
class Email:
    """Represents an email from EDRM data."""
    doc_id: str
    from_addr: str
    to_addrs: str
    cc_addrs: str
    subject: str
    date_sent: str
    has_attachments: bool
    attachment_count: int
    attachment_names: List[str]
    custodian: str
    folder: str
    native_file: str
    md5_hash: str


class EDRMExtractor:
    """Extract attachments from EDRM XML format."""

    def __init__(
        self,
        output_dir: str,
        max_attachment_size: int = 50 * 1024 * 1024,  # 50MB default
        verbose: bool = False
    ):
        self.output_dir = Path(output_dir)
        self.attachments_dir = self.output_dir / "attachments"
        self.max_attachment_size = max_attachment_size
        self.verbose = verbose

        # Statistics
        self.stats = {
            "zips_processed": 0,
            "emails_found": 0,
            "emails_with_attachments": 0,
            "attachments_found": 0,
            "attachments_extracted": 0,
            "attachments_deduplicated": 0,
            "attachments_too_large": 0,
            "bytes_extracted": 0,
            "errors": 0,
        }

        # Hash cache for deduplication
        self.hash_cache: Dict[str, str] = {}  # sha256 -> storage_path

        # Results
        self.emails: List[Email] = []
        self.attachments: List[Attachment] = []

        # Create output directories
        self.attachments_dir.mkdir(parents=True, exist_ok=True)

    def _get_storage_path(self, sha256_hash: str, extension: str) -> str:
        """Get sharded storage path for attachment."""
        # Two-level sharding: ab/cd/abcdef...ext
        shard1 = sha256_hash[:2]
        shard2 = sha256_hash[2:4]
        shard_dir = self.attachments_dir / shard1 / shard2
        shard_dir.mkdir(parents=True, exist_ok=True)
        return str(shard_dir / f"{sha256_hash}{extension}")

    def _compute_sha256(self, data: bytes) -> str:
        """Compute SHA256 hash of data."""
        return hashlib.sha256(data).hexdigest()

    def _parse_tag_value(self, doc: ET.Element, tag_name: str) -> str:
        """Extract a tag value from a document element."""
        for tag in doc.findall(".//Tag"):
            if tag.get("TagName") == tag_name:
                return tag.get("TagValue", "")
        return ""

    def _parse_file_info(self, doc: ET.Element) -> Tuple[str, str, int, str]:
        """Extract native file info (path, filename, size, hash)."""
        for file_elem in doc.findall(".//File[@FileType='Native']"):
            ext_file = file_elem.find("ExternalFile")
            if ext_file is not None:
                return (
                    ext_file.get("FilePath", ""),
                    ext_file.get("FileName", ""),
                    int(ext_file.get("FileSize", 0)),
                    ext_file.get("Hash", "")
                )
        return "", "", 0, ""

    def _parse_xml(self, xml_content: str) -> Tuple[List[Email], Dict[str, Attachment]]:
        """Parse EDRM XML content and extract emails and attachments."""
        emails = []
        attachments = {}  # doc_id -> Attachment

        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            print(f"  XML parse error: {e}", file=sys.stderr)
            return emails, attachments

        for doc in root.findall(".//Document"):
            doc_id = doc.get("DocID", "")
            doc_type = doc.get("DocType", "")
            mime_type = doc.get("MimeType", "")

            if doc_type == "Message":
                # This is an email
                has_att = self._parse_tag_value(doc, "#HasAttachments").lower() == "true"
                att_count = int(self._parse_tag_value(doc, "#AttachmentCount") or "0")
                att_names_str = self._parse_tag_value(doc, "#AttachmentNames")
                att_names = [n.strip() for n in att_names_str.split(";")] if att_names_str else []

                # Get location info
                location = doc.find(".//Location")
                custodian = ""
                folder = ""
                if location is not None:
                    cust_elem = location.find("Custodian")
                    folder_elem = location.find("LocationURI")
                    custodian = cust_elem.text if cust_elem is not None else ""
                    folder = folder_elem.text if folder_elem is not None else ""

                # Get native file info
                file_path, file_name, file_size, md5_hash = self._parse_file_info(doc)

                email = Email(
                    doc_id=doc_id,
                    from_addr=self._parse_tag_value(doc, "#From"),
                    to_addrs=self._parse_tag_value(doc, "#To"),
                    cc_addrs=self._parse_tag_value(doc, "#CC"),
                    subject=self._parse_tag_value(doc, "#Subject"),
                    date_sent=self._parse_tag_value(doc, "#DateSent"),
                    has_attachments=has_att,
                    attachment_count=att_count,
                    attachment_names=att_names,
                    custodian=custodian,
                    folder=folder,
                    native_file=f"{file_path}/{file_name}" if file_path else file_name,
                    md5_hash=md5_hash
                )
                emails.append(email)
                self.stats["emails_found"] += 1
                if has_att:
                    self.stats["emails_with_attachments"] += 1

            elif doc_type == "File":
                # This is an attachment
                # Parent doc_id is everything before the last .N suffix
                parent_match = re.match(r"(.+)\.(\d+)$", doc_id)
                if parent_match:
                    parent_doc_id = parent_match.group(1)
                else:
                    parent_doc_id = ""

                filename = self._parse_tag_value(doc, "#FileName")
                extension = self._parse_tag_value(doc, "#FileExtension")
                file_size = int(self._parse_tag_value(doc, "#FileSize") or "0")

                # Get native file info
                file_path, native_filename, native_size, md5_hash = self._parse_file_info(doc)

                attachment = Attachment(
                    doc_id=doc_id,
                    filename=filename,
                    extension=f".{extension}" if extension and not extension.startswith(".") else extension,
                    file_size=file_size or native_size,
                    mime_type=mime_type,
                    md5_hash=md5_hash,
                    parent_doc_id=parent_doc_id
                )
                attachments[doc_id] = attachment
                self.stats["attachments_found"] += 1

        return emails, attachments

    def _extract_attachment_file(
        self,
        zip_file: zipfile.ZipFile,
        attachment: Attachment,
        native_filename: str
    ) -> bool:
        """Extract an attachment file from the ZIP."""
        # Find the file in the ZIP
        matching_files = [
            n for n in zip_file.namelist()
            if n.endswith(native_filename) or native_filename in n
        ]

        if not matching_files:
            if self.verbose:
                print(f"  File not found in ZIP: {native_filename}")
            return False

        file_path = matching_files[0]

        try:
            # Read the file
            data = zip_file.read(file_path)

            # Check size
            if len(data) > self.max_attachment_size:
                self.stats["attachments_too_large"] += 1
                if self.verbose:
                    print(f"  Attachment too large: {attachment.filename} ({len(data)} bytes)")
                return False

            # Compute SHA256
            sha256_hash = self._compute_sha256(data)
            attachment.sha256_hash = sha256_hash

            # Check for duplicate
            if sha256_hash in self.hash_cache:
                attachment.storage_path = self.hash_cache[sha256_hash]
                self.stats["attachments_deduplicated"] += 1
                return True

            # Write to storage
            storage_path = self._get_storage_path(sha256_hash, attachment.extension)
            with open(storage_path, "wb") as f:
                f.write(data)

            attachment.storage_path = storage_path
            self.hash_cache[sha256_hash] = storage_path
            self.stats["attachments_extracted"] += 1
            self.stats["bytes_extracted"] += len(data)

            return True

        except Exception as e:
            self.stats["errors"] += 1
            if self.verbose:
                print(f"  Error extracting {attachment.filename}: {e}", file=sys.stderr)
            return False

    def process_zip(self, zip_path: str) -> None:
        """Process a single EDRM ZIP file."""
        print(f"Processing: {zip_path}")

        try:
            with zipfile.ZipFile(zip_path, "r") as zf:
                # Find the XML metadata file
                xml_files = [n for n in zf.namelist() if n.endswith(".xml") and "zl_" in n]

                if not xml_files:
                    print(f"  No XML metadata file found")
                    return

                # Process each XML file (usually just one)
                for xml_file in xml_files:
                    xml_content = zf.read(xml_file).decode("utf-8", errors="replace")
                    emails, attachments = self._parse_xml(xml_content)

                    self.emails.extend(emails)

                    # Extract attachment files
                    for doc_id, attachment in attachments.items():
                        # Build the expected native filename
                        native_filename = f"{doc_id}{attachment.extension}"

                        if self._extract_attachment_file(zf, attachment, native_filename):
                            self.attachments.append(attachment)

                self.stats["zips_processed"] += 1

        except zipfile.BadZipFile:
            print(f"  Invalid ZIP file: {zip_path}", file=sys.stderr)
            self.stats["errors"] += 1
        except Exception as e:
            print(f"  Error processing {zip_path}: {e}", file=sys.stderr)
            self.stats["errors"] += 1

    def save_results(self) -> None:
        """Save extraction results to JSON files."""
        # Save emails
        emails_file = self.output_dir / "edrm_emails.json"
        with open(emails_file, "w") as f:
            json.dump([asdict(e) for e in self.emails], f, indent=2)
        print(f"Saved {len(self.emails)} emails to {emails_file}")

        # Save attachments
        attachments_file = self.output_dir / "edrm_attachments.json"
        with open(attachments_file, "w") as f:
            json.dump([asdict(a) for a in self.attachments], f, indent=2)
        print(f"Saved {len(self.attachments)} attachments to {attachments_file}")

        # Save stats
        stats_file = self.output_dir / "edrm_stats.json"
        with open(stats_file, "w") as f:
            json.dump(self.stats, f, indent=2)

    def print_stats(self) -> None:
        """Print extraction statistics."""
        print("\n" + "=" * 60)
        print("EDRM Extraction Statistics")
        print("=" * 60)
        print(f"ZIP files processed:    {self.stats['zips_processed']:,}")
        print(f"Emails found:           {self.stats['emails_found']:,}")
        print(f"Emails with attachments:{self.stats['emails_with_attachments']:,}")
        print(f"Attachments found:      {self.stats['attachments_found']:,}")
        print(f"Attachments extracted:  {self.stats['attachments_extracted']:,}")
        print(f"Attachments deduplicated:{self.stats['attachments_deduplicated']:,}")
        print(f"Attachments too large:  {self.stats['attachments_too_large']:,}")
        print(f"Total bytes extracted:  {self.stats['bytes_extracted']:,}")
        print(f"Errors:                 {self.stats['errors']:,}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Extract attachments from EDRM Enron Email Dataset v2"
    )
    parser.add_argument(
        "input",
        nargs="+",
        help="Input ZIP file(s) or directory containing ZIP files"
    )
    parser.add_argument(
        "-o", "--output",
        default="extracted_edrm_data",
        help="Output directory (default: extracted_edrm_data)"
    )
    parser.add_argument(
        "--max-size",
        type=int,
        default=50,
        help="Maximum attachment size in MB (default: 50)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output"
    )

    args = parser.parse_args()

    extractor = EDRMExtractor(
        output_dir=args.output,
        max_attachment_size=args.max_size * 1024 * 1024,
        verbose=args.verbose
    )

    # Collect all ZIP files
    zip_files = []
    for input_path in args.input:
        path = Path(input_path)
        if path.is_file() and path.suffix.lower() == ".zip":
            zip_files.append(str(path))
        elif path.is_dir():
            zip_files.extend(str(p) for p in path.glob("*.zip"))

    if not zip_files:
        print("No ZIP files found", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(zip_files)} ZIP files to process")

    # Process each ZIP
    for zip_path in sorted(zip_files):
        extractor.process_zip(zip_path)

    # Save results
    extractor.save_results()
    extractor.print_stats()


if __name__ == "__main__":
    main()
