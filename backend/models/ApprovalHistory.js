const mongoose = require('mongoose');

const approvalHistorySchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 3
  },
  approver: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  expense: {
    type: mongoose.Schema.ObjectId,
    ref: 'Expense',
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
  userAgent: String,
  modifiedAmount: {
    type: Number,
    min: 0
  },
  modificationReason: String,
  paymentAmount: {
    type: Number,
    min: 0
  },
  paymentDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
approvalHistorySchema.index({ expense: 1, level: 1 });
approvalHistorySchema.index({ approver: 1 });
approvalHistorySchema.index({ date: -1 });

// Virtual for approval level name
approvalHistorySchema.virtual('levelName').get(function() {
  const levelNames = {
    1: 'L1 Approver',
    2: 'L2 Approver', 
    3: 'L3 Approver'
  };
  return levelNames[this.level] || `Level ${this.level}`;
});

// Method to get approval statistics
approvalHistorySchema.statics.getApprovalStats = function(startDate, endDate, approverId) {
  const match = {};
  
  if (startDate && endDate) {
    match.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (approverId) {
    match.approver = approverId;
  }
  
  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          approver: '$approver',
          action: '$action',
          level: '$level'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$modifiedAmount' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.approver',
        foreignField: '_id',
        as: 'approver'
      }
    },
    { $unwind: '$approver' },
    {
      $group: {
        _id: '$_id.approver',
        approver: { $first: '$approver' },
        totalApprovals: { $sum: '$count' },
        totalAmount: { $sum: '$totalAmount' },
        actions: {
          $push: {
            action: '$_id.action',
            level: '$_id.level',
            count: '$count',
            amount: '$totalAmount'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('ApprovalHistory', approvalHistorySchema); 