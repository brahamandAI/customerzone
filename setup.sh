#!/bin/bash

# Setup script for CustomerZone application
# This script installs dependencies, builds the frontend, and starts the backend

set -e  # Exit on any error

echo "🚀 Starting CustomerZone setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed globally. Installing PM2..."
    npm install -g pm2
    print_success "PM2 installed successfully"
fi

# Check if directories exist
if [ ! -d "/home/customerzone/htdocs/customerzone.in/customerzone.in/frontend" ]; then
    print_error "Frontend directory not found at /home/customerzone/htdocs/customerzone.in/customerzone.in/frontend"
    exit 1
fi

if [ ! -d "/home/customerzone/htdocs/customerzone.in/customerzone.in/backend" ]; then
    print_error "Backend directory not found at /home/customerzone/htdocs/customerzone.in/customerzone.in/backend"
    exit 1
fi

# Frontend setup
print_status "Setting up frontend..."
cd /home/customerzone/htdocs/customerzone.in/customerzone.in/frontend

print_status "Installing frontend dependencies..."
npm install
print_success "Frontend dependencies installed"

print_status "Building frontend..."
npm run build
print_success "Frontend built successfully"

# Backend setup
print_status "Setting up backend..."
cd /home/customerzone/htdocs/customerzone.in/customerzone.in/backend

print_status "Installing backend dependencies..."
npm install
print_success "Backend dependencies installed"

# Start with PM2
print_status "Starting application with PM2..."
cd /home/customerzone/htdocs/customerzone.in/customerzone.in
pm2 start ecosystem.config.js
print_success "Application started with PM2"

# Show PM2 status
print_status "PM2 Status:"
pm2 status

print_success "🎉 CustomerZone setup completed successfully!"
print_status "You can monitor your application with: pm2 logs"
print_status "To stop the application: pm2 stop all"
print_status "To restart the application: pm2 restart all"
