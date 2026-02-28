const mongoose = require('mongoose');

const batchPaymentSchema = new mongoose.Schema({
  utrNumber: {
    type: String,
    required: true,
    trim: true
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
  totalAmount: {
    type: Number,
    required: true
  },
  expenseCount: {
    type: Number,
    required: true
  },
  paymentRemarks: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

batchPaymentSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('BatchPayment', batchPaymentSchema);
