#!/bin/bash
# SSL initialization script for polarsquares.com
# Run this ONCE on the EC2 server after DNS propagation

set -e

DOMAIN="polarsquares.com"
EMAIL="dhruvsahu007@gmail.com"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

cd /opt/splitmint

echo "=== Step 1: Create temporary self-signed cert so Nginx can start ==="
sudo mkdir -p /var/lib/docker/volumes/splitmint_certbot_etc/_data/live/$DOMAIN
sudo docker compose -f $COMPOSE_FILE --env-file $ENV_FILE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj '/CN=$DOMAIN'" certbot
echo "✅ Temporary self-signed cert created"

echo ""
echo "=== Step 2: Start all services ==="
sudo docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
echo "✅ All services started"

echo ""
echo "=== Step 3: Wait for Nginx to be ready ==="
sleep 5

echo ""
echo "=== Step 4: Get real Let's Encrypt certificate ==="
sudo docker compose -f $COMPOSE_FILE --env-file $ENV_FILE run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN \
  -d www.$DOMAIN \
  --force-renewal
echo "✅ Real SSL certificate obtained"

echo ""
echo "=== Step 5: Reload Nginx to use real cert ==="
sudo docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec nginx nginx -s reload
echo "✅ Nginx reloaded with real certificate"

echo ""
echo "=== Step 6: Set up auto-renewal cron job ==="
# Add a cron job to renew certs every 12 hours
(sudo crontab -l 2>/dev/null; echo "0 */12 * * * cd /opt/splitmint && docker compose -f docker-compose.prod.yml --env-file .env.production run --rm certbot renew --quiet && docker compose -f docker-compose.prod.yml --env-file .env.production exec nginx nginx -s reload") | sort -u | sudo crontab -
echo "✅ Auto-renewal cron job installed"

echo ""
echo "======================================="
echo "🎉 SSL setup complete!"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo "======================================="
