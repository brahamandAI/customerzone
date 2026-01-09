const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
// const fileUpload = require('express-fileupload'); // COMMENTED OUT - CONFLICTS WITH MULTER
const { createServer } = require('http');
const { Server } = require('socket.io');
const winston = require('winston');
const nodeCron = require('node-cron');
const path = require('path');
const fs = require('fs');

// Load environment variables based on NODE_ENV
// Development: .env.local (if exists) or .env
// Production: .env
const envCandidates = process.env.NODE_ENV === 'production'
  ? ['.env.production', '.env']
  : ['.env.local', '.env', '.env.production'];

const envFile = envCandidates.find((candidate) =>
  fs.existsSync(path.join(__dirname, candidate))
) || '.env';

require('dotenv').config({ path: path.join(__dirname, envFile) });

const app = express();
const server = createServer(app);

// Initialize Socket.io with CORS
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:3004']);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true, // Allow all in production if not specified
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Winston Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'rakshak-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
// Make logger available to routes and error utils
app.set('logger', logger);

// Security middleware
const backendUrl = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001');
const frontendUrls = allowedOrigins.length > 0 ? allowedOrigins : [];

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", ...(backendUrl ? [backendUrl] : [])],
      frameSrc: ["'self'", ...frontendUrls, ...(backendUrl ? [backendUrl] : []), "blob:", "data:"],
      frameAncestors: ["'self'", ...frontendUrls],
      mediaSrc: ["'self'", "blob:", "data:"],
      connectSrc: ["'self'", ...frontendUrls, ...(backendUrl ? [backendUrl] : [])],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(cookieParser());

// Rate limiting with different limits for different endpoints
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // limit each IP to 50 requests per windowMs for auth endpoints
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// CORS configuration for Express
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true, // Allow all in production if not specified
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static file serving for profile photos
app.use('/api/users/profile-photo', express.static(path.join(__dirname, 'uploads/profile-photos'), {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware - COMMENTED OUT TO AVOID CONFLICT WITH MULTER
// app.use(fileUpload({
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
//   abortOnLimit: true,
//   responseOnLimit: 'File size limit exceeded',
//   useTempFiles: true,
//   tempFileDir: '/tmp/',
//   createParentPath: true
// }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// MongoDB connection with advanced options
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rakshak-expense', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Database event listeners
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
    
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // Join user to their role-based room
  socket.on('join-role-room', (userRole) => {
    socket.join(`role-${userRole}`);
    logger.info(`User ${socket.id} joined role room: ${userRole}`);
  });
  
  // Join user to their specific user room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${socket.id} joined user room: ${userId}`);
  });
  
  // Join user to site-based room
  socket.on('join-site-room', (siteId) => {
    socket.join(`site-${siteId}`);
    logger.info(`User ${socket.id} joined site room: ${siteId}`);
  });
  
  // Handle expense status updates
  socket.on('expense-status-update', (data) => {
    // Broadcast to relevant users
    socket.to(`site-${data.siteId}`).emit('expense-updated', data);
    socket.to('role-l1_approver').emit('expense-updated', data);
    socket.to('role-l2_approver').emit('expense-updated', data);
    socket.to('role-l3_approver').emit('expense-updated', data);
  });
  
  // Handle budget alerts
  socket.on('budget-alert', (data) => {
    socket.to('role-l3_approver').emit('budget-alert', data);
  });
  
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const siteRoutes = require('./routes/sites');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const categoryRoutes = require('./routes/categories');
const paymentRoutes = require('./routes/payments');
const testNotificationRoutes = require('./routes/test-notifications');
const financeRoutes = require('./routes/finance');
const batchPaymentRoutes = require('./routes/batchPayments');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/test-notifications', testNotificationRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/batch-payments', batchPaymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Rakshak Expense Management System API',
    version: '1.0.0',
    status: 'Active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      sites: '/api/sites',
      expenses: '/api/expenses',
      dashboard: '/api/dashboard',
      reports: '/api/reports',
      notifications: '/api/notifications',
      categories: '/api/categories',
      payments: '/api/payments'
    },
    features: [
      'Real-time updates via Socket.io',
      'Multi-level expense approval',
      'Vehicle KM tracking',
      'Budget management',
      'File upload support',
      'Email notifications',
      'Comprehensive logging',
    ]
  });
});

// Error handling middleware (standardized)
const { errorResponder } = require('./utils/errors');
app.use(errorResponder);

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Socket.IO server ready for connections`);
});

// Monthly reset cron job - Reset site statistics on 1st of every month at 00:01
nodeCron.schedule('1 0 1 * *', async () => {
  try {
    logger.info('🔄 Starting monthly site statistics reset...');
    
    const Site = require('./models/Site');
    const sites = await Site.find({ isActive: true });
    
    let resetCount = 0;
    for (const site of sites) {
      await site.resetMonthlyStats();
      resetCount++;
      logger.info(`✅ Reset monthly stats for site: ${site.name}`);
    }
    
    logger.info(`✅ Monthly reset completed for ${resetCount} sites`);
  } catch (error) {
    logger.error('❌ Error during monthly reset:', error);
  }
}, {
  timezone: 'Asia/Kolkata'
});

logger.info('📅 Monthly reset cron job scheduled for 1st of every month at 00:01 IST');

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close(() => {
    logger.info('HTTP server closed');

    mongoose.connection.close()
      .then(() => {
        logger.info('MongoDB connection closed');
        process.exit(0);
      })
      .catch((error) => {
        logger.error('Error closing MongoDB connection', error);
        process.exit(1);
      });
  });
  
  // Force close server after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, server, io }; 