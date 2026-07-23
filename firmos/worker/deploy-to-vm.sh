#!/usr/bin/env bash
# Waits for the VM's SSH, copies the worker, runs setup. Idempotent.
set -uo pipefail
IP="$(cat "$(dirname "$0")/vm-ip.txt")"
KEY=~/.ssh/firmos_oci
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$HOME/.ssh/known_hosts_firmos -o ConnectTimeout=10"
SCP="scp -i $KEY -o StrictHostKeyChecking=accept-new -o UserKnownHostsFile=$HOME/.ssh/known_hosts_firmos -o ConnectTimeout=10"
cd "$(dirname "$0")"

echo "Waiting for SSH on $IP …"
for i in $(seq 1 40); do
  if $SSH ubuntu@"$IP" "echo up" >/dev/null 2>&1; then echo "SSH ready (try $i)"; break; fi
  sleep 15
  [ "$i" = 40 ] && { echo "SSH never came up"; exit 1; }
done

echo "Copying worker files …"
$SSH ubuntu@"$IP" "mkdir -p ~/firmos-worker"
$SCP worker.mjs package.json setup-oci.sh .env ubuntu@"$IP":~/firmos-worker/

echo "Running setup on VM (installs Node, tesseract eng+urd, libreoffice, systemd service) …"
$SSH ubuntu@"$IP" "cd ~/firmos-worker && bash setup-oci.sh"

echo "=== worker service status ==="
$SSH ubuntu@"$IP" "systemctl is-active firmos-worker; journalctl -u firmos-worker -n 8 --no-pager"
