const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'expense_summary',
      'expense_details',
      'budget_utilization',
      'vehicle_km',
      'approval_analytics',
      'user_activity',
      'site_performance',
      'custom'
    ],
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Site'
  },
  dateRange: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  format: {
    type: String,
    enum: ['json', 'csv', 'pdf', 'excel'],
    default: 'json'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  filters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  filePath: String,
  fileSize: Number,
  downloadCount: {
    type: Number,
    default: 0
  },
  expiresAt: Date,
  metadata: {
    totalRecords: Number,
    totalAmount: Number,
    processingTime: Number,
    generatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ type: 1, status: 1 });
reportSchema.index({ siteId: 1 });
reportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for is expired
reportSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Virtual for download URL
reportSchema.virtual('downloadUrl').get(function() {
  if (!this.filePath) return null;
  return `/api/reports/${this._id}/download`;
});

// Method to mark as completed
reportSchema.methods.markCompleted = function(data, filePath = null) {
  this.status = 'completed';
  this.data = data;
  if (filePath) {
    this.filePath = filePath;
  }
  this.metadata.generatedAt = new Date();
  return this.save();
};

// Method to mark as failed
reportSchema.methods.markFailed = function(error) {
  this.status = 'failed';
  this.data = { error: error.message };
  return this.save();
};

// Method to increment download count
reportSchema.methods.incrementDownload = function() {
  this.downloadCount += 1;
  return this.save();
};

// Static method to get user reports
reportSchema.statics.getUserReports = function(userId, options = {}) {
  const { page = 1, limit = 20, type, status } = options;
  
  const match = { generatedBy: userId };
  
  if (type) match.type = type;
  if (status) match.status = status;
  
  return this.find(match)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
};

// Static method to create report
reportSchema.statics.createReport = function(data) {
  return this.create({
    title: data.title,
    type: data.type,
    generatedBy: data.userId,
    siteId: data.siteId,
    dateRange: data.dateRange,
    format: data.format || 'json',
    filters: data.filters || {},
    expiresAt: data.expiresAt
  });
};

// Static method to get report statistics
reportSchema.statics.getReportStats = function(userId) {
  return this.aggregate([
    { $match: { generatedBy: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        byType: {
          $push: {
            type: '$type',
            count: 1
          }
        },
        byStatus: {
          $push: {
            status: '$status',
            count: 1
          }
        },
        totalDownloads: { $sum: '$downloadCount' }
      }
    }
  ]);
};

module.exports = mongoose.model('Report', reportSchema); 