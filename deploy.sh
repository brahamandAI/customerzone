#!/bin/bash

# Setup script for CustomerZone application
# This script installs dependencies, builds the frontend, and starts the backend

set -e  # Exit on any error

echo "🚀 Starting CustomerZone setup..."

cd backend
npm install
pm2 restart ecosystem.config.js

cd ../frontend
npm install
npm run build
pm2 restart ecosystem.config.js