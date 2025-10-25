const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting Rakshak Expense Management Backend...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('📝 Please create a .env file with the following variables:');
  console.log(`
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/rakshak-expense
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRE=24h
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@rakshak.com
FROM_NAME=Rakshak Expense System
MAX_FILE_UPLOAD=10000000
FILE_UPLOAD_PATH=./uploads
BCRYPT_SALT_ROUNDS=12
SYSTEM_TIMEZONE=Asia/Kolkata
CURRENCY=INR
  `);
  process.exit(1);
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing dependencies...');
  const npmInstall = spawn('npm', ['install'], { 
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true 
  });
  
  npmInstall.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
    startServer();
  });
} else {
  startServer();
}

function startServer() {
  console.log('✅ Dependencies installed');
  
  // Check if logs directory exists
  const logsPath = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath);
    console.log('📁 Created logs directory');
  }
  
  // Check if uploads directory exists
  const uploadsPath = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath);
    console.log('📁 Created uploads directory');
  }
  
  console.log('🔧 Starting server...\n');
  
  // Start the server
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('close', (code) => {
    console.log(`\n🛑 Server stopped with code ${code}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Gracefully shutting down...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Gracefully shutting down...');
    serverProcess.kill('SIGTERM');
  });
} 