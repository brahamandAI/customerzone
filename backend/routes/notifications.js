const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Site = require('../models/Site');

const router = express.Router();

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status = 'all' } = req.query;
  const userId = req.user._id;
  const userRole = req.user.role;

  // Build notifications based on user role and activities
  let notifications = [];

  // Get pending approvals for approvers
  if (['l1_approver', 'l2_approver', 'l3_approver'].includes(userRole)) {
    const pendingExpenses = await Expense.find({
      'pendingApprovers.approver': userId,
      status: { $in: ['submitted', 'under_review', 'approved_l1', 'approved_l2'] },
      isActive: true,
      isDeleted: false
    })
    .populate('submittedBy', 'name email employeeId')
    .populate('site', 'name code')
    .sort({ submissionDate: 1 });

    pendingExpenses.forEach(expense => {
      notifications.push({
        id: `approval_${expense._id}`,
        type: 'approval_required',
        title: 'Expense Approval Required',
        message: `Expense "${expense.title}" from ${expense.submittedBy.name} requires your approval`,
        data: {
          expenseId: expense._id,
          amount: expense.amount,
          submitter: expense.submittedBy.name,
          site: expense.site.name,
          daysPending: expense.daysSinceSubmission
        },
        priority: expense.daysSinceSubmission > 7 ? 'high' : expense.priority,
        timestamp: expense.submissionDate,
        read: false,
        actionRequired: true
      });
    });
  }

  // Get expense status updates for submitters
  const userExpenses = await Expense.find({
    submittedBy: userId,
    isActive: true,
    isDeleted: false
  })
  .populate('site', 'name code')
  .sort({ updatedAt: -1 })
  .limit(50);

  userExpenses.forEach(expense => {
    // Add notifications for status changes
    if (expense.approvalHistory.length > 0) {
      const latestApproval = expense.approvalHistory[expense.approvalHistory.length - 1];
      
      notifications.push({
        id: `status_${expense._id}_${latestApproval._id}`,
        type: 'expense_status_update',
        title: `Expense ${latestApproval.action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your expense "${expense.title}" has been ${latestApproval.action}`,
        data: {
          expenseId: expense._id,
          amount: expense.amount,
          status: expense.status,
          comments: latestApproval.comments,
          site: expense.site.name
        },
        priority: latestApproval.action === 'rejected' ? 'high' : 'medium',
        timestamp: latestApproval.date,
        read: false,
        actionRequired: latestApproval.action === 'rejected'
      });
    }
  });

  // Get budget alerts for L3 approvers
  if (userRole === 'l3_approver') {
    const sitesWithAlerts = await Site.find({
      isActive: true,
      $expr: {
        $gte: [
          { $divide: ['$statistics.monthlySpend', '$budget.monthly'] },
          { $divide: ['$budget.alertThreshold', 100] }
        ]
      }
    });

    sitesWithAlerts.forEach(site => {
      notifications.push({
        id: `budget_alert_${site._id}`,
        type: 'budget_alert',
        title: 'Budget Alert',
        message: `Site "${site.name}" has exceeded ${site.budget.alertThreshold}% of monthly budget`,
        data: {
          siteId: site._id,
          siteName: site.name,
          utilization: site.budgetUtilization,
          monthlyBudget: site.budget.monthly,
          currentSpend: site.statistics.monthlySpend
        },
        priority: site.budgetUtilization >= 100 ? 'urgent' : 'high',
        timestamp: new Date(),
        read: false,
        actionRequired: true
      });
    });

    // System notifications
    const overdueExpenses = await Expense.countDocuments({
      status: { $in: ['submitted', 'under_review', 'approved_l1', 'approved_l2'] },
      submissionDate: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      isActive: true,
      isDeleted: false
    });

    if (overdueExpenses > 0) {
      notifications.push({
        id: 'system_overdue_expenses',
        type: 'system_alert',
        title: 'Overdue Expenses Alert',
        message: `${overdueExpenses} expenses are pending approval for more than 7 days`,
        data: {
          count: overdueExpenses
        },
        priority: 'high',
        timestamp: new Date(),
        read: false,
        actionRequired: true
      });
    }
  }

  // Sort notifications by priority and timestamp
  notifications.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 1;
    const bPriority = priorityOrder[b.priority] || 1;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  // Apply filters
  if (type) {
    notifications = notifications.filter(n => n.type === type);
  }

  if (status === 'unread') {
    notifications = notifications.filter(n => !n.read);
  } else if (status === 'read') {
    notifications = notifications.filter(n => n.read);
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedNotifications = notifications.slice(startIndex, endIndex);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  res.json({
    success: true,
    data: {
      notifications: paginatedNotifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(notifications.length / limit),
        totalNotifications: notifications.length,
        hasNext: endIndex < notifications.length,
        hasPrev: startIndex > 0
      },
      unreadCount
    }
  });
}));

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // In a real application, you would update the notification in the database
  // For now, we'll just return success
  
  res.json({
    success: true,
    message: 'Notification marked as read'
  });
}));

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put('/mark-all-read', protect, asyncHandler(async (req, res) => {
  // In a real application, you would update all user notifications in the database
  
  res.json({
    success: true,
    message: 'All notifications marked as read'
  });
}));

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
router.get('/preferences', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('preferences');
  
  res.json({
    success: true,
    data: user.preferences.notifications || {
      email: true,
      push: true,
      sms: false
    }
  });
}));

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
router.put('/preferences', protect, asyncHandler(async (req, res) => {
  const { email, push, sms } = req.body;
  
  const user = await User.findById(req.user._id);
  
  user.preferences.notifications = {
    email: email !== undefined ? email : user.preferences.notifications.email,
    push: push !== undefined ? push : user.preferences.notifications.push,
    sms: sms !== undefined ? sms : user.preferences.notifications.sms
  };
  
  await user.save();
  
  res.json({
    success: true,
    message: 'Notification preferences updated',
    data: user.preferences.notifications
  });
}));

// @desc    Send real-time notification
// @route   POST /api/notifications/send
// @access  Private (L3 approvers only)
router.post('/send', protect, authorize('l3_approver', 'finance'), asyncHandler(async (req, res) => {
  const { type, title, message, recipients, data, priority = 'medium' } = req.body;
  
  if (!type || !title || !message || !recipients) {
    return res.status(400).json({
      success: false,
      message: 'Type, title, message, and recipients are required'
    });
  }
  
  // Get Socket.io instance
  const io = req.app.get('io');
  
  const notification = {
    id: `custom_${Date.now()}`,
    type,
    title,
    message,
    data: data || {},
    priority,
    timestamp: new Date(),
    read: false,
    sender: req.user._id
  };
  
  // Send to specific users or roles
  if (recipients.users && recipients.users.length > 0) {
    recipients.users.forEach(userId => {
      io.to(`user_${userId}`).emit('notification', notification);
    });
  }
  
  if (recipients.roles && recipients.roles.length > 0) {
    recipients.roles.forEach(role => {
      io.to(`role_${role}`).emit('notification', notification);
    });
  }
  
  if (recipients.sites && recipients.sites.length > 0) {
    recipients.sites.forEach(siteId => {
      io.to(`site_${siteId}`).emit('notification', notification);
    });
  }
  
  // Send to all users if specified
  if (recipients.all) {
    io.emit('notification', notification);
  }
  
  res.json({
    success: true,
    message: 'Notification sent successfully',
    data: notification
  });
}));

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
router.get('/stats', protect, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  
  let stats = {
    total: 0,
    unread: 0,
    byType: {},
    byPriority: {}
  };
  
  // Count pending approvals
  if (['l1_approver', 'l2_approver', 'l3_approver'].includes(userRole)) {
    const pendingCount = await Expense.countDocuments({
      'pendingApprovers.approver': userId,
      status: { $in: ['submitted', 'under_review', 'approved_l1', 'approved_l2'] },
      isActive: true,
      isDeleted: false
    });
    
    stats.byType.approval_required = pendingCount;
    stats.total += pendingCount;
    stats.unread += pendingCount;
  }
  
  // Count expense status updates
  const recentExpenses = await Expense.countDocuments({
    submittedBy: userId,
    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    isActive: true,
    isDeleted: false
  });
  
  stats.byType.expense_status_update = recentExpenses;
  stats.total += recentExpenses;
  
  // Count budget alerts for L3 approvers
  if (userRole === 'l3_approver') {
    const budgetAlerts = await Site.countDocuments({
      isActive: true,
      $expr: {
        $gte: [
          { $divide: ['$statistics.monthlySpend', '$budget.monthly'] },
          { $divide: ['$budget.alertThreshold', 100] }
        ]
      }
    });
    
    stats.byType.budget_alert = budgetAlerts;
    stats.total += budgetAlerts;
    stats.unread += budgetAlerts;
  }
  
  res.json({
    success: true,
    data: stats
  });
}));

// @desc    Test notification
// @route   POST /api/notifications/test
// @access  Private
router.post('/test', protect, asyncHandler(async (req, res) => {
  const { type = 'test', message = 'This is a test notification' } = req.body;
  
  // Get Socket.io instance
  const io = req.app.get('io');
  
  const testNotification = {
    id: `test_${Date.now()}`,
    type,
    title: 'Test Notification',
    message,
    data: {
      userId: req.user._id,
      timestamp: new Date()
    },
    priority: 'low',
    timestamp: new Date(),
    read: false
  };
  
  // Send to current user
  io.to(`user_${req.user._id}`).emit('notification', testNotification);
  
  res.json({
    success: true,
    message: 'Test notification sent',
    data: testNotification
  });
}));

// @desc    Get notification templates
// @route   GET /api/notifications/templates
// @access  Private (L3 approvers only)
router.get('/templates', protect, authorize('l3_approver', 'finance'), asyncHandler(async (req, res) => {
  const templates = [
    {
      id: 'expense_approved',
      name: 'Expense Approved',
      type: 'expense_status_update',
      title: 'Expense Approved',
      message: 'Your expense "{{expenseTitle}}" has been approved for ₹{{amount}}',
      variables: ['expenseTitle', 'amount']
    },
    {
      id: 'expense_rejected',
      name: 'Expense Rejected',
      type: 'expense_status_update',
      title: 'Expense Rejected',
      message: 'Your expense "{{expenseTitle}}" has been rejected. Reason: {{reason}}',
      variables: ['expenseTitle', 'reason']
    },
    {
      id: 'budget_warning',
      name: 'Budget Warning',
      type: 'budget_alert',
      title: 'Budget Warning',
      message: 'Site "{{siteName}}" has reached {{percentage}}% of monthly budget',
      variables: ['siteName', 'percentage']
    },
    {
      id: 'approval_reminder',
      name: 'Approval Reminder',
      type: 'approval_required',
      title: 'Approval Reminder',
      message: 'You have {{count}} pending expense approvals requiring attention',
      variables: ['count']
    },
    {
      id: 'system_maintenance',
      name: 'System Maintenance',
      type: 'system_alert',
      title: 'System Maintenance',
      message: 'System maintenance scheduled for {{date}} from {{startTime}} to {{endTime}}',
      variables: ['date', 'startTime', 'endTime']
    }
  ];
  
  res.json({
    success: true,
    data: templates
  });
}));

module.exports = router; 