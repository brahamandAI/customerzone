const mongoose = require('mongoose');
const crypto = require('crypto');

const batchOTPSchema = new mongoose.Schema({
  otp: {
    type: String,
    required: true,
    select: false
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  expenseIds: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Expense',
    required: true
  }],
  purpose: {
    type: String,
    enum: ['batch_payment', 'batch_approval'],
    default: 'batch_payment'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      // OTP expires in 5 minutes
      return new Date(Date.now() + 5 * 60 * 1000);
    }
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for automatic expiry
batchOTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for performance
batchOTPSchema.index({ user: 1, isUsed: 1, expiresAt: 1 });

// Method to generate 6-digit OTP
batchOTPSchema.methods.generateOTP = function() {
  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP before storing
  this.otp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
  
  return otp; // Return plain OTP for sending via email/SMS
};

// Method to verify OTP
batchOTPSchema.methods.verifyOTP = function(enteredOTP) {
  // Check if OTP has expired
  if (new Date() > this.expiresAt) {
    return {
      success: false,
      message: 'OTP has expired. Please generate a new OTP.'
    };
  }
  
  // Check if OTP has been used
  if (this.isUsed) {
    return {
      success: false,
      message: 'OTP has already been used.'
    };
  }
  
  // Check max attempts
  if (this.attempts >= this.maxAttempts) {
    return {
      success: false,
      message: 'Maximum attempts exceeded. Please generate a new OTP.'
    };
  }
  
  // Increment attempts
  this.attempts += 1;
  
  // Hash entered OTP and compare
  const hashedEnteredOTP = crypto
    .createHash('sha256')
    .update(enteredOTP)
    .digest('hex');
  
  if (hashedEnteredOTP === this.otp) {
    this.isUsed = true;
    this.usedAt = new Date();
    return {
      success: true,
      message: 'OTP verified successfully'
    };
  }
  
  return {
    success: false,
    message: `Invalid OTP. ${this.maxAttempts - this.attempts} attempts remaining.`
  };
};

// Static method to clean expired OTPs
batchOTPSchema.statics.cleanExpiredOTPs = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  console.log(`🧹 Cleaned ${result.deletedCount} expired OTPs`);
  return result;
};

// Static method to get active OTP for user
batchOTPSchema.statics.getActiveOTP = function(userId) {
  return this.findOne({
    user: userId,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).select('+otp');
};

module.exports = mongoose.model('BatchOTP', batchOTPSchema);

