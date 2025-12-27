#!/bin/bash

set -e

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"  # Can override with env var
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
ECR_REPOSITORY="enron-email"

# Get droplet IP from environment or prompt user
if [ -z "$DROPLET_IP" ]; then
    echo "Enter your DigitalOcean Droplet IP address:"
    read -r DROPLET_IP
    if [ -z "$DROPLET_IP" ]; then
        echo "❌ Error: Droplet IP is required"
        exit 1
    fi
fi

# Get git commit hash for versioning
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT_FULL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

echo "======================================"
echo "Build & Push to AWS ECR"
echo "======================================"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI not installed"
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check AWS credentials
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ Error: AWS credentials not configured"
    echo "Run: aws configure"
    exit 1
fi

echo "✅ AWS Account: $AWS_ACCOUNT_ID"
echo "✅ Region: $AWS_REGION"
echo "✅ Git Commit: $GIT_COMMIT ($GIT_COMMIT_FULL)"
echo ""

# ECR repository URLs
ECR_BACKEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}-backend"
ECR_FRONTEND="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}-frontend"

# Create ECR repositories if they don't exist
echo "📦 Creating ECR repositories..."
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY}-backend --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name ${ECR_REPOSITORY}-backend --region $AWS_REGION

aws ecr describe-repositories --repository-names ${ECR_REPOSITORY}-frontend --region $AWS_REGION 2>/dev/null || \
    aws ecr create-repository --repository-name ${ECR_REPOSITORY}-frontend --region $AWS_REGION

echo "✅ ECR repositories ready"
echo ""

# Login to ECR
echo "🔐 Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
echo "✅ Logged in to ECR"
echo ""

# Build backend
echo "🔨 Building backend image..."
cd backend
docker build -t ${ECR_REPOSITORY}-backend:latest .
docker tag ${ECR_REPOSITORY}-backend:latest ${ECR_BACKEND}:latest
docker tag ${ECR_REPOSITORY}-backend:latest ${ECR_BACKEND}:${GIT_COMMIT}
docker tag ${ECR_REPOSITORY}-backend:latest ${ECR_BACKEND}:$(date +%Y%m%d-%H%M%S)
cd ..
echo "✅ Backend built"
echo ""

# Build frontend
echo "🔨 Building frontend image..."
VITE_API_URL="http://${DROPLET_IP}/api"
cd frontend
docker build --build-arg VITE_API_URL=${VITE_API_URL} -t ${ECR_REPOSITORY}-frontend:latest .
docker tag ${ECR_REPOSITORY}-frontend:latest ${ECR_FRONTEND}:latest
docker tag ${ECR_REPOSITORY}-frontend:latest ${ECR_FRONTEND}:${GIT_COMMIT}
docker tag ${ECR_REPOSITORY}-frontend:latest ${ECR_FRONTEND}:$(date +%Y%m%d-%H%M%S)
cd ..
echo "✅ Frontend built"
echo ""

# Push to ECR
echo "📤 Pushing backend to ECR..."
docker push ${ECR_BACKEND}:latest
docker push ${ECR_BACKEND}:${GIT_COMMIT}
docker push ${ECR_BACKEND}:$(date +%Y%m%d-%H%M%S)
echo "✅ Backend pushed (tags: latest, ${GIT_COMMIT}, timestamp)"
echo ""

echo "📤 Pushing frontend to ECR..."
docker push ${ECR_FRONTEND}:latest
docker push ${ECR_FRONTEND}:${GIT_COMMIT}
docker push ${ECR_FRONTEND}:$(date +%Y%m%d-%H%M%S)
echo "✅ Frontend pushed (tags: latest, ${GIT_COMMIT}, timestamp)"
echo ""

# Create docker-compose file for droplet
cat > docker-compose.droplet.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: enron_postgres
    environment:
      POSTGRES_USER: enron
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
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
    image: ${ECR_BACKEND}:latest
    container_name: enron_backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: enron
      DB_PASSWORD: \${POSTGRES_PASSWORD}
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
    image: ${ECR_FRONTEND}:latest
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
      - ./nginx-simple.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
EOF

echo "✅ Created docker-compose.droplet.yml"
echo ""

# Create simplified nginx config
cat > nginx-simple.conf << 'NGINX_EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;
    gzip on;

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

        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://backend/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location / {
            limit_req zone=general_limit burst=50 nodelay;
            proxy_pass http://frontend/;
            proxy_set_header Host $host;
        }

        location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
            proxy_pass http://frontend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
NGINX_EOF

echo "✅ Created nginx-simple.conf"
echo ""

# Generate secure password
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Create .env file for droplet
cat > .env.droplet << EOF
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
EOF

echo "✅ Created .env.droplet"
echo ""

echo "======================================"
echo "✅ Build & Push Complete!"
echo "======================================"
echo ""
echo "Images pushed to ECR with tags:"
echo "  Backend:  ${ECR_BACKEND}"
echo "    - latest"
echo "    - ${GIT_COMMIT}"
echo "    - timestamp"
echo ""
echo "  Frontend: ${ECR_FRONTEND}"
echo "    - latest"
echo "    - ${GIT_COMMIT}"
echo "    - timestamp"
echo ""
echo "======================================"
echo "Next: Deploy to Droplet"
echo "======================================"
echo ""
echo "1. Copy deployment files to droplet:"
echo "   scp docker-compose.droplet.yml .env.droplet nginx-simple.conf backend/schema.sql root@${DROPLET_IP}:/root/enron/"
echo ""
echo "2. Copy your data to droplet (if you have it locally):"
echo "   rsync -avz --progress extracted_data root@${DROPLET_IP}:/root/enron/"
echo ""
echo "3. SSH to droplet:"
echo "   ssh root@${DROPLET_IP}"
echo ""
echo "4. On droplet, install Docker & AWS CLI:"
echo "   curl -fsSL https://get.docker.com | sh"
echo "   apt-get update && apt-get install -y awscli python3 python3-pip"
echo ""
echo "5. Configure AWS credentials on droplet:"
echo "   aws configure"
echo "   (Use IAM user with ECR read permissions)"
echo ""
echo "6. Login to ECR on droplet:"
echo "   aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo ""
echo "7. Start services:"
echo "   cd /root/enron"
echo "   docker-compose --env-file .env.droplet -f docker-compose.droplet.yml pull"
echo "   docker-compose --env-file .env.droplet -f docker-compose.droplet.yml up -d"
echo ""
echo "8. Load data (if needed):"
echo "   pip3 install psycopg2-binary"
echo "   python3 load_to_postgres.py --data-dir extracted_data"
echo ""
echo "9. Access your app:"
echo "   http://${DROPLET_IP}"
echo ""
echo "======================================"
echo "PostgreSQL Password (save this!):"
echo "${POSTGRES_PASSWORD}"
echo "======================================"
echo ""
