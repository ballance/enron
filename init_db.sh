#!/bin/bash
# Initialize Enron email database

set -e  # Exit on error

DB_NAME="${1:-enron_emails}"
DB_USER="${2:-$USER}"

echo "Initializing Enron email database..."
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if PostgreSQL is running
if ! pg_isready > /dev/null 2>&1; then
    echo "Error: PostgreSQL is not running"
    echo "Start it with: brew services start postgresql (macOS)"
    exit 1
fi

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Warning: Database '$DB_NAME' already exists"
    read -p "Do you want to drop and recreate it? (yes/no): " -r
    echo
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Dropping existing database..."
        dropdb "$DB_NAME" || true
    else
        echo "Aborted."
        exit 1
    fi
fi

# Create database
echo "Creating database '$DB_NAME'..."
createdb "$DB_NAME"

# Run schema
echo "Creating schema..."
psql -d "$DB_NAME" -f schema.sql

echo ""
echo "✓ Database initialized successfully!"
echo ""
echo "Connect with:"
echo "  psql $DB_NAME"
echo ""
echo "Next steps:"
echo "  1. Run extraction: python3 extract_emails.py --limit 1000"
echo "  2. Load data: python3 load_to_postgres.py"
