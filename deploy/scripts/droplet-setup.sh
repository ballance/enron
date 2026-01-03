#!/bin/bash
# Run this script ON THE DROPLET after copying files

set -e

echo "======================================"
echo "Droplet Setup for Enron Email App"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (or use sudo)"
    exit 1
fi

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install AWS CLI if not already installed
if ! command -v aws &> /dev/null; then
    echo "📦 Installing AWS CLI..."
    apt-get update -qq
    apt-get install -y awscli unzip
    echo "✅ AWS CLI installed"
else
    echo "✅ AWS CLI already installed"
fi

# Install Python and dependencies for data loading
if ! command -v python3 &> /dev/null; then
    echo "📦 Installing Python..."
    apt-get install -y python3 python3-pip
    echo "✅ Python installed"
else
    echo "✅ Python already installed"
fi

echo ""
echo "======================================"
echo "✅ Droplet setup complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure AWS credentials:"
echo "   aws configure"
echo "   (Enter your AWS Access Key, Secret Key, region: us-east-1)"
echo ""
echo "2. Test AWS connection:"
echo "   aws sts get-caller-identity"
echo ""
echo "3. See DEPLOYMENT-GUIDE.md for next steps"
echo ""
