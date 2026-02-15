#!/bin/bash

# ═══════════════════════════════════════════════════════════
# SplitMint — EC2 Deployment Script
# Run on a fresh Ubuntu 22.04/24.04 EC2 instance:
#   chmod +x deploy.sh && sudo ./deploy.sh
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

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}  SplitMint — EC2 Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""

# ── 1. System updates ────────────────────────────────
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# ── 2. Install Docker ────────────────────────────────
if ! command -v docker &>/dev/null; then
    log "Installing Docker..."
    apt-get install -y -qq ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    log "Docker installed"
else
    log "Docker already installed"
fi

# ── 3. Install git ───────────────────────────────────
if ! command -v git &>/dev/null; then
    log "Installing git..."
    apt-get install -y -qq git
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
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s ifconfig.me)
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
if command -v ufw &>/dev/null; then
    log "Configuring firewall..."
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
    log "Firewall configured (22, 80, 443)"
fi

# ── Done ──────────────────────────────────────────────
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s ifconfig.me)
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
