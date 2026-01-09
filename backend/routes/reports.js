const express = require('express');
const asyncHandler = require('express-async-handler');
const { protect, authorize, checkPermission } = require('../middleware/auth');
const User = require('../models/User');
const Site = require('../models/Site');
const Expense = require('../models/Expense');

const router = express.Router();

// @desc    Get expense summary report
// @route   GET /api/reports/expense-summary
// @access  Private (L2, L3 approvers only)
router.get('/expense-summary', protect, checkPermission('canViewReports'), asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    site, 
    category, 
    status, 
    submitter,
    format = 'json' 
  } = req.query;
  
  const userRole = req.user.role;
  
  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      expenseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  } else {
    // Default to current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    dateFilter = {
      expenseDate: {
        $gte: monthStart,
        $lte: monthEnd
      }
    };
  }

  // Build match filter
  let matchFilter = {
    ...dateFilter,
    isActive: true,
    isDeleted: false
  };

  // Apply role-based filtering
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

  // Apply additional filters
  if (category) matchFilter.category = category;
  if (status) matchFilter.status = status;
  if (submitter) matchFilter.submittedBy = submitter;

  // Get current period summary data
  const summary = await Expense.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
        maxAmount: { $max: '$amount' },
        minAmount: { $min: '$amount' },
        approvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        approvedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
        },
        pendingCount: {
          $sum: { 
            $cond: [
              { $in: ['$status', ['submitted', 'under_review', 'approved_l1', 'approved_l2']] }, 
              1, 
              0
            ]
          }
        },
        pendingAmount: {
          $sum: { 
            $cond: [
              { $in: ['$status', ['submitted', 'under_review', 'approved_l1', 'approved_l2']] }, 
              '$amount', 
              0
            ]
          }
        },
        rejectedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        rejectedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, '$amount', 0] }
        }
      }
    }
  ]);

  // Calculate previous period for trend comparison
  let previousDateFilter = {};
  if (startDate && endDate) {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const periodDays = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
    
    const previousStartDate = new Date(startDateObj);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    const previousEndDate = new Date(startDateObj);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    
    previousDateFilter = {
      expenseDate: {
        $gte: previousStartDate,
        $lte: previousEndDate
      }
    };
  } else {
    // Default to previous month
    const now = new Date();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    previousDateFilter = {
      expenseDate: {
        $gte: previousMonthStart,
        $lte: previousMonthEnd
      }
    };
  }

  // Build previous period match filter
  let previousMatchFilter = {
    ...previousDateFilter,
    isActive: true,
    isDeleted: false
  };

  // Apply role-based filtering for previous period
  if (userRole === 'l1_approver') {
    previousMatchFilter.site = req.user.site?._id; // L1 approver: only their site
  } else if (userRole === 'l2_approver') {
    // L2 approver: all sites (no site filter)
    if (site) {
      previousMatchFilter.site = site; // Allow filtering by specific site if requested
    }
  } else if (userRole === 'l3_approver' || userRole === 'finance') {
    // L3 approver and Finance: all sites
    if (site) {
      previousMatchFilter.site = site; // Allow filtering by specific site if requested
    }
  }

  // Apply additional filters for previous period
  if (category) previousMatchFilter.category = category;
  if (status) previousMatchFilter.status = status;
  if (submitter) previousMatchFilter.submittedBy = submitter;

  // Get previous period summary data
  const previousSummary = await Expense.aggregate([
    { $match: previousMatchFilter },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        approvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pendingCount: {
          $sum: { 
            $cond: [
              { $in: ['$status', ['submitted', 'under_review', 'approved_l1', 'approved_l2']] }, 
              1, 
              0
            ]
          }
        }
      }
    }
  ]);

  // Calculate trends
  const currentData = summary[0] || {
    totalExpenses: 0,
    totalAmount: 0,
    approvedCount: 0,
    pendingCount: 0
  };

  const previousData = previousSummary[0] || {
    totalExpenses: 0,
    totalAmount: 0,
    approvedCount: 0,
    pendingCount: 0
  };

  const calculateTrend = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const trends = {
    totalExpenses: calculateTrend(currentData.totalExpenses, previousData.totalExpenses),
    totalAmount: calculateTrend(currentData.totalAmount, previousData.totalAmount),
    approvedCount: calculateTrend(currentData.approvedCount, previousData.approvedCount),
    pendingCount: calculateTrend(currentData.pendingCount, previousData.pendingCount)
  };

  // Get category breakdown
  const categoryBreakdown = await Expense.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
        approvedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        approvedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
        }
      }
    },
    { $sort: { amount: -1 } }
  ]);

  // Get monthly trends
  const monthlyTrends = await Expense.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: {
          year: { $year: '$expenseDate' },
          month: { $month: '$expenseDate' }
        },
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        approvedAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Get top submitters
  const topSubmitters = await Expense.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$submittedBy',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' }
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
  ]);

  const reportData = {
    summary: summary[0] || {
      totalExpenses: 0,
      totalAmount: 0,
      averageAmount: 0,
      maxAmount: 0,
      minAmount: 0,
      approvedCount: 0,
      approvedAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      rejectedCount: 0,
      rejectedAmount: 0
    },
    trends,
    categoryBreakdown,
    monthlyTrends,
    topSubmitters,
    filters: {
      startDate,
      endDate,
      site,
      category,
      status,
      submitter
    },
    generatedAt: new Date(),
    generatedBy: req.user._id
  };

  if (format === 'csv') {
    // Convert to CSV format
    const csv = convertToCSV(reportData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expense-summary.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: reportData
  });
}));

// @desc    Get detailed expense report
// @route   GET /api/reports/expense-details
// @access  Private (L2, L3 approvers only)
router.get('/expense-details', protect, checkPermission('canViewReports'), asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    site, 
    category, 
    status, 
    submitter,
    page = 1,
    limit = 50,
    format = 'json'
  } = req.query;
  
  const userRole = req.user.role;
  
  // Build filters
  let matchFilter = {
    isActive: true,
    isDeleted: false
  };

  // Date filter
  if (startDate && endDate) {
    matchFilter.expenseDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Role-based filtering
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

  // Additional filters
  if (category) matchFilter.category = category;
  if (status) matchFilter.status = status;
  if (submitter) matchFilter.submittedBy = submitter;

  // Get detailed expenses
  const expenses = await Expense.find(matchFilter)
    .populate('submittedBy', 'name email employeeId department')
    .populate('site', 'name code location.city')
    .populate('approvalHistory.approver', 'name email')
    .sort({ expenseDate: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const totalExpenses = await Expense.countDocuments(matchFilter);

  const reportData = {
    expenses,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalExpenses / limit),
      totalExpenses,
      hasNext: page * limit < totalExpenses,
      hasPrev: page > 1
    },
    filters: {
      startDate,
      endDate,
      site,
      category,
      status,
      submitter
    },
    generatedAt: new Date(),
    generatedBy: req.user._id
  };

  if (format === 'csv') {
    const csv = convertExpensesToCSV(expenses);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expense-details.csv');
    return res.send(csv);
  }

  res.json({
    success: true,
    data: reportData
  });
}));

// @desc    Get budget utilization report
// @route   GET /api/reports/budget-utilization
// @access  Private (L2, L3 approvers only)
router.get('/budget-utilization', protect, checkPermission('canViewReports'), asyncHandler(async (req, res) => {
  const { month, year, site } = req.query;
  const userRole = req.user.role;

  // Set date range
  const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  
  const monthStart = new Date(targetYear, targetMonth, 1);
  const monthEnd = new Date(targetYear, targetMonth + 1, 0);

  // Get sites to analyze
  let sitesToAnalyze = [];
  if (userRole === 'l3_approver' || userRole === 'finance') {
    if (site) {
      sitesToAnalyze = await Site.find({ _id: site, isActive: true });
    } else {
      sitesToAnalyze = await Site.find({ isActive: true });
    }
  } else {
    sitesToAnalyze = await Site.find({ _id: req.user.site?._id, isActive: true });
  }

  const budgetReport = await Promise.all(sitesToAnalyze.map(async (siteData) => {
    // Get expenses for this site and month
    const expenses = await Expense.aggregate([
      {
        $match: {
          site: siteData._id,
          expenseDate: { $gte: monthStart, $lte: monthEnd },
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

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const utilization = siteData.budget.monthly > 0 ? (totalSpent / siteData.budget.monthly) * 100 : 0;

    // Calculate category-wise utilization
    const categoryUtilization = expenses.map(exp => ({
      category: exp._id,
      spent: exp.amount,
      count: exp.count,
      budget: siteData.budget.categories[exp._id.toLowerCase()] || 0,
      utilization: siteData.budget.categories[exp._id.toLowerCase()] > 0 
        ? (exp.amount / siteData.budget.categories[exp._id.toLowerCase()]) * 100 
        : 0
    }));

    return {
      site: {
        id: siteData._id,
        name: siteData.name,
        code: siteData.code,
        location: siteData.location.city
      },
      budget: {
        monthly: siteData.budget.monthly,
        yearly: siteData.budget.yearly,
        alertThreshold: siteData.budget.alertThreshold
      },
      spent: totalSpent,
      remaining: Math.max(0, siteData.budget.monthly - totalSpent),
      utilization: Math.round(utilization * 100) / 100,
      status: utilization >= 100 ? 'exceeded' : utilization >= siteData.budget.alertThreshold ? 'warning' : 'healthy',
      categoryBreakdown: categoryUtilization,
      expenseCount: expenses.reduce((sum, exp) => sum + exp.count, 0)
    };
  }));

  res.json({
    success: true,
    data: {
      period: {
        month: targetMonth + 1,
        year: targetYear,
        monthName: monthStart.toLocaleString('default', { month: 'long' })
      },
      sites: budgetReport,
      summary: {
        totalSites: budgetReport.length,
        healthySites: budgetReport.filter(s => s.status === 'healthy').length,
        warningSites: budgetReport.filter(s => s.status === 'warning').length,
        exceededSites: budgetReport.filter(s => s.status === 'exceeded').length,
        totalBudget: budgetReport.reduce((sum, s) => sum + s.budget.monthly, 0),
        totalSpent: budgetReport.reduce((sum, s) => sum + s.spent, 0),
        overallUtilization: budgetReport.length > 0 
          ? Math.round((budgetReport.reduce((sum, s) => sum + s.utilization, 0) / budgetReport.length) * 100) / 100
          : 0
      },
      generatedAt: new Date(),
      generatedBy: req.user._id
    }
  });
}));

// @desc    Get vehicle KM report
// @route   GET /api/reports/vehicle-km
// @access  Private (L2, L3 approvers only)
router.get('/vehicle-km', protect, checkPermission('canViewReports'), asyncHandler(async (req, res) => {
  const { startDate, endDate, site, vehicleNumber } = req.query;
  const userRole = req.user.role;

  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      expenseDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  } else {
    // Default to current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = { expenseDate: { $gte: monthStart } };
  }

  // Build match filter
  let matchFilter = {
    ...dateFilter,
    category: 'Vehicle KM',
    isActive: true,
    isDeleted: false
  };

  // Role-based filtering
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

  if (vehicleNumber) {
    matchFilter['vehicleKm.vehicleNumber'] = vehicleNumber;
  }

  // Get vehicle KM expenses
  const kmExpenses = await Expense.find(matchFilter)
    .populate('submittedBy', 'name email employeeId')
    .populate('site', 'name code vehicleKmLimit')
    .sort({ expenseDate: -1 });

  // Group by vehicle number
  const vehicleStats = {};
  kmExpenses.forEach(expense => {
    const vehicleNum = expense.vehicleKm.vehicleNumber || 'Unknown';
    
    if (!vehicleStats[vehicleNum]) {
      vehicleStats[vehicleNum] = {
        vehicleNumber: vehicleNum,
        totalKm: 0,
        totalAmount: 0,
        tripCount: 0,
        exceedCount: 0,
        expenses: []
      };
    }
    
    vehicleStats[vehicleNum].totalKm += expense.vehicleKm.totalKm || 0;
    vehicleStats[vehicleNum].totalAmount += expense.amount;
    vehicleStats[vehicleNum].tripCount += 1;
    if (expense.vehicleKm.exceedsLimit) {
      vehicleStats[vehicleNum].exceedCount += 1;
    }
    vehicleStats[vehicleNum].expenses.push(expense);
  });

  // Get site-wise summary
  const siteStats = await Expense.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: '$site',
        totalKm: { $sum: '$vehicleKm.totalKm' },
        totalAmount: { $sum: '$amount' },
        tripCount: { $sum: 1 },
        exceedCount: {
          $sum: { $cond: ['$vehicleKm.exceedsLimit', 1, 0] }
        },
        averageKmPerTrip: { $avg: '$vehicleKm.totalKm' },
        averageRatePerKm: { $avg: '$vehicleKm.ratePerKm' }
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
    { $unwind: '$site' }
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        totalExpenses: kmExpenses.length,
        totalKm: kmExpenses.reduce((sum, exp) => sum + (exp.vehicleKm.totalKm || 0), 0),
        totalAmount: kmExpenses.reduce((sum, exp) => sum + exp.amount, 0),
        uniqueVehicles: Object.keys(vehicleStats).length,
        exceedLimitCount: kmExpenses.filter(exp => exp.vehicleKm.exceedsLimit).length,
        averageKmPerTrip: kmExpenses.length > 0 
          ? Math.round(kmExpenses.reduce((sum, exp) => sum + (exp.vehicleKm.totalKm || 0), 0) / kmExpenses.length)
          : 0
      },
      vehicleStats: Object.values(vehicleStats),
      siteStats,
      expenses: kmExpenses,
      filters: {
        startDate,
        endDate,
        site,
        vehicleNumber
      },
      generatedAt: new Date(),
      generatedBy: req.user._id
    }
  });
}));

// @desc    Get approval analytics report
// @route   GET /api/reports/approval-analytics
// @access  Private (L3 approvers only)
router.get('/approval-analytics', protect, authorize('l3_approver', 'finance'), asyncHandler(async (req, res) => {
  const { startDate, endDate, approver } = req.query;

  // Build date filter
  let dateFilter = {};
  if (startDate && endDate) {
    dateFilter = {
      'approvalHistory.date': {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
  } else {
    // Default to current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter = {
      'approvalHistory.date': { $gte: monthStart }
    };
  }

  let matchFilter = {
    ...dateFilter,
    isActive: true,
    isDeleted: false
  };

  if (approver) {
    matchFilter['approvalHistory.approver'] = approver;
  }

  // Get approval statistics
  const approvalStats = await Expense.aggregate([
    { $match: matchFilter },
    { $unwind: '$approvalHistory' },
    { $match: dateFilter },
    {
      $group: {
        _id: {
          approver: '$approvalHistory.approver',
          action: '$approvalHistory.action',
          level: '$approvalHistory.level'
        },
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id.approver',
        foreignField: '_id',
        as: 'approver'
      }
    },
    { $unwind: '$approver' },
    {
      $group: {
        _id: '$_id.approver',
        approver: { $first: '$approver' },
        totalApprovals: { $sum: '$count' },
        totalAmount: { $sum: '$totalAmount' },
        actions: {
          $push: {
            action: '$_id.action',
            level: '$_id.level',
            count: '$count',
            amount: '$totalAmount'
          }
        }
      }
    }
  ]);

  // Get processing time analytics
  const processingTimes = await Expense.aggregate([
    { $match: matchFilter },
    { $unwind: '$approvalHistory' },
    { $match: dateFilter },
    {
      $addFields: {
        processingTime: {
          $subtract: ['$approvalHistory.date', '$submissionDate']
        }
      }
    },
    {
      $group: {
        _id: '$approvalHistory.approver',
        averageProcessingTime: { $avg: '$processingTime' },
        minProcessingTime: { $min: '$processingTime' },
        maxProcessingTime: { $max: '$processingTime' },
        totalApprovals: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'approver'
      }
    },
    { $unwind: '$approver' }
  ]);

  // Convert processing times from milliseconds to hours
  processingTimes.forEach(stat => {
    stat.averageProcessingTime = Math.round(stat.averageProcessingTime / (1000 * 60 * 60) * 100) / 100;
    stat.minProcessingTime = Math.round(stat.minProcessingTime / (1000 * 60 * 60) * 100) / 100;
    stat.maxProcessingTime = Math.round(stat.maxProcessingTime / (1000 * 60 * 60) * 100) / 100;
  });

  res.json({
    success: true,
    data: {
      approvalStats,
      processingTimes,
      filters: {
        startDate,
        endDate,
        approver
      },
      generatedAt: new Date(),
      generatedBy: req.user._id
    }
  });
}));

// @desc    Get dashboard summary report
// @route   GET /api/reports/dashboard-summary
// @access  Private
router.get('/dashboard-summary', protect, asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const userSite = req.user.site?._id; // Use optional chaining to avoid error

  const currentMonth = new Date();
  currentMonth.setDate(1);
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  let summary = {};

  // Personal stats for all users
  const personalStats = await Expense.aggregate([
    {
      $match: {
        submittedBy: userId,
        expenseDate: { $gte: currentMonth, $lt: nextMonth },
        isActive: true,
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$amount' }
      }
    }
  ]);

  summary.personal = {
    totalExpenses: personalStats.reduce((sum, stat) => sum + stat.count, 0),
    totalAmount: personalStats.reduce((sum, stat) => sum + stat.amount, 0),
    byStatus: personalStats
  };

  // Role-specific stats
      if (['l1_approver', 'l2_approver', 'l3_approver', 'finance'].includes(userRole)) {
    const pendingApprovals = await Expense.countDocuments({
      'pendingApprovers.approver': userId,
      isActive: true,
      isDeleted: false
    });

    summary.approvals = { pending: pendingApprovals };
  }

      if (userRole === 'l3_approver' || userRole === 'finance') {
    // System-wide stats
    const systemStats = await Expense.aggregate([
      {
        $match: {
          expenseDate: { $gte: currentMonth, $lt: nextMonth },
          isActive: true,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    summary.system = {
      totalExpenses: systemStats.reduce((sum, stat) => sum + stat.count, 0),
      totalAmount: systemStats.reduce((sum, stat) => sum + stat.amount, 0),
      byStatus: systemStats
    };

    // Budget alerts
    const budgetAlerts = await Site.countDocuments({
      isActive: true,
      $expr: {
        $gte: [
          { $divide: ['$statistics.monthlySpend', '$budget.monthly'] },
          { $divide: ['$budget.alertThreshold', 100] }
        ]
      }
    });

    summary.budgetAlerts = budgetAlerts;
  }

  res.json({
    success: true,
    data: {
      summary,
      period: {
        start: currentMonth,
        end: nextMonth
      },
      generatedAt: new Date()
    }
  });
}));

// Helper function to convert data to CSV
function convertToCSV(data) {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Expenses', data.summary.totalExpenses],
    ['Total Amount', data.summary.totalAmount],
    ['Average Amount', data.summary.averageAmount],
    ['Approved Count', data.summary.approvedCount],
    ['Approved Amount', data.summary.approvedAmount],
    ['Pending Count', data.summary.pendingCount],
    ['Pending Amount', data.summary.pendingAmount],
    ['Rejected Count', data.summary.rejectedCount],
    ['Rejected Amount', data.summary.rejectedAmount]
  ];

  let csv = headers.join(',') + '\n';
  csv += rows.map(row => row.join(',')).join('\n');
  
  return csv;
}

// Helper function to convert expenses to CSV
function convertExpensesToCSV(expenses) {
  const headers = [
    'Expense ID', 'Title', 'Amount', 'Category', 'Status', 
    'Submitter', 'Site', 'Date', 'Submission Date'
  ];
  
  let csv = headers.join(',') + '\n';
  
  expenses.forEach(expense => {
    const row = [
      expense.expenseId,
      `"${expense.title}"`,
      expense.amount,
      expense.category,
      expense.status,
      `"${expense.submittedBy.name}"`,
      `"${expense.site.name}"`,
      expense.expenseDate.toISOString().split('T')[0],
      expense.submissionDate.toISOString().split('T')[0]
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

module.exports = router; 