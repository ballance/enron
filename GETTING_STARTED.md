# Getting Started with Enron Email Graph

This guide will walk you through extracting the full Enron dataset and building the conversation graph.

## Prerequisites

- Docker installed and running
- Python 3.7+ with pip
- ~5GB free disk space (for full extraction and database)

## Step-by-Step Setup

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- `psycopg2-binary` - PostgreSQL adapter
- `python-dateutil` - Date parsing
- `python-dotenv` - Environment configuration

### 2. Start the Database

```bash
make start
```

This will:
- Create a `.env` file with database credentials
- Start PostgreSQL in a Docker container on port **5434**
- Initialize the schema automatically (tables, indexes, views, functions)
- Wait for the database to be ready

**Verify it's running:**
```bash
docker-compose ps
# Should show: enron_postgres (healthy)
```

### 3. Extract the Full Dataset

```bash
make extract-all
```

This will:
- Read through the 423MB tarball
- Parse ~517,000 email files
- Output batched JSON files to `extracted_data/`
- Take approximately 10-15 minutes

**Progress will be logged:**
```
2025-12-07 10:00:00 - INFO - Found 517401 email files
2025-12-07 10:01:00 - INFO - Processed 10,000 / 517,401 emails
2025-12-07 10:02:00 - INFO - Processed 20,000 / 517,401 emails
...
```

**Test with a smaller sample first:**
```bash
make extract  # Only extracts 1,000 emails
```

### 4. Load into PostgreSQL

```bash
make load
```

This will:
- Read all JSON batch files
- Create person records (deduplicated by email)
- Insert messages with all metadata
- Create recipient relationships (to/cc/bcc)
- Build conversation threads by subject
- Update aggregate statistics
- Take approximately 20-30 minutes for full dataset

**Progress will be logged:**
```
2025-12-07 10:15:00 - INFO - Loading batch: extracted_data/emails_batch_0000.json
2025-12-07 10:15:01 - INFO - Batch complete. Progress: 1,000 messages, 450 people
...
2025-12-07 10:40:00 - INFO - Building conversation threads...
2025-12-07 10:40:15 - INFO - Created 15,234 threads by subject
```

### 5. Explore the Data

**Connect to the database:**
```bash
make psql
```

**Run a simple query:**
```sql
-- See overall statistics
SELECT
    (SELECT COUNT(*) FROM people) as total_people,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(*) FROM threads) as total_threads;
```

**Find the most active emailers:**
```sql
SELECT email, sent_count, received_count
FROM people
ORDER BY sent_count DESC
LIMIT 10;
```

**Explore conversation threads:**
```sql
SELECT subject_normalized, message_count, participant_count
FROM threads
ORDER BY message_count DESC
LIMIT 10;
```

**View the email network:**
```sql
SELECT * FROM v_email_network
ORDER BY email_count DESC
LIMIT 20;
```

## Next Steps

### Run Example Queries

The `example_queries.sql` file contains 50+ queries organized by category:

```bash
# From psql:
\i example_queries.sql

# Or run specific sections:
\copy (
  SELECT * FROM v_email_network
  ORDER BY email_count DESC
) TO '/tmp/email_network.csv' CSV HEADER
```

### Query Categories in example_queries.sql:

1. **Basic Statistics** - Dataset overview, active users
2. **Conversation Threads** - Thread analysis, participants
3. **Email Network Analysis** - Who emails whom, mutual relationships
4. **Reply Chains** - Recursive thread reconstruction
5. **Temporal Analysis** - Volume by time, day, hour
6. **Content Search** - Full-text search with ranking
7. **Social Network Metrics** - Centrality, brokers, communities
8. **Mailbox Analysis** - Per-user statistics
9. **Advanced Graph Queries** - Shortest paths, communities

### Useful Database Commands

```bash
# View table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

# See all indexes
\di

# See all views
\dv

# See all functions
\df

# Explain query performance
EXPLAIN ANALYZE
SELECT * FROM v_email_network
WHERE email_count > 10;
```

## Common Workflows

### Development Workflow

```bash
# 1. Extract sample for testing
make extract

# 2. Load into database
make load

# 3. Try queries
make psql

# 4. Reset and try again
make reset
make start
```

### Full Dataset Workflow

```bash
# One command to do everything
make pipeline

# Or step by step:
make start
make extract-all    # ~10-15 min
make load          # ~20-30 min
make psql
```

### Exploration Workflow

```bash
# Connect to database
make psql

# Load example queries
\i example_queries.sql

# Run queries interactively
SELECT * FROM people WHERE sent_count > 100;

# Export results
\copy (SELECT * FROM v_thread_stats) TO '/tmp/threads.csv' CSV HEADER

# Exit
\q
```

## Troubleshooting

### Port Conflicts

If port 5434 is already in use, edit:
- `docker-compose.yml` - change port mapping
- `.env` - change `POSTGRES_PORT`

Then restart:
```bash
docker-compose down
docker-compose up -d postgres
```

### Out of Disk Space

The full dataset requires:
- **423MB** - Original tarball
- **2-3GB** - Extracted JSON files
- **1-2GB** - PostgreSQL database

To free space after loading:
```bash
make clean  # Removes extracted_data/ folder
```

### Slow Loading

Loading can be optimized by:
1. Increasing batch size in extraction
2. Disabling thread building initially:
   ```bash
   python3 load_to_postgres.py --skip-threads
   ```
3. Building threads separately later

### Database Connection Issues

If you can't connect:
```bash
# Check if container is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

## Database Management

### Backup

```bash
# Backup entire database
docker-compose exec postgres pg_dump -U enron enron_emails > backup.sql

# Backup just data
docker-compose exec postgres pg_dump -U enron -a enron_emails > data.sql
```

### Restore

```bash
# From backup
docker-compose exec -T postgres psql -U enron enron_emails < backup.sql
```

### Reset Database

```bash
# Complete reset (deletes all data)
make reset

# Then restart
make start
```

## Performance Tips

1. **Indexes are already optimized** - The schema includes all necessary indexes
2. **Use EXPLAIN ANALYZE** - Check query plans for slow queries
3. **Materialized views** - Consider creating for frequently-run aggregations
4. **Vacuum regularly** - After large data loads:
   ```sql
   VACUUM ANALYZE;
   ```

## What's Next?

Now that you have the data loaded, you can:

1. **Analyze social networks** - Find communities, influencers, information brokers
2. **Study communication patterns** - Temporal analysis, response times
3. **Build visualizations** - Export to NetworkX, D3.js, Gephi
4. **Machine learning** - Email classification, sender identification, anomaly detection
5. **Custom analysis** - Write your own queries for specific research questions

## Resources

- **Schema Documentation**: See comments in `schema.sql`
- **Example Queries**: `example_queries.sql`
- **Main README**: `README.md`
- **Original Dataset**: https://www.cs.cmu.edu/~enron/

## Support

If you encounter issues:
1. Check Docker logs: `docker-compose logs postgres`
2. Check Python logs: Error output from scripts
3. Verify database connection: `make psql`

Happy analyzing! 📊
