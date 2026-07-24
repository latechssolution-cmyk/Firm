#!/usr/bin/env bash
# One-shot provisioning for the FirmOS worker on an OCI Always-Free Ubuntu ARM VM.
# Usage on the VM:  bash setup-oci.sh
set -euo pipefail

echo "== FirmOS worker setup =="
sudo apt-get update -y
# Node 20, OCR (English + Urdu), headless LibreOffice for PDF
sudo apt-get install -y ca-certificates curl gnupg tesseract-ocr tesseract-ocr-urd poppler-utils libreoffice --no-install-recommends
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version && tesseract --version | head -1

APP_DIR="$HOME/firmos-worker"
mkdir -p "$APP_DIR"
# Expect worker.mjs, package.json and .env copied alongside this script.
cp -f worker.mjs package.json "$APP_DIR"/
[ -f .env ] && cp -f .env "$APP_DIR"/ || echo "WARN: create $APP_DIR/.env from .env.example"
cd "$APP_DIR" && npm install --omit=dev

# systemd service so it survives reboots
sudo tee /etc/systemd/system/firmos-worker.service >/dev/null <<UNIT
[Unit]
Description=FirmOS heavy-compute worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$(command -v node) $APP_DIR/worker.mjs
Restart=always
RestartSec=5
User=$USER

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now firmos-worker
sleep 2
sudo systemctl status firmos-worker --no-pager | head -12
echo "== done. logs: journalctl -u firmos-worker -f =="
