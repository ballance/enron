#!/bin/bash

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DEPLOY_DIR")"

echo "======================================"
echo "Enron Email - Simple Droplet Deployment"
echo "======================================"
echo ""

# Configuration
# Get droplet IP from environment or prompt user
if [ -z "$DROPLET_IP" ]; then
    echo "Enter your DigitalOcean Droplet IP address:"
    read -r DROPLET_IP
    if [ -z "$DROPLET_IP" ]; then
        echo "❌ Error: Droplet IP is required"
        exit 1
    fi
fi

POSTGRES_PASSWORD=$(openssl rand -base64 32)

echo "📋 Configuration:"
echo "   Droplet IP: $DROPLET_IP"
echo "   Generated secure password for PostgreSQL"
echo ""

# Create .env.production file in deploy directory
cat > "$DEPLOY_DIR/.env.production" << EOF
# PostgreSQL Configuration
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# API URL (using droplet IP)
VITE_API_URL=http://$DROPLET_IP

# No domain/SSL for simple deployment
DOMAIN=
EMAIL=
EOF

echo "✅ Created deploy/.env.production"
echo ""

echo "======================================"
echo "✅ Deployment files ready!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Copy project to droplet:"
echo "   rsync -avz --exclude node_modules --exclude .git $PROJECT_ROOT/ root@$DROPLET_IP:/root/enron/"
echo ""
echo "2. SSH to droplet:"
echo "   ssh root@$DROPLET_IP"
echo ""
echo "3. On the droplet, install Docker:"
echo "   curl -fsSL https://get.docker.com | sh"
echo ""
echo "4. Build and start services:"
echo "   cd /root/enron/deploy"
echo "   docker-compose --env-file .env.production -f docker-compose.simple.yml up -d"
echo ""
echo "5. Wait for database to initialize (~30 seconds)"
echo ""
echo "6. Load your data (if you have extracted_data/):"
echo "   cd /root/enron"
echo "   python3 load_to_postgres.py --data-dir extracted_data"
echo ""
echo "7. Access your app:"
echo "   http://$DROPLET_IP"
echo ""
echo "======================================"
echo "PostgreSQL Password (save this!):"
echo "$POSTGRES_PASSWORD"
echo "======================================"
echo ""
