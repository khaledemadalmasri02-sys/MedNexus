#!/bin/bash
set -e

echo "=== Building Backend ==="
npm ci --include=dev --ignore-scripts
npm run build

echo "=== Building Frontend ==="
cd new-frontend
npm ci
npm run build

echo "=== Build Complete ==="