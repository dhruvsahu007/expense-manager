#!/bin/bash

# ═══════════════════════════════════════════════════════════
# SplitMint — EC2 Deployment Script
# Works on: Amazon Linux 2023, Ubuntu 22.04/24.04
# Run:  chmod +x deploy.sh && sudo ./deploy.sh
# ═══════════════════════════════════════════════════════════

set -euo pipefail

APP_DIR="/opt/splitmint"
REPO_URL="https://github.com/dhruvsahu007/expense-manager.git"
BRANCH="main"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Must run as root ──────────────────────────────────
if [ "$EUID" -ne 0 ]; then
    err "Please run as root: sudo ./deploy.sh"
fi

# ── Detect OS ─────────────────────────────────────────
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
else
    OS_ID="unknown"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  SplitMint — EC2 Deployment${NC}"
echo -e "${GREEN}  OS detected: ${OS_ID}${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""

# ── 1. System updates ────────────────────────────────
log "Updating system packages..."
if [[ "$OS_ID" == "amzn" || "$OS_ID" == "fedora" || "$OS_ID" == "rhel" || "$OS_ID" == "centos" ]]; then
    dnf update -y -q
elif [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
    apt-get update -qq && apt-get upgrade -y -qq
else
    warn "Unknown OS '$OS_ID' — trying dnf then apt"
    dnf update -y -q 2>/dev/null || apt-get update -qq && apt-get upgrade -y -qq
fi

# ── 2. Install Docker ────────────────────────────────
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    if [[ "$OS_ID" == "amzn" ]]; then
        dnf install -y docker git
        systemctl enable docker
        systemctl start docker
        # Install Docker Compose plugin
        mkdir -p /usr/local/lib/docker/cli-plugins
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
        curl -sL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
        chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    elif [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
        apt-get install -y -qq ca-certificates curl gnupg lsb-release
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        systemctl enable docker
        systemctl start docker
    fi
    log "Docker installed: $(docker --version)"
    log "Compose installed: $(docker compose version)"
else
    log "Docker already installed: $(docker --version)"
fi

# ── 3. Install git ───────────────────────────────────
if ! command -v git &>/dev/null; then
    log "Installing git..."
    if [[ "$OS_ID" == "amzn" || "$OS_ID" == "fedora" || "$OS_ID" == "rhel" ]]; then
        dnf install -y git
    else
        apt-get install -y -qq git
    fi
fi

# ── 4. Clone / Pull repo ─────────────────────────────
if [ -d "$APP_DIR" ]; then
    log "Updating existing repo..."
    cd "$APP_DIR"
    git fetch origin
    git reset --hard origin/$BRANCH
else
    log "Cloning repository..."
    git clone -b $BRANCH "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── 5. Setup environment file ────────────────────────
# IMDSv2 token for metadata access
IMDS_TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300" 2>/dev/null || echo "")

get_public_ip() {
    if [ -n "$IMDS_TOKEN" ]; then
        curl -s -H "X-aws-ec2-metadata-token: $IMDS_TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null
    else
        curl -s ifconfig.me 2>/dev/null
    fi
}

if [ ! -f "$APP_DIR/.env.production" ]; then
    warn "No .env.production found. Creating from template..."
    cp "$APP_DIR/.env.production.example" "$APP_DIR/.env.production"

    # Auto-generate a SECRET_KEY
    SECRET=$(openssl rand -base64 48)
    sed -i "s|CHANGE_ME_generate_a_64_char_random_string|${SECRET}|g" "$APP_DIR/.env.production"

    # Auto-generate a DB password
    DB_PASS=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
    sed -i "s|CHANGE_ME_strong_random_password_here|${DB_PASS}|g" "$APP_DIR/.env.production"

    # Auto-set the public IP
    PUBLIC_IP=$(get_public_ip)
    sed -i "s|YOUR_EC2_PUBLIC_IP_OR_DOMAIN|${PUBLIC_IP}|g" "$APP_DIR/.env.production"

    log "Generated .env.production with:"
    echo "    Public IP:   $PUBLIC_IP"
    echo "    DB Password: (auto-generated)"
    echo "    Secret Key:  (auto-generated)"
    warn "Review and edit if needed: nano $APP_DIR/.env.production"
else
    log "Using existing .env.production"
fi

# ── 6. Build & Start ─────────────────────────────────
log "Building and starting containers..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file .env.production down 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d

# ── 7. Wait for health ───────────────────────────────
log "Waiting for services to start..."
sleep 10

if curl -sf http://localhost/health > /dev/null 2>&1; then
    log "Health check passed!"
else
    warn "Health check didn't respond yet — services may still be starting."
    warn "Check logs: docker compose -f docker-compose.prod.yml logs -f"
fi

# ── 8. Setup firewall ────────────────────────────────
# Amazon Linux uses security groups (no ufw), Ubuntu may have ufw
if command -v ufw &>/dev/null; then
    log "Configuring firewall..."
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
    log "Firewall configured (22, 80, 443)"
else
    log "No ufw found — relying on AWS Security Group for firewall rules"
fi

# ── Done ──────────────────────────────────────────────
PUBLIC_IP=$(get_public_ip)
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ SplitMint deployed successfully!${NC}"
echo -e "${GREEN}  App:      http://${PUBLIC_IP}${NC}"
echo -e "${GREEN}  API Docs: http://${PUBLIC_IP}/docs${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose.prod.yml logs -f          # View logs"
echo "  docker compose -f docker-compose.prod.yml restart          # Restart"
echo "  docker compose -f docker-compose.prod.yml down             # Stop"
echo "  docker compose -f docker-compose.prod.yml up --build -d    # Rebuild"
echo ""
