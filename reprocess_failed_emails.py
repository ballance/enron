#!/usr/bin/env python3
"""
Re-extract emails that failed during the initial extraction.

This script:
1. Scans extraction logs or examines the tarball to find emails with Header object errors
2. Re-extracts only those specific emails using the fixed parser
3. Appends them to a new batch file
"""

import tarfile
import json
import logging
from pathlib import Path
from extract_emails import EmailParser

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def find_header_object_emails(tarball_path: str, sample_size: int = None):
    """
    Scan tarball to find emails that would trigger Header object errors.

    Args:
        tarball_path: Path to tarball
        sample_size: If set, only check this many emails (for testing)

    Returns:
        List of file paths that have Header objects
    """
    from email.header import Header
    import email

    logger.info("Scanning tarball for emails with Header objects...")
    problem_files = []

    with tarfile.open(tarball_path, 'r:gz') as tar:
        members = [m for m in tar.getmembers() if m.isfile() and m.name.endswith('.')]

        if sample_size:
            import random
            members = random.sample(members, min(sample_size, len(members)))

        for idx, member in enumerate(members, 1):
            if idx % 10000 == 0:
                logger.info(f"Scanned {idx:,} / {len(members):,} emails, found {len(problem_files)} with Header objects")

            try:
                f = tar.extractfile(member)
                if f is None:
                    continue

                content = f.read()
                msg = email.message_from_bytes(content)

                # Check for Header objects in any field we access
                headers_to_check = ['Message-ID', 'From', 'To', 'Cc', 'Bcc',
                                  'In-Reply-To', 'References', 'Subject',
                                  'X-From', 'X-To', 'X-cc', 'X-bcc',
                                  'X-Folder', 'X-Origin', 'X-FileName']

                for header in headers_to_check:
                    val = msg.get(header)
                    if isinstance(val, Header):
                        problem_files.append(member.name)
                        break

            except Exception as e:
                logger.debug(f"Error checking {member.name}: {e}")

    logger.info(f"Found {len(problem_files)} emails with Header objects")
    return problem_files


def reprocess_emails(tarball_path: str, file_list: list, output_file: str):
    """
    Re-extract specific emails using the fixed parser.

    Args:
        tarball_path: Path to tarball
        file_list: List of file paths to re-extract
        output_file: Output JSON file for re-extracted emails
    """
    logger.info(f"Re-extracting {len(file_list)} emails...")

    parser = EmailParser()
    results = []

    with tarfile.open(tarball_path, 'r:gz') as tar:
        for idx, file_path in enumerate(file_list, 1):
            if idx % 100 == 0:
                logger.info(f"Re-extracted {idx:,} / {len(file_list):,} emails")

            try:
                member = tar.getmember(file_path)
                f = tar.extractfile(member)
                if f is None:
                    continue

                content = f.read()
                parsed = parser.parse_email_file(content, file_path)

                if parsed:
                    results.append(parsed)

            except Exception as e:
                logger.error(f"Error re-extracting {file_path}: {e}")

    # Write results
    output_path = Path(output_file)
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    logger.info(f"Wrote {len(results)} re-extracted emails to {output_path}")
    parser.print_stats()

    return results


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Re-extract failed emails')
    parser.add_argument(
        '--tarball',
        default='enron_mail_20150507.tar.gz',
        help='Path to tarball'
    )
    parser.add_argument(
        '--output',
        default='extracted_data/emails_batch_reprocessed.json',
        help='Output file for re-extracted emails'
    )
    parser.add_argument(
        '--scan',
        action='store_true',
        help='Scan for problem emails (slow, for diagnosis only)'
    )
    parser.add_argument(
        '--file-list',
        help='File containing list of paths to re-extract (one per line)'
    )

    args = parser.parse_args()

    if args.scan:
        problem_files = find_header_object_emails(args.tarball)
        # Save the list
        with open('problem_emails.txt', 'w') as f:
            f.write('\n'.join(problem_files))
        logger.info(f"Saved problem file list to problem_emails.txt")

        # Re-extract them
        if problem_files:
            reprocess_emails(args.tarball, problem_files, args.output)

    elif args.file_list:
        with open(args.file_list, 'r') as f:
            file_list = [line.strip() for line in f if line.strip()]
        reprocess_emails(args.tarball, file_list, args.output)

    else:
        logger.error("Either --scan or --file-list must be provided")
        return 1


if __name__ == '__main__':
    main()
