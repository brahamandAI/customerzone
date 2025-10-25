const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

// Test email service
router.post('/test-email', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { email, expenseData } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    // Test expense data
    const testExpenseData = expenseData || {
      expenseNumber: 'EXP-0001',
      title: 'Test Expense',
      submitter: 'Test User',
      submitterEmail: 'test@example.com',
      site: 'Test Site',
      department: 'IT',
      amount: 1000,
      category: 'Travel',
      timestamp: new Date()
    };

    // Test email service
    const emailResult = await emailService.sendExpenseNotification(
      { email: email },
      testExpenseData
    );

    if (emailResult) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          to: email,
          expenseData: testExpenseData
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email'
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
});

// Test SMS service
router.post('/test-sms', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { phone, expenseData } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Test expense data
    const testExpenseData = expenseData || {
      expenseNumber: 'EXP-0001',
      title: 'Test Expense',
      submitter: 'Test User',
      site: 'Test Site',
      amount: 1000,
      category: 'Travel'
    };

    // Test SMS service
    const smsResult = await smsService.sendExpenseNotification(phone, testExpenseData);

    if (smsResult) {
      res.json({
        success: true,
        message: 'Test SMS sent successfully',
        data: {
          to: phone,
          expenseData: testExpenseData
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test SMS'
      });
    }
  } catch (error) {
    console.error('Test SMS error:', error);
    res.status(500).json({
      success: false,
      message: 'Test SMS failed',
      error: error.message
    });
  }
});

// Test service connections
router.get('/test-connections', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const emailTest = await emailService.testConnection();
    const smsTest = await smsService.testConnection();
    const smsStatus = smsService.getServiceStatus();

    res.json({
      success: true,
      data: {
        email: emailTest,
        sms: smsTest,
        smsStatus: smsStatus
      }
    });
  } catch (error) {
    console.error('Test connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Test connections failed',
      error: error.message
    });
  }
});

// Test status update notifications
router.post('/test-status-update', protect, authorize('l3_approver', 'finance'), async (req, res) => {
  try {
    const { email, phone, action = 'approved' } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required'
      });
    }

    const testExpenseData = {
      expenseNumber: 'EXP-0001',
      title: 'Test Expense',
      amount: 1000,
      category: 'Travel',
      site: 'Test Site',
      submitterEmail: email || 'test@example.com'
    };

    const approverName = 'Test Approver';
    const results = {};

    // Test email status update
    if (email) {
      results.email = await emailService.sendExpenseStatusUpdate(testExpenseData, action, approverName);
    }

    // Test SMS status update
    if (phone) {
      results.sms = await smsService.sendExpenseStatusUpdate(phone, testExpenseData, action, approverName);
    }

    res.json({
      success: true,
      message: 'Status update test completed',
      data: {
        results: results,
        expenseData: testExpenseData,
        action: action,
        approverName: approverName
      }
    });
  } catch (error) {
    console.error('Test status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Test status update failed',
      error: error.message
    });
  }
});

module.exports = router; 