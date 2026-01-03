#!/bin/bash

# This script runs ON THE DROPLET to rebuild and restart services
# Called by push-update.sh or can be run directly

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

cd "$DEPLOY_DIR"

# Use docker compose plugin or docker-compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Services to update (default: all application services)
SERVICES="${@:-frontend backend}"

echo -e "${YELLOW}Updating services: $SERVICES${NC}"
echo ""

# Load env file if exists
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Rebuild specified services
for SERVICE in $SERVICES; do
    echo -e "${YELLOW}Building $SERVICE...${NC}"
    $COMPOSE_CMD -f docker-compose.prod.yml build --no-cache "$SERVICE"
    echo -e "${GREEN}$SERVICE built${NC}"
done

echo ""
echo -e "${YELLOW}Restarting services...${NC}"

# Restart in correct order
if [[ "$SERVICES" == *"backend"* ]]; then
    $COMPOSE_CMD -f docker-compose.prod.yml up -d backend
    echo -e "${GREEN}Backend restarted${NC}"
fi

if [[ "$SERVICES" == *"frontend"* ]]; then
    $COMPOSE_CMD -f docker-compose.prod.yml up -d frontend
    echo -e "${GREEN}Frontend restarted${NC}"
fi

# Reload nginx if it's running
if $COMPOSE_CMD -f docker-compose.prod.yml ps nginx 2>/dev/null | grep -q "Up"; then
    echo -e "${YELLOW}Reloading nginx...${NC}"
    $COMPOSE_CMD -f docker-compose.prod.yml exec -T nginx nginx -s reload 2>/dev/null || true
fi

echo ""
echo -e "${YELLOW}Service status:${NC}"
$COMPOSE_CMD -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}Update complete!${NC}"
