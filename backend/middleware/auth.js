const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Protect routes - verify JWT token
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('site', '_id name code location vehicleKmLimit budget');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('DEBUG: authorize middleware - req.user:', req.user);
    console.log('DEBUG: authorize middleware - req.user.role:', req.user?.role);
    console.log('DEBUG: authorize middleware - required roles:', roles);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log('DEBUG: authorize middleware - role mismatch!');
      console.log('DEBUG: authorize middleware - user role:', req.user.role);
      console.log('DEBUG: authorize middleware - required roles:', roles);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Check if user has specific permission
exports.checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!req.user.permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${permission.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      });
    }

    next();
  };
};

// Check if user can approve at specific level
exports.checkApprovalLevel = (requiredLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    const userLevel = req.user.getApprovalLevel();
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `You need L${requiredLevel} or higher approval level to access this route`
      });
    }

    next();
  };
};

// Check if user belongs to the same site
exports.checkSiteAccess = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  // L3 approvers can access all sites
  if (req.user.role === 'l3_approver') {
    return next();
  }

  const siteId = req.params.siteId || req.body.site || req.query.site;
  
  if (!siteId) {
    return res.status(400).json({
      success: false,
      message: 'Site ID is required'
    });
  }

  // Handle both cases: req.user.site can be ObjectId or populated site object
  let userSiteId;
  if (typeof req.user.site === 'string' || (req.user.site && req.user.site._bsontype === 'ObjectID')) {
    userSiteId = req.user.site.toString();
  } else if (req.user.site && req.user.site._id) {
    userSiteId = req.user.site._id.toString();
  } else {
    return res.status(403).json({
      success: false,
      message: 'No site assigned to user'
    });
  }
  
  if (userSiteId !== siteId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only access data from your assigned site'
    });
  }

  next();
});

// Check if user owns the resource or has permission to access it
exports.checkResourceOwnership = (resourceModel, ownerField = 'submittedBy') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    const resourceId = req.params.id;
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required'
      });
    }

    const Model = require(`../models/${resourceModel}`);
    const resource = await Model.findById(resourceId);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: `${resourceModel} not found`
      });
    }

    // Check ownership
    const isOwner = resource[ownerField].toString() === req.user._id.toString();
    
    // Check if user has management permissions
    const canManage = req.user.role === 'l3_approver' || 
                     (req.user.role === 'l2_approver' && req.user.permissions.canManageBudgets) ||
                     (req.user.role === 'l1_approver' && req.user.permissions.canApproveExpenses);

    if (!isOwner && !canManage) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own resources'
      });
    }

    req.resource = resource;
    next();
  });
};

// Rate limiting for sensitive operations
exports.rateLimitSensitive = (windowMs = 15 * 60 * 1000, max = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.user ? req.user._id : '');
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key).filter(time => time > windowStart);
      attempts.set(key, userAttempts);
    }

    const currentAttempts = attempts.get(key) || [];

    if (currentAttempts.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts, please try again later'
      });
    }

    currentAttempts.push(now);
    attempts.set(key, currentAttempts);

    next();
  };
};

// Middleware to log user actions
exports.logUserAction = (action) => {
  return (req, res, next) => {
    if (req.user) {
      console.log(`User ${req.user.email} performed action: ${action}`);
      
      // You can extend this to log to database or external service
      req.userAction = {
        user: req.user._id,
        action,
        timestamp: new Date(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };
    }

    next();
  };
};

// Middleware to check if user can modify expense based on status
exports.checkExpenseModificationPermission = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  const expenseId = req.params.id;
  
  if (!expenseId) {
    return res.status(400).json({
      success: false,
      message: 'Expense ID is required'
    });
  }

  const Expense = require('../models/Expense');
  const expense = await Expense.findById(expenseId);

  if (!expense) {
    return res.status(404).json({
      success: false,
      message: 'Expense not found'
    });
  }

  // Check if user owns the expense
  const isOwner = expense.submittedBy.toString() === req.user._id.toString();
  
  // Check if expense can be modified based on status
  const canModifyStatuses = ['draft', 'rejected'];
  const canModify = canModifyStatuses.includes(expense.status);

  // L3 approvers can always modify
  const isL3Approver = req.user.role === 'l3_approver';

  if (!isOwner && !isL3Approver) {
    return res.status(403).json({
      success: false,
      message: 'You can only modify your own expenses'
    });
  }

  if (!canModify && !isL3Approver) {
    return res.status(403).json({
      success: false,
      message: `Cannot modify expense with status: ${expense.status}`
    });
  }

  req.expense = expense;
  next();
});

// Middleware to validate API key for external integrations
exports.validateApiKey = asyncHandler(async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }

  // In a real application, you would validate this against a database
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  next();
});

// Middleware to check if operation is allowed during business hours
exports.checkBusinessHours = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.site) {
    return next();
  }

  const site = req.user.site;
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  const isWorkingDay = site.workingDays?.includes(currentDay);
  const isWorkingHours = site.operatingHours && 
                        currentTime >= site.operatingHours.start && 
                        currentTime <= site.operatingHours.end;

  // Allow L3 approvers to work anytime
  if (req.user.role === 'l3_approver') {
    return next();
  }

  // Check if site allows operations outside business hours
  if (!isWorkingDay && !site.settings?.allowWeekendExpenses) {
    return res.status(403).json({
      success: false,
      message: 'This operation is not allowed on weekends'
    });
  }

  if (!isWorkingHours && !site.settings?.allowAfterHoursExpenses) {
    return res.status(403).json({
      success: false,
      message: 'This operation is only allowed during business hours'
    });
  }

  next();
}); 