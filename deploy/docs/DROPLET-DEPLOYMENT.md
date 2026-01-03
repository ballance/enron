# Enron Email - DigitalOcean Droplet Deployment Guide

Complete guide for deploying the Enron Email visualization app to a DigitalOcean Droplet using AWS ECR.

## Architecture Overview

**Build locally → Push to AWS ECR → Deploy on Droplet**

- **Cost**: ~$12/month (DigitalOcean) + ~$1/month (AWS ECR)
- **Build time**: ~5 minutes (local)
- **Deployment time**: ~2 minutes (droplet)

## Prerequisites

### On Your Local Machine
- [x] Docker Desktop installed
- [x] AWS CLI installed (`aws --version`)
- [x] AWS account with ECR access
- [x] DigitalOcean Droplet (2GB RAM minimum)

### Droplet Info
- **IP**: `YOUR_DROPLET_IP` (replace with your actual droplet IP)
- **Size**: 2GB RAM, 50GB SSD ($12/month)
- **OS**: Ubuntu 22.04

## Security Best Practices

### SSH Access
- **Use SSH keys only** - disable password authentication
- **Create a non-root user** with sudo privileges instead of using root directly
- **Configure firewall** (ufw) to only allow ports 22, 80, 443
- **Consider changing SSH port** from default 22
- **Use SSH key passphrases** for additional security

### Credential Management
- **Never commit secrets** to git - they're already in `.gitignore`
- **Store passwords securely** in a password manager (1Password, LastPass, AWS Secrets Manager)
- **Rotate database passwords** periodically
- **Use AWS IAM roles** when possible instead of access keys

### Network Security
- **Enable DigitalOcean Cloud Firewall** to restrict SSH access to your IP only
- **Use SSL/TLS** with Let's Encrypt for production deployments
- **Consider VPN access** for administrative tasks instead of exposing SSH publicly

### Monitoring
- **Enable DigitalOcean Monitoring** (free) for resource usage alerts
- **Set up log monitoring** for suspicious activity
- **Configure automated backups** (see Optional: Enable Backups section)
- **Monitor ECR for unauthorized image pushes**

### Example: Create Non-Root User

```bash
# On droplet (as root)
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy

# Copy SSH keys
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test login (from local machine)
ssh deploy@YOUR_DROPLET_IP

# Disable root SSH login (optional but recommended)
# Edit /etc/ssh/sshd_config: PermitRootLogin no
# Then: systemctl restart sshd
```

## Step 1: AWS Setup (Local Machine)

### 1.1 Install AWS CLI (if not installed)

**macOS:**
```bash
brew install awscli
```

**Linux/Windows:**
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

### 1.2 Configure AWS Credentials

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `us-east-1`
- Default output format: `json`

**Note**: You'll need an IAM user with `AmazonEC2ContainerRegistryFullAccess` policy.

### 1.3 Verify AWS Connection

```bash
aws sts get-caller-identity
```

Should show your AWS account ID.

## Step 2: Build & Push to ECR (Local Machine)

### 2.1 Run the Build Script

```bash
cd /Users/ballance/home/code/enron
./build-and-push-ecr.sh
```

This script will:
- ✅ Create ECR repositories
- ✅ Build backend Docker image
- ✅ Build frontend Docker image
- ✅ Push both images to ECR
- ✅ Generate deployment files
- ✅ Generate secure PostgreSQL password

**Build time**: ~5 minutes

### 2.2 Save the PostgreSQL Password

The script outputs a password at the end - **save this somewhere safe!**

## Step 3: Copy Files to Droplet

### 3.1 Copy Deployment Files

```bash
# Copy deployment configuration
scp docker-compose.droplet.yml .env.droplet nginx-simple.conf root@YOUR_DROPLET_IP:/root/enron/

# Copy database schema
scp backend/schema.sql root@YOUR_DROPLET_IP:/root/enron/

# Copy droplet setup script
scp droplet-setup.sh root@YOUR_DROPLET_IP:/root/enron/
```

### 3.2 Copy Data Files (Optional - if you have data locally)

**Option A: If you have extracted_data locally**
```bash
# This will take 10-20 minutes (1.7GB)
rsync -avz --progress extracted_data root@YOUR_DROPLET_IP:/root/enron/
```

**Option B: If you have a PostgreSQL dump**
```bash
scp enron_backup.sql root@YOUR_DROPLET_IP:/root/enron/
```

**Option C: No data yet**
Skip this - you'll set up the empty database and can load data later.

## Step 4: Setup Droplet

### 4.1 SSH to Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

### 4.2 Run Setup Script

```bash
cd /root/enron
chmod +x droplet-setup.sh
./droplet-setup.sh
```

This installs:
- Docker
- AWS CLI
- Python (for data loading)

### 4.3 Configure AWS Credentials on Droplet

```bash
aws configure
```

**IMPORTANT**: Use the same credentials as your local machine.

### 4.4 Login to ECR

```bash
# Replace ACCOUNT_ID and REGION with your values
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

Example:
```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

## Step 5: Deploy Application

### 5.1 Pull Images from ECR

```bash
cd /root/enron
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml pull
```

### 5.2 Start Services

```bash
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml up -d
```

### 5.3 Check Status

```bash
docker-compose -f docker-compose.droplet.yml ps
```

All services should show "Up" status.

### 5.4 View Logs

```bash
# All services
docker-compose -f docker-compose.droplet.yml logs -f

# Specific service
docker-compose -f docker-compose.droplet.yml logs -f backend
```

## Step 6: Load Data

### 6.1 Install Python Dependencies

```bash
pip3 install psycopg2-binary python-dotenv
```

### 6.2 Load Data

**Option A: From extracted_data**
```bash
cd /root/enron
# Copy load script from local machine first
# Then run:
python3 load_to_postgres.py --data-dir extracted_data
```

**Option B: From PostgreSQL dump**
```bash
docker-compose -f docker-compose.droplet.yml exec postgres \
  psql -U enron -d enron_emails < enron_backup.sql
```

**Option C: Start with empty database**
The database is initialized with the schema - you can load data later.

## Step 7: Access Your App

Open your browser:
```
http://YOUR_DROPLET_IP
```

You should see the Enron Email visualization app!

## Maintenance

### View Logs
```bash
docker-compose -f docker-compose.droplet.yml logs -f [service]
```

### Restart Services
```bash
docker-compose -f docker-compose.droplet.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.droplet.yml down
```

### Update Application

**On local machine:**
```bash
./build-and-push-ecr.sh
```

**On droplet:**
```bash
cd /root/enron
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml pull
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml up -d
```

### Backup Database

```bash
# Create backup
docker-compose -f docker-compose.droplet.yml exec postgres \
  pg_dump -U enron enron_emails > backup-$(date +%Y%m%d).sql

# Download to local machine
scp root@YOUR_DROPLET_IP:/root/enron/backup-*.sql .
```

### Restore Database

```bash
# On droplet
docker-compose -f docker-compose.droplet.yml exec postgres \
  psql -U enron -d enron_emails < backup-YYYYMMDD.sql
```

## Troubleshooting

### Can't connect to app
```bash
# Check if services are running
docker-compose -f docker-compose.droplet.yml ps

# Check nginx logs
docker-compose -f docker-compose.droplet.yml logs nginx

# Check if port 80 is open
curl http://localhost
```

### Database connection errors
```bash
# Check postgres logs
docker-compose -f docker-compose.droplet.yml logs postgres

# Verify password in .env.droplet
cat .env.droplet

# Test database connection
docker-compose -f docker-compose.droplet.yml exec postgres \
  psql -U enron -d enron_emails -c "SELECT COUNT(*) FROM messages;"
```

### ECR pull errors
```bash
# Re-login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Verify credentials
aws sts get-caller-identity
```

### Out of disk space
```bash
# Clean up old images
docker system prune -a

# Check disk usage
df -h
```

## Cost Breakdown

| Service | Cost |
|---------|------|
| DigitalOcean Droplet (2GB) | $12/month |
| AWS ECR (2 images, ~500MB) | ~$1/month |
| **Total** | **~$13/month** |

## Next Steps

### Optional: Add a Domain

1. Point domain to `YOUR_DROPLET_IP`
2. Update `docker-compose.droplet.yml` with domain
3. Add SSL with Let's Encrypt (see `backend/deploy.sh` for example)

### Optional: Enable Backups

Add to crontab on droplet:
```bash
0 2 * * * cd /root/enron && docker-compose -f docker-compose.droplet.yml exec postgres pg_dump -U enron enron_emails > /root/backups/enron-$(date +\%Y\%m\%d).sql
```

### Optional: Monitoring

Add monitoring with:
- Uptime Robot (free)
- DigitalOcean Monitoring (free)
- Prometheus + Grafana (self-hosted)

## Support

If you encounter issues:
1. Check logs: `docker-compose -f docker-compose.droplet.yml logs`
2. Verify services are running: `docker-compose -f docker-compose.droplet.yml ps`
3. Check disk space: `df -h`
4. Review this guide again

---

**Deployment created**: $(date)
**Droplet IP**: YOUR_DROPLET_IP
**App URL**: http://YOUR_DROPLET_IP
