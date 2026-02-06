#!/bin/bash

echo "=== Sonos Configuration Diagnostics ==="
echo ""

echo "1. Checking for legacy config.json file:"
if [ -f "server/config/config.json" ]; then
    echo "   ✗ Found server/config/config.json"
    echo "   Content:"
    cat server/config/config.json | grep -A 3 "node-sonos-http-api"
else
    echo "   ✓ No legacy config.json found"
fi
echo ""

echo "2. Checking environment variables:"
echo "   SONOS_SERVER=${SONOS_SERVER:-not set}"
echo "   SONOS_PORT=${SONOS_PORT:-not set}"
echo ""

echo "3. Checking database config:"
sqlite3 server/data/database.sqlite "SELECT key, value FROM config WHERE key LIKE '%sonos%' ORDER BY key;"
echo ""

echo "=== Recommendations ==="
if [ -f "server/config/config.json" ]; then
    echo "1. Delete or rename server/config/config.json"
    echo "   mv server/config/config.json server/config/config.json.backup"
fi

if [ ! -z "$SONOS_SERVER" ]; then
    echo "2. Check Home Assistant addon configuration for SONOS_SERVER variable"
fi
