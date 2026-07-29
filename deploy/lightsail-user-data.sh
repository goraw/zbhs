#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/zbhs/app"
DATA_DIR="/opt/zbhs/data"
REPO_URL="https://github.com/goraw/zbhs.git"
DOMAIN="zbhs.zagolseniorscare.com"

mkdir -p "$APP_DIR" "$DATA_DIR"
chmod 700 "$DATA_DIR"

apt-get update
apt-get install -y ca-certificates curl git nodejs npm caddy openssl

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi

cd "$APP_DIR"
npm ci

NEXTAUTH_SECRET_VALUE="$(openssl rand -base64 48)"
INITIAL_ADMIN_PASSWORD_VALUE="$(openssl rand -base64 24)"

cat > "$APP_DIR/.env" <<ENV
DATABASE_URL="file:$DATA_DIR/cbhs.db"
NEXTAUTH_URL="https://$DOMAIN"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET_VALUE"
INITIAL_ADMIN_NAME="Primary Administrator"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="$INITIAL_ADMIN_PASSWORD_VALUE"
SQLCIPHER_KEY="$(openssl rand -base64 48)"
ENV

chmod 600 "$APP_DIR/.env"
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run build

cat > /etc/systemd/system/zbhs.service <<SERVICE
[Unit]
Description=ZBHS CBHS web app
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- -p 3000
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable --now zbhs

cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
CADDY

systemctl enable --now caddy
systemctl reload caddy

cat > /root/zbhs-admin-credentials.txt <<CREDS
URL: https://$DOMAIN
Username: admin
Temporary password: $INITIAL_ADMIN_PASSWORD_VALUE
CREDS
chmod 600 /root/zbhs-admin-credentials.txt
