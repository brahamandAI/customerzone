import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  Fade,
  Zoom,
  Divider,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  AttachMoney,
  Business,
  CalendarToday,
  Refresh,
  Download,
  Assessment,
  Speed,
  AccountBalance
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { expenseAPI, dashboardAPI } from '../services/api';
import { createCSVExportHandler } from '../utils/exportUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

const BudgetUtilizationPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { t } = useLanguage();
  
  const [budgetData, setBudgetData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stats, setStats] = useState({
    totalBudget: 0,
    usedBudget: 0,
    remainingBudget: 0,
    utilizationPercentage: 0,
    projectedUtilization: 0,
    categoryBreakdown: [],
    monthlyTrend: [],
    budgetAlerts: [],
    topSpendingCategories: []
  });

  const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0', '#00bcd4'];

  // Fetch budget and expenses data
  const fetchBudgetData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data for budget information
      const dashboardResponse = await dashboardAPI.getOverview();
      const expensesResponse = await expenseAPI.getAll();
      
      if (dashboardResponse.data.success && expensesResponse.data.success) {
        const dashboardData = dashboardResponse.data.data;
        const expensesData = expensesResponse.data.data || [];
        
        setBudgetData(dashboardData);
        setExpenses(expensesData);
        calculateBudgetStats(dashboardData, expensesData);
      }
    } catch (err) {
      console.error('Error fetching budget data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Calculate budget statistics
  const calculateBudgetStats = (budgetInfo, expensesData) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get budget information
    const totalBudget = budgetInfo.siteBudget?.monthly || budgetInfo.submitterBudgetBreakdown?.remainingBudget || 0;
    const usedBudget = budgetInfo.siteBudget?.used || budgetInfo.submitterBudgetBreakdown?.approvedAmount || 0;
    const remainingBudget = budgetInfo.siteBudget?.remaining || budgetInfo.submitterBudgetBreakdown?.remainingBudget || 0;
    const utilizationPercentage = budgetInfo.siteBudget?.utilization || budgetInfo.submitterBudgetBreakdown?.approvedUtilization || 0;
    const projectedUtilization = budgetInfo.siteBudget?.projectedUtilization || budgetInfo.submitterBudgetBreakdown?.projectedUtilization || 0;

    // Filter expenses for current month and user role
    let filteredExpenses = expensesData;
    if (user?.role?.toLowerCase() === 'submitter') {
      // Try multiple ways to match expenses for submitter
      filteredExpenses = expensesData.filter(exp => {
        const matchesSubmittedBy = exp.submittedBy === user._id;
        const matchesSubmittedById = exp.submittedBy?._id === user._id;
        const matchesUserId = exp.userId === user._id;
        const matchesUser = exp.user === user._id;
        
        return matchesSubmittedBy || matchesSubmittedById || matchesUserId || matchesUser;
      });
    } else if (user?.role?.toLowerCase() === 'l1_approver') {
      console.log('🔍 Filtering for L1 approver with site ID:', user.site?._id);
      console.log('🔍 User site object:', user.site);
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      
      // L1 approver: show all expenses from their site
      filteredExpenses = expensesData.filter(exp => {
        // Try multiple ways to match site
        const matchesSite = exp.site === user.site?._id;
        const matchesSiteId = exp.site?._id === user.site?._id;
        const matchesSiteString = exp.site === user.site?._id?.toString();
        
        console.log('🔍 Checking expense site match:', {
          expenseId: exp._id,
          expenseSite: exp.site,
          expenseSiteId: exp.site?._id,
          userSiteId: user.site?._id,
          userSiteIdString: user.site?._id?.toString(),
          matchesSite,
          matchesSiteId,
          matchesSiteString
        });
        
        return matchesSite || matchesSiteId || matchesSiteString;
      });
      console.log('📊 Filtered expenses count for L1 approver:', filteredExpenses.length);
      console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
    } else if (user?.role?.toLowerCase() === 'l2_approver') {
      console.log('🔍 L2 approver: showing all expenses from all sites');
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      
      // L2 approver: show all expenses from all sites
      filteredExpenses = expensesData;
      console.log('📊 Filtered expenses count for L2 approver:', filteredExpenses.length);
      console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
    } else if (user?.role?.toLowerCase() === 'l3_approver') {
      console.log('🔍 L3 approver: showing all expenses from all sites');
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      // L3 approver: show all expenses from all sites
      filteredExpenses = expensesData;
      console.log('📊 Filtered expenses count for L3 approver:', filteredExpenses.length);
      console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
    } else if (user?.role?.toLowerCase() === 'finance') {
      console.log('🔍 Filtering for Finance - all expenses');
      console.log('🔍 Raw expenses data sample:', expensesData.slice(0, 3));
      // Finance: show all expenses
      filteredExpenses = expensesData;
      console.log('📊 Filtered expenses count for Finance:', filteredExpenses.length);
      console.log('📊 Filtered expenses sample:', filteredExpenses.slice(0, 3));
    }

    const monthlyExpenses = filteredExpenses.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    // Category breakdown
    const categoryMap = {};
    monthlyExpenses.forEach(exp => {
      if (categoryMap[exp.category]) {
        categoryMap[exp.category] += exp.amount;
      } else {
        categoryMap[exp.category] = exp.amount;
      }
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / usedBudget) * 100,
      budgetAllocation: (amount / totalBudget) * 100
    })).sort((a, b) => b.amount - a.amount);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthExpenses = filteredExpenses.filter(exp => {
        const expDate = new Date(exp.expenseDate);
        return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
      });
      const monthTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      monthlyTrend.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthTotal,
        budget: totalBudget,
        utilization: totalBudget > 0 ? (monthTotal / totalBudget) * 100 : 0
      });
    }

    // Budget alerts
    const budgetAlerts = [];
    if (utilizationPercentage >= 90) {
      budgetAlerts.push({
        type: 'critical',
        message: 'Budget utilization is at critical level (90%+)',
        icon: <Warning />,
        color: '#f44336'
      });
    } else if (utilizationPercentage >= 80) {
      budgetAlerts.push({
        type: 'warning',
        message: 'Budget utilization is approaching limit (80%+)',
        icon: <Warning />,
        color: '#ff9800'
      });
    } else if (utilizationPercentage >= 50) {
      budgetAlerts.push({
        type: 'info',
        message: 'Budget utilization is moderate (50%+)',
        icon: <TrendingUp />,
        color: '#2196f3'
      });
    } else {
      budgetAlerts.push({
        type: 'success',
        message: 'Budget utilization is healthy (under 50%)',
        icon: <CheckCircle />,
        color: '#4caf50'
      });
    }

    // Top spending categories
    const topSpendingCategories = categoryBreakdown.slice(0, 5);

    setStats({
      totalBudget,
      usedBudget,
      remainingBudget,
      utilizationPercentage,
      projectedUtilization,
      categoryBreakdown,
      monthlyTrend,
      budgetAlerts,
      topSpendingCategories
    });
  };

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const getBudgetStatusColor = (percentage) => {
    if (percentage >= 90) return '#f44336';
    if (percentage >= 80) return '#ff9800';
    if (percentage >= 50) return '#2196f3';
    return '#4caf50';
  };

  const getBudgetStatusIcon = (percentage) => {
    if (percentage >= 90) return <Warning />;
    if (percentage >= 80) return <Warning />;
    if (percentage >= 50) return <TrendingUp />;
    return <CheckCircle />;
  };

  const getBudgetStatusText = (percentage) => {
    if (percentage >= 90) return 'Critical';
    if (percentage >= 80) return 'Warning';
    if (percentage >= 50) return 'Moderate';
    return 'Healthy';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: darkMode 
        ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' 
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      py: 4
    }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Fade in timeout={600}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <IconButton 
                onClick={() => navigate('/dashboard')}
                sx={{ 
                  mr: 2, 
                  color: darkMode ? '#fff' : '#333',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h4" fontWeight={700} color={darkMode ? '#fff' : '#333'}>
                Budget Utilization Analysis
              </Typography>
            </Box>
            <Typography variant="body1" color={darkMode ? '#b0b0b0' : '#666'}>
              Monitor budget usage, trends, and spending patterns
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={createCSVExportHandler(
                  { 
                    summary: { 
                      budgetUtilization: stats.utilizationPercentage, 
                      totalBudget: stats.totalBudget,
                      usedBudget: stats.usedBudget,
                      remainingBudget: stats.remainingBudget
                    },
                    expenses: expenses,
                    categoryBreakdown: stats.categoryBreakdown,
                    monthlyTrend: stats.monthlyTrend
                  }, 
                  'budget-utilization', 
                  user, 
                  setError
                )}
                sx={{ 
                  borderColor: darkMode ? '#555' : '#ccc',
                  color: darkMode ? '#fff' : '#333'
                }}
              >
                Export
              </Button>
            </Box>
          </Box>
        </Fade>

        {/* Budget Alerts */}
        {stats.budgetAlerts.length > 0 && (
          <Fade in timeout={800}>
            <Box sx={{ mb: 4 }}>
              {stats.budgetAlerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
                  icon={alert.icon}
                  sx={{ 
                    mb: 2,
                    background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {alert.message}
                </Alert>
              ))}
            </Box>
          </Fade>
        )}

        {/* Budget Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '200ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#2196f3', mr: 2 }}>
                      <AccountBalance />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.totalBudget.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Total Budget
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '400ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#ff9800', mr: 2 }}>
                      <AttachMoney />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.usedBudget.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Used Budget
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '600ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                      <TrendingDown />
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      ₹{stats.remainingBudget.toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Remaining Budget
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in style={{ transitionDelay: '800ms' }}>
              <Card sx={{ 
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar sx={{ bgcolor: getBudgetStatusColor(stats.utilizationPercentage), mr: 2 }}>
                      {getBudgetStatusIcon(stats.utilizationPercentage)}
                    </Avatar>
                    <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.utilizationPercentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Utilization ({getBudgetStatusText(stats.utilizationPercentage)})
                  </Typography>
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
        </Grid>

        {/* Budget Utilization Chart */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Fade in timeout={1000}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Budget Utilization Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#555' : '#ccc'} />
                    <XAxis dataKey="month" stroke={darkMode ? '#fff' : '#333'} />
                    <YAxis stroke={darkMode ? '#fff' : '#333'} />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: darkMode ? '#333' : '#fff',
                        border: darkMode ? '1px solid #555' : '1px solid #ccc',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stackId="1"
                      stroke="#2196f3" 
                      fill="#2196f3"
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="budget" 
                      stackId="2"
                      stroke="#4caf50" 
                      fill="#4caf50"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Fade>
          </Grid>

          {/* Budget Status */}
          <Grid item xs={12} md={4}>
            <Fade in timeout={1200}>
              <Paper sx={{ 
                p: 3,
                background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 2 }}>
                  Budget Status
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Current Utilization
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.utilizationPercentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.utilizationPercentage} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: darkMode ? '#333' : '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getBudgetStatusColor(stats.utilizationPercentage)
                      }
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                      Projected Utilization
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                      {stats.projectedUtilization.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats.projectedUtilization} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: darkMode ? '#333' : '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#ff9800'
                      }
                    }}
                  />
                </Box>

                <Divider sx={{ my: 2, borderColor: darkMode ? '#555' : '#eee' }} />

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color={getBudgetStatusColor(stats.utilizationPercentage)}>
                    {getBudgetStatusText(stats.utilizationPercentage)}
                  </Typography>
                  <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                    Budget Status
                  </Typography>
                </Box>
              </Paper>
            </Fade>
          </Grid>
        </Grid>

        {/* Category Breakdown */}
        <Fade in timeout={1400}>
          <Paper sx={{ 
            p: 3,
            mb: 4,
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 3 }}>
              Category Spending Breakdown
            </Typography>
            <Grid container spacing={2}>
              {stats.topSpendingCategories.map((category, index) => (
                <Grid item xs={12} sm={6} md={4} key={category.category}>
                  <Card sx={{ 
                    background: darkMode ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${COLORS[index % COLORS.length]}20`
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h4" sx={{ mr: 1 }}>
                          {category.category === 'Travel' ? '✈️' : 
                           category.category === 'Food' ? '🍽️' : 
                           category.category === 'Accommodation' ? '🏨' : 
                           category.category === 'Transport' ? '🚗' : 
                           category.category === 'Office' ? '🏢' : '💰'}
                        </Typography>
                        <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                          {category.category}
                        </Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={700} color={COLORS[index % COLORS.length]}>
                        ₹{category.amount.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ mb: 1 }}>
                        {category.percentage.toFixed(1)}% of spending
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'} sx={{ mb: 1 }}>
                        {category.budgetAllocation.toFixed(1)}% of budget
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={category.budgetAllocation} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: darkMode ? '#333' : '#f0f0f0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: COLORS[index % COLORS.length]
                          }
                        }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Fade>

        {/* Budget Recommendations */}
        <Fade in timeout={1600}>
          <Paper sx={{ 
            background: darkMode ? 'rgba(45,45,45,0.95)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}` }}>
              <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'}>
                Budget Recommendations
              </Typography>
            </Box>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={2}>
                {stats.utilizationPercentage >= 90 && (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Critical: Budget utilization is at {stats.utilizationPercentage.toFixed(1)}%. 
                        Consider requesting additional budget or reducing expenses.
                      </Typography>
                    </Alert>
                  </Grid>
                )}
                
                {stats.utilizationPercentage >= 80 && stats.utilizationPercentage < 90 && (
                  <Grid item xs={12}>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Warning: Budget utilization is at {stats.utilizationPercentage.toFixed(1)}%. 
                        Monitor spending closely and consider cost optimization.
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {stats.projectedUtilization > 100 && (
                  <Grid item xs={12}>
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Projected over-budget: Based on current spending patterns, 
                        you may exceed budget by {(stats.projectedUtilization - 100).toFixed(1)}%.
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {stats.utilizationPercentage < 50 && (
                  <Grid item xs={12}>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600}>
                        Good: Budget utilization is healthy at {stats.utilizationPercentage.toFixed(1)}%. 
                        You have good control over spending.
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <Card sx={{ 
                    background: darkMode ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
                    border: '1px solid #2196f320'
                  }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 1 }}>
                        Daily Budget
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="#2196f3">
                        ₹{(stats.remainingBudget / 30).toFixed(0)}
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                        Available per day
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Card sx={{ 
                    background: darkMode ? 'rgba(26,26,26,0.5)' : 'rgba(255,255,255,0.5)',
                    border: '1px solid #4caf5020'
                  }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={600} color={darkMode ? '#fff' : '#333'} sx={{ mb: 1 }}>
                        Savings Potential
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="#4caf50">
                        ₹{stats.remainingBudget.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color={darkMode ? '#b0b0b0' : '#666'}>
                        Remaining budget
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default BudgetUtilizationPage;
