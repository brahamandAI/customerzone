#!/bin/bash
set -e

echo "🚀 Starting deployment process..."

# Load ENCRYPTION_KEY from .env.git if it exists
if [ -f .env.git ]; then
    echo "📂 Loading ENCRYPTION_KEY from .env.git..."
    export $(cat .env.git | grep -v '^#' | xargs)
    echo "✅ ENCRYPTION_KEY loaded from .env.git"
else
    echo "❌ Error: .env.git file not found"
    echo "Please create .env.git file with ENCRYPTION_KEY=your-key"
    exit 1
fi

echo "📥 Pulling latest code..."
git pull origin main

echo "🔍 Checking for Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js found: $(node --version)"
else
    echo "⚠️  Node.js not found, installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed: $(node --version)"
fi

echo "🔓 Decrypting .env.production files..."
if [ -f frontend/.env.production.encrypted ]; then
    node scripts/env-manager.js decrypt frontend/.env.production.encrypted
    echo "✅ frontend/.env.production decrypted successfully"
else
    echo "⚠️  frontend/.env.production.encrypted not found, skipping decryption"
fi

if [ -f backend/.env.production.encrypted ]; then
    node scripts/env-manager.js decrypt backend/.env.production.encrypted
    echo "✅ backend/.env.production decrypted successfully"
else
    echo "⚠️  backend/.env.production.encrypted not found, skipping decryption"
fi

echo "🔍 Checking for npm..."
if command -v npm &> /dev/null; then
    echo "✅ npm found: $(npm --version)"
else
    echo "⚠️  npm not found, installing..."
    # Try to install npm if it's missing
    if command -v node &> /dev/null; then
        # If Node.js is installed but npm is missing, try to install npm
        curl -L https://www.npmjs.com/install.sh | sh
        echo "✅ npm installed: $(npm --version)"
    else
        echo "❌ Error: Node.js not found, cannot install npm"
        exit 1
    fi
fi

echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "🏗️  Building frontend..."
npm run build
cd ..

echo "✅ Build completed successfully"

echo "🔍 Checking for PM2..."
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 found: $(pm2 --version)"
else
    echo "⚠️  PM2 not found, installing..."
    sudo npm install -g pm2
    echo "✅ PM2 installed: $(pm2 --version)"
fi

echo "🔄 Restarting application with PM2..."
pm2 stop ecosystem.config.js
pm2 delete ecosystem.config.js
pm2 start ecosystem.config.js

echo "📊 PM2 Status:"
pm2 status

echo "✅ Deployment completed successfully!"
echo "🌐 Application should be running on your server"
