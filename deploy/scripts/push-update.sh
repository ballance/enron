#!/bin/bash

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$DEPLOY_DIR")"

# Configuration
DROPLET_USER="${DROPLET_USER:-root}"
DROPLET_IP="${DROPLET_IP:-137.184.208.192}"
REMOTE_PATH="${REMOTE_PATH:-/root/enron}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_sovbank}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Enron Email - Push Update to Production"
echo "======================================"
echo ""

# Parse arguments
SERVICES=""
REBUILD=false
RESTART_ONLY=false

usage() {
    echo "Usage: $0 [OPTIONS] [SERVICES...]"
    echo ""
    echo "Options:"
    echo "  --rebuild       Force rebuild of specified services"
    echo "  --restart       Restart only (no code sync)"
    echo "  --help          Show this help message"
    echo ""
    echo "Services: frontend, backend, all (default: all)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Sync all code and rebuild all"
    echo "  $0 frontend           # Sync and rebuild frontend only"
    echo "  $0 --restart backend  # Restart backend without sync"
    echo ""
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --restart)
            RESTART_ONLY=true
            shift
            ;;
        --help|-h)
            usage
            ;;
        *)
            SERVICES="$SERVICES $1"
            shift
            ;;
    esac
done

# Default to all services
SERVICES="${SERVICES:-all}"
SERVICES=$(echo "$SERVICES" | xargs)  # Trim whitespace

echo -e "${YELLOW}Configuration:${NC}"
echo "   Droplet: $DROPLET_USER@$DROPLET_IP"
echo "   Remote path: $REMOTE_PATH"
echo "   Services: $SERVICES"
echo ""

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key not found at $SSH_KEY${NC}"
    echo "Set SSH_KEY environment variable to your key path"
    exit 1
fi

SSH_CMD="ssh -i $SSH_KEY $DROPLET_USER@$DROPLET_IP"
RSYNC_SSH="ssh -i $SSH_KEY"

# Sync code unless restart-only
if [ "$RESTART_ONLY" = false ]; then
    echo -e "${YELLOW}Syncing code to droplet...${NC}"
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude '*.pyc' \
        --exclude '__pycache__' \
        --exclude '.env' \
        --exclude '.env.local' \
        --exclude 'deploy/.env.production' \
        --exclude 'extracted_data' \
        --exclude 'extracted_edrm_data' \
        --exclude 'edrm_data' \
        --exclude 'pst_data' \
        --exclude 'maildir' \
        --exclude 'dist' \
        --exclude '.next' \
        --exclude 'coverage' \
        --exclude '.idea' \
        --exclude '.vscode' \
        --exclude '*.tar.gz' \
        --exclude '*.log' \
        --exclude '.DS_Store' \
        --exclude '.claude' \
        -e "$RSYNC_SSH" \
        "$PROJECT_ROOT/" "$DROPLET_USER@$DROPLET_IP:$REMOTE_PATH/"

    echo -e "${GREEN}Code synced successfully${NC}"
    echo ""
fi

# Build command based on services
if [ "$SERVICES" = "all" ]; then
    BUILD_SERVICES="frontend backend"
else
    BUILD_SERVICES="$SERVICES"
fi

echo -e "${YELLOW}Rebuilding and restarting services on droplet...${NC}"

# Run update script on droplet
$SSH_CMD "cd $REMOTE_PATH/deploy && ./scripts/update.sh $BUILD_SERVICES"

echo ""
echo -e "${GREEN}======================================"
echo "Update complete!"
echo "======================================${NC}"
echo ""
echo "View logs: $SSH_CMD \"cd $REMOTE_PATH/deploy && docker-compose -f docker-compose.prod.yml logs -f\""
