const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'expense_submitted',
      'expense_approved',
      'expense_rejected',
      'approval_required',
      'budget_alert',
      'system_alert',
      'reminder',
      'report_ready'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  read: {
    type: Boolean,
    default: false
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  sentVia: [{
    type: String,
    enum: ['email', 'push', 'sms', 'in_app'],
    default: ['in_app']
  }],
  metadata: {
    expenseId: mongoose.Schema.ObjectId,
    siteId: mongoose.Schema.ObjectId,
    approverId: mongoose.Schema.ObjectId,
    amount: Number,
    status: String
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, timestamp: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function(userId, options = {}) {
  const { page = 1, limit = 20, type, status = 'all' } = options;
  
  const match = { user: userId };
  
  if (type) match.type = type;
  if (status === 'unread') match.read = false;
  if (status === 'read') match.read = true;
  
  return this.find(match)
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
};

// Static method to create notification
notificationSchema.statics.createNotification = function(data) {
  return this.create({
    user: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    data: data.data || {},
    priority: data.priority || 'normal',
    actionRequired: data.actionRequired || false,
    metadata: data.metadata || {},
    sentVia: data.sentVia || ['in_app']
  });
};

// Static method to get notification statistics
notificationSchema.statics.getNotificationStats = function(userId) {
  return this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: ['$read', 0, 1] } },
        byType: {
          $push: {
            type: '$type',
            count: 1
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            count: 1
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Notification', notificationSchema); 