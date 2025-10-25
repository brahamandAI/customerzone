const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: function() {
      // Password is not required for Google OAuth users
      return !this.googleId;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['submitter', 'l1_approver', 'l2_approver', 'l3_approver', 'finance'],
      message: 'Role must be either submitter, l1_approver, l2_approver, l3_approver, or finance'
    },
    default: 'submitter'
  },
  employeeId: {
    type: String,
    required: function() {
      // Employee ID is not required for Google OAuth users
      return !this.googleId;
    },
    unique: true,
    sparse: true,
    trim: true
  },
  department: {
    type: String,
    required: function() {
      // Department is not required for Google OAuth users
      return !this.googleId;
    },
    trim: true
  },
  site: {
    type: mongoose.Schema.ObjectId,
    ref: 'Site',
    required: function() {
      // Only require site for non-L3 and non-finance users
      return this.role !== 'l3_approver' && this.role !== 'finance';
    }
  },
  phone: {
    type: String,
    match: [
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please add a valid phone number'
    ]
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  bankDetails: {
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountHolderName: { type: String, trim: true }
  },
  profilePicture: {
    type: String,
    default: 'default-avatar.png'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  otpCode: String,
  otpExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  preferences: {
    darkMode: {
      type: Boolean,
      default: false
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  permissions: {
    canCreateExpenses: {
      type: Boolean,
      default: true
    },
    canApproveExpenses: {
      type: Boolean,
      default: false
    },
    canManageUsers: {
      type: Boolean,
      default: false
    },
    canManageSites: {
      type: Boolean,
      default: false
    },
    canViewReports: {
      type: Boolean,
      default: false
    },
    canManageBudgets: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name display
userSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.employeeId})`;
});

// Virtual for role display
userSchema.virtual('roleDisplay').get(function() {
  const roleMap = {
    submitter: 'Submitter',
    l1_approver: 'L1 Approver',
    l2_approver: 'L2 Approver',
    l3_approver: 'Super Admin',
    finance: 'Finance'
  };
  return roleMap[this.role] || this.role;
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ site: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'submitter':
        this.permissions = {
          canCreateExpenses: true,
          canApproveExpenses: false,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: false,
          canManageBudgets: false
        };
        break;
      case 'l1_approver':
        this.permissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: true,
          canManageBudgets: false
        };
        break;
      case 'l2_approver':
        this.permissions = {
          canCreateExpenses: true,
          canApproveExpenses: true,
          canManageUsers: false,
          canManageSites: false,
          canViewReports: true,
          canManageBudgets: true
        };
        break;
             case 'l3_approver':
         this.permissions = {
           canCreateExpenses: true,
           canApproveExpenses: true,
           canManageUsers: true,
           canManageSites: true,
           canViewReports: true,
           canManageBudgets: true
         };
         break;
       case 'finance':
         this.permissions = {
           canCreateExpenses: false,
           canApproveExpenses: true,
           canManageUsers: false,
           canManageSites: false,
           canViewReports: true,
           canManageBudgets: false
         };
         break;
    }
  }
  next();
});

// Pre-save middleware to update updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Method to match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate and hash password token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we have hit max attempts and it's not locked already, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 5 * 60 * 1000 }; // 5 minutes
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check if user can approve expenses at a certain level
userSchema.methods.canApproveAtLevel = function(level) {
  const userLevel = this.role.replace('l', '').replace('_approver', '');
  return parseInt(userLevel) >= level;
};

// Method to get user's approval level
userSchema.methods.getApprovalLevel = function() {
  if (this.role === 'submitter') return 0;
  return parseInt(this.role.replace('l', '').replace('_approver', ''));
};

// Static method to get users by role
userSchema.statics.getUsersByRole = function(role) {
  return this.find({ role, isActive: true }).populate('site');
};

// Static method to get approvers for a site
userSchema.statics.getApproversForSite = function(siteId) {
  return this.find({
    site: siteId,
    role: { $in: ['l1_approver', 'l2_approver', 'l3_approver'] },
    isActive: true
  }).populate('site');
};

module.exports = mongoose.model('User', userSchema); 