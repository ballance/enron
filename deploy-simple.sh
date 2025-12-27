#!/bin/bash

set -e

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

# Create .env.production file
cat > backend/.env.production << EOF
# PostgreSQL Configuration
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# API URL (using droplet IP)
VITE_API_URL=http://$DROPLET_IP

# No domain/SSL for simple deployment
DOMAIN=
EMAIL=
EOF

echo "✅ Created backend/.env.production"
echo ""

# Create simplified docker-compose file (no SSL, direct port exposure)
cat > backend/docker-compose.simple.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: enron_postgres
    environment:
      POSTGRES_USER: enron
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: enron_emails
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U enron"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: enron_redis
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: enron_backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: enron
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: enron_emails
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL}
    container_name: enron_frontend
    depends_on:
      - backend
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: enron_nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx-simple.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF

echo "✅ Created backend/docker-compose.simple.yml"
echo ""

# Create simplified nginx config (HTTP only)
mkdir -p backend/nginx

cat > backend/nginx/nginx-simple.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name _;

        client_max_body_size 10M;

        # API routes
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://backend/api/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Frontend routes
        location / {
            limit_req zone=general_limit burst=50 nodelay;

            proxy_pass http://frontend/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Static file caching
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF

echo "✅ Created backend/nginx/nginx-simple.conf"
echo ""

echo "======================================"
echo "✅ Deployment files created!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Copy project to droplet:"
echo "   rsync -avz --exclude node_modules --exclude .git . root@$DROPLET_IP:/root/enron/"
echo ""
echo "2. SSH to droplet:"
echo "   ssh root@$DROPLET_IP"
echo ""
echo "3. On the droplet, install Docker:"
echo "   curl -fsSL https://get.docker.com | sh"
echo ""
echo "4. Build and start services:"
echo "   cd /root/enron/backend"
echo "   docker-compose --env-file .env.production -f docker-compose.simple.yml up -d"
echo ""
echo "5. Wait for database to initialize (~30 seconds)"
echo ""
echo "6. Load your data (if you have extracted_data/):"
echo "   python3 load_to_postgres.py --data-dir ../extracted_data"
echo ""
echo "7. Access your app:"
echo "   http://$DROPLET_IP"
echo ""
echo "======================================"
echo "PostgreSQL Password (save this!):"
echo "$POSTGRES_PASSWORD"
echo "======================================"
echo ""
