# Enron Email Dataset - PostgreSQL Graph Database

A complete pipeline for extracting, processing, and analyzing the Enron email corpus as a graph database in PostgreSQL.

## ⚠️ Security Notice

**This configuration is for LOCAL DEVELOPMENT ONLY!**

The default passwords in `docker-compose.yml` and `.env.example` are publicly visible and should **NEVER** be used in production environments. Before deploying to production:

- Change all default passwords
- Use environment variables or secrets management (e.g., Docker Secrets, AWS Secrets Manager)
- Enable SSL/TLS for database connections
- Configure proper firewall rules
- Review and harden all security settings

## 📊 Dataset Overview

The Enron email dataset contains **517,401 emails** from the Federal Energy Regulatory Commission's investigation, representing one of the largest publicly available email corpora for research and analysis.

**Database Statistics:**
- **Messages:** 517,401 emails
- **People:** 87,402 unique email addresses
- **Recipients:** 4,222,037 total (to/cc/bcc relationships)
- **Threads:** 127,144 conversation threads
- **Date Range:** 1979-12-31 to 2044-01-04

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.8+
- 5GB+ free disk space

### 1. Clone and Setup

```bash
git clone <your-repo>
cd enron

# Copy environment template
cp .env.example .env

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Start PostgreSQL

```bash
# Start the database
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

### 3. Extract Emails from Tarball

```bash
# Extract all emails to JSON (takes ~3 minutes)
python3 extract_emails.py --tarball enron_mail_20150507.tar.gz
```

### 4. Load into PostgreSQL

```bash
# Load all data (takes ~3.5 hours)
python3 load_to_postgres.py --data-dir extracted_data
```

### 5. Connect and Query

**Using psql:**
```bash
docker-compose exec postgres psql -U enron -d enron_emails
```

**Using DataGrip/pgAdmin:**
- Host: `localhost`
- Port: `5434`
- Database: `enron_emails`
- User: `enron`
- Password: `enron_dev_password`

## 📁 Project Structure

```
enron/
├── extract_emails.py          # Extract emails from tarball to JSON
├── load_to_postgres.py        # Load JSON into PostgreSQL
├── reprocess_failed_emails.py # Recovery tool for failed extractions
├── schema.sql                 # Database schema with indexes & views
├── example_queries.sql        # Sample analytical queries
├── docker-compose.yml         # PostgreSQL & pgAdmin services
├── init_db.sh                 # Database initialization script
├── Makefile                   # Common commands
├── requirements.txt           # Python dependencies
├── .env.example               # Environment configuration template
├── extracted_data/            # JSON batch files (created during extraction)
└── GETTING_STARTED.md        # Detailed setup guide
```

## 🗄️ Database Schema

### Core Tables

**people** - Unique email addresses
- `id`, `email`, `name`
- `sent_count`, `received_count`
- `first_seen_at`, `last_seen_at`

**messages** - Email messages
- `id`, `message_id`, `from_person_id`
- `subject`, `body`, `date`, `timestamp`
- `in_reply_to`, `thread_id`
- `mailbox_owner`, `folder_name`
- X-headers (Enron-specific metadata)

**message_recipients** - To/CC/BCC relationships
- `message_id`, `person_id`, `recipient_type`

**message_references** - Email threading
- `message_id`, `referenced_message_id`, `reference_order`

**threads** - Conversation groupings
- `id`, `root_message_id`, `subject_normalized`
- `participant_count`, `message_count`
- `start_date`, `end_date`

### Views

- `v_message_details` - Messages with sender info
- `v_thread_stats` - Thread statistics
- `v_email_network` - Person-to-person email frequency

### Functions

- `normalize_subject(text)` - Normalize subject for threading
- `get_thread_depth(msg_id)` - Calculate thread depth
- `get_thread_participants(thread_id)` - Get thread participants

## 📝 Example Queries

### Most Active Email Senders
```sql
SELECT
    email,
    name,
    sent_count,
    received_count
FROM people
ORDER BY sent_count DESC
LIMIT 10;
```

### Largest Email Threads
```sql
SELECT
    subject_normalized,
    message_count,
    participant_count,
    start_date,
    end_date
FROM v_thread_stats
ORDER BY message_count DESC
LIMIT 10;
```

### Email Network Analysis
```sql
SELECT
    from_email,
    to_email,
    email_count,
    first_email,
    last_email
FROM v_email_network
WHERE recipient_type = 'to'
ORDER BY email_count DESC
LIMIT 20;
```

### Messages by Time Period
```sql
SELECT
    DATE_TRUNC('month', date) as month,
    COUNT(*) as email_count
FROM messages
WHERE date IS NOT NULL
GROUP BY month
ORDER BY month;
```

See `example_queries.sql` for more examples.

## 🛠️ Makefile Commands

```bash
make init          # Initialize database
make extract       # Extract emails from tarball
make load          # Load data into PostgreSQL
make full-load     # Extract + Load (complete pipeline)
make psql          # Connect to database
make status        # Check database status
make clean         # Remove extracted data
make reset         # Reset database (WARNING: deletes all data)
```

## 🐛 Troubleshooting

### Issue: Extraction Errors with Header Objects

**Problem:** `'Header' object has no attribute 'strip'`

**Solution:** The extraction script handles this automatically by converting Header objects to strings. If you encounter this, ensure you're using the latest version of `extract_emails.py`.

### Issue: PostgreSQL tsvector Size Limit

**Problem:** `string is too long for tsvector (max 1048575 bytes)`

**Solution:** The schema.sql has disabled full-text search indexes on the body field to avoid this limitation. These can be added later with filtered content if needed.

### Issue: Slow Loading Performance

**Optimization Tips:**
- Ensure Docker has adequate resources (4GB+ RAM recommended)
- Loading is I/O intensive; SSD storage recommended
- Process runs fastest with minimal other database activity

### Issue: Database Connection Refused

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart if needed
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

## 📈 Performance Metrics

**Extraction Phase:**
- **Time:** ~3 minutes
- **Output:** 518 JSON batch files (~1.8GB total)
- **Speed:** ~3,000 emails/second

**Loading Phase:**
- **Time:** ~3.5 hours
- **Speed:** ~2,500-6,000 messages/minute
- **Peak Memory:** ~500MB

**Database Size:**
- **Total:** ~4-5GB (including indexes)
- **Messages table:** ~2.5GB
- **Recipients table:** ~1GB
- **Indexes:** ~1.5GB

## 🔍 Data Quality

### Issues Resolved

1. **Header Object Errors:** 90 emails had Header objects instead of strings - fixed with automatic conversion
2. **Missing Message IDs:** Generated fallback IDs for emails without Message-ID headers
3. **Date Parsing:** Handled malformed dates gracefully with null values
4. **Large Email Bodies:** Disabled tsvector indexes to support emails >1MB

### Data Completeness

- **Total emails in tarball:** 517,401
- **Successfully extracted:** 517,401 (100%)
- **Successfully loaded:** 517,401 (100%)
- **Data loss:** 0%

## 📚 Additional Resources

- **Dataset Source:** [FERC Enron Investigation](https://www.ferc.gov/industries-data/electric/industry-activities/market-manipulation/enron)
- **Original Research:** [CMU Enron Email Dataset](https://www.cs.cmu.edu/~enron/)
- **Docker Documentation:** [PostgreSQL on Docker](https://hub.docker.com/_/postgres)

## 🤝 Contributing

Contributions welcome! Areas for enhancement:

- Additional analytical queries
- Performance optimizations
- Alternative loading strategies
- Graph visualization tools
- Machine learning integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The Enron email dataset itself is public domain data released by the Federal Energy Regulatory Commission (FERC). The MIT License applies to the code, scripts, schema, and documentation in this repository, not to the underlying email dataset.

## 🙏 Acknowledgments

- Federal Energy Regulatory Commission (FERC)
- Carnegie Mellon University (CMU)
- Original dataset curators and researchers
