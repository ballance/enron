#!/bin/bash

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DEPLOY_DIR")"

cd "$DEPLOY_DIR"

echo "======================================"
echo "Enron Email Visualization Deployment"
echo "======================================"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production not found!"
    echo "Please copy .env.production.example to .env.production and configure it."
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Validate required variables
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "❌ Error: POSTGRES_PASSWORD not set in .env.production"
    exit 1
fi

if [ -z "$DOMAIN" ]; then
    echo "❌ Error: DOMAIN not set in .env.production"
    exit 1
fi

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Update nginx config with domain
echo "🔧 Updating nginx configuration..."
sed -i.bak "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/enron.conf
echo "✅ Nginx configuration updated"

# Build and start services
echo ""
echo "🐳 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo ""
echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d postgres redis backend frontend

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check if services are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo "❌ Error: Services failed to start"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

echo "✅ Services started successfully"

# SSL Certificate setup
echo ""
echo "🔐 Setting up SSL certificates..."
echo "This will obtain SSL certificates from Let's Encrypt"
echo ""

# Create initial nginx config without SSL for certbot
cat > nginx/conf.d/enron.conf << NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
NGINX_EOF

# Start nginx
docker-compose -f docker-compose.prod.yml up -d nginx

# Obtain certificate
echo "📜 Obtaining SSL certificate..."
docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully"

    # Restore full nginx config with SSL
    git checkout nginx/conf.d/enron.conf
    sed -i.bak "s/YOUR_DOMAIN/$DOMAIN/g" nginx/conf.d/enron.conf

    # Reload nginx
    docker-compose -f docker-compose.prod.yml restart nginx

    # Start certbot renewal service
    docker-compose -f docker-compose.prod.yml up -d certbot
else
    echo "⚠️  SSL certificate setup failed. You can run this again later:"
    echo "   docker-compose -f docker-compose.prod.yml run --rm certbot certonly ..."
fi

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "Your application is now available at:"
echo "   🌐 https://$DOMAIN"
echo ""
echo "To view logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "To stop services:"
echo "   docker-compose -f docker-compose.prod.yml down"
echo ""
