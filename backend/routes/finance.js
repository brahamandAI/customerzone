const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Expense = require('../models/Expense');
const User = require('../models/User');
const Site = require('../models/Site');

// Middleware to check if user has finance/admin access
const checkFinanceAccess = (req, res, next) => {
  const allowedRoles = ['finance', 'admin', 'l3_approver', 'l4_approver'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Finance/Admin role required.'
    });
  }
  next();
};

// Get pending payments data
router.get('/pending-payments', protect, checkFinanceAccess, async (req, res) => {
  try {
    const { siteId } = req.query;
    
    let query = {
      status: { $in: ['approved_l2', 'approved_l3', 'approved_finance'] },
      'paymentDetails.paymentMethod': { $exists: true }
    };

    if (siteId) {
      query.site = siteId;
    }

    const pendingExpenses = await Expense.find(query)
      .populate('site', 'name')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 });

    // Group by site
    const siteData = {};
    let totalAmount = 0;
    let totalCount = 0;

    pendingExpenses.forEach(expense => {
      const siteName = expense.site?.name || 'Unknown Site';
      if (!siteData[siteName]) {
        siteData[siteName] = { amount: 0, count: 0 };
      }
      siteData[siteName].amount += expense.amount;
      siteData[siteName].count += 1;
      totalAmount += expense.amount;
      totalCount += 1;
    });

    const chartData = Object.entries(siteData).map(([site, data]) => ({
      site,
      amount: data.amount,
      count: data.count
    }));

    res.json({
      success: true,
      data: {
        chartData,
        summary: {
          totalAmount,
          totalCount,
          averageAmount: totalCount > 0 ? totalAmount / totalCount : 0
        },
        expenses: pendingExpenses
      }
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending payments'
    });
  }
});

// Get travel expenses by user
router.get('/travel-expenses', protect, checkFinanceAccess, async (req, res) => {
  try {
    const { period = 'quarter' } = req.query;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    }

    const travelExpenses = await Expense.find({
      category: 'Travel',
      createdAt: { $gte: startDate },
      status: { $in: ['approved', 'approved_l2', 'approved_l3', 'approved_finance'] }
    })
    .populate('submittedBy', 'name email')
    .populate('site', 'name');

    // Group by user
    const userData = {};
    travelExpenses.forEach(expense => {
      const userName = expense.submittedBy?.name || 'Unknown User';
      if (!userData[userName]) {
        userData[userName] = { amount: 0, trips: 0 };
      }
      userData[userName].amount += expense.amount;
      userData[userName].trips += 1;
    });

    const chartData = Object.entries(userData)
      .map(([user, data]) => ({
        user,
        amount: data.amount,
        trips: data.trips
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10 users

    res.json({
      success: true,
      data: {
        chartData,
        period,
        totalAmount: chartData.reduce((sum, item) => sum + item.amount, 0),
        totalTrips: chartData.reduce((sum, item) => sum + item.trips, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching travel expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching travel expenses'
    });
  }
});

// Get monthly expense trend
router.get('/monthly-trend', protect, checkFinanceAccess, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const expenses = await Expense.find({
      createdAt: { $gte: startDate },
      status: { $in: ['approved', 'approved_l2', 'approved_l3', 'approved_finance'] }
    });

    // Group by month
    const monthlyData = {};
    expenses.forEach(expense => {
      const month = expense.createdAt.toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      monthlyData[month] += expense.amount;
    });

    const chartData = Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    }));

    res.json({
      success: true,
      data: {
        chartData,
        totalAmount: chartData.reduce((sum, item) => sum + item.amount, 0),
        averageAmount: chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.amount, 0) / chartData.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching monthly trend:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly trend'
    });
  }
});

// Get category breakdown
router.get('/category-breakdown', protect, checkFinanceAccess, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const expenses = await Expense.find({
      createdAt: { $gte: startDate },
      status: { $in: ['approved', 'approved_l2', 'approved_l3', 'approved_finance'] }
    });

    // Group by category
    const categoryData = {};
    let totalAmount = 0;

    expenses.forEach(expense => {
      const category = expense.category || 'Miscellaneous';
      if (!categoryData[category]) {
        categoryData[category] = 0;
      }
      categoryData[category] += expense.amount;
      totalAmount += expense.amount;
    });

    const chartData = Object.entries(categoryData).map(([name, value]) => ({
      name,
      value: Math.round((value / totalAmount) * 100),
      amount: value
    }));

    res.json({
      success: true,
      data: {
        chartData,
        totalAmount,
        period
      }
    });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category breakdown'
    });
  }
});

// Get site-specific data
router.get('/site-data/:siteId', protect, checkFinanceAccess, async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const site = await Site.findById(siteId);
    if (!site) {
      return res.status(404).json({
        success: false,
        message: 'Site not found'
      });
    }

    const expenses = await Expense.find({ site: siteId })
      .populate('submittedBy', 'name email');

    const pendingExpenses = expenses.filter(e => 
      ['approved_l2', 'approved_l3', 'approved_finance'].includes(e.status)
    );

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Category breakdown for this site
    const categoryData = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Miscellaneous';
      if (!categoryData[category]) {
        categoryData[category] = 0;
      }
      categoryData[category] += expense.amount;
    });

    const topCategory = Object.entries(categoryData)
      .sort(([,a], [,b]) => b - a)[0];

    res.json({
      success: true,
      data: {
        site: {
          name: site.name,
          totalExpenses: expenses.length,
          totalAmount,
          pendingAmount,
          pendingCount: pendingExpenses.length,
          averageAmount: expenses.length > 0 ? totalAmount / expenses.length : 0,
          topCategory: topCategory ? `${topCategory[0]} (${Math.round((topCategory[1] / totalAmount) * 100)}%)` : 'N/A'
        },
        recentExpenses: expenses.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error fetching site data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching site data'
    });
  }
});

// Process AI query
router.post('/ai-query', protect, checkFinanceAccess, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    const lowerQuery = query.toLowerCase();
    let response = { type: 'text', content: '', data: null, chartType: null };

    // Simple NLP processing
    if (lowerQuery.includes('pending payment') || lowerQuery.includes('pending payments')) {
      const pendingData = await getPendingPaymentsData();
      response = {
        type: 'chart',
        content: `Here are the pending payments across all sites:\n\nTotal Pending: ₹${pendingData.totalAmount.toLocaleString()} across ${pendingData.totalCount} expenses`,
        data: pendingData.chartData,
        chartType: 'bar',
        chartTitle: 'Pending Payments by Site'
      };
    } else if (lowerQuery.includes('travel expense') || lowerQuery.includes('highest travel')) {
      const travelData = await getTravelExpensesData();
      response = {
        type: 'chart',
        content: `Here are the users with highest travel expenses this quarter:\n\n${travelData.chartData[0]?.user || 'No data'} has the highest travel expenses with ₹${travelData.chartData[0]?.amount?.toLocaleString() || 0}`,
        data: travelData.chartData,
        chartType: 'bar',
        chartTitle: 'Travel Expenses by User'
      };
    } else if (lowerQuery.includes('monthly') || lowerQuery.includes('trend')) {
      const trendData = await getMonthlyTrendData();
      response = {
        type: 'chart',
        content: `Here's the monthly expense trend for the last 6 months:\n\nAverage monthly expense: ₹${trendData.averageAmount.toLocaleString()}`,
        data: trendData.chartData,
        chartType: 'line',
        chartTitle: 'Monthly Expense Trend'
      };
    } else if (lowerQuery.includes('category') || lowerQuery.includes('breakdown')) {
      const categoryData = await getCategoryBreakdownData();
      response = {
        type: 'chart',
        content: `Here's the expense breakdown by category:\n\n${categoryData.chartData[0]?.name || 'Travel'} expenses account for ${categoryData.chartData[0]?.value || 0}% of total expenses`,
        data: categoryData.chartData,
        chartType: 'pie',
        chartTitle: 'Expense Category Breakdown'
      };
    } else {
      response = {
        type: 'text',
        content: `I understand you're asking about "${query}". Let me help you with that.\n\nYou can ask me about:\n• Pending payments and expenses\n• User expense analysis\n• Site-wise reports\n• Monthly trends and patterns\n• Category breakdowns\n\nTry asking something like "Show me pending payments" or "Which user has the highest travel expenses?"`
      };
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing AI query:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing query'
    });
  }
});

// Helper functions for AI query processing
async function getPendingPaymentsData() {
  const pendingExpenses = await Expense.find({
    status: { $in: ['approved_l2', 'approved_l3', 'approved_finance'] }
  }).populate('site', 'name');

  const siteData = {};
  let totalAmount = 0;
  let totalCount = 0;

  pendingExpenses.forEach(expense => {
    const siteName = expense.site?.name || 'Unknown Site';
    if (!siteData[siteName]) {
      siteData[siteName] = { amount: 0, count: 0 };
    }
    siteData[siteName].amount += expense.amount;
    siteData[siteName].count += 1;
    totalAmount += expense.amount;
    totalCount += 1;
  });

  const chartData = Object.entries(siteData).map(([site, data]) => ({
    site,
    amount: data.amount,
    count: data.count
  }));

  return { chartData, totalAmount, totalCount };
}

async function getTravelExpensesData() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const travelExpenses = await Expense.find({
    category: 'Travel',
    createdAt: { $gte: startDate },
    status: { $in: ['approved', 'approved_l2', 'approved_l3', 'approved_finance'] }
  }).populate('submittedBy', 'name');

  const userData = {};
  travelExpenses.forEach(expense => {
    const userName = expense.submittedBy?.name || 'Unknown User';
    if (!userData[userName]) {
      userData[userName] = { amount: 0, trips: 0 };
    }
    userData[userName].amount += expense.amount;
    userData[userName].trips += 1;
  });

  const chartData = Object.entries(userData)
    .map(([user, data]) => ({
      user,
      amount: data.amount,
      trips: data.trips
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return { chartData };
}

async function getMonthlyTrendData() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  const expenses = await Expense.find({
    createdAt: { $gte: startDate },
    status: { $in: ['approved', 'approved_l2', 'approved_l3', 'approved_finance'] }
  });

  const monthlyData = {};
  expenses.forEach(expense => {
    const month = expense.createdAt.toLocaleString('default', { month: 'short' });
    if (!monthlyData[month]) {
      monthlyData[month] = 0;
    }
    monthlyData[month] += expense.amount;
  });

  const chartData = Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount
  }));

  const averageAmount = chartData.length > 0 ? 
    chartData.reduce((sum, item) => sum + item.amount, 0) / chartData.length : 0;

  return { chartData, averageAmount };
}

async function getCategoryBreakdownData() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth(), 1);

  const expenses = await Expense.find({
    createdAt: { $gte: startDate },
    status: { $in: ['approved', 'approved_l2', 'approved_l3', 'approved_finance'] }
  });

  const categoryData = {};
  let totalAmount = 0;

  expenses.forEach(expense => {
    const category = expense.category || 'Miscellaneous';
    if (!categoryData[category]) {
      categoryData[category] = 0;
    }
    categoryData[category] += expense.amount;
    totalAmount += expense.amount;
  });

  const chartData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value: Math.round((value / totalAmount) * 100),
    amount: value
  }));

  return { chartData };
}

module.exports = router;
