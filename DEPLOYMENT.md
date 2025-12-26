# Enron Email Visualization - Deployment Guide

Complete guide for deploying to Digital Ocean Droplet.

## Prerequisites

- **Digital Ocean Account**
- **Domain name** pointed to your droplet's IP
- **Droplet Requirements:**
  - **Minimum:** 4GB RAM, 2 CPUs, 80GB SSD
  - **Recommended:** 8GB RAM, 4 CPUs, 160GB SSD
  - **OS:** Ubuntu 22.04 LTS

## Part 1: Digital Ocean Droplet Setup

### 1.1 Create a Droplet

1. Log in to Digital Ocean
2. Click **Create** → **Droplets**
3. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic ($24/mo - 4GB RAM recommended)
   - **Datacenter:** Closest to your users
   - **Authentication:** SSH keys (recommended) or Password
4. **Hostname:** enron-email-viz
5. Click **Create Droplet**

### 1.2 Configure DNS

1. In your domain registrar, add an **A Record**:
   ```
   Type: A
   Host: @ (or your subdomain)
   Value: YOUR_DROPLET_IP
   TTL: 3600
   ```

2. Wait 5-10 minutes for DNS propagation
3. Verify: `dig yourdomain.com`

### 1.3 Initial Server Setup

SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

Update system:
```bash
apt update && apt upgrade -y
```

Install required software:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Install Git
apt install git -y

# Verify installations
docker --version
docker compose version
git --version
```

Configure firewall:
```bash
# Install UFW
apt install ufw -y

# Configure firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
ufw status
```

## Part 2: Application Deployment

### 2.1 Clone Repository

```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/enron.git
cd enron/backend
```

### 2.2 Configure Environment

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit configuration
nano .env.production
```

Configure these variables:
```bash
# Strong password for PostgreSQL
POSTGRES_PASSWORD=YourSecurePasswordHere123!

# Your domain (no http:// or https://)
VITE_API_URL=https://yourdomain.com
DOMAIN=yourdomain.com

# Your email for SSL certificates
EMAIL=your-email@example.com
```

Save and exit (`Ctrl+X`, then `Y`, then `Enter`)

### 2.3 Upload Database Data

**Option A: From local machine (recommended)**
```bash
# On your local machine, compress the database
docker exec enron_postgres pg_dump -U enron enron_emails | gzip > enron_db_backup.sql.gz

# Upload to droplet
scp enron_db_backup.sql.gz root@YOUR_DROPLET_IP:/opt/enron/backend/
```

**Option B: Re-run extraction on droplet**
```bash
# Upload tarball and extraction script
scp enron_mail_20150507.tar.gz extract_emails.py load_to_postgres.py root@YOUR_DROPLET_IP:/opt/enron/backend/
```

### 2.4 Run Deployment

```bash
cd /opt/enron/backend
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. ✅ Validate configuration
2. ✅ Build Docker images
3. ✅ Start services (PostgreSQL, Redis, Backend, Frontend)
4. ✅ Obtain SSL certificate from Let's Encrypt
5. ✅ Configure Nginx reverse proxy

### 2.5 Restore Database (if uploaded backup)

```bash
# Wait for PostgreSQL to be ready
docker exec enron_postgres_prod pg_isready -U enron

# Restore database
gunzip < enron_db_backup.sql.gz | docker exec -i enron_postgres_prod psql -U enron -d enron_emails

# Verify data
docker exec enron_postgres_prod psql -U enron -d enron_emails -c "SELECT COUNT(*) FROM messages;"
```

Expected output: `517401` messages

## Part 3: Verification

### 3.1 Check Services

```bash
# View all containers
docker compose -f docker-compose.prod.yml ps

# Should show all services as "Up" and "healthy"
```

### 3.2 Check Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs

# Specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs nginx
```

### 3.3 Test Application

1. **Open browser:** `https://yourdomain.com`
2. **Check SSL:** Green padlock should appear
3. **Test features:**
   - Dashboard loads
   - Search works
   - Thread explorer functions
   - Network visualization renders

### 3.4 Monitor Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check Docker stats
docker stats
```

## Part 4: Maintenance

### 4.1 Database Backups

Manual backup:
```bash
docker exec enron_postgres_prod pg_dump -U enron enron_emails | gzip > /opt/backups/enron_$(date +%Y%m%d_%H%M%S).sql.gz
```

Automated backups (cron):
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * docker exec enron_postgres_prod pg_dump -U enron enron_emails | gzip > /opt/backups/enron_$(date +\%Y\%m\%d).sql.gz && find /opt/backups -name "enron_*.sql.gz" -mtime +7 -delete
```

### 4.2 View Logs

```bash
# Live logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

### 4.3 Restart Services

```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### 4.4 Update Application

```bash
cd /opt/enron/backend
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

### 4.5 SSL Certificate Renewal

Certificates auto-renew via certbot container. To manually renew:
```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

## Part 5: Monitoring & Optimization

### 5.1 Set Up Monitoring (Optional)

**Install monitoring tools:**
```bash
apt install htop iotop nethogs -y
```

**Monitor resources:**
```bash
htop           # CPU/Memory
iotop          # Disk I/O
nethogs        # Network
```

### 5.2 PostgreSQL Performance

**Check database size:**
```bash
docker exec enron_postgres_prod psql -U enron -d enron_emails -c "
SELECT
    pg_size_pretty(pg_database_size('enron_emails')) as db_size,
    pg_size_pretty(pg_total_relation_size('messages')) as messages_size;
"
```

**Check query performance:**
```bash
docker exec enron_postgres_prod psql -U enron -d enron_emails -c "
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

### 5.3 Redis Cache Stats

```bash
docker exec enron_redis_prod redis-cli INFO stats
```

## Troubleshooting

### Issue: SSL Certificate Fails

**Solution:**
1. Ensure DNS is properly configured: `dig yourdomain.com`
2. Check firewall allows port 80: `ufw status`
3. Verify nginx is running: `docker ps | grep nginx`
4. Try manual certificate:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm certbot certonly --webroot \
     --webroot-path /var/www/certbot \
     --email your-email@example.com \
     --agree-tos \
     -d yourdomain.com
   ```

### Issue: Out of Memory

**Solution:**
1. Check memory usage: `free -h`
2. Add swap space:
   ```bash
   fallocate -l 4G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
   ```

### Issue: Database Connection Failed

**Solution:**
1. Check PostgreSQL: `docker logs enron_postgres_prod`
2. Verify credentials in `.env.production`
3. Restart PostgreSQL: `docker compose -f docker-compose.prod.yml restart postgres`

### Issue: Slow Performance

**Solution:**
1. Check Redis cache hit rate
2. Verify indexes on database
3. Scale up droplet resources
4. Enable gzip compression (already configured in nginx)

## Security Best Practices

1. **Change default passwords** - Use strong, unique passwords
2. **Keep system updated** - Run `apt update && apt upgrade` weekly
3. **Monitor logs** - Check for suspicious activity
4. **Backup regularly** - Automated daily backups recommended
5. **Use SSH keys** - Disable password authentication
6. **Enable fail2ban** - Prevent brute force attacks:
   ```bash
   apt install fail2ban -y
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

## Cost Estimate

**Monthly Costs:**
- Droplet (4GB): $24/month
- Backup storage (optional): $1-5/month
- Domain (annual): ~$12/year = $1/month

**Total: ~$25-30/month**

## Support

- **GitHub Issues:** https://github.com/YOUR_USERNAME/enron/issues
- **Digital Ocean Docs:** https://docs.digitalocean.com/
- **Docker Docs:** https://docs.docker.com/

---

**Deployment completed! 🎉**

Your Enron Email Visualization is now live at `https://yourdomain.com`
