const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // Basic Information
  expenseNumber: {
    type: String,
    required: [true, 'Please add expense number'],
    unique: true,
    trim: true,
    maxlength: [50, 'Expense number cannot be more than 50 characters']
  },
  title: {
    type: String,
    required: [true, 'Please add expense title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Please add expense amount'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  category: {
    type: String,
    required: [true, 'Please select expense category'],
    enum: [
      'Travel',
      'Food',
      'Accommodation',
      'Vehicle KM',
      'Fuel',
      'Equipment',
      'Maintenance',
      'Office Supplies',
      'Miscellaneous'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Date Information
  expenseDate: {
    type: Date,
    required: [true, 'Please add expense date'],
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Expense date cannot be in the future'
    }
  },
  submissionDate: {
    type: Date,
    default: Date.now
  },
  
  // Reservation expiry for temporary expense number reservations
  reservationExpiry: {
    type: Date,
    default: null
  },
  
  // User and Site Information
  submittedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Please add submitter']
  },
  site: {
    type: mongoose.Schema.ObjectId,
    ref: 'Site',
    required: [true, 'Please add site']
  },
  department: {
    type: String,
    required: [true, 'Please add department'],
    trim: true
  },
  
  // Vehicle KM Specific Fields
  vehicleKm: {
    startKm: {
      type: Number,
      min: [0, 'Start KM cannot be negative']
    },
    endKm: {
      type: Number,
      min: [0, 'End KM cannot be negative']
    },
    totalKm: {
      type: Number,
      min: [0, 'Total KM cannot be negative']
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    purpose: {
      type: String,
      trim: true
    },
    route: {
      from: String,
      to: String,
      via: [String]
    },
    ratePerKm: {
      type: Number,
      default: 10,
      min: [0, 'Rate per KM cannot be negative']
    },
    exceedsLimit: {
      type: Boolean,
      default: false
    },
    exceedReason: {
      type: String,
      trim: true
    }
  },
  
  // Travel Specific Fields
  travel: {
    from: String,
    to: String,
    travelDate: Date,
    returnDate: Date,
    mode: {
      type: String,
      enum: ['Flight', 'Train', 'Bus', 'Car', 'Taxi', 'Other']
    },
    bookingReference: String,
    passengerName: String
  },
  
  // Accommodation Specific Fields
  accommodation: {
    hotelName: String,
    checkIn: Date,
    checkOut: Date,
    location: String,
    roomType: String,
    guestName: String,
    bookingReference: String
  },
  
  // File Attachments
  attachments: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    uploadDate: {
      type: Date,
      default: Date.now
    },
    isReceipt: {
      type: Boolean,
      default: false
    }
  }],
  
  // Fraud & Policy Detection
  receiptHash: {
    type: String,
    index: true
  },
  normalizedKey: {
    type: String,
    index: true
  },
  policyFlags: [{
    type: String,
    enum: [
      'DUPLICATE_RECEIPT',
      'SOFT_DUPLICATE',
      'OVER_LIMIT_TRAVEL',
      'CASH_OVER_CAP',
      'SUSPECT',
      'LOCATION_MISMATCH',
      'DISTANCE_EXCEEDED'
    ]
  }],
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Geo Tagging
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      index: '2dsphere',
    },
    accuracy: Number
  },
  
  // Approval Workflow
  status: {
    type: String,
    enum: [
      'draft',
      'submitted',
      'under_review',
      'approved_l1',
      'approved_l2',
      'approved_l3',
      'approved_finance',
      'approved',
      'rejected',
      'cancelled',
      'reimbursed',
      'payment_processed',
      'refunded',
      'reserved'
    ],
    default: 'draft'
  },
  currentApprovalLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 4
  },
  requiredApprovalLevel: {
    type: Number,
    default: 1,
    min: 0,
    max: 4
  },
  
  // Payment Information
  paymentAmount: {
    type: Number,
    min: [0, 'Payment amount cannot be negative']
  },
  paymentDate: {
    type: Date
  },
  paymentProcessedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  paymentDetails: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paymentMethod: String,
    bank: String,
    cardId: String,
    wallet: String,
    vpa: String,
    email: String,
    contact: String
  },
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundDate: Date,
    refundedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  
  // Approval History
  approvalHistory: [{
    level: {
      type: Number,
      required: true
    },
    approver: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: ['approved', 'rejected', 'returned', 'payment_processed'],
      required: true
    },
    comments: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  
  // Current Approvers
  pendingApprovers: [{
    level: Number,
    approver: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    assignedDate: {
      type: Date,
      default: Date.now
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    lastReminderDate: Date
  }],
  
  // Comments and Notes
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  
  // Reimbursement Information
  reimbursement: {
    amount: {
      type: Number,
      min: [0, 'Reimbursement amount cannot be negative']
    },
    date: Date,
    method: {
      type: String,
      enum: ['Bank Transfer', 'Cash', 'Cheque', 'Digital Wallet']
    },
    reference: String,
    processedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      accountHolderName: String
    }
  },
  
  // Audit Trail
  auditTrail: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String
  }],
  
  // Metadata
  tags: [{
    type: String,
    trim: true
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    interval: {
      type: Number,
      min: 1
    },
    endDate: Date,
    nextOccurrence: Date
  },
  
  // Policy Compliance
  policyCompliance: {
    isCompliant: {
      type: Boolean,
      default: true
    },
    violations: [{
      rule: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    }],
    reviewedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    reviewDate: Date
  },
  
  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
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

// Virtual for expense ID display
expenseSchema.virtual('expenseId').get(function() {
  return `EXP-${this._id.toString().slice(-6).toUpperCase()}`;
});

// Virtual for status display
expenseSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'draft': 'Draft',
    'submitted': 'Submitted',
    'under_review': 'Under Review',
    'approved_l1': 'L1 Approved',
    'approved_l2': 'L2 Approved',

    'approved_l3': 'L3 Approved',
    'approved_finance': 'Finance Approved',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'cancelled': 'Cancelled',
    'reimbursed': 'Reimbursed'
  };
  return statusMap[this.status] || this.status;
});

// Virtual for days since submission
expenseSchema.virtual('daysSinceSubmission').get(function() {
  if (!this.submissionDate) return 0;
  const diffTime = Math.abs(new Date() - this.submissionDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for approval progress percentage
expenseSchema.virtual('approvalProgress').get(function() {
  if (this.requiredApprovalLevel === 0) return 100;
  return Math.round((this.currentApprovalLevel / this.requiredApprovalLevel) * 100);
});

// Virtual for is overdue
expenseSchema.virtual('isOverdue').get(function() {
  return this.daysSinceSubmission > 7 && !['approved', 'rejected', 'cancelled', 'reimbursed'].includes(this.status);
});

// Virtual for total attachments size
expenseSchema.virtual('totalAttachmentsSize').get(function() {
  if (!this.attachments || !Array.isArray(this.attachments)) {
    return 0;
  }
  return this.attachments.reduce((total, attachment) => total + (attachment.size || 0), 0);
});

// Indexes for performance
expenseSchema.index({ submittedBy: 1, status: 1 });
expenseSchema.index({ site: 1, status: 1 });
expenseSchema.index({ status: 1, submissionDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });
expenseSchema.index({ 'pendingApprovers.approver': 1 });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ amount: 1 });
expenseSchema.index({ isActive: 1, isDeleted: 1 });
// Fraud detection indexes
expenseSchema.index({ receiptHash: 1 });
expenseSchema.index({ normalizedKey: 1 });
expenseSchema.index({ submittedBy: 1, expenseDate: -1, amount: 1 });

// Compound indexes
expenseSchema.index({ site: 1, category: 1, expenseDate: -1 });
expenseSchema.index({ submittedBy: 1, expenseDate: -1 });

// Pre-save middleware to calculate vehicle KM total
expenseSchema.pre('save', function(next) {
  if (this.category === 'Vehicle KM' && this.vehicleKm.startKm && this.vehicleKm.endKm) {
    this.vehicleKm.totalKm = this.vehicleKm.endKm - this.vehicleKm.startKm;
    
    // Calculate amount based on KM and rate
    if (this.vehicleKm.totalKm > 0 && this.vehicleKm.ratePerKm > 0) {
      this.amount = this.vehicleKm.totalKm * this.vehicleKm.ratePerKm;
    }
  }
  next();
});

// Pre-save middleware to update timestamps
expenseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to add audit trail
expenseSchema.pre('save', function(next) {
  if (this.isNew) {
    this.auditTrail.push({
      action: 'created',
      performedBy: this.submittedBy,
      details: { status: this.status }
    });
  } else if (this.isModified('status')) {
    this.auditTrail.push({
      action: 'status_changed',
      performedBy: this.submittedBy, // This should be set by the controller
      details: { 
        oldStatus: this.constructor.findOne({ _id: this._id }).status,
        newStatus: this.status 
      }
    });
  }
  next();
});

// Method to add approval
expenseSchema.methods.addApproval = function(approver, level, action, comments, ipAddress, userAgent) {
  this.approvalHistory.push({
    level,
    approver,
    action,
    comments,
    ipAddress,
    userAgent
  });
  
  if (action === 'approved') {
    this.currentApprovalLevel = Math.max(this.currentApprovalLevel, level);
    
    // Update status based on approval level
    if (level === 1) this.status = 'approved_l1';
    else if (level === 2) this.status = 'approved_l2';

    else if (level === 3) this.status = 'approved_l3';
    else if (level === 4) this.status = 'approved_finance';
    
    // Check if fully approved
    if (this.currentApprovalLevel >= this.requiredApprovalLevel) {
      this.status = 'approved';
      this.pendingApprovers = [];
    } else {
      // Remove current approver and keep pending ones
      this.pendingApprovers = (this.pendingApprovers || []).filter(pa => pa.level !== level);
    }
  } else if (action === 'rejected') {
    this.status = 'rejected';
    this.pendingApprovers = [];
  }
  
  return this.save();
};

// Method to add comment
expenseSchema.methods.addComment = function(user, text, isInternal = false) {
  this.comments.push({
    user,
    text,
    isInternal
  });
  return this.save();
};

// Method to check if user can approve
expenseSchema.methods.canUserApprove = function(user) {
  // Check if user is in pending approvers
  return (this.pendingApprovers || []).some(pa => 
    pa.approver.toString() === user._id.toString()
  );
};

// Method to check if expense needs receipt
expenseSchema.methods.needsReceipt = function(site) {
  return this.amount >= (site?.settings?.requireReceiptForAmount || 100);
};

// Method to check if expense has receipt
expenseSchema.methods.hasReceipt = function() {
  return (this.attachments || []).some(attachment => attachment.isReceipt);
};

// Method to calculate reimbursement amount
expenseSchema.methods.calculateReimbursement = function() {
  // Apply any policy deductions here
  let reimbursableAmount = this.amount;
  
  // Check policy violations
  if (!this.policyCompliance.isCompliant) {
    const criticalViolations = (this.policyCompliance?.violations || []).filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      reimbursableAmount = 0; // No reimbursement for critical violations
    }
  }
  
  return reimbursableAmount;
};

// Method to submit expense
expenseSchema.methods.submit = function(pendingApprovers) {
  this.status = 'submitted';
  this.submissionDate = new Date();
  this.pendingApprovers = pendingApprovers;
  return this.save();
};

// Method to cancel expense
expenseSchema.methods.cancel = function(user, reason) {
  this.status = 'cancelled';
  this.addComment(user, `Expense cancelled. Reason: ${reason}`, true);
  this.pendingApprovers = [];
  return this.save();
};

// Static method to get expenses by status
expenseSchema.statics.getExpensesByStatus = function(status, limit = 50) {
  return this.find({ status, isActive: true, isDeleted: false })
    .populate('submittedBy', 'name email employeeId')
    .populate('site', 'name code')
    .sort({ submissionDate: -1 })
    .limit(limit);
};

// Static method to get pending expenses for approver
expenseSchema.statics.getPendingExpensesForApprover = function(approverId) {
  return this.find({
    'pendingApprovers.approver': approverId,
    status: { $in: ['submitted', 'under_review', 'approved_l1', 'approved_l2'] },
    isActive: true,
    isDeleted: false
  })
  .populate('submittedBy', 'name email employeeId')
  .populate('site', 'name code')
  .sort({ submissionDate: 1 });
};

// Static method to get expenses by date range
expenseSchema.statics.getExpensesByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    expenseDate: { $gte: startDate, $lte: endDate },
    isActive: true,
    isDeleted: false,
    ...filters
  };
  
  return this.find(query)
    .populate('submittedBy', 'name email employeeId')
    .populate('site', 'name code')
    .sort({ expenseDate: -1 });
};

// Static method to get expense statistics
expenseSchema.statics.getExpenseStatistics = function(filters = {}) {
  return this.aggregate([
    { $match: { isActive: true, isDeleted: false, ...filters } },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
        approvedExpenses: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pendingExpenses: {
          $sum: { $cond: [{ $in: ['$status', ['submitted', 'under_review', 'approved_l1', 'approved_l2']] }, 1, 0] }
        },
        rejectedExpenses: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Expense', expenseSchema); 