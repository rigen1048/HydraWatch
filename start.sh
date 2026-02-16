#!/bin/bash

LOCAL_IP=$(hostname -I | awk '{print $1}')
HOSTNAME=$(hostname)

echo "=================================================="
echo "WatchJoy is starting..."
echo ""
echo "On this machine: http://localhost:3000"
echo "From other devices on WiFi (recommended):"
echo "   http://$HOSTNAME:3000"
echo "   (If that doesn't resolve, use: http://$LOCAL_IP:3000)"
echo ""
echo "Tip: Bookmark 'http://$HOSTNAME:3000' for easy access!"
echo "=================================================="

if command -v qrencode >/dev/null; then
    qrencode -t ansiutf8 "http://$LOCAL_IP:3000"  # QR for IP fallback
else
    echo "(Install qrencode for QR: sudo apt install qrencode)"
fi

docker builder prune --all --force  # Free space + clear old cache
docker compose build --no-cache      # Full fresh build
docker compose up -d               # Start it


if command -v xdg-open >/dev/null; then
    xdg-open http://localhost:3000
fi

docker compose logs -f
