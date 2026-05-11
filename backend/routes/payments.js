const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const razorpayService = require('../services/razorpay.service');
const Expense = require('../models/Expense');
const User = require('../models/User');

// @desc    Verify CMS payment (manual bank transfer - Razorpay bypassed)
// @route   POST /api/payments/verify-cms
// @access  Private (Finance/L3 only)
router.post('/verify-cms', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { expenseId, cmsNumber } = req.body;

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        message: 'Expense ID is required'
      });
    }

    if (!cmsNumber || String(cmsNumber).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'CMS number is required'
      });
    }

    const expense = await Expense.findById(expenseId)
      .populate('submittedBy', 'name email')
      .populate('site', 'name');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Check expense is approved and ready for payment
    if (!['approved', 'approved_l3', 'approved_finance'].includes(expense.status)) {
      return res.status(400).json({
        success: false,
        message: 'Expense is not approved for payment'
      });
    }

    // Update expense with payment information
    expense.status = 'payment_processed';
    expense.paymentAmount = expense.amount;
    expense.paymentDate = new Date();
    expense.paymentProcessedBy = req.user.id;
    expense.paymentDetails = {
      cmsNumber: String(cmsNumber).trim(),
      paymentMethod: 'manual_bank_transfer',
      processedAt: new Date()
    };

    await expense.save();

    // Add to approval history
    const ApprovalHistory = require('../models/ApprovalHistory');
    await ApprovalHistory.create({
      expense: expenseId,
      approver: req.user.id,
      action: 'payment_processed',
      level: 3,
      comments: `Payment processed via bank transfer. CMS: ${cmsNumber}`,
      paymentAmount: expense.paymentAmount,
      paymentDate: expense.paymentDate
    });

    // Update site statistics
    const Site = require('../models/Site');
    const site = await Site.findById(expense.site);
    if (site) {
      await site.updateStatistics(expense.paymentAmount, true);
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    const submitterId = expense.submittedBy?._id ?? expense.submittedBy;
    const socketData = {
      expenseId: expense._id,
      expenseNumber: expense.expenseNumber,
      status: 'payment_processed',
      submittedById: submitterId,
      paymentAmount: expense.paymentAmount,
      paymentDate: expense.paymentDate,
      processedBy: req.user.name,
      timestamp: new Date()
    };

    io.to('role-l3_approver').emit('expense_payment_processed', socketData);
    io.to(`user-${submitterId}`).emit('expense_payment_processed', socketData);
    io.emit('dashboard-update', socketData);

    res.json({
      success: true,
      message: 'Payment is done',
      payment: {
        id: cmsNumber,
        amount: expense.paymentAmount,
        status: 'payment_processed',
        method: 'manual_bank_transfer',
        cmsNumber: cmsNumber,
        processedAt: expense.paymentDate
      }
    });

  } catch (error) {
    console.error('Error verifying CMS payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment'
    });
  }
});

// @desc    Create payment order (RAZORPAY - COMMENTED OUT / BYPASSED)
// @route   POST /api/payments/create-order
// @access  Private
router.post('/create-order', protect, async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured. Please contact administrator.'
      });
    }

    const { expenseId, amount, currency = 'INR' } = req.body;

    console.log('🔍 Received payment request:', {
      expenseId,
      amount,
      currency,
      body: req.body
    });

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        message: 'Expense ID is required'
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Verify expense exists and user has permission
    const expense = await Expense.findById(expenseId)
      .populate('submittedBy', 'name email')
      .populate('site', 'name');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Check if user is authorized to make payment for this expense
    const isAuthorized = req.user.role === 'l3_approver' || 
                        req.user.role === 'finance' ||
                        expense.submittedBy._id.toString() === req.user.id;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to make payment for this expense'
      });
    }

    // Create Razorpay order
    const receipt = `exp_${expenseId.toString().slice(-8)}_${Date.now().toString().slice(-8)}`;
    const order = await razorpayService.createOrder(amount, currency, receipt);

    res.json({
      success: true,
      message: 'Payment order created successfully',
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    console.error('Error creating payment order:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      expenseId: req.body.expenseId,
      amount: req.body.amount,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured. Please contact administrator.'
      });
    }

    const { orderId, paymentId, signature, expenseId } = req.body;

    if (!orderId || !paymentId || !signature || !expenseId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, Payment ID, Signature, and Expense ID are required'
      });
    }

    // Verify payment signature
    const isValidSignature = razorpayService.verifyPaymentSignature(
      orderId, 
      paymentId, 
      signature
    );

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Get payment details from Razorpay
    const paymentDetails = await razorpayService.getPaymentDetails(paymentId);

    // Update expense with payment information
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Update expense status and payment details
    expense.status = 'payment_processed';
    expense.paymentAmount = paymentDetails.amount / 100; // Convert from paise
    expense.paymentDate = new Date();
    expense.paymentProcessedBy = req.user.id;
    expense.paymentDetails = {
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      paymentMethod: paymentDetails.method,
      bank: paymentDetails.bank,
      cardId: paymentDetails.card_id,
      wallet: paymentDetails.wallet,
      vpa: paymentDetails.vpa,
      email: paymentDetails.email,
      contact: paymentDetails.contact
    };

    await expense.save();

    // Add to approval history
    const ApprovalHistory = require('../models/ApprovalHistory');
    await ApprovalHistory.create({
      expense: expenseId,
      approver: req.user.id,
      action: 'payment_processed',
      level: 3,
      comments: `Payment processed via Razorpay. Payment ID: ${paymentId}`,
      paymentAmount: expense.paymentAmount,
      paymentDate: expense.paymentDate
    });

    // Update site statistics
    const Site = require('../models/Site');
    const site = await Site.findById(expense.site);
    if (site) {
      await site.updateStatistics(expense.paymentAmount, true);
    }

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    const submitterId = expense.submittedBy?._id ?? expense.submittedBy;
    const socketData = {
      expenseId: expense._id,
      expenseNumber: expense.expenseNumber,
      status: 'payment_processed',
      submittedById: submitterId,
      paymentAmount: expense.paymentAmount,
      paymentDate: expense.paymentDate,
      processedBy: req.user.name,
      timestamp: new Date()
    };

    io.to('role-l3_approver').emit('expense_payment_processed', socketData);
    io.to(`user-${submitterId}`).emit('expense_payment_processed', socketData);

    res.json({
      success: true,
      message: 'Payment verified and processed successfully',
      payment: {
        id: paymentId,
        amount: expense.paymentAmount,
        status: paymentDetails.status,
        method: paymentDetails.method,
        processedAt: expense.paymentDate
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

// @desc    Get payment history for user
// @route   GET /api/payments/history
// @access  Private
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get expenses with payments for the user
    const expenses = await Expense.find({
      $or: [
        { submittedBy: req.user.id },
        { paymentProcessedBy: req.user.id }
      ],
      status: 'payment_processed'
    })
    .populate('submittedBy', 'name email')
    .populate('site', 'name')
    .populate('paymentProcessedBy', 'name')
    .sort({ paymentDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Expense.countDocuments({
      $or: [
        { submittedBy: req.user.id },
        { paymentProcessedBy: req.user.id }
      ],
      status: 'payment_processed'
    });

    res.json({
      success: true,
      data: expenses,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history'
    });
  }
});

// @desc    Refund payment
// @route   POST /api/payments/refund
// @access  Private (L3 Approver only)
router.post('/refund', protect, authorize('l3_approver'), async (req, res) => {
  try {
    // Check if Razorpay is configured
    if (!razorpayService.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Payment service is not configured. Please contact administrator.'
      });
    }

    const { expenseId, reason = 'Expense refund' } = req.body;

    if (!expenseId) {
      return res.status(400).json({
        success: false,
        message: 'Expense ID is required'
      });
    }

    // Find expense with payment details
    const expense = await Expense.findById(expenseId);
    if (!expense || !expense.paymentDetails) {
      return res.status(404).json({
        success: false,
        message: 'Expense or payment details not found'
      });
    }

    // Process refund through Razorpay
    const refund = await razorpayService.refundPayment(
      expense.paymentDetails.razorpayPaymentId,
      expense.paymentAmount,
      reason
    );

    // Update expense status
    expense.status = 'refunded';
    expense.refundDetails = {
      refundId: refund.id,
      refundAmount: expense.paymentAmount,
      refundReason: reason,
      refundDate: new Date(),
      refundedBy: req.user.id
    };

    await expense.save();

    // Add to approval history
    const ApprovalHistory = require('../models/ApprovalHistory');
    await ApprovalHistory.create({
      expense: expenseId,
      approver: req.user.id,
      action: 'refund_processed',
      level: 3,
      comments: `Payment refunded. Refund ID: ${refund.id}. Reason: ${reason}`,
      refundAmount: expense.paymentAmount,
      refundDate: new Date()
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      refund: {
        id: refund.id,
        amount: expense.paymentAmount,
        reason: reason,
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund'
    });
  }
});

module.exports = router; 