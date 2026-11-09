#!/usr/bin/env bash
# exit on error
set -o errexit

echo "=== Installing frontend dependencies and building production assets ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Installing backend dependencies ==="
python -m pip install --upgrade pip
pip install -r backend/requirements.txt

echo "=== Build completed successfully ==="

