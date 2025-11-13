const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const User = require('../models/User');
const Site = require('../models/Site');
const Expense = require('../models/Expense');
const PendingApprover = require('../models/PendingApprovers');

const router = express.Router();

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

// @desc    Get dashboard overview for current user
// @route   GET /api/dashboard/overview
// @access  Private
router.get('/overview', protect, authorize('submitter', 'l1_approver', 'l2_approver', 'l3_approver', 'finance'), asyncHandler(async (req, res) => {
  try {
    console.log('Dashboard overview request for user:', req.user._id, 'Role:', req.user.role);
    console.log('Query parameters:', req.query); // Log query parameters for debugging
    
  const userId = req.user._id;
    const userRole = req.user.role.toLowerCase();
    const userSite = req.user.site?._id; // Use optional chaining
    
    console.log('User site info:', {
      userSite: userSite,
      userSiteObject: req.user.site,
      hasSite: !!userSite
    });

  let dashboardData = {};

  // Common data for all users
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // Get all user's expenses (all-time)
  const userExpenses = await Expense.find({
    submittedBy: userId,
    isActive: true,
    isDeleted: false
  });

  const userStats = {
    totalExpenses: userExpenses.length,
    totalAmount: userExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    pendingExpenses: userExpenses.filter(exp => 
      ['submitted', 'under_review'].includes(exp.status)
    ).length,
    approvedExpenses: userExpenses.filter(exp => 
      ['approved', 'reimbursed', 'payment_processed', 'approved_l1', 'approved_l2', 'approved_l3', 'approved_finance'].includes(exp.status)
    ).length,
    rejectedExpenses: userExpenses.filter(exp => exp.status === 'rejected').length
  };

  dashboardData.userStats = userStats;

  // Get pending approvals count based on user role and assignments
  let pendingApprovalsCount = 0;
  
  if (userRole === 'finance') {
    // For Finance, count only expenses approved by Super Admin (L3) that need payment processing
    pendingApprovalsCount = await Expense.countDocuments({
      status: 'approved_l3',
      isActive: true,
      isDeleted: false
    });
    console.log('🔍 Finance - Pending payments count (approved_l3):', pendingApprovalsCount);
  } else if (['l1_approver', 'l2_approver', 'l3_approver'].includes(userRole)) {
    // For other approvers, count only expenses assigned to them
    const pendingApprovals = await PendingApprover.find({
      approver: userId,
      status: 'pending'
    }).select('expense');

    const pendingExpenseIds = pendingApprovals.map(pa => pa.expense);
    
    // Role-based filtering (same logic as approval page)
    let statusFilter = {};
    if (userRole === 'l1_approver') {
      // Include newly-created flagged items that are marked under_review
      statusFilter = { status: { $in: ['submitted', 'under_review'] } };
    } else if (userRole === 'l2_approver') {
      statusFilter = { status: 'approved_l1' };
    } else if (userRole === 'l3_approver') {
      statusFilter = { status: 'approved_l2' };
    } else {
      statusFilter = { status: { $in: ['submitted', 'approved_l1', 'approved_l2'] } };
    }
    
    pendingApprovalsCount = await Expense.countDocuments({
      _id: { $in: pendingExpenseIds },
      ...statusFilter,
      isActive: true,
      isDeleted: false
    });
  } else {
    // For submitters, count their own pending expenses
    pendingApprovalsCount = await Expense.countDocuments({
      submittedBy: userId,
      status: { $in: ['submitted', 'under_review'] },
      isActive: true,
      isDeleted: false
    });
  }
  
  dashboardData.pendingApprovalsCount = pendingApprovalsCount;

  // Role-specific data
  if (userRole === 'submitter') {
    // Recent expenses
    const recentExpenses = await Expense.find({
      submittedBy: userId,
      isActive: true,
      isDeleted: false
    })
    .populate('site', 'name code')
    .sort({ createdAt: -1 })
    .limit(5);

    // Site budget info
    const siteInfo = await Site.findById(userSite);
    console.log('Site info for submitter:', {
      siteId: userSite,
      siteInfo: siteInfo ? {
        budget: siteInfo.budget,
        statistics: siteInfo.statistics,
        budgetUtilization: siteInfo.budgetUtilization,
        remainingBudget: siteInfo.remainingBudget
      } : 'Site not found'
    });

    // Calculate submitter dashboard breakdown for current month
    const breakdownAgg = await Expense.aggregate([
      {
        $match: {
          submittedBy: userId,
          isActive: true,
          isDeleted: false,
          expenseDate: { $gte: currentMonth, $lt: nextMonth }
        }
      },
      {
        $group: {
          _id: null,
          approvedAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved', 'reimbursed', 'payment_processed', 'approved_l1', 'approved_l2', 'approved_l3', 'approved_finance']] },
                '$amount',
                0
              ]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['submitted', 'under_review']] },
                '$amount',
                0
              ]
            }
          },
          totalSpentAllStatuses: { $sum: '$amount' }
        }
      }
    ]);

    const approvedAmount = breakdownAgg[0]?.approvedAmount || 0;
    const pendingAmount = breakdownAgg[0]?.pendingAmount || 0;
    const monthlySpent = breakdownAgg[0]?.totalSpentAllStatuses || 0;
    const monthlyBudget = siteInfo?.budget?.monthly || 0;
    const remainingBudget = Math.max(0, monthlyBudget - approvedAmount);
    const approvedUtilization = monthlyBudget > 0 ? Math.round((approvedAmount / monthlyBudget) * 100) : 0;
    const projectedUtilization = monthlyBudget > 0 ? Math.round(((approvedAmount + pendingAmount) / monthlyBudget) * 100) : 0;

    console.log('📊 Real-time budget calculation:', {
      monthlyBudget,
      monthlySpent,
      remainingBudget,
      approvedUtilization,
      projectedUtilization
    });
    
    dashboardData.recentExpenses = recentExpenses;
    dashboardData.siteBudget = {
        monthly: monthlyBudget,
        used: approvedAmount, // show approved usage in primary card
        remaining: remainingBudget,
        utilization: approvedUtilization,
        projectedUtilization: projectedUtilization,
        pending: pendingAmount
    };
    dashboardData.submitterBudgetBreakdown = {
      approvedAmount,
      pendingAmount,
      remainingBudget,
      approvedUtilization,
      projectedUtilization
    };
    dashboardData.vehicleKmLimit = siteInfo?.vehicleKmLimit;

    // Enhanced recent activities for submitter
    console.log('🔍 Processing recent activities for submitter...');
    
    const userRecentExpenses = await Expense.find({
      submittedBy: userId,
      isActive: true,
      isDeleted: false
    })
    .populate('site', 'name code')
    .sort({ updatedAt: -1 })
    .limit(10);

    console.log(`📝 Found ${userRecentExpenses.length} recent expenses for user`);

    dashboardData.recentActivities = userRecentExpenses.map(expense => {
      let title = '';
      let type = '';
      let status = '';

      switch (expense.status) {
        case 'submitted':
          title = 'Expense submitted';
          type = 'expense_submitted';
          status = 'pending';
          break;
        case 'approved_l1':
          title = 'Expense approved by L1';
          type = 'expense_approved';
          status = 'approved';
          break;
        case 'approved_l2':
          title = 'Expense approved by L2';
          type = 'expense_approved';
          status = 'approved';
          break;
        case 'approved':
          title = 'Expense finally approved';
          type = 'expense_approved';
          status = 'approved';
          break;
        case 'payment_processed':
          title = 'Payment processed';
          type = 'payment_processed';
          status = 'completed';
          break;
        case 'rejected':
          title = 'Expense rejected';
          type = 'expense_rejected';
          status = 'rejected';
          break;
        default:
          title = 'Expense updated';
          type = 'expense_update';
          status = 'pending';
      }

      return {
        id: expense._id,
        type: type,
        title: title,
        description: `${expense.site?.name || 'Unknown Site'} - ₹${expense.amount.toLocaleString()}`,
        time: getTimeAgo(expense.updatedAt),
        status: status
      };
    });

    console.log(`✅ Created ${dashboardData.recentActivities.length} recent activities`);

    // Top expense categories for submitter
    console.log('🔍 Processing top categories for submitter...');
    
    const topCategories = await Expense.aggregate([
      {
        $match: {
          submittedBy: userId,
          isActive: true,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalAmount: -1 }
      },
      {
        $limit: 5
      }
    ]);

    console.log(`📊 Found ${topCategories.length} top categories`);

    // Calculate percentages
    const totalUserExpenses = await Expense.aggregate([
      {
        $match: {
          submittedBy: userId,
          isActive: true,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const userTotalAmount = totalUserExpenses[0]?.totalAmount || 0;
    console.log(`💰 Total user amount: ₹${userTotalAmount.toLocaleString()}`);

    dashboardData.topCategories = topCategories.map(category => ({
      name: category._id,
      amount: category.totalAmount,
      count: category.count,
      percentage: userTotalAmount > 0 ? Math.round((category.totalAmount / userTotalAmount) * 100) : 0
    }));

    console.log(`✅ Created ${dashboardData.topCategories.length} top categories`);

    } else if (['l1_approver', 'l2_approver', 'l3_approver', 'finance'].includes(userRole)) {
      console.log('Processing dashboard for approver role:', userRole);
      console.log('User ID for approval stats:', userId);
      
      // For Finance, get system-wide approval statistics
      if (userRole === 'finance') {
        console.log('Setting up dashboard for Finance - System-wide stats');
        
        // System-wide approval statistics for all time (not current month)
        const systemApprovalStats = await Expense.aggregate([
          {
            $match: {
              isActive: true,
              isDeleted: false
            }
          },
          {
            $unwind: '$approvalHistory'
          },
          {
            $match: {
              'approvalHistory.action': 'approved'
            }
          },
          {
            $group: {
              _id: null,
              totalApprovals: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          }
        ]);

        // System-wide payment processing statistics for all time (not current month)
        const systemPaymentStats = await Expense.aggregate([
          {
            $match: {
              status: 'payment_processed',
              isActive: true,
              isDeleted: false
            }
          },
          {
            $group: {
              _id: null,
              totalPayments: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          }
        ]);

        const approvalResult = systemApprovalStats[0] || { totalApprovals: 0, totalAmount: 0 };
        const paymentResult = systemPaymentStats[0] || { totalPayments: 0, totalAmount: 0 };

        dashboardData.approvalStats = {
          totalApprovals: paymentResult.totalPayments,  // Use payment stats for processed payments
          approvedCount: paymentResult.totalPayments,   // Use payment stats for processed payments
          rejectedCount: 0,
          totalAmount: paymentResult.totalAmount        // Use payment amount
        };
        
        dashboardData.monthlyStats = {
          monthlyApprovedAmount: paymentResult.totalAmount,  // Use payment amount
          monthlyApprovedCount: paymentResult.totalPayments  // Use payment count
        };

        dashboardData.paymentStats = {
          totalPayments: paymentResult.totalPayments,
          totalAmount: paymentResult.totalAmount
        };

        console.log('📊 Finance system-wide stats:', {
          approvals: approvalResult,
          payments: paymentResult
        });
      } else {
        // Pending approvals for other approvers
    const pendingApprovals = await Expense.getPendingExpensesForApprover(userId);
    console.log('Pending approvals count:', pendingApprovals.length);
    
    // Approval statistics - all time
    console.log('🔍 Starting approval stats aggregation for user:', userId);
    console.log('🔍 Current month range:', { currentMonth, nextMonth });
    
    const approvalStats = await Expense.aggregate([
      {
        $match: {
          'approvalHistory.approver': userId,
          isActive: true,
          isDeleted: false
        }
      },
      {
        $unwind: '$approvalHistory'
      },
      {
        $match: {
          'approvalHistory.approver': userId
        }
      },
      {
        $group: {
          _id: null,
          totalApprovals: { $sum: 1 },
          approvedCount: {
            $sum: {
              $cond: [
                { $eq: ['$approvalHistory.action', 'approved'] },
                1,
                0
              ]
            }
          },
          rejectedCount: {
            $sum: {
              $cond: [
                { $eq: ['$approvalHistory.action', 'rejected'] },
                1,
                0
              ]
            }
          },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ['$approvalHistory.action', 'approved'] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    console.log('📊 Raw approval stats result:', approvalStats);

    // Current month approval statistics
    console.log('🔍 Starting current month approval stats aggregation...');
    const currentMonthApprovalStats = await Expense.aggregate([
      {
        $match: {
          'approvalHistory.approver': userId,
          isActive: true,
          isDeleted: false
        }
      },
      {
        $unwind: '$approvalHistory'
      },
      {
        $match: {
          'approvalHistory.approver': userId,
          $expr: {
            $and: [
              { $gte: [{ $toDate: '$approvalHistory.date' }, currentMonth] },
              { $lt: [{ $toDate: '$approvalHistory.date' }, nextMonth] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          currentMonthApprovedCount: {
            $sum: {
              $cond: [
                { $eq: ['$approvalHistory.action', 'approved'] },
                1,
                0
              ]
            }
          },
          currentMonthRejectedCount: {
            $sum: {
              $cond: [
                { $eq: ['$approvalHistory.action', 'rejected'] },
                1,
                0
              ]
            }
          },
          currentMonthApprovedAmount: {
            $sum: {
              $cond: [
                { $eq: ['$approvalHistory.action', 'approved'] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    // For L1 approver, count only L2 approved expenses
    let l1ApprovedStats = { currentMonthApprovedCount: 0, currentMonthApprovedAmount: 0 };
    if (userRole === 'l1_approver') {
      console.log('🔍 Calculating L1 approver stats - only L2 approved expenses...');
      l1ApprovedStats = await Expense.aggregate([
        {
          $match: {
            'approvalHistory.approver': userId,
            isActive: true,
            isDeleted: false,
            status: 'approved_l2'  // Only L2 approved expenses
          }
        },
        {
          $unwind: '$approvalHistory'
        },
        {
          $match: {
            'approvalHistory.approver': userId,
            'approvalHistory.action': 'approved',
            $expr: {
              $and: [
                { $gte: [{ $toDate: '$approvalHistory.date' }, currentMonth] },
                { $lt: [{ $toDate: '$approvalHistory.date' }, nextMonth] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            currentMonthApprovedCount: { $sum: 1 },
            currentMonthApprovedAmount: { $sum: '$amount' }
          }
        }
      ]);
      l1ApprovedStats = l1ApprovedStats[0] || { currentMonthApprovedCount: 0, currentMonthApprovedAmount: 0 };
      console.log('🔍 L1 Approver Stats:', l1ApprovedStats);
    }

    // For L2 approver, count only L3 approved expenses
    let l2ApprovedStats = { currentMonthApprovedCount: 0, currentMonthApprovedAmount: 0 };
    if (userRole === 'l2_approver') {
      console.log('🔍 Calculating L2 approver stats - only L3 approved expenses...');
      l2ApprovedStats = await Expense.aggregate([
        {
          $match: {
            'approvalHistory.approver': userId,
            isActive: true,
            isDeleted: false,
            status: 'approved_l3'  // Only L3 approved expenses
          }
        },
        {
          $unwind: '$approvalHistory'
        },
        {
          $match: {
            'approvalHistory.approver': userId,
            'approvalHistory.action': 'approved',
            $expr: {
              $and: [
                { $gte: [{ $toDate: '$approvalHistory.date' }, currentMonth] },
                { $lt: [{ $toDate: '$approvalHistory.date' }, nextMonth] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            currentMonthApprovedCount: { $sum: 1 },
            currentMonthApprovedAmount: { $sum: '$amount' }
          }
        }
      ]);
      l2ApprovedStats = l2ApprovedStats[0] || { currentMonthApprovedCount: 0, currentMonthApprovedAmount: 0 };
    }

    // For L3 approver (Super Admin), count ALL expenses they have approved
    let l3ApprovedStats = { currentMonthApprovedCount: 0, currentMonthApprovedAmount: 0 };
    if (userRole === 'l3_approver') {
      console.log('🔍 Calculating L3 approver stats - ALL expenses approved by Super Admin...');
      l3ApprovedStats = await Expense.aggregate([
        {
          $match: {
            'approvalHistory.approver': userId,
            isActive: true,
            isDeleted: false,
            // Super Admin can see all expenses they approved, not just finance approved
            status: { $in: ['approved_l3', 'approved_finance', 'reimbursed', 'payment_processed'] }
          }
        },
        {
          $unwind: '$approvalHistory'
        },
        {
          $match: {
            'approvalHistory.approver': userId,
            'approvalHistory.action': 'approved',
            $expr: {
              $and: [
                { $gte: [{ $toDate: '$approvalHistory.date' }, currentMonth] },
                { $lt: [{ $toDate: '$approvalHistory.date' }, nextMonth] }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            currentMonthApprovedCount: { $sum: 1 },
            currentMonthApprovedAmount: { $sum: '$amount' }
          }
        }
      ]);
      l3ApprovedStats = l3ApprovedStats[0] || { currentMonthApprovedCount: 0, currentMonthApprovedAmount: 0 };
    }

    console.log('📊 Raw current month approval stats result:', currentMonthApprovalStats);

    // Test query to check if there are any approval history entries
    console.log('🧪 Testing: Checking for any approval history entries...');
    const testApprovalHistory = await Expense.aggregate([
      {
        $match: {
          'approvalHistory.approver': userId
        }
      },
      {
        $project: {
          expenseNumber: 1,
          amount: 1,
          approvalHistory: {
            $filter: {
              input: '$approvalHistory',
              as: 'history',
              cond: { $eq: ['$$history.approver', userId] }
            }
          }
        }
      }
    ]);
    
    console.log('🧪 Test approval history entries found:', testApprovalHistory.length);
    if (testApprovalHistory.length > 0) {
      console.log('🧪 Sample approval history entry:', JSON.stringify(testApprovalHistory[0], null, 2));
    }

    dashboardData.pendingApprovals = pendingApprovals;
    dashboardData.approvalStats = {
      ...(approvalStats[0] || {
        totalApprovals: 0,
        approvedCount: 0,
        rejectedCount: 0,
        totalAmount: 0
      }),
      // Add current month stats - use role specific stats
      approvedCount: userRole === 'l1_approver' 
        ? l1ApprovedStats.currentMonthApprovedCount 
        : userRole === 'l2_approver'
        ? l2ApprovedStats.currentMonthApprovedCount
        : userRole === 'l3_approver'
        ? l3ApprovedStats.currentMonthApprovedCount
        : (currentMonthApprovalStats[0]?.currentMonthApprovedCount || 0),
      rejectedCount: currentMonthApprovalStats[0]?.currentMonthRejectedCount || 0,
      approvedAmount: userRole === 'l1_approver'
        ? l1ApprovedStats.currentMonthApprovedAmount
        : userRole === 'l2_approver'
        ? l2ApprovedStats.currentMonthApprovedAmount
        : userRole === 'l3_approver'
        ? l3ApprovedStats.currentMonthApprovedAmount
        : (currentMonthApprovalStats[0]?.currentMonthApprovedAmount || 0),
      currentMonthApprovedAmount: userRole === 'l1_approver'
        ? l1ApprovedStats.currentMonthApprovedAmount
        : userRole === 'l2_approver'
        ? l2ApprovedStats.currentMonthApprovedAmount
        : userRole === 'l3_approver'
        ? l3ApprovedStats.currentMonthApprovedAmount
        : (currentMonthApprovalStats[0]?.currentMonthApprovedAmount || 0)
    };

    console.log('Approval stats calculated:', {
      allTime: approvalStats[0] || { totalApprovals: 0, approvedCount: 0, rejectedCount: 0, totalAmount: 0 },
      currentMonth: currentMonthApprovalStats[0] || { currentMonthApprovedCount: 0, currentMonthRejectedCount: 0, currentMonthApprovedAmount: 0 },
      finalStats: dashboardData.approvalStats
    });
    
    console.log('🔍 Final approval stats for user role:', userRole);
    console.log('🔍 L1 Stats:', l1ApprovedStats);
    console.log('🔍 L2 Stats:', l2ApprovedStats);
    console.log('🔍 L3 Stats:', l3ApprovedStats);

    // Use the current month stats for monthlyStats as well - use role specific stats
    dashboardData.monthlyStats = {
      monthlyApprovedAmount: userRole === 'l1_approver'
        ? l1ApprovedStats.currentMonthApprovedAmount
        : userRole === 'l2_approver'
        ? l2ApprovedStats.currentMonthApprovedAmount
        : userRole === 'l3_approver'
        ? l3ApprovedStats.currentMonthApprovedAmount
        : (currentMonthApprovalStats[0]?.currentMonthApprovedAmount || 0),
      monthlyApprovedCount: userRole === 'l1_approver'
        ? l1ApprovedStats.currentMonthApprovedCount
        : userRole === 'l2_approver'
        ? l2ApprovedStats.currentMonthApprovedCount
        : userRole === 'l3_approver'
        ? l3ApprovedStats.currentMonthApprovedCount
        : (currentMonthApprovalStats[0]?.currentMonthApprovedCount || 0)
    };
      }

      // Add budget utilization, recent activities, and top categories for L1/L2/L3 approvers
      if (userRole === 'l1_approver' || userRole === 'l2_approver' || userRole === 'l3_approver') {
        console.log('🔍 Adding budget utilization, recent activities, and top categories for L1/L2/L3 approver...');
        
        // Get site info for budget utilization
        const siteInfo = await Site.findById(userSite);
        console.log('Site info for L1/L2 approver:', {
          siteId: userSite,
          siteInfo: siteInfo ? {
            budget: siteInfo.budget,
            statistics: siteInfo.statistics,
            budgetUtilization: siteInfo.budgetUtilization,
            remainingBudget: siteInfo.remainingBudget
          } : 'Site not found'
        });

        // Calculate real-time budget utilization for current month
        // L1 approver: only their site, L2/L3 approver: all sites
        let siteFilter = {};
        if (userRole === 'l1_approver') {
          siteFilter = { site: userSite };
        }
        // L2 and L3 approvers see all sites (no site filter)

        const currentMonthExpenses = await Expense.aggregate([
          {
            $match: {
              ...siteFilter,
              isActive: true,
              isDeleted: false,
              expenseDate: { $gte: currentMonth, $lt: nextMonth }
            }
          },
          {
            $group: {
              _id: null,
              totalSpent: { $sum: '$amount' }
            }
          }
        ]);

        const monthlySpent = currentMonthExpenses[0]?.totalSpent || 0;
        const monthlyBudget = siteInfo?.budget?.monthly || 0;
        const remainingBudget = Math.max(0, monthlyBudget - monthlySpent);
        const utilization = monthlyBudget > 0 ? Math.round((monthlySpent / monthlyBudget) * 100) : 0;

        console.log('📊 Real-time budget calculation for L1/L2 approver:', {
          monthlyBudget,
          monthlySpent,
          remainingBudget,
          utilization
        });
        
        dashboardData.siteBudget = {
            monthly: monthlyBudget,
            used: monthlySpent,
            remaining: remainingBudget,
            utilization: utilization
        };
        dashboardData.vehicleKmLimit = siteInfo?.vehicleKmLimit;

        // Recent activities for L1/L2 approver (expenses they've approved/rejected)
        console.log('🔍 Processing recent activities for L1/L2 approver...');
        
        let approverRecentExpenses;
        if (userRole === 'l1_approver') {
          // L1 approver: only expenses they've approved from their site
          approverRecentExpenses = await Expense.find({
            'approvalHistory.approver': userId,
            isActive: true,
            isDeleted: false
          })
          .populate('site', 'name code')
          .populate('submittedBy', 'name email')
          .sort({ updatedAt: -1 })
          .limit(10);
        } else {
          // L2/L3 approver: all expenses from all sites
          approverRecentExpenses = await Expense.find({
            isActive: true,
            isDeleted: false
          })
          .populate('site', 'name code')
          .populate('submittedBy', 'name email')
          .sort({ updatedAt: -1 })
          .limit(10);
        }

        console.log(`📝 Found ${approverRecentExpenses.length} recent expenses for L1/L2 approver`);

        dashboardData.recentActivities = approverRecentExpenses.map(expense => {
          // Find the user's approval action in the approval history
          const userApproval = expense.approvalHistory.find(history => 
            history.approver.toString() === userId.toString()
          );

          let title = '';
          let type = '';
          let status = '';

          if (userApproval) {
            switch (userApproval.action) {
              case 'approved':
                title = 'Expense approved';
                type = 'expense_approved';
                status = 'approved';
                break;
              case 'rejected':
                title = 'Expense rejected';
                type = 'expense_rejected';
                status = 'rejected';
                break;
              default:
                title = 'Expense reviewed';
                type = 'expense_reviewed';
                status = 'pending';
            }
          } else {
            title = 'Expense reviewed';
            type = 'expense_reviewed';
            status = 'pending';
          }

          return {
            id: expense._id,
            type: type,
            title: title,
            description: `${expense.site?.name || 'Unknown Site'} - ₹${expense.amount.toLocaleString()} by ${expense.submittedBy?.name || 'Unknown User'}`,
            time: getTimeAgo(expense.updatedAt),
            status: status
          };
        });

        console.log(`✅ Created ${dashboardData.recentActivities.length} recent activities for L1/L2/L3 approver`);

        // Top expense categories for L1/L2/L3 approver (expenses they've approved/rejected)
        console.log('🔍 Processing top categories for L1/L2/L3 approver...');
        
        let topCategories;
        if (userRole === 'l1_approver') {
          // L1 approver: only expenses they've approved from their site
          topCategories = await Expense.aggregate([
            {
              $match: {
                'approvalHistory.approver': userId,
                isActive: true,
                isDeleted: false
              }
            },
            {
              $unwind: '$approvalHistory'
            },
            {
              $match: {
                'approvalHistory.approver': userId
              }
            },
            {
              $group: {
                _id: '$category',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { totalAmount: -1 }
            },
            {
              $limit: 5
            }
          ]);
        } else {
          // L2/L3 approver: all expenses from all sites
          topCategories = await Expense.aggregate([
            {
              $match: {
                isActive: true,
                isDeleted: false
              }
            },
            {
              $group: {
                _id: '$category',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { totalAmount: -1 }
            },
            {
              $limit: 5
            }
          ]);
        }

        console.log(`📊 Found ${topCategories.length} top categories for L1/L2 approver`);

        // Calculate percentages
        let totalApproverExpenses;
        if (userRole === 'l1_approver') {
          // L1 approver: only expenses they've approved from their site
          totalApproverExpenses = await Expense.aggregate([
            {
              $match: {
                'approvalHistory.approver': userId,
                isActive: true,
                isDeleted: false
              }
            },
            {
              $unwind: '$approvalHistory'
            },
            {
              $match: {
                'approvalHistory.approver': userId
              }
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amount' }
              }
            }
          ]);
        } else {
          // L2/L3 approver: all expenses from all sites
          totalApproverExpenses = await Expense.aggregate([
            {
              $match: {
                isActive: true,
                isDeleted: false
              }
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amount' }
              }
            }
          ]);
        }

        const approverTotalAmount = totalApproverExpenses[0]?.totalAmount || 0;
        console.log(`💰 Total L1/L2/L3 approver amount: ₹${approverTotalAmount.toLocaleString()}`);

        dashboardData.topCategories = topCategories.map(category => ({
          name: category._id,
          amount: category.totalAmount,
          count: category.count,
          percentage: approverTotalAmount > 0 ? Math.round((category.totalAmount / approverTotalAmount) * 100) : 0
        }));

        console.log(`✅ Created ${dashboardData.topCategories.length} top categories for L1/L2/L3 approver`);
      }

      // If Finance or Super Admin (L3), get system-wide statistics
      if (userRole === 'finance' || userRole === 'l3_approver') {
        console.log(`🔍 Setting up dashboard for ${userRole === 'finance' ? 'Finance' : 'Super Admin (L3)'} - System-wide stats`);
        
        const systemStats = await getSystemStatistics();
        dashboardData.systemStats = systemStats;

        // Calculate system-wide budget utilization for Finance and Super Admin
        console.log(`🔍 Calculating system-wide budget utilization for ${userRole === 'finance' ? 'Finance' : 'Super Admin (L3)'}...`);
        
        // Get all sites with their budgets
        const allSites = await Site.find({ isActive: true });
        console.log(`📊 Found ${allSites.length} active sites for budget calculation`);
        
        let totalSystemBudget = 0;
        let totalSystemSpent = 0;
        
        // Calculate total budget and spent amount across all sites
        for (const site of allSites) {
          const siteMonthlyBudget = site.budget?.monthly || 0;
          totalSystemBudget += siteMonthlyBudget;
          
          // Get current month expenses for this site
          const siteExpenses = await Expense.aggregate([
            {
              $match: {
                site: site._id,
                isActive: true,
                isDeleted: false,
                expenseDate: { $gte: currentMonth, $lt: nextMonth }
              }
            },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: '$amount' }
              }
            }
          ]);
          
          const siteSpent = siteExpenses[0]?.totalSpent || 0;
          totalSystemSpent += siteSpent;
          
          console.log(`📊 Site ${site.name}: Budget ₹${siteMonthlyBudget.toLocaleString()}, Spent ₹${siteSpent.toLocaleString()}`);
        }
        
        const systemUtilization = totalSystemBudget > 0 ? Math.round((totalSystemSpent / totalSystemBudget) * 100) : 0;
        const systemRemainingBudget = Math.max(0, totalSystemBudget - totalSystemSpent);
        
        console.log(`📊 System-wide budget calculation for ${userRole === 'finance' ? 'Finance' : 'Super Admin (L3)'}:`, {
          totalSystemBudget: totalSystemBudget.toLocaleString(),
          totalSystemSpent: totalSystemSpent.toLocaleString(),
          systemUtilization: systemUtilization + '%',
          systemRemainingBudget: systemRemainingBudget.toLocaleString()
        });
        
        // Add budget utilization data for Finance and Super Admin
        dashboardData.budgetUtilization = systemUtilization;
        dashboardData.siteBudget = {
          monthly: totalSystemBudget,
          used: totalSystemSpent,
          remaining: systemRemainingBudget,
          utilization: systemUtilization
        };

        // Budget alerts (for Finance and Super Admin)
        const budgetAlerts = await Site.getSitesWithBudgetAlerts();
        dashboardData.budgetAlerts = budgetAlerts;

        // Recent activity (for Finance and Super Admin)
        const recentActivity = await getRecentActivity();
        dashboardData.recentActivity = recentActivity;

        // For Finance and Super Admin, use the general recent activity
        dashboardData.recentActivities = recentActivity.map(activity => ({
          id: activity.expense.id,
          type: activity.type,
          title: `${activity.expense.title} ${activity.expense.status}`,
          description: `${activity.site?.name || 'Unknown Site'} - ₹${activity.expense.amount.toLocaleString()}`,
          time: getTimeAgo(activity.timestamp),
          status: activity.expense.status
        }));

        // Top categories for Finance and Super Admin (system-wide)
        let matchFilter = { isActive: true, isDeleted: false };
        
        if (userRole === 'l1_approver') {
          matchFilter.site = req.user.site?._id; // L1 approver: only their site
        }
        // L2 approvers, L3 approvers and Finance can see all expenses (no additional filtering)

        const topCategories = await Expense.aggregate([
          { $match: matchFilter },
          {
            $group: {
              _id: '$category',
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          {
            $sort: { totalAmount: -1 }
          },
          {
            $limit: 5
          }
        ]);

        // Calculate percentages
        const totalExpenses = await Expense.aggregate([
          { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const totalAmount = totalExpenses[0]?.totalAmount || 0;

      dashboardData.topCategories = topCategories.map(category => ({
        name: category._id,
        amount: category.totalAmount,
        count: category.count,
        percentage: totalAmount > 0 ? Math.round((category.totalAmount / totalAmount) * 100) : 0
      }));
    }
  }

  // Get notifications count
  const notificationsCount = await getNotificationsCount(userId);
  dashboardData.notificationsCount = notificationsCount;

  // Debug: Log the complete response
  console.log('📊 Complete Dashboard Response:', {
    userRole: userRole,
    hasRecentActivities: !!dashboardData.recentActivities,
    hasTopCategories: !!dashboardData.topCategories,
    recentActivitiesCount: dashboardData.recentActivities?.length || 0,
    topCategoriesCount: dashboardData.topCategories?.length || 0,
    userStats: dashboardData.userStats,
    siteBudget: dashboardData.siteBudget
  });

  res.json({
    success: true,
    data: dashboardData
  });
  } catch (error) {
    console.error('Error in dashboard overview route:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}));

// @desc    Get expense statistics
// @route   GET /api/dashboard/expense-stats
// @access  Private
router.get('/expense-stats', protect, authorize('submitter', 'l1_approver', 'l2_approver', 'l3_approver', 'finance'), asyncHandler(async (req, res) => {
  const { period = 'month', category, site } = req.query;
  const userId = req.user._id;
  const userRole = req.user.role;

  let dateFilter = {};
  const now = new Date();

  // Set date filter based on period
  switch (period) {
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);
      dateFilter = { expenseDate: { $gte: weekStart } };
      break;
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { expenseDate: { $gte: monthStart } };
      break;
    case 'quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      dateFilter = { expenseDate: { $gte: quarterStart } };
      break;
    case 'year':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      dateFilter = { expenseDate: { $gte: yearStart } };
      break;
  }

  let matchFilter = {
    ...dateFilter,
    isActive: true,
    isDeleted: false
  };

  // Apply filters based on user role
  if (userRole === 'submitter') {
    matchFilter.submittedBy = userId;
  } else if (userRole === 'l1_approver') {
    matchFilter.site = req.user.site?._id; // L1 approver: only their site
  }
  // L2 approvers, L3 approvers and Finance can see all expenses (no additional filtering)

  // Apply additional filters
  if (category) {
    matchFilter.category = category;
  }
  if (site && (userRole === 'l3_approver' || userRole === 'finance')) {
    matchFilter.site = site;
  }

  const stats = await Expense.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          category: '$category',
          status: '$status'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $group: {
        _id: '$_id.category',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            amount: '$totalAmount'
          }
        },
        totalCount: { $sum: '$count' },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Get trend data
  const trendData = await Expense.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year: { $year: '$expenseDate' },
          month: { $month: '$expenseDate' },
          day: period === 'week' ? { $dayOfMonth: '$expenseDate' } : null
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      categoryStats: stats,
      trendData,
      period
    }
  });
}));

// @desc    Get budget overview
// @route   GET /api/dashboard/budget-overview
// @access  Private
router.get('/budget-overview', protect, authorize('l1_approver', 'l2_approver', 'l3_approver', 'finance'), checkPermission('canViewReports'), asyncHandler(async (req, res) => {
  const userRole = req.user.role;
  const userSite = req.user.site?._id; // Use optional chaining to avoid error

  let sites = [];

  if (userRole === 'l3_approver' || userRole === 'finance') {
    // Get all sites
    sites = await Site.find({ isActive: true });
  } else {
    // Get only user's site
    sites = await Site.find({ _id: userSite, isActive: true });
  }

  const budgetOverview = await Promise.all(sites.map(async (site) => {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Get current month expenses for this site
    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          site: site._id,
          expenseDate: { $gte: currentMonth, $lt: nextMonth },
          status: { $in: ['approved', 'reimbursed'] },
          isActive: true,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSpent = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const utilization = site.budget.monthly > 0 ? (totalSpent / site.budget.monthly) * 100 : 0;

    return {
      siteId: site._id,
      siteName: site.name,
      siteCode: site.code,
      budget: {
        monthly: site.budget.monthly,
        yearly: site.budget.yearly,
        categories: site.budget.categories
      },
      spent: totalSpent,
      remaining: Math.max(0, site.budget.monthly - totalSpent),
      utilization: Math.round(utilization),
      status: utilization >= 100 ? 'exceeded' : utilization >= site.budget.alertThreshold ? 'warning' : 'healthy',
      categoryBreakdown: monthlyExpenses
    };
  }));

  res.json({
    success: true,
    data: budgetOverview
  });
}));

// @desc    Get pending approvals summary
// @route   GET /api/dashboard/pending-approvals
// @access  Private (Approvers only)
router.get('/pending-approvals', protect, authorize('l1_approver', 'l2_approver', 'l3_approver'), asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  const pendingExpenses = await Expense.find({
    'pendingApprovers.approver': userId,
    status: { $in: ['submitted', 'under_review', 'approved_l1', 'approved_l2'] },
    isActive: true,
    isDeleted: false
  })
  .populate('submittedBy', 'name email')
  .populate('site', 'name code')
  .sort({ submissionDate: 1 });

  // Group by priority and urgency
  const groupedExpenses = {
    urgent: pendingExpenses.filter(exp => 
      exp.priority === 'urgent' || exp.daysSinceSubmission > 7
    ),
    high: pendingExpenses.filter(exp => 
      exp.priority === 'high' && exp.daysSinceSubmission <= 7
    ),
    normal: pendingExpenses.filter(exp => 
      ['medium', 'low'].includes(exp.priority) && exp.daysSinceSubmission <= 7
    )
  };

  // Get summary statistics
  const summary = {
    total: pendingExpenses.length,
    totalAmount: pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    urgent: groupedExpenses.urgent.length,
    overdue: pendingExpenses.filter(exp => exp.daysSinceSubmission > 7).length,
    avgProcessingTime: await getAverageProcessingTime(userId)
  };

  res.json({
    success: true,
    data: {
      summary,
      expenses: groupedExpenses,
      allExpenses: pendingExpenses
    }
  });
}));

// @desc    Get recent activity
// @route   GET /api/dashboard/recent-activity
// @access  Private
router.get('/recent-activity', protect, authorize('submitter', 'l1_approver', 'l2_approver', 'l3_approver', 'finance'), asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const userId = req.user._id;
  const userRole = req.user.role;

  let matchFilter = {
    isActive: true,
    isDeleted: false
  };

  // Filter based on user role
  if (userRole === 'submitter') {
    matchFilter.submittedBy = userId;
  } else if (userRole === 'l1_approver') {
    matchFilter.site = req.user.site?._id; // L1 approver: only their site
  }
  // L2 approvers, L3 approvers and Finance can see all expenses (no additional filtering)

  const recentExpenses = await Expense.find(matchFilter)
    .populate('submittedBy', 'name email')
    .populate('site', 'name code')
    .populate('approvalHistory.approver', 'name email')
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit));

  // Format activity feed
  const activities = [];

  recentExpenses.forEach(expense => {
    // Add submission activity
    activities.push({
      type: 'expense_submitted',
      expense: {
        id: expense._id,
        title: expense.title,
        amount: expense.amount,
        status: expense.status
      },
      user: expense.submittedBy,
      site: expense.site,
      timestamp: expense.submissionDate,
      description: `Expense "${expense.title}" submitted for ₹${expense.amount}`
    });

    // Add approval activities
    expense.approvalHistory.forEach(approval => {
      activities.push({
        type: `expense_${approval.action}`,
        expense: {
          id: expense._id,
          title: expense.title,
          amount: expense.amount,
          status: expense.status
        },
        user: approval.approver,
        site: expense.site,
        timestamp: approval.date,
        description: `Expense "${expense.title}" ${approval.action} by ${approval.approver.name}`,
        comments: approval.comments
      });
    });
  });

  // Sort by timestamp and limit
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const limitedActivities = activities.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: limitedActivities
  });
}));

// @desc    Get expense analytics
// @route   GET /api/dashboard/analytics
// @access  Private (L2, L3 approvers only)
router.get('/analytics', protect, authorize('l2_approver', 'l3_approver', 'finance'), asyncHandler(async (req, res) => {
  const { startDate, endDate, site } = req.query;
  const userRole = req.user.role;

  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      expenseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  } else {
    // Default to current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    dateFilter = { expenseDate: { $gte: yearStart } };
  }

  let matchFilter = {
    ...dateFilter,
    isActive: true,
    isDeleted: false
  };

  // Apply site filter
  if (userRole === 'l1_approver') {
    matchFilter.site = req.user.site?._id; // L1 approver: only their site
  } else if (userRole === 'l2_approver') {
    // L2 approver: all sites (no site filter)
    if (site) {
      matchFilter.site = site; // Allow filtering by specific site if requested
    }
  } else if (userRole === 'l3_approver' || userRole === 'finance') {
    // L3 approver and Finance: all sites
    if (site) {
      matchFilter.site = site; // Allow filtering by specific site if requested
    }
  }

  // Get comprehensive analytics
  const analytics = await Promise.all([
    // Monthly trends
    Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            year: { $year: '$expenseDate' },
            month: { $month: '$expenseDate' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),

    // Category analysis
    Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
          minAmount: { $min: '$amount' }
        }
      },
      { $sort: { amount: -1 } }
    ]),

    // User analysis (top spenders)
    Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$submittedBy',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $sort: { amount: -1 } },
      { $limit: 10 }
    ]),

    // Site analysis (if L3 approver)
    userRole === 'l3_approver' ? Expense.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$site',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'sites',
          localField: '_id',
          foreignField: '_id',
          as: 'site'
        }
      },
      { $unwind: '$site' },
      { $sort: { amount: -1 } }
    ]) : Promise.resolve([])
  ]);

  res.json({
    success: true,
    data: {
      monthlyTrends: analytics[0],
      categoryAnalysis: analytics[1],
      topSpenders: analytics[2],
      siteAnalysis: analytics[3]
    }
  });
}));

// Helper function to get system statistics
async function getSystemStatistics() {
  const currentMonth = new Date();
  currentMonth.setDate(1);
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [totalUsers, totalSites, monthlyExpenses, totalExpenses] = await Promise.all([
    User.countDocuments({ isActive: true }),
    Site.countDocuments({ isActive: true }),
    Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: currentMonth, $lt: nextMonth },
          isActive: true,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]),
    Expense.aggregate([
      {
        $match: { isActive: true, isDeleted: false }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ])
  ]);

  return {
    totalUsers,
    totalSites,
    monthlyExpenses: monthlyExpenses[0] || { count: 0, amount: 0 },
    totalExpenses: totalExpenses[0] || { count: 0, amount: 0 }
  };
}

// Helper function to get recent activity
async function getRecentActivity() {
  const recentExpenses = await Expense.find({
    isActive: true,
    isDeleted: false
  })
  .populate('submittedBy', 'name email')
  .populate('site', 'name code')
  .sort({ updatedAt: -1 })
  .limit(10);

  return recentExpenses.map(expense => ({
    type: 'expense_update',
    expense: {
      id: expense._id,
      title: expense.title,
      amount: expense.amount,
      status: expense.status
    },
    user: expense.submittedBy,
    site: expense.site,
    timestamp: expense.updatedAt
  }));
}

// Helper function to get notifications count
async function getNotificationsCount(userId) {
  // Align notifications with actual pending approvals stored in PendingApprovers collection
  const count = await PendingApprover.countDocuments({ approver: userId, status: 'pending' });
  return { total: count, unread: count };
}

// Helper function to get average processing time
async function getAverageProcessingTime(approverId) {
  const approvedExpenses = await Expense.find({
    'approvalHistory.approver': approverId,
    status: { $in: ['approved', 'rejected'] },
    isActive: true,
    isDeleted: false
  });

  if (approvedExpenses.length === 0) return 0;

  const totalProcessingTime = approvedExpenses.reduce((total, expense) => {
    const submission = expense.submissionDate;
    const approval = expense.approvalHistory.find(ah => 
      ah.approver.toString() === approverId.toString()
    );
    
    if (submission && approval) {
      return total + (approval.date - submission);
    }
    return total;
  }, 0);

  // Return average in hours
  return Math.round(totalProcessingTime / (approvedExpenses.length * 1000 * 60 * 60));
}

module.exports = router; 