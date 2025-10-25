const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Site = require('../models/Site');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile-photos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload profile photo - MUST BE FIRST ROUTE TO AVOID CONFLICTS
router.post('/upload-profile-photo', protect, upload.single('profilePhoto'), async (req, res) => {
  try {
    console.log('🔍 DEBUG: Upload endpoint hit');
    console.log('DEBUG: Request headers:', req.headers);
    console.log('DEBUG: Request body:', req.body);
    console.log('DEBUG: Request file:', req.file);

    if (!req.file) {
      console.log('❌ DEBUG: No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('✅ DEBUG: File received:', req.file.originalname);

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      console.log('❌ DEBUG: User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old profile photo if exists and not default
    if (user.profilePicture && user.profilePicture !== 'default-avatar.png') {
      const oldPhotoPath = path.join('uploads/profile-photos', user.profilePicture);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
        console.log('🗑️ DEBUG: Old photo deleted:', user.profilePicture);
      }
    }

    // Update user's profile picture
    user.profilePicture = req.file.filename;
    await user.save();

    console.log('✅ DEBUG: Profile photo updated successfully:', req.file.filename);

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      profilePicture: req.file.filename
    });

  } catch (error) {
    console.error('❌ DEBUG: Error uploading profile photo:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile photo',
      error: error.message
    });
  }
});

// Get profile photo - MUST BE SECOND ROUTE TO AVOID CONFLICTS
router.get('/profile-photo/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads/profile-photos', filename);
  
  // Add comprehensive CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    // Return 404 if file doesn't exist (frontend will show default avatar)
    res.status(404).json({ message: 'Profile photo not found' });
  }
});

// Create new user (Admin only)
router.post('/create', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  // Debug logs
  console.log('🔍 DEBUG: User creation endpoint hit!');
  console.log('DEBUG: Current user role:', req.user.role);
  console.log('DEBUG: Current user email:', req.user.email);
  console.log('DEBUG: Current user ID:', req.user.id);
  console.log('DEBUG: Request body:', req.body);
  
  try {
    const {
      fullName,
      email,
      phoneNumber,
      employeeId,
      department,
      role,
      site, // Changed from assignedSites to site
      initialPassword,
      // Notification preferences
      emailNotifications,
      pushNotifications,
      smsNotifications,
      // Permissions
      canCreateExpenses,
      canApproveExpenses,
      canManageUsers,
      canManageSites,
      canViewReports,
      canManageBudgets,
      // Address
      streetAddress,
      city,
      state,
      pinCode,
      // Bank Details
      bankAccountNumber,
      bankIfscCode,
      bankName,
      bankAccountHolderName
    } = req.body;

    // Check if user with email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if employee ID already exists
    const existingEmployeeId = await User.findOne({ employeeId });

    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'User with this employee ID already exists'
      });
    }

    // Find site by code if provided
    let siteId = undefined;
    if (site) {
      const foundSite = await Site.findOne({ code: site });
      if (!foundSite) {
        return res.status(400).json({
          success: false,
          message: 'Site not found with the provided code'
        });
      }
      siteId = foundSite._id;
    }

    // Create new user
    const newUser = new User({
      name: fullName,
      email,
      password: initialPassword, // Let the User model handle password hashing
      employeeId,
      department,
      role: role.toLowerCase(), // Convert to lowercase to match Mongoose enum
      phone: phoneNumber,
      site: siteId,
      address: {
        street: streetAddress,
        city,
        state,
        zipCode: pinCode,
        country: 'India'
      },
      bankDetails: {
        accountNumber: bankAccountNumber,
        ifscCode: bankIfscCode,
        bankName: bankName,
        accountHolderName: bankAccountHolderName
      },
      preferences: {
        notifications: {
          email: emailNotifications,
          push: pushNotifications,
          sms: smsNotifications
        },
        language: 'en',
        timezone: 'Asia/Kolkata',
        currency: 'INR'
      },
      permissions: {
        canCreateExpenses,
        canApproveExpenses,
        canManageUsers,
        canManageSites,
        canViewReports,
        canManageBudgets
      },
      isActive: true,
      isEmailVerified: false
    });

    await newUser.save();

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all users (Admin only)
router.get('/all', protect, authorize('l2_approver', 'l3_approver', 'finance'), async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .populate('site', 'name code')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});



// Delete user (Admin only)
router.delete('/:userId', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    console.log('🗑️ DELETE /users/:userId - Request received');
    console.log('User ID to delete:', req.params.userId);
    console.log('Current user:', req.user.email, 'Role:', req.user.role);
    
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    console.log('User to delete found:', user ? user.email : 'Not found');

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (req.user._id.toString() === userId) {
      console.log('❌ Attempt to delete own account');
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Check if user has any pending expenses
    const Expense = require('../models/Expense');
    const pendingExpenses = await Expense.find({
      submittedBy: userId,
      status: { $in: ['pending', 'l1_approved', 'l2_approved'] }
    });

    console.log('Pending expenses found:', pendingExpenses.length);

    if (pendingExpenses.length > 0) {
      console.log('❌ Cannot delete user with pending expenses');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with pending expenses. Please process all pending expenses first.'
      });
    }

    // HARD DELETE - Permanently remove user from database
    console.log(`🗑️ Performing HARD DELETE for user: ${user.email}`);
    await User.deleteOne({ _id: userId });

    console.log(`✅ User ${user.email} permanently deleted from database by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User permanently deleted from database'
    });

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get user by ID
router.get('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Users can only access their own data unless they're admin
    if (req.user._id.toString() !== userId && req.user.role !== 'l3_approver' && req.user.role !== 'finance') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId)
      .select('-password')
      .populate('site', 'name code');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update user profile
router.put('/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      name, 
      phone, 
      department, 
      avatar, 
      bankDetails, 
      role,
      email,
      employeeId,
      address,
      // Notification preferences
      emailNotifications,
      pushNotifications,
      smsNotifications,
      // Permissions
      canCreateExpenses,
      canApproveExpenses,
      canManageUsers,
      canManageSites,
      canViewReports,
      canManageBudgets
    } = req.body;

    // Users can only update their own profile unless they're admin
    if (req.user._id.toString() !== userId && req.user.role !== 'l3_approver' && req.user.role !== 'finance') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update basic fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (department) user.department = department;
    if (avatar) user.avatar = avatar;
    if (email) user.email = email;
    if (employeeId) user.employeeId = employeeId;
    if (address) user.address = { ...user.address, ...address };
    if (bankDetails) user.bankDetails = { ...user.bankDetails, ...bankDetails };

    // Update role (only for admin users)
    if (role && (req.user.role === 'l3_approver' || req.user.role === 'finance')) {
      user.role = role;
    }

    // Update notification preferences
    if (emailNotifications !== undefined) {
      user.preferences.notifications.email = emailNotifications;
    }
    if (pushNotifications !== undefined) {
      user.preferences.notifications.push = pushNotifications;
    }
    if (smsNotifications !== undefined) {
      user.preferences.notifications.sms = smsNotifications;
    }

    // Update permissions (only for admin users)
    if (req.user.role === 'l3_approver' || req.user.role === 'finance') {
      if (canCreateExpenses !== undefined) user.permissions.canCreateExpenses = canCreateExpenses;
      if (canApproveExpenses !== undefined) user.permissions.canApproveExpenses = canApproveExpenses;
      if (canManageUsers !== undefined) user.permissions.canManageUsers = canManageUsers;
      if (canManageSites !== undefined) user.permissions.canManageSites = canManageSites;
      if (canViewReports !== undefined) user.permissions.canViewReports = canViewReports;
      if (canManageBudgets !== undefined) user.permissions.canManageBudgets = canManageBudgets;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Change password
router.put('/:userId/password', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Users can only change their own password unless they're admin
    if (req.user._id.toString() !== userId && req.user.role !== 'l3_approver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password (not required for admin)
    if (req.user._id.toString() === userId) {
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update user role (Admin only)
router.put('/:userId/role', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Deactivate user (Admin only)
router.put('/:userId/deactivate', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get users by role
router.get('/role/:role', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { role } = req.params;

    const users = await User.find({ 
      role: role, 
      isActive: true 
    })
    .select('-password')
      .sort({ name: 'asc' });

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router; 