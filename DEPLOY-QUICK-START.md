# Quick Start Deployment Guide

**Target**: Deploy to `137.184.208.192` using AWS ECR

## Prerequisites
- AWS CLI configured (`aws configure`)
- Docker Desktop running
- SSH access to droplet

## Local Machine (5 minutes)

```bash
# 1. Build and push to ECR
./build-and-push-ecr.sh

# Save the PostgreSQL password that's printed at the end!

# 2. Copy files to droplet
scp docker-compose.droplet.yml .env.droplet nginx-simple.conf droplet-setup.sh root@137.184.208.192:/root/enron/
scp backend/schema.sql root@137.184.208.192:/root/enron/

# 3. (Optional) Copy data if you have it
rsync -avz --progress extracted_data root@137.184.208.192:/root/enron/
```

## On Droplet (2 minutes)

```bash
# 1. SSH to droplet
ssh root@137.184.208.192

# 2. Setup environment
cd /root/enron
chmod +x droplet-setup.sh
./droplet-setup.sh

# 3. Configure AWS (use same credentials as local)
aws configure

# 4. Login to ECR (replace ACCOUNT_ID)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# 5. Deploy
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml pull
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml up -d

# 6. Check status
docker-compose -f docker-compose.droplet.yml ps

# 7. (Optional) Load data
pip3 install psycopg2-binary
python3 load_to_postgres.py --data-dir extracted_data
```

## Access

Open browser: **http://137.184.208.192**

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.droplet.yml logs -f

# Restart
docker-compose -f docker-compose.droplet.yml restart

# Stop
docker-compose -f docker-compose.droplet.yml down

# Update app (run build-and-push-ecr.sh locally first)
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml pull
docker-compose --env-file .env.droplet -f docker-compose.droplet.yml up -d
```

## Costs

- DigitalOcean: $12/month
- AWS ECR: ~$1/month
- **Total: ~$13/month**

---

See **DROPLET-DEPLOYMENT.md** for detailed guide and troubleshooting.
