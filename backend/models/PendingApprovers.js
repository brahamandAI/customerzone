const mongoose = require('mongoose');

const pendingApproverSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 4
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
  assignedDate: {
    type: Date,
    default: Date.now
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  lastReminderDate: Date,
  reminderCount: {
    type: Number,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for performance
pendingApproverSchema.index({ expense: 1, level: 1 });
pendingApproverSchema.index({ approver: 1, status: 1 });
pendingApproverSchema.index({ assignedDate: -1 });
pendingApproverSchema.index({ status: 1, priority: 1 });

// Virtual for days since assignment
pendingApproverSchema.virtual('daysSinceAssignment').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.assignedDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
pendingApproverSchema.virtual('isOverdue').get(function() {
  return this.daysSinceAssignment > 7;
});

// Method to mark reminder sent
pendingApproverSchema.methods.markReminderSent = function() {
  this.reminderSent = true;
  this.lastReminderDate = new Date();
  this.reminderCount += 1;
  return this.save();
};

// Method to complete approval
pendingApproverSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

// Static method to get pending approvals for an approver
pendingApproverSchema.statics.getPendingForApprover = function(approverId) {
  return this.find({
    approver: approverId,
    status: 'pending'
  })
  .populate('expense', 'title amount expenseNumber status submittedBy site')
  .populate('approver', 'name email')
  .sort({ priority: -1, assignedDate: 1 });
};

// Static method to get overdue approvals
pendingApproverSchema.statics.getOverdueApprovals = function() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  return this.find({
    status: 'pending',
    assignedDate: { $lt: sevenDaysAgo }
  })
  .populate('expense', 'title amount expenseNumber')
  .populate('approver', 'name email')
  .sort({ assignedDate: 1 });
};

// Static method to get approval statistics
pendingApproverSchema.statics.getApprovalStats = function(approverId) {
  return this.aggregate([
    { $match: { approver: approverId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: {
          $sum: {
            $toDouble: '$expense.amount'
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('PendingApprover', pendingApproverSchema); 