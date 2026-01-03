const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Single Port Configuration for Rakshak Expense Management...\n');

// Create .env file for backend
const envContent = `# Server Configuration
NODE_ENV=development
PORT=5001
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/rakshak-expense

# JWT Configuration
JWT_SECRET=rakshak_super_secret_jwt_key_2024
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# Email Configuration (for notifications)
EMAIL_FROM=noreply@rakshaksecuritas.com
EMAIL_FROM_NAME=Rakshak Securitas
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# SMS Configuration (Fast2SMS)
FAST2SMS_API_KEY=your_fast2sms_api_key_here
FAST2SMS_SENDER_ID=RAKSHAK

# File Upload Configuration
MAX_FILE_SIZE=10485760
FILE_UPLOAD_PATH=./uploads

# Cloudinary Configuration (optional for cloud storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# System Configuration
TIMEZONE=Asia/Kolkata
CURRENCY=INR
COMPANY_NAME=Rakshak Securitas

# Security Configuration
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=30

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# Budget Alert Configuration
BUDGET_ALERT_THRESHOLD=80
BUDGET_CRITICAL_THRESHOLD=95

# Cron Job Configuration
ENABLE_CRON_JOBS=true
BUDGET_CHECK_CRON=0 9 * * *
REPORT_GENERATION_CRON=0 0 1 * *

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=5242880
LOG_FILE_MAX_FILES=5
`;

try {
  // Create backend .env file
  fs.writeFileSync(path.join(__dirname, 'backend', '.env'), envContent);
  console.log('✅ Backend .env file created successfully');
  
  // Update backend server.js to handle CORS for frontend
  const serverPath = path.join(__dirname, 'backend', 'server.js');
  let serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Update CORS configuration
  serverContent = serverContent.replace(
    /origin: process\.env\.FRONTEND_URL \|\| 'http:\/\/localhost:3000'/g,
    "origin: ['http://localhost:3000', 'http://localhost:5001'], credentials: true"
  );
  
  fs.writeFileSync(serverPath, serverContent);
  console.log('✅ Backend CORS configuration updated');
  
  console.log('\n🎉 Single Port Setup Complete!');
  console.log('\n📋 How to run:');
  console.log('1. Backend will run on: http://localhost:5001');
  console.log('2. Frontend will run on: http://localhost:3000');
  console.log('3. API calls from frontend will be proxied to backend');
  console.log('4. Use command: npm run dev-single-port');
  
  console.log('\n🔧 Configuration Details:');
  console.log('- Frontend proxy: http://localhost:5001');
  console.log('- Backend port: 5001');
  console.log('- Frontend port: 3000');
  console.log('- Database: MongoDB on localhost:27017');
  
} catch (error) {
  console.error('❌ Error during setup:', error.message);
} 