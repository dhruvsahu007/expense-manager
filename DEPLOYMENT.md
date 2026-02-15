# SplitMint — EC2 Deployment Guide

## EC2 Instance Requirements

| Spec | Minimum | Recommended |
|------|---------|-------------|
| **Instance type** | `t3.micro` (free tier) | `t3.small` |
| **vCPUs** | 2 | 2 |
| **RAM** | 1 GB | 2 GB |
| **Storage** | 20 GB gp3 | 30 GB gp3 |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

> `t3.micro` (1 GB) works for personal use / demo. For production with multiple users, use `t3.small` (2 GB) or above.

---

## Architecture

```
Internet
   │
   ▼ :80 / :443
┌──────────┐
│  Nginx   │  reverse proxy
└────┬─────┘
     ├──── / ──────► Frontend (Next.js :3000)
     └──── /api/ ──► Backend  (FastAPI :8000)
                         │
                         ▼
                    PostgreSQL :5432
```

All services run as Docker containers via `docker-compose.prod.yml`.

---

## Step-by-Step Deployment

### 1. Launch EC2 Instance

**AWS Console → EC2 → Launch Instance:**

| Setting | Value |
|---------|-------|
| AMI | Ubuntu 24.04 LTS (64-bit ARM or x86) |
| Instance type | `t3.small` |
| Key pair | Create or select an existing `.pem` key |
| Storage | 30 GB gp3 |

### 2. Configure Security Group

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP (`x.x.x.x/32`) | SSH access |
| HTTP | 80 | `0.0.0.0/0` | Web traffic |
| HTTPS | 443 | `0.0.0.0/0` | SSL traffic |

> ⚠️ Do NOT open port 5432 (PostgreSQL) or 8000 (backend) to the public. Nginx handles routing.

### 3. SSH into Instance

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### 4. Run the Deploy Script

```bash
# Download and run
git clone https://github.com/dhruvsahu007/expense-manager.git /opt/splitmint
cd /opt/splitmint
chmod +x deploy.sh
sudo ./deploy.sh
```

The script will:
- Install Docker & Docker Compose
- Clone the repo
- Auto-generate `.env.production` (with random secrets + your public IP)
- Build and start all 4 containers
- Configure UFW firewall

### 5. Verify

```bash
curl http://localhost/health
# → {"status":"healthy"}
```

Visit `http://<EC2_PUBLIC_IP>` in your browser.

---

## Adding a Custom Domain + SSL

### 1. Point your domain to EC2

In your DNS provider (Route 53, Cloudflare, GoDaddy, etc.):

| Type | Name | Value |
|------|------|-------|
| A | `splitmint.com` | `<EC2_PUBLIC_IP>` |
| A | `www.splitmint.com` | `<EC2_PUBLIC_IP>` |

### 2. Update environment

```bash
nano /opt/splitmint/.env.production
```

Change:
```
FRONTEND_URL=https://splitmint.com
NEXT_PUBLIC_API_URL=https://splitmint.com
```

### 3. Install SSL with Certbot

```bash
# Install certbot on the host
sudo apt install certbot -y

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get certificate
sudo certbot certonly --standalone -d splitmint.com -d www.splitmint.com

# Copy certs to docker volume
sudo cp -rL /etc/letsencrypt/ /var/lib/docker/volumes/splitmint_certbot_etc/_data/
```

### 4. Enable HTTPS in Nginx

Edit `nginx/default.conf`:
1. Uncomment the `return 301 https://...` redirect in the port 80 block
2. Uncomment the entire port 443 server block
3. Replace `yourdomain.com` with your actual domain

### 5. Rebuild

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up --build -d
```

---

## CI/CD with GitHub Actions

Auto-deploy on every push to `main`:

### 1. Add GitHub Secrets

Go to **repo → Settings → Secrets → Actions** and add:

| Secret | Value |
|--------|-------|
| `EC2_HOST` | Your EC2 public IP or domain |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Contents of your `.pem` private key |

### 2. Push to main

```bash
git add . && git commit -m "deploy" && git push
```

GitHub Actions will SSH into EC2, pull the latest code, and rebuild containers.

---

## Useful Commands

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@<IP>

# View all containers
cd /opt/splitmint
docker compose -f docker-compose.prod.yml ps

# View logs (all services)
docker compose -f docker-compose.prod.yml logs -f

# View logs (single service)
docker compose -f docker-compose.prod.yml logs -f backend

# Restart everything
docker compose -f docker-compose.prod.yml restart

# Full rebuild
docker compose -f docker-compose.prod.yml up --build -d

# Stop everything
docker compose -f docker-compose.prod.yml down

# Stop and delete data (⚠️ destroys database)
docker compose -f docker-compose.prod.yml down -v

# Database backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U splitmint splitmint > backup.sql

# Database restore
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U splitmint splitmint
```

---

## Cost Estimate (AWS Mumbai `ap-south-1`)

| Resource | Spec | Monthly Cost |
|----------|------|-------------|
| EC2 `t3.micro` | 2 vCPU, 1 GB (free tier eligible) | **$0** (first 12 months) |
| EC2 `t3.small` | 2 vCPU, 2 GB | ~**$15/mo** |
| EBS gp3 | 30 GB | ~**$2.40/mo** |
| Data transfer | 10 GB/mo outbound | ~**$0.90/mo** |
| **Total (free tier)** | | **~$3/mo** |
| **Total (t3.small)** | | **~$18/mo** |

> 💡 For an even cheaper option, consider a `t4g.micro` (ARM-based, free tier eligible) — just make sure your Docker images build for `linux/arm64`.

---

## Elastic IP (Recommended)

Allocate an Elastic IP so your public IP doesn't change on instance stop/start:

```
AWS Console → EC2 → Elastic IPs → Allocate → Associate with your instance
```

Free while the instance is running; ~$3.60/mo if instance is stopped.
