#!/usr/bin/env python3
"""
Process all downloaded EDRM ZIP files: extract attachments and load to database.

This script:
1. Finds all downloaded EDRM ZIP files
2. Extracts attachments from each (skipping already processed)
3. Loads attachments into the database
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime


def get_processed_files(output_dir: Path) -> set:
    """Get set of already processed ZIP files."""
    processed_file = output_dir / "processed_zips.json"
    if processed_file.exists():
        with open(processed_file) as f:
            return set(json.load(f))
    return set()


def save_processed_files(output_dir: Path, processed: set):
    """Save set of processed ZIP files."""
    processed_file = output_dir / "processed_zips.json"
    with open(processed_file, "w") as f:
        json.dump(list(processed), f, indent=2)


def run_extraction(zip_files: list, output_dir: str, verbose: bool = False) -> bool:
    """Run the extraction script on ZIP files."""
    if not zip_files:
        return True

    cmd = [
        sys.executable,
        "extract_edrm_attachments.py",
        *zip_files,
        "-o", output_dir,
    ]
    if verbose:
        cmd.append("-v")

    print(f"\nExtracting from {len(zip_files)} ZIP files...")
    result = subprocess.run(cmd)
    return result.returncode == 0


def run_loading(emails_json: str, attachments_json: str, verbose: bool = False) -> bool:
    """Run the loading script."""
    cmd = [
        sys.executable,
        "load_edrm_attachments.py",
        "--emails-json", emails_json,
        "--attachments-json", attachments_json,
    ]
    if verbose:
        cmd.append("-v")

    print("\nLoading attachments into database...")
    result = subprocess.run(cmd)
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(
        description="Process all EDRM ZIP files"
    )
    parser.add_argument(
        "--input-dir",
        default="pst_data/edrm",
        help="Directory containing EDRM ZIP files"
    )
    parser.add_argument(
        "--output-dir",
        default="extracted_edrm_data",
        help="Output directory for extracted data"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Number of ZIP files to process per batch"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force reprocessing of all files"
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Find all ZIP files
    zip_files = sorted(input_dir.glob("*.zip"))
    print(f"Found {len(zip_files)} ZIP files in {input_dir}")

    if not zip_files:
        print("No ZIP files found. Run download_edrm.sh first.")
        return

    # Get already processed files
    if args.force:
        processed = set()
    else:
        processed = get_processed_files(output_dir)
        print(f"Already processed: {len(processed)} files")

    # Filter to unprocessed files
    to_process = [f for f in zip_files if f.name not in processed]
    print(f"To process: {len(to_process)} files")

    if not to_process:
        print("All files already processed. Use --force to reprocess.")
        return

    # Process in batches
    total_batches = (len(to_process) + args.batch_size - 1) // args.batch_size

    for batch_num in range(total_batches):
        start_idx = batch_num * args.batch_size
        end_idx = min(start_idx + args.batch_size, len(to_process))
        batch = to_process[start_idx:end_idx]

        print(f"\n{'='*60}")
        print(f"Batch {batch_num + 1}/{total_batches}")
        print(f"Processing {len(batch)} files: {batch[0].name} to {batch[-1].name}")
        print(f"{'='*60}")

        # Extract
        if run_extraction([str(f) for f in batch], args.output_dir, args.verbose):
            # Load
            emails_json = str(output_dir / "edrm_emails.json")
            attachments_json = str(output_dir / "edrm_attachments.json")

            if run_loading(emails_json, attachments_json, args.verbose):
                # Mark as processed
                for f in batch:
                    processed.add(f.name)
                save_processed_files(output_dir, processed)
                print(f"\nBatch {batch_num + 1} complete. Total processed: {len(processed)}")
            else:
                print(f"Loading failed for batch {batch_num + 1}")
        else:
            print(f"Extraction failed for batch {batch_num + 1}")

    print(f"\n{'='*60}")
    print("Processing complete!")
    print(f"Total ZIP files processed: {len(processed)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
