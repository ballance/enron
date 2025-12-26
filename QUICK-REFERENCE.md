# Quick Reference - Enron Email Visualization

## Common Commands

### Service Management

```bash
# View all services
docker compose -f docker-compose.prod.yml ps

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Logs

```bash
# View all logs (live)
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs nginx
docker compose -f docker-compose.prod.yml logs postgres

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Database

```bash
# Connect to PostgreSQL
docker exec -it enron_postgres_prod psql -U enron -d enron_emails

# Backup database
./scripts/backup-db.sh

# Restore from backup
gunzip < backup.sql.gz | docker exec -i enron_postgres_prod psql -U enron -d enron_emails

# Check database size
docker exec enron_postgres_prod psql -U enron -d enron_emails -c "
  SELECT pg_size_pretty(pg_database_size('enron_emails'));
"

# Count messages
docker exec enron_postgres_prod psql -U enron -d enron_emails -c "
  SELECT COUNT(*) FROM messages;
"
```

### Updates

```bash
# Update code
cd /opt/enron/backend
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### SSL Certificates

```bash
# Manual renewal
docker compose -f docker-compose.prod.yml run --rm certbot renew

# Restart nginx after renewal
docker compose -f docker-compose.prod.yml restart nginx

# Check certificate expiry
docker exec enron_nginx_prod openssl x509 -in /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem -noout -dates
```

### Monitoring

```bash
# System resources
htop

# Docker container stats
docker stats

# Disk usage
df -h

# Redis stats
docker exec enron_redis_prod redis-cli INFO stats

# Nginx access logs
docker exec enron_nginx_prod tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec enron_nginx_prod tail -f /var/log/nginx/error.log
```

### Troubleshooting

```bash
# Check service health
docker compose -f docker-compose.prod.yml ps

# View container details
docker inspect enron_backend_prod

# Execute commands in container
docker exec -it enron_backend_prod sh

# Check network connectivity
docker network ls
docker network inspect enron_default

# Rebuild everything from scratch
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

## Important Files

- **Configuration:** `/opt/enron/backend/.env.production`
- **Backups:** `/opt/backups/`
- **Logs:** `docker compose -f docker-compose.prod.yml logs`
- **SSL Certs:** `/opt/enron/backend/certbot/conf/`

## URLs

- **Application:** `https://yourdomain.com`
- **API:** `https://yourdomain.com/api/`
- **Health Check:** `https://yourdomain.com/api/health`

## Emergency Contacts

- **Digital Ocean Status:** https://status.digitalocean.com/
- **Let's Encrypt Status:** https://letsencrypt.status.io/

## Performance Optimization

```bash
# Clear Redis cache
docker exec enron_redis_prod redis-cli FLUSHALL

# Analyze slow queries
docker exec enron_postgres_prod psql -U enron -d enron_emails -c "
  SELECT query, calls, total_exec_time, mean_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Vacuum database
docker exec enron_postgres_prod psql -U enron -d enron_emails -c "VACUUM ANALYZE;"
```

## Scheduled Tasks

Add to crontab: `crontab -e`

```bash
# Daily backup at 2 AM
0 2 * * * /opt/enron/backend/scripts/backup-db.sh >> /var/log/enron-backup.log 2>&1

# Weekly database vacuum (Sunday 3 AM)
0 3 * * 0 docker exec enron_postgres_prod psql -U enron -d enron_emails -c "VACUUM ANALYZE;" >> /var/log/enron-vacuum.log 2>&1

# Monthly log cleanup
0 4 1 * * find /var/log -name "enron-*.log" -mtime +30 -delete
```
