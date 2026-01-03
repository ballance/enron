#!/bin/bash

# Check status of production deployment
# Can be run locally (connects to droplet) or on the droplet

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Detect if we're on the droplet or local
if [ -f "/root/enron/deploy/docker-compose.prod.yml" ]; then
    # Running on droplet
    cd /root/enron/deploy

    echo -e "${YELLOW}=== Container Status ===${NC}"
    docker-compose -f docker-compose.prod.yml ps

    echo ""
    echo -e "${YELLOW}=== Health Checks ===${NC}"

    # Check backend health
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "Backend API: ${GREEN}Healthy${NC}"
    else
        echo -e "Backend API: ${RED}Unhealthy${NC}"
    fi

    # Check frontend
    if curl -sf http://localhost:3002 > /dev/null 2>&1; then
        echo -e "Frontend: ${GREEN}Healthy${NC}"
    else
        echo -e "Frontend: ${RED}Unhealthy${NC}"
    fi

    # Check nginx
    if curl -sf http://localhost > /dev/null 2>&1; then
        echo -e "Nginx: ${GREEN}Healthy${NC}"
    else
        echo -e "Nginx: ${RED}Unhealthy${NC}"
    fi

    echo ""
    echo -e "${YELLOW}=== Recent Logs (last 20 lines) ===${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=20

else
    # Running locally - connect to droplet
    DROPLET_USER="${DROPLET_USER:-root}"
    DROPLET_IP="${DROPLET_IP:-137.184.208.192}"
    SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_sovbank}"

    if [ ! -f "$SSH_KEY" ]; then
        echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Connecting to $DROPLET_IP...${NC}"
    echo ""

    ssh -i "$SSH_KEY" "$DROPLET_USER@$DROPLET_IP" 'bash -s' < "$SCRIPT_DIR/status.sh"
fi
