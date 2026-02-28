const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const BatchOTP = require('../models/BatchOTP');
const BatchPayment = require('../models/BatchPayment');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Site = require('../models/Site');
const ApprovalHistory = require('../models/ApprovalHistory');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

// @desc    Process batch payment with UTR (no OTP)
// @route   POST /api/batch-payments/process-utr
// @access  Private (Finance & L3 Approver only)
router.post('/process-utr', protect, authorize('finance', 'l3_approver'), async (req, res) => {
  try {
    const { expenseIds, utrNumber, paymentRemarks } = req.body;

    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one expense ID'
      });
    }

    if (!utrNumber || String(utrNumber).trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'UTR number is required'
      });
    }

    const expenses = await Expense.find({
      _id: { $in: expenseIds },
      status: { $in: ['approved', 'approved_l3', 'approved_finance'] }
    }).populate('submittedBy', 'name email phone')
      .populate('site', 'name code');

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No eligible expenses found for payment processing'
      });
    }

    const processedExpenses = [];
    const failedExpenses = [];
    const notifications = [];
    const utr = String(utrNumber).trim();

    for (const expense of expenses) {
      try {
        if (!['approved', 'approved_l3', 'approved_finance'].includes(expense.status)) {
          failedExpenses.push({
            expenseId: expense._id,
            expenseNumber: expense.expenseNumber,
            reason: `Invalid status: ${expense.status}`
          });
          continue;
        }

        expense.status = 'payment_processed';
        expense.paymentAmount = expense.amount;
        expense.paymentDate = new Date();
        expense.paymentProcessedBy = req.user._id;
        expense.paymentDetails = {
          utrNumber: utr,
          paymentMethod: 'manual_bank_transfer',
          processedAt: new Date(),
          batchPayment: true
        };

        if (paymentRemarks) {
          expense.comments.push({
            user: req.user._id,
            text: `Batch Payment (UTR: ${utr}): ${paymentRemarks}`,
            isInternal: true,
            date: new Date()
          });
        }

        await expense.save();

        await ApprovalHistory.create({
          expense: expense._id,
          approver: req.user._id,
          action: 'payment_processed',
          level: 4,
          comments: `Batch payment via bank transfer. UTR: ${utr}`,
          paymentAmount: expense.amount,
          paymentDate: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        if (expense.site) {
          const site = await Site.findById(expense.site._id);
          if (site) {
            await site.updateStatistics(expense.amount, true);
          }
        }

        processedExpenses.push({
          expenseId: expense._id,
          expenseNumber: expense.expenseNumber,
          amount: expense.amount,
          submitter: expense.submittedBy.name
        });

        notifications.push({
          userId: expense.submittedBy._id,
          email: expense.submittedBy.email,
          phone: expense.submittedBy.phone,
          expenseNumber: expense.expenseNumber,
          amount: expense.amount,
          siteName: expense.site?.name
        });
      } catch (error) {
        console.error(`❌ Failed to process expense ${expense.expenseNumber}:`, error);
        failedExpenses.push({
          expenseId: expense._id,
          expenseNumber: expense.expenseNumber,
          reason: error.message
        });
      }
    }

    // Save batch payment record for history
    const totalAmount = processedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    await BatchPayment.create({
      utrNumber: utr,
      user: req.user._id,
      expenseIds: processedExpenses.map(e => e.expenseId),
      totalAmount,
      expenseCount: processedExpenses.length,
      paymentRemarks: paymentRemarks?.trim() || undefined
    });

    // Send notifications
    setImmediate(async () => {
      for (const notification of notifications) {
        try {
          await emailService.sendPaymentProcessedNotification({
            email: notification.email,
            expenseNumber: notification.expenseNumber,
            amount: notification.amount,
            siteName: notification.siteName
          });
          if (notification.phone) {
            await smsService.sendPaymentProcessedNotification({
              phone: notification.phone,
              expenseNumber: notification.expenseNumber,
              amount: notification.amount
            });
          }
        } catch (err) {
          console.error('⚠️ Failed to send notification:', err);
        }
      }
    });

    // Socket events
    const io = req.app.get('io');
    for (const notification of notifications) {
      io.to(`user-${notification.userId}`).emit('expense_payment_processed', {
        expenseNumber: notification.expenseNumber,
        amount: notification.amount,
        paymentDate: new Date(),
        processedBy: req.user.name,
        batchProcessing: true
      });
    }
    io.to('role-finance').to('role-l3_approver').emit('batch-payment-completed', {
      processedCount: processedExpenses.length,
      totalAmount,
      failedCount: failedExpenses.length,
      processedBy: req.user.name,
      utrNumber: utr,
      timestamp: new Date()
    });
    io.emit('dashboard-update', { type: 'batch_payment', count: processedExpenses.length, timestamp: new Date() });

    res.json({
      success: true,
      message: 'Payment is done',
      data: {
        processed: processedExpenses,
        failed: failedExpenses,
        totalProcessed: processedExpenses.length,
        totalFailed: failedExpenses.length,
        totalAmount,
        utrNumber: utr
      }
    });

  } catch (error) {
    console.error('❌ Error processing batch UTR payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch payment',
      error: error.message
    });
  }
});

// @desc    Generate OTP for batch payment processing (DEPRECATED - use process-utr instead)
// @route   POST /api/batch-payments/generate-otp
// @access  Private (Finance & L3 Approver only)
router.post('/generate-otp', protect, authorize('finance', 'l3_approver'), async (req, res) => {
  try {
    const { expenseIds } = req.body;

    // Validation
    if (!expenseIds || !Array.isArray(expenseIds) || expenseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one expense ID'
      });
    }

    // Verify all expenses exist and are eligible for payment
    const expenses = await Expense.find({
      _id: { $in: expenseIds },
      status: { $in: ['approved', 'approved_l3', 'approved_finance'] }
    }).populate('submittedBy', 'name email')
      .populate('site', 'name code');

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No eligible expenses found for payment processing'
      });
    }

    if (expenses.length !== expenseIds.length) {
      return res.status(400).json({
        success: false,
        message: `Only ${expenses.length} out of ${expenseIds.length} expenses are eligible for payment`
      });
    }

    // Calculate total amount
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expenseCount = expenses.length;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    // Create OTP record
    const batchOTP = await BatchOTP.create({
      user: req.user._id,
      otp,
      expenseIds,
      totalAmount,
      expenseCount,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes validity
    });

    console.log('✅ Batch OTP generated:', {
      otpId: batchOTP._id,
      user: req.user.email,
      expenseCount,
      totalAmount
    });

    // Send OTP via Email
    try {
      await emailService.sendBatchPaymentOTP({
        email: req.user.email,
        name: req.user.name,
        otp,
        expenseCount,
        totalAmount
      });
      console.log('✅ OTP sent via email to:', req.user.email);
    } catch (emailError) {
      console.error('⚠️ Email sending failed:', emailError);
      // Continue even if email fails
    }

    // Send OTP via SMS if phone number exists
    if (req.user.phone) {
      try {
        await smsService.sendBatchPaymentOTP({
          phone: req.user.phone,
          otp,
          expenseCount
        });
        console.log('✅ OTP sent via SMS to:', req.user.phone);
      } catch (smsError) {
        console.error('⚠️ SMS sending failed:', smsError);
        // Continue even if SMS fails
      }
    }

    // Emit socket event
    const io = req.app.get('io');
    io.to(`user-${req.user._id}`).emit('batch-otp-generated', {
      expenseCount,
      totalAmount,
      expiresAt: batchOTP.expiresAt
    });

    res.json({
      success: true,
      message: `OTP sent to your ${req.user.phone ? 'email and phone' : 'email'}`,
      data: {
        otpId: batchOTP._id,
        expenseCount,
        totalAmount,
        expiresAt: batchOTP.expiresAt,
        validFor: '5 minutes'
      }
    });

  } catch (error) {
    console.error('❌ Error generating batch OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate OTP. Please try again.',
      error: error.message
    });
  }
});

// @desc    Verify OTP and process batch payment
// @route   POST /api/batch-payments/verify-and-process
// @access  Private (Finance & L3 Approver only)
router.post('/verify-and-process', protect, authorize('finance', 'l3_approver'), async (req, res) => {
  try {
    const { otpId, otp, paymentRemarks } = req.body;

    // Validation
    if (!otpId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP ID and OTP are required'
      });
    }

    // Find OTP record
    const batchOTP = await BatchOTP.findById(otpId);

    if (!batchOTP) {
      return res.status(404).json({
        success: false,
        message: 'Invalid OTP request'
      });
    }

    // Check if already used
    if (batchOTP.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'This OTP has already been used'
      });
    }

    // Check if expired
    if (batchOTP.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please generate a new one.'
      });
    }

    // Verify OTP belongs to current user
    if (batchOTP.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This OTP does not belong to you'
      });
    }

    // Verify OTP
    const isValid = await batchOTP.verifyOTP(otp);

    if (!isValid) {
      // Check if max attempts exceeded
      if (batchOTP.attempts >= batchOTP.maxAttempts) {
        await batchOTP.markAsUsed(); // Lock the OTP
        return res.status(400).json({
          success: false,
          message: 'Maximum OTP attempts exceeded. Please generate a new OTP.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${batchOTP.maxAttempts - batchOTP.attempts} attempts remaining.`
      });
    }

    console.log('✅ OTP verified successfully. Processing batch payment...');

    // Get all expenses
    const expenses = await Expense.find({
      _id: { $in: batchOTP.expenseIds }
    }).populate('submittedBy', 'name email phone')
      .populate('site', 'name code');

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No expenses found for processing'
      });
    }

    const processedExpenses = [];
    const failedExpenses = [];
    const notifications = [];

    // Process each expense
    for (const expense of expenses) {
      try {
        // Check if expense is still eligible
        if (!['approved', 'approved_l3', 'approved_finance'].includes(expense.status)) {
          failedExpenses.push({
            expenseId: expense._id,
            expenseNumber: expense.expenseNumber,
            reason: `Invalid status: ${expense.status}`
          });
          continue;
        }

        // Update expense status
        expense.status = 'payment_processed';
        expense.paymentAmount = expense.amount;
        expense.paymentDate = new Date();
        expense.paymentProcessedBy = req.user._id;
        
        if (paymentRemarks) {
          expense.comments.push({
            user: req.user._id,
            text: `Batch Payment: ${paymentRemarks}`,
            isInternal: true,
            date: new Date()
          });
        }

        await expense.save();

        // Create approval history
        await ApprovalHistory.create({
          expense: expense._id,
          approver: req.user._id,
          action: 'payment_processed',
          level: 4, // Finance level
          comments: paymentRemarks || 'Batch payment processed',
          paymentAmount: expense.amount,
          paymentDate: new Date(),
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        // Update site statistics
        if (expense.site) {
          const site = await Site.findById(expense.site._id);
          if (site) {
            await site.updateStatistics(expense.amount, true);
          }
        }

        processedExpenses.push({
          expenseId: expense._id,
          expenseNumber: expense.expenseNumber,
          amount: expense.amount,
          submitter: expense.submittedBy.name
        });

        // Prepare notification for submitter
        notifications.push({
          userId: expense.submittedBy._id,
          email: expense.submittedBy.email,
          phone: expense.submittedBy.phone,
          expenseNumber: expense.expenseNumber,
          amount: expense.amount,
          siteName: expense.site?.name
        });

      } catch (error) {
        console.error(`❌ Failed to process expense ${expense.expenseNumber}:`, error);
        failedExpenses.push({
          expenseId: expense._id,
          expenseNumber: expense.expenseNumber,
          reason: error.message
        });
      }
    }

    // Mark OTP as used
    await batchOTP.markAsUsed();

    console.log('✅ Batch payment processing completed:', {
      total: expenses.length,
      processed: processedExpenses.length,
      failed: failedExpenses.length
    });

    // Send notifications to all submitters (async, don't wait)
    setImmediate(async () => {
      for (const notification of notifications) {
        try {
          // Send email notification
          await emailService.sendPaymentProcessedNotification({
            email: notification.email,
            expenseNumber: notification.expenseNumber,
            amount: notification.amount,
            siteName: notification.siteName
          });

          // Send SMS notification if phone exists
          if (notification.phone) {
            await smsService.sendPaymentProcessedNotification({
              phone: notification.phone,
              expenseNumber: notification.expenseNumber,
              amount: notification.amount
            });
          }
        } catch (error) {
          console.error('⚠️ Failed to send notification:', error);
        }
      }
    });

    // Emit socket events
    const io = req.app.get('io');
    
    // Notify all affected users
    for (const notification of notifications) {
      io.to(`user-${notification.userId}`).emit('expense_payment_processed', {
        expenseNumber: notification.expenseNumber,
        amount: notification.amount,
        paymentDate: new Date(),
        processedBy: req.user.name,
        batchProcessing: true
      });
    }

    // Notify finance team
    io.to('role-finance').to('role-l3_approver').emit('batch-payment-completed', {
      processedCount: processedExpenses.length,
      totalAmount: processedExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      failedCount: failedExpenses.length,
      processedBy: req.user.name,
      timestamp: new Date()
    });

    // Broadcast dashboard update
    io.emit('dashboard-update', {
      type: 'batch_payment',
      count: processedExpenses.length,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Successfully processed ${processedExpenses.length} out of ${expenses.length} expenses`,
      data: {
        processed: processedExpenses,
        failed: failedExpenses,
        totalProcessed: processedExpenses.length,
        totalFailed: failedExpenses.length,
        totalAmount: processedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error processing batch payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch payment',
      error: error.message
    });
  }
});

// @desc    Get batch payment history (UTR-based)
// @route   GET /api/batch-payments/history
// @access  Private (Finance & L3 Approver only)
router.get('/history', protect, authorize('finance', 'l3_approver'), async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const batchPayments = await BatchPayment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await BatchPayment.countDocuments({ user: req.user._id });

    res.json({
      success: true,
      data: {
        batchPayments: batchPayments.map(bp => ({
          _id: bp._id,
          utrNumber: bp.utrNumber,
          expenseCount: bp.expenseCount,
          totalAmount: bp.totalAmount,
          paymentRemarks: bp.paymentRemarks,
          createdAt: bp.createdAt
        })),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching batch payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch payment history',
      error: error.message
    });
  }
});

// @desc    Cancel/Invalidate OTP
// @route   POST /api/batch-payments/cancel-otp
// @access  Private (Finance & L3 Approver only)
router.post('/cancel-otp', protect, authorize('finance', 'l3_approver'), async (req, res) => {
  try {
    const { otpId } = req.body;

    if (!otpId) {
      return res.status(400).json({
        success: false,
        message: 'OTP ID is required'
      });
    }

    const batchOTP = await BatchOTP.findById(otpId);

    if (!batchOTP) {
      return res.status(404).json({
        success: false,
        message: 'OTP not found'
      });
    }

    // Verify ownership
    if (batchOTP.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own OTPs'
      });
    }

    // Check if already used
    if (batchOTP.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an already used OTP'
      });
    }

    // Mark as used to invalidate
    await batchOTP.markAsUsed();

    res.json({
      success: true,
      message: 'OTP cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Error cancelling OTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel OTP',
      error: error.message
    });
  }
});

module.exports = router;

