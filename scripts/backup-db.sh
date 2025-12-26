#!/bin/bash

# Database Backup Script for Enron Email Visualization

set -e

BACKUP_DIR="/opt/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/enron_$TIMESTAMP.sql.gz"
RETENTION_DAYS=7

echo "🗄️  Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo "📦 Creating backup: $BACKUP_FILE"
docker exec enron_postgres_prod pg_dump -U enron enron_emails | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo "✅ Backup completed successfully: $SIZE"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Remove old backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "enron_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 $BACKUP_DIR/enron_*.sql.gz 2>/dev/null | wc -l)
echo "📊 Backups remaining: $REMAINING"

# List recent backups
echo ""
echo "Recent backups:"
ls -lh $BACKUP_DIR/enron_*.sql.gz | tail -5

echo ""
echo "✅ Backup process completed!"
