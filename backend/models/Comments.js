const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  expense: {
    type: mongoose.Schema.ObjectId,
    ref: 'Expense',
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
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['general', 'approval', 'rejection', 'system', 'internal'],
    default: 'general'
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
commentSchema.index({ expense: 1, date: -1 });
commentSchema.index({ user: 1 });
commentSchema.index({ isInternal: 1 });

// Virtual for formatted date
commentSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to get comments for an expense
commentSchema.statics.getExpenseComments = function(expenseId, includeInternal = false) {
  const match = { expense: expenseId };
  
  if (!includeInternal) {
    match.isInternal = false;
  }
  
  return this.find(match)
    .populate('user', 'name email employeeId')
    .sort({ date: 1 });
};

// Method to add system comment
commentSchema.statics.addSystemComment = function(expenseId, text, type = 'system') {
  return this.create({
    expense: expenseId,
    text,
    type,
    isSystem: true,
    isInternal: true
  });
};

module.exports = mongoose.model('Comment', commentSchema); 