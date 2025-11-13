const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const googleAuthService = require('../services/googleAuth.service');
const emailService = require('../services/emailService');
const { AppError } = require('../utils/errors');

const router = express.Router();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('employeeId')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Employee ID must be between 3 and 20 characters'),
  body('department')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Department must be between 2 and 50 characters'),
  body('site')
    .isMongoId()
    .withMessage('Please provide a valid site ID'),
  body('role')
    .optional()
          .isIn(['submitter', 'l1_approver', 'l2_approver', 'l3_approver', 'finance'])
    .withMessage('Invalid role specified')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { name, email, password, employeeId, department, site, role, phone, bankDetails } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { employeeId }]
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: existingUser.email === email ? 'Email already registered' : 'Employee ID already exists'
    });
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    employeeId,
    department,
    site,
    role: role || 'submitter',
    phone,
    bankDetails
  });

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Get user data without password
  const userData = await User.findById(user._id)
    .select('-password')
    .populate('site', 'name code location.city');

  // Get Socket.io instance
  const io = req.app.get('io');
  
  // Emit user registration event to admins
      io.to('role-l3_approver').to('role-finance').emit('user-registered', {
    user: userData,
    timestamp: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    token,
    user: userData
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  // Find user by email and include password
  const user = await User.findOne({ email }).select('+password').populate('site', 'name code location.city');

  // Print user email and hashed password if user found
  if (user) {
    console.log('LOGIN ATTEMPT:');
    console.log('User email:', user.email);
    console.log('User hashed password:', user.password);
  }

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if account is locked
  if (user.isLocked) {
    return res.status(423).json({
      success: false,
      message: 'Account is temporarily locked due to too many failed login attempts'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated. Please contact administrator'
    });
  }

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    // Increment login attempts
    await user.incLoginAttempts();
    
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = user.getSignedJwtToken();

  // Get user data without password
  const userData = await User.findById(user._id)
    .select('-password')
    .populate('site', 'name code location.city');

  // Get Socket.io instance
  const io = req.app.get('io');
  
  // Emit user login event to admins
      io.to('role-l3_approver').to('role-finance').emit('user-login', {
    user: userData,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: userData
  });
}));

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, asyncHandler(async (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just return success
  
  // Get Socket.io instance
  const io = req.app.get('io');
  
  // Emit user logout event to admins
      io.to('role-l3_approver').to('role-finance').emit('user-logout', {
    user: userData,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'Logout successful'
  });
}));

// @desc    Update user profile picture
// @route   PUT /api/auth/profile-picture
// @access  Private
router.put('/profile-picture', protect, asyncHandler(async (req, res) => {
  const { profilePicture } = req.body;

  if (!profilePicture) {
    return res.status(400).json({
      success: false,
      message: 'Profile picture filename is required'
    });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Update profile picture
  user.profilePicture = profilePicture;
  await user.save();

  const updatedUser = await User.findById(user._id)
    .select('-password')
    .populate('site', 'name code location.city');

  res.json({
    success: true,
    message: 'Profile picture updated successfully',
    user: updatedUser
  });
}));

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password')
    .populate('site', 'name code location.city vehicleKmLimit budget');

  res.json({
    success: true,
    user
  });
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  body('address.zipCode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Please provide a valid 6-digit zip code')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { name, phone, address, preferences, bankDetails } = req.body;

  const user = await User.findById(req.user.id);

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (address) user.address = { ...user.address, ...address };
  if (preferences) user.preferences = { ...user.preferences, ...preferences };
  if (bankDetails) user.bankDetails = { ...user.bankDetails, ...bankDetails };

  await user.save();

  const updatedUser = await User.findById(user._id)
    .select('-password')
    .populate('site', 'name code location.city');

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: updatedUser
  });
}));

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found with this email'
    });
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken();
  await user.save();

  // Send password reset email
  const emailSent = await emailService.sendPasswordResetEmail(user.email, resetToken);
  
  if (emailSent) {
    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email address.'
    });
  } else {
    // If email fails, still return success but with a note
    res.json({
      success: true,
      message: 'Password reset request received. Please check your email or contact administrator if you don\'t receive it.',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined // Only show token in development
    });
  }
}));

// @desc    Reset password
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
router.post('/reset-password/:resetToken', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], asyncHandler(async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  const { password } = req.body;
  const { resetToken } = req.params;

  // Hash the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Find user by reset token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token'
    });
  }

  // Set new password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset successful'
  });
}));

// @desc    Verify token
// @route   GET /api/auth/verify-token
// @access  Private
router.get('/verify-token', protect, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
}));

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Private
router.post('/refresh-token', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password')
    .populate('site', 'name code location.city');

  // Generate new token
  const token = user.getSignedJwtToken();

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    token,
    user
  });
}));

// @desc    Google OAuth Sign In
// @route   POST /api/auth/google
// @access  Public
router.post('/google', asyncHandler(async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    const googleData = await googleAuthService.verifyGoogleToken(token);
    
    // Find or create user
    const user = await googleAuthService.findOrCreateUser(googleData);
    
    // Generate JWT token
    const jwtToken = googleAuthService.generateToken(user);
    
    // Get user data without password
    const userData = await User.findById(user._id)
      .select('-password')
      .populate('site', 'name code location.city');

    // Get Socket.io instance
    const io = req.app.get('io');
    
    // Emit user login event to admins
    io.to('role-l3_approver').to('role-finance').emit('user-login', {
      user: userData,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Google sign-in successful',
      token: jwtToken,
      user: userData
    });

  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Google sign-in failed'
    });
  }
}));

// @desc    Send OTP to email for login
// @route   POST /api/auth/send-otp
// @access  Public
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'Valid email required' });
  }
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, errorCode: 'NOT_FOUND', message: 'User not found' });
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otpCode = otp;
  user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  await user.save();
  try { await emailService.sendOtpEmail(email, otp); } catch {}
  res.json({ success: true, message: 'OTP sent' });
}));

// @desc    Verify OTP and login
// @route   POST /api/auth/verify-otp
// @access  Public
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 4 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errorCode: 'VALIDATION_ERROR', message: 'Invalid input' });
  }
  const { email, otp } = req.body;
  const user = await User.findOne({ email }).populate('site', 'name code location.city');
  if (!user || !user.otpCode || !user.otpExpires || user.otpExpires < new Date() || user.otpCode !== otp) {
    return res.status(401).json({ success: false, errorCode: 'AUTH_REQUIRED', message: 'Invalid or expired OTP' });
  }
  user.otpCode = undefined; user.otpExpires = undefined; user.lastLogin = new Date();
  await user.save();
  const token = user.getSignedJwtToken();
  res.json({ success: true, message: 'Login successful', token, user });
}));

module.exports = router; 
 